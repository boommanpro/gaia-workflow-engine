/**
 * API 调用文档模块。
 *  /docs            已发布 API 列表
 *  /docs/:workflowCode  单个 API 的完整调用文档（地址 / 鉴权 / 请求·响应参数 / 示例 / 错误码）
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { workflowApi, GaiaApiMeta } from '../services/workflow-api';
import { getApiBaseUrl } from '../utils/apiConfig';
import { useLanguage, t } from '../i18n';
import { ContentTopNav } from '../components/ContentTopNav';
import ScrollPage from '../components/ScrollPage';

const ACCENT = '#4d53e8';

const useCopied = () => {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };
  return { copied, copy };
};

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

export const ApiDocsPage: React.FC = () => {
  useLanguage();
  const navigate = useNavigate();
  const { workflowCode } = useParams<{ workflowCode?: string }>();
  const { copied, copy } = useCopied();

  if (!workflowCode) return <ApiDocsList navigate={navigate} />;
  return <ApiDocDetail code={workflowCode} navigate={navigate} copied={copied} copy={copy} />;
};

const ApiDocsList: React.FC<{ navigate: (p: string) => void }> = ({ navigate }) => {
  const [apis, setApis] = useState<GaiaApiMeta[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    workflowApi
      .listApis()
      .then(setApis)
      .catch(() => setApis([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollPage>
      <ContentTopNav active="/docs" />
      <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold sm:text-4xl" style={{ letterSpacing: '-0.02em' }}>
          {t('apiDocs.title')}
        </h1>
        <p className="mt-3 max-w-[560px] text-[15px] text-[#666]">{t('apiDocs.subtitle')}</p>

        {loading ? (
          <div className="py-20 text-center text-sm text-[#999]">{t('Loading')}</div>
        ) : apis.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#e3e3ea] py-20 text-center">
            <p className="text-[15px] text-[#666]">{t('apiDocs.listEmpty')}</p>
            <p className="mt-1 text-sm text-[#999]">{t('apiDocs.publishHint')}</p>
            <button
              onClick={() => navigate('/preview')}
              className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: ACCENT }}
            >
              {t('preview.title')}
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apis.map((a) => (
              <button
                key={a.workflowCode}
                onClick={() => navigate(`/docs/${a.workflowCode}`)}
                className="rounded-2xl border border-[#eee] bg-white p-5 text-left transition-shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
              >
                <div className="text-[15px] font-semibold text-[#1a1a1a]">{a.apiName || a.workflowCode}</div>
                <div className="mt-1 text-xs text-[#999]">{a.workflowCode}</div>
                <code className="mt-3 block truncate rounded-lg bg-[#f6f6fb] px-2 py-1.5 text-[12px] text-[#4d53e8]">
                  POST {a.apiPath}
                </code>
              </button>
            ))}
          </div>
        )}
      </div>
    </ScrollPage>
  );
};

const ApiDocDetail: React.FC<{
  code: string;
  navigate: (p: string) => void;
  copied: boolean;
  copy: (s: string) => void;
}> = ({ code, navigate, copied, copy }) => {
  const [meta, setMeta] = useState<(GaiaApiMeta & { published?: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    workflowApi
      .getApiMeta(code)
      .then((m) => setMeta(m.published === false ? null : m))
      .catch(() => setMeta(null))
      .finally(() => setLoading(false));
  };
  useEffect(load, [code]);

  const base = getApiBaseUrl().replace(/\/+$/, '');
  const fullUrl = useMemo(() => `${base}/v1/wf/${code}`, [base, code]);

  const exampleBody = useMemo(() => (meta ? buildExampleBody(meta) : {}), [meta]);
  const curl = `curl -X POST '${fullUrl}' \\\n  -H 'Content-Type: application/json' \\\n  -H 'X-API-Key: ${revealedKey || 'YOUR_API_KEY'}' \\\n  -d '${JSON.stringify(exampleBody, null, 2)}'`;

  const onRegenerate = async () => {
    try {
      const r = await workflowApi.regenerateApiKey(code);
      setRevealedKey(r.apiKey || null);
      load();
    } catch {
      /* ignore */
    }
  };
  const onUnpublish = async () => {
    if (!window.confirm(t('apiDocs.unpublish'))) return;
    try {
      await workflowApi.unpublishApi(code);
      load();
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <ScrollPage>
        <ContentTopNav active="/docs" />
        <div className="py-20 text-center text-sm text-[#999]">{t('Loading')}</div>
      </ScrollPage>
    );
  }

  if (!meta || meta.published === false) {
    return (
      <ScrollPage>
        <ContentTopNav active="/docs" />
        <div className="mx-auto max-w-[700px] px-4 py-20 text-center">
          <p className="text-[15px] text-[#666]">{t('apiDocs.notPublished')}</p>
          <button
            onClick={() => navigate(`/editor/${code}`)}
            className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: ACCENT }}
          >
            {t('apiDocs.goPublish')}
          </button>
        </div>
      </ScrollPage>
    );
  }

  const props = meta.requestSchema?.properties || {};
  const respProps = (meta.responseSchema as any)?.properties || {};

  return (
    <ScrollPage>
      <ContentTopNav active="/docs" />
      <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14">
        <button onClick={() => navigate('/docs')} className="mb-4 text-sm text-[#888] hover:text-[#4d53e8]">
          ← {t('apiDocs.title')}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{meta.apiName || code}</h1>
            <div className="mt-1 text-sm text-[#999]">
              {code} · {t('apiDocs.version')}: {meta.versionNumber}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onRegenerate} className="rounded-lg border border-[#e3e3ea] px-3 py-2 text-sm font-medium text-[#444] hover:border-[#c9c9ff] hover:text-[#4d53e8]">
              {t('apiDocs.regenerate')}
            </button>
            <button onClick={onUnpublish} className="rounded-lg border border-[#f3d4d4] px-3 py-2 text-sm font-medium text-[#d4380d] hover:bg-[#fff5f5]">
              {t('apiDocs.unpublish')}
            </button>
          </div>
        </div>

        {/* 接口地址 + 鉴权 */}
        <div className="mt-6 rounded-2xl border border-[#eee] bg-white p-5">
          <Section label={t('apiDocs.endpoint')}>
            <div className="flex items-center justify-between gap-3">
              <code className="break-all rounded-lg bg-[#f6f6fb] px-3 py-2 text-[13px] text-[#4d53e8]">
                POST {fullUrl}
              </code>
              <button onClick={() => copy(fullUrl)} className="shrink-0 rounded-lg border border-[#e3e3ea] px-3 py-2 text-xs font-medium text-[#444] hover:text-[#4d53e8]">
                {copied ? t('apiDocs.copied') : t('apiDocs.copy')}
              </button>
            </div>
          </Section>
          <Section label={t('apiDocs.auth')}>
            <div className="text-[13px] text-[#555]">
              {t('apiDocs.authDesc')} <code className="rounded bg-[#f6f6fb] px-1.5 py-0.5 text-[#4d53e8]">X-API-Key</code>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[13px] text-[#888]">{t('apiDocs.apiKey')}:</span>
              <code className="rounded bg-[#f6f6fb] px-2 py-1 text-[12px] text-[#666]">
                {revealedKey || meta.apiKeyMasked || '****'}
              </code>
            </div>
            {revealedKey && (
              <div className="mt-2 rounded-lg border border-[#fde9c8] bg-[#fffaf0] px-3 py-2 text-[12px] text-[#b76e00]">
                {t('apiDocs.showKey')}: <code className="text-[#b76e00]">{revealedKey}</code> · {t('apiDocs.copied')}
              </div>
            )}
          </Section>
        </div>

        {/* 请求参数 */}
        <div className="mt-5 rounded-2xl border border-[#eee] bg-white p-5">
          <Section label={t('apiDocs.requestParams')}>
            <Table
              headers={[t('apiDocs.name'), t('apiDocs.type'), t('apiDocs.desc')]}
              rows={Object.entries(props).map(([name, p]) => [
                name,
                (p as any)?.type || 'string',
                (p as any)?.description || '—',
              ])}
              empty={Object.keys(props).length === 0}
            />
          </Section>
        </div>

        {/* 响应参数 */}
        <div className="mt-5 rounded-2xl border border-[#eee] bg-white p-5">
          <Section label={t('apiDocs.responseParams')}>
            <Table
              headers={[t('apiDocs.name'), t('apiDocs.type'), t('apiDocs.desc')]}
              rows={Object.entries(respProps).map(([name, p]) => [
                name,
                (p as any)?.type || 'string',
                (p as any)?.description || '—',
              ])}
              empty={Object.keys(respProps).length === 0}
            />
          </Section>
        </div>

        {/* 调用示例 */}
        <div className="mt-5 rounded-2xl border border-[#eee] bg-white p-5">
          <Section label={t('apiDocs.example')}>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-[#1a1a2e] p-4 text-[12.5px] leading-relaxed text-[#e0e0e0]">
                <code>{curl}</code>
              </pre>
              <button onClick={() => copy(curl)} className="absolute right-3 top-3 rounded-lg border border-[#3a3a55] bg-[#26264a] px-2.5 py-1 text-xs text-[#cfcffb] hover:text-white">
                {copied ? t('apiDocs.copied') : t('apiDocs.copy')}
              </button>
            </div>
          </Section>
        </div>

        {/* 错误码 */}
        <div className="mt-5 rounded-2xl border border-[#eee] bg-white p-5">
          <Section label={t('apiDocs.errorCodes')}>
            <Table
              headers={[t('apiDocs.code'), t('apiDocs.message'), t('apiDocs.description')]}
              rows={(meta.errorCodes || []).map((e) => [e.code, e.message, e.description])}
              empty={(meta.errorCodes || []).length === 0}
            />
          </Section>
        </div>
      </div>
    </ScrollPage>
  );
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-4 last:mb-0">
    <div className="mb-2 text-[13px] font-semibold text-[#333]">{label}</div>
    {children}
  </div>
);

const Table: React.FC<{ headers: string[]; rows: string[][]; empty?: boolean }> = ({ headers, rows, empty }) => {
  if (empty) {
    return <div className="text-sm text-[#999]">—</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-left text-[#888]">
            {headers.map((h) => (
              <th key={h} className="border-b border-[#eee] py-2 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="text-[#444]">
              {r.map((c, j) => (
                <td key={j} className="border-b border-[#f4f4f6] py-2 pr-4 align-top">
                  {j === 0 ? <code className="text-[#4d53e8]">{c}</code> : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ApiDocsPage;
