/**
 * ApiDocModal — 管理后台「API 文档」行内弹窗。
 * 在工作流列表原位查看 / 发布某个工作流的 API 调用文档，不跳转页面：
 *   已发布：接口地址 · 鉴权 Key · 请求/响应参数 · 调用示例 · 错误码，以及重置 Key / 下架
 *   未发布：直接在弹窗内填写名称与描述并发布为 API
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Toast, Input, Button as SemiButton } from '@douyinfe/semi-ui';
import { workflowApi, GaiaApiMeta } from '../services/workflow-api';
import { getApiBaseUrl } from '../utils/apiConfig';
import { useLanguage, t } from '../i18n';
import { getSessionKeyForWorkflow } from '../ai-workspace/session-scope';

const ACCENT = 'var(--g-accent)';

interface ApiDocModalProps {
  /** 当前选中的工作流编码；null 表示关闭 */
  workflowCode: string | null;
  workflowName?: string;
  onClose: () => void;
}

/** 根据请求契约构造示例请求体 */
const buildExampleBody = (meta: GaiaApiMeta): Record<string, any> => {
  const props = meta.requestSchema?.properties || {};
  const body: Record<string, any> = {};
  Object.entries(props).forEach(([name, p]) => {
    const type = (p as any)?.type || 'string';
    if (name === 'inputs') {
      body.inputs = {};
    } else if (type === 'number' || type === 'integer') {
      body[name] = 0;
    } else if (type === 'boolean') {
      body[name] = false;
    } else if (type === 'object' || type === 'array') {
      body[name] = type === 'array' ? [] : {};
    } else {
      body[name] = '';
    }
  });
  if (Object.keys(body).length === 0) body.inputs = {};
  return body;
};

export const ApiDocModal: React.FC<ApiDocModalProps> = ({ workflowCode, workflowName, onClose }) => {
  useLanguage();
  const [meta, setMeta] = useState<(GaiaApiMeta & { published?: boolean }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [apiName, setApiName] = useState('');
  const [apiDesc, setApiDesc] = useState('');

  // 打开 / 切换工作流时重新拉取元信息并重置临时状态
  useEffect(() => {
    if (!workflowCode) return;
    let cancelled = false;
    setMeta(null);
    setRevealedKey(null);
    setCopied(false);
    setPublishing(false);
    setApiName(workflowName || workflowCode);
    setApiDesc('');
    setLoading(true);
    workflowApi
      .getApiMeta(workflowCode)
      .then((m) => {
        if (!cancelled) setMeta(m.published === false ? null : m);
      })
      .catch(() => {
        if (!cancelled) setMeta(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workflowCode, workflowName]);

  const copy = (text: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  const handlePublish = async () => {
    if (!workflowCode) return;
    setPublishing(true);
    try {
      const m = await workflowApi.publishApi(
        workflowCode,
        apiName.trim() || undefined,
        apiDesc.trim() || undefined,
        getSessionKeyForWorkflow(workflowCode) || undefined
      );
      setMeta(m);
      setRevealedKey(m.apiKey || null);
      Toast.success(t('apiDocs.publishSuccess'));
    } catch (e) {
      Toast.error(`${t('apiDocs.publish')}：${(e as Error).message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleRegenerate = async () => {
    if (!workflowCode) return;
    try {
      const r = await workflowApi.regenerateApiKey(workflowCode);
      setRevealedKey(r.apiKey || null);
      setMeta((prev) => (prev ? { ...prev, apiKeyMasked: r.apiKeyMasked } : prev));
      Toast.success(t('apiDocs.keyRotated'));
    } catch (e) {
      Toast.error(`${t('apiDocs.regenerate')}：${(e as Error).message}`);
    }
  };

  const handleUnpublish = () => {
    if (!workflowCode) return;
    Modal.confirm({
      title: t('apiDocs.unpublish'),
      content: t('apiDocs.unpublishConfirm'),
      okType: 'danger',
      onOk: async () => {
        try {
          await workflowApi.unpublishApi(workflowCode);
          setMeta(null);
          setRevealedKey(null);
          Toast.success(t('apiDocs.unpublishSuccess'));
        } catch (e) {
          Toast.error(`${t('apiDocs.unpublish')}：${(e as Error).message}`);
        }
      },
    });
  };

  const base = getApiBaseUrl().replace(/\/+$/, '');
  const fullUrl = useMemo(() => (workflowCode ? `${base}/v1/wf/${workflowCode}` : ''), [base, workflowCode]);
  const exampleBody = useMemo(() => (meta ? buildExampleBody(meta) : {}), [meta]);
  const curl = useMemo(
    () =>
      `curl -X POST '${fullUrl}' \\\n  -H 'Content-Type: application/json' \\\n  -H 'X-API-Key: ${revealedKey || 'YOUR_API_KEY'}' \\\n  -d '${JSON.stringify(exampleBody, null, 2)}'`,
    [fullUrl, revealedKey, exampleBody]
  );

  const renderBody = () => {
    if (loading) {
      return <div style={{ padding: '56px 0', textAlign: 'center', color: 'var(--g-text-muted)', fontSize: 14 }}>{t('Loading')}</div>;
    }

    // 未发布：原位发布，不再跳去编辑器
    if (!meta) {
      return (
        <div style={{ padding: '8px 0' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--g-text-sub)', lineHeight: 1.7 }}>
            {t('apiDocs.notPublished')}
          </p>
          <p style={{ margin: '4px 0 20px 0', fontSize: 13, color: 'var(--g-text-muted)' }}>{t('apiDocs.publishHintInline')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--g-text)' }}>{t('apiDocs.apiName')}</div>
              <Input value={apiName} onChange={(v) => setApiName(v)} placeholder={workflowName || workflowCode || ''} />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--g-text)' }}>{t('apiDocs.apiDesc')}</div>
              <Input value={apiDesc} onChange={(v) => setApiDesc(v)} placeholder={t('apiDocs.apiDescPlaceholder')} />
            </div>
            <div>
              <SemiButton theme="solid" style={{ background: ACCENT, borderRadius: 6 }} loading={publishing} onClick={handlePublish}>
                {t('apiDocs.publish')}
              </SemiButton>
            </div>
          </div>
        </div>
      );
    }

    const props = meta.requestSchema?.properties || {};
    const respProps = (meta.responseSchema as any)?.properties || {};

    return (
      <div>
        {/* 头部：编码 · 版本 + 管理动作 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--g-text)' }}>{meta.apiName || meta.workflowCode}</div>
            <div style={{ marginTop: 2, fontSize: 12, color: 'var(--g-text-muted)' }}>
              {meta.workflowCode} · {t('apiDocs.version')}: {meta.versionNumber || '—'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <SemiButton size="small" onClick={handleRegenerate} style={{ borderRadius: 6 }}>
              {t('apiDocs.regenerate')}
            </SemiButton>
            <SemiButton size="small" type="danger" onClick={handleUnpublish} style={{ borderRadius: 6 }}>
              {t('apiDocs.unpublish')}
            </SemiButton>
          </div>
        </div>

        {/* 接口地址 + 鉴权：宽屏下并排 */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div style={{ border: '1px solid #eee', borderRadius: 12, background: 'var(--g-bg-raised)', padding: 16 }}>
            <Section label={t('apiDocs.endpoint')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <code style={{ flex: 1, wordBreak: 'break-all', background: 'var(--g-bg-sunken)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: ACCENT }}>
                  POST {fullUrl}
                </code>
                <SemiButton size="small" onClick={() => copy(fullUrl)} style={{ borderRadius: 6, flexShrink: 0 }}>
                  {copied ? t('apiDocs.copied') : t('apiDocs.copy')}
                </SemiButton>
              </div>
            </Section>
          </div>
          <div style={{ border: '1px solid #eee', borderRadius: 12, background: 'var(--g-bg-raised)', padding: 16 }}>
            <Section label={t('apiDocs.auth')}>
              <div style={{ fontSize: 13, color: 'var(--g-text-sub)' }}>
                {t('apiDocs.authDesc')}{' '}
                <code style={{ background: 'var(--g-bg-sunken)', borderRadius: 4, padding: '2px 6px', color: ACCENT }}>X-API-Key</code>
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--g-text-muted)' }}>{t('apiDocs.apiKey')}:</span>
                <code style={{ background: 'var(--g-bg-sunken)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--g-text-sub)' }}>
                  {revealedKey || meta.apiKeyMasked || '****'}
                </code>
                {revealedKey && (
                  <SemiButton size="small" onClick={() => copy(revealedKey)} style={{ borderRadius: 6 }}>
                    {copied ? t('apiDocs.copied') : t('apiDocs.copy')}
                  </SemiButton>
                )}
              </div>
              {revealedKey && (
                <div style={{ marginTop: 8, borderRadius: 8, border: '1px solid #fde9c8', background: 'var(--g-warn-soft)', padding: '8px 10px', fontSize: 12, color: 'var(--g-warn)' }}>
                  {t('apiDocs.showKey')}: <code style={{ color: 'var(--g-warn)' }}>{revealedKey}</code>
                </div>
              )}
            </Section>
          </div>
        </div>

        {/* 请求参数 + 响应参数：宽屏下并排 */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div style={{ border: '1px solid #eee', borderRadius: 12, background: 'var(--g-bg-raised)', padding: 16 }}>
            <Section label={t('apiDocs.requestParams')}>
              <DocsTable
                headers={[t('apiDocs.name'), t('apiDocs.type'), t('apiDocs.desc')]}
                rows={Object.entries(props).map(([name, p]) => [name, (p as any)?.type || 'string', (p as any)?.description || '—'])}
                empty={Object.keys(props).length === 0}
              />
            </Section>
          </div>
          <div style={{ border: '1px solid #eee', borderRadius: 12, background: 'var(--g-bg-raised)', padding: 16 }}>
            <Section label={t('apiDocs.responseParams')}>
              <DocsTable
                headers={[t('apiDocs.name'), t('apiDocs.type'), t('apiDocs.desc')]}
                rows={Object.entries(respProps).map(([name, p]) => [name, (p as any)?.type || 'string', (p as any)?.description || '—'])}
                empty={Object.keys(respProps).length === 0}
              />
            </Section>
          </div>
        </div>

        {/* 调用示例 */}
        <div style={{ marginTop: 12, border: '1px solid #eee', borderRadius: 12, background: 'var(--g-bg-raised)', padding: 16 }}>
          <Section label={t('apiDocs.example')}>
            <div style={{ position: 'relative' }}>
              <pre style={{ margin: 0, overflowX: 'auto', background: '#1a1a2e', borderRadius: 8, padding: 14, fontSize: 12.5, lineHeight: 1.7, color: 'var(--g-line)' }}>
                <code>{curl}</code>
              </pre>
              <SemiButton
                size="small"
                style={{ position: 'absolute', right: 8, top: 8, borderRadius: 6, background: '#26264a', color: 'var(--g-accent-border)', borderColor: '#3a3a55' }}
                onClick={() => copy(curl)}
              >
                {copied ? t('apiDocs.copied') : t('apiDocs.copy')}
              </SemiButton>
            </div>
          </Section>
        </div>

        {/* 错误码 */}
        <div style={{ marginTop: 12, border: '1px solid #eee', borderRadius: 12, background: 'var(--g-bg-raised)', padding: 16 }}>
          <Section label={t('apiDocs.errorCodes')}>
            <DocsTable
              headers={[t('apiDocs.code'), t('apiDocs.message'), t('apiDocs.description')]}
              rows={(meta.errorCodes || []).map((e) => [e.code, e.message, e.description])}
              empty={(meta.errorCodes || []).length === 0}
            />
          </Section>
        </div>
      </div>
    );
  };

  return (
    <Modal
      title={
        <span style={{ fontSize: 16, fontWeight: 600 }}>
          {t('apiDocs.title')}
          {workflowCode && <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: 'var(--g-text-muted)' }}>{workflowCode}</span>}
        </span>
      }
      visible={!!workflowCode}
      onCancel={onClose}
      footer={
        <SemiButton onClick={onClose} style={{ borderRadius: 6 }}>
          {t('Close')}
        </SemiButton>
      }
      width={960}
      style={{ maxWidth: 'calc(100vw - 32px)' }}
    >
      <div style={{ maxHeight: '72vh', overflowY: 'auto', padding: '4px 2px' }}>{renderBody()}</div>
    </Modal>
  );
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--g-text-body)' }}>{label}</div>
    {children}
  </div>
);

const DocsTable: React.FC<{ headers: string[]; rows: string[][]; empty?: boolean }> = ({ headers, rows, empty }) => {
  if (empty) {
    return <div style={{ fontSize: 13, color: 'var(--g-text-muted)' }}>—</div>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            {headers.map((h) => (
              <th key={h} style={{ borderBottom: '1px solid #eee', padding: '6px 12px 6px 0', fontWeight: 500, color: 'var(--g-text-muted)', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} style={{ borderBottom: '1px solid #f4f4f6', padding: '7px 12px 7px 0', verticalAlign: 'top', color: 'var(--g-text-body)' }}>
                  {j === 0 ? <code style={{ color: ACCENT }}>{c}</code> : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ApiDocModal;
