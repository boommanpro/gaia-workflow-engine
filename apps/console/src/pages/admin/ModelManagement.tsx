/**
 * 模型管理（owb 设置页对标，2026-10-11）：
 * 模型条目 CRUD + 三段式 modelId 选择 + 测活探针 + 健康账本 + 全局默认/思考档位。
 * 数据源：/api/agent/models*（ModelConfigController）。
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Table, Button, Modal, Input, Select, Switch, Toast, Popconfirm, Tag, Tooltip,
} from '@douyinfe/semi-ui';
import { IconPlus, IconRefresh } from '@douyinfe/semi-icons';
import { agentApi } from '../../agent/api';
import { useLanguage } from '../../i18n';

const ACCENT = '#4d53e8';

/** 厂商预设（对标 owb PROVIDER_KINDS 精选）：选厂商自动填 baseUrl 模板 + vendor */
const VENDOR_PRESETS: Record<string, { label: string; baseUrl: string }> = {
  qwen: { label: '通义 Qwen（DashScope 兼容）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  glm: { label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  openai: { label: 'OpenAI 兼容', baseUrl: 'https://api.openai.com/v1' },
  anthropic: { label: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1' },
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  ollama: { label: 'Ollama（本地）', baseUrl: 'http://127.0.0.1:11434/v1' },
  custom: { label: '自定义', baseUrl: '' },
};

const THINKING_OPTIONS = [
  { value: '', label: '跟随全局' },
  { value: 'auto', label: '默认' },
  { value: 'off', label: '关闭' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
];

interface ModelEntry {
  id: number;
  displayName: string;
  vendor?: string;
  baseUrl?: string;
  apiKeyMasked?: string;
  modelId?: string;
  thinkingOverride?: string;
  maxTokens?: number;
  temperature?: number;
  enabled: boolean;
  active: boolean;
}

interface HealthItem {
  model: string;
  total: number;
  errors: number;
  successRate: number;
  avgLatencyMs: number;
  healthy: boolean;
}

const emptyForm = () => ({
  id: undefined as number | undefined,
  displayName: '',
  vendor: 'qwen',
  baseUrl: VENDOR_PRESETS.qwen.baseUrl,
  apiKey: '',
  modelId: '',
  thinkingOverride: '',
  maxTokens: undefined as number | undefined,
  extraBody: '',
  enabled: true,
});

export const ModelManagement: React.FC = () => {
  useLanguage();
  const [items, setItems] = useState<ModelEntry[]>([]);
  const [activeModelId, setActiveModelId] = useState<number | null>(null);
  const [globalThinking, setGlobalThinking] = useState('auto');
  const [health, setHealth] = useState<HealthItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [list, h] = await Promise.all([
        agentApi.listModels(),
        agentApi.modelHealth().catch(() => ({ items: [] })),
      ]);
      setItems((list.items || []) as ModelEntry[]);
      setActiveModelId(list.activeModelId ?? null);
      setGlobalThinking(list.globalThinking || 'auto');
      setHealth((h.items || []) as HealthItem[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const healthFor = (entry: ModelEntry): HealthItem | undefined =>
    health.find((h) => h.model === entry.modelId);

  const openCreate = () => {
    setTestResult(null);
    setEditing(emptyForm());
  };

  const openEdit = (entry: ModelEntry) => {
    setTestResult(null);
    setEditing({
      id: entry.id,
      displayName: entry.displayName,
      vendor: entry.vendor || 'custom',
      baseUrl: entry.baseUrl || '',
      apiKey: '',
      modelId: entry.modelId || '',
      thinkingOverride: entry.thinkingOverride || '',
      maxTokens: entry.maxTokens,
      extraBody: '',
      enabled: entry.enabled,
    });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.displayName.trim() || !editing.modelId.trim()) {
      Toast.warning('显示名和上游模型 ID 必填');
      return;
    }
    const body: Record<string, unknown> = {
      id: editing.id,
      displayName: editing.displayName.trim(),
      vendor: editing.vendor,
      baseUrl: editing.baseUrl,
      modelId: editing.modelId.trim(),
      thinkingOverride: editing.thinkingOverride || null,
      maxTokens: editing.maxTokens ?? null,
      enabled: editing.enabled,
    };
    // apiKey 原样掩码 = 未修改，不传
    if (editing.apiKey && !editing.apiKey.includes('****')) body.apiKey = editing.apiKey;
    if (editing.extraBody?.trim()) body.extraBody = editing.extraBody.trim();
    const res = await agentApi.saveModel(body);
    if (!res.success) {
      Toast.error(res.error || '保存失败');
      return;
    }
    Toast.success('已保存');
    setEditing(null);
    void reload();
  };

  const remove = async (entry: ModelEntry) => {
    const res = await agentApi.deleteModel(entry.id);
    if (!res.success) {
      Toast.error(res.error || '删除失败');
      return;
    }
    void reload();
  };

  const setActive = async (entry: ModelEntry) => {
    await agentApi.setActiveModel(entry.id);
    Toast.success(`已设为平台默认：${entry.displayName}`);
    void reload();
  };

  const testEntry = async () => {
    if (!editing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const body: Record<string, unknown> = editing.id
        ? { id: editing.id }
        : { baseUrl: editing.baseUrl, apiKey: editing.apiKey, modelId: editing.modelId };
      const res = await agentApi.testModel(body);
      setTestResult(res.success
        ? { ok: true, text: `连通正常 · ${res.latencyMs}ms` }
        : { ok: false, text: `${res.error}（${res.latencyMs}ms）` });
    } catch (e) {
      setTestResult({ ok: false, text: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const columns = [
    {
      title: '名称', dataIndex: 'displayName',
      render: (v: string, e: ModelEntry) => (
        <span>
          <b style={{ color: '#1a1a1a' }}>{v}</b>
          {e.active && <Tag color="blue" style={{ marginLeft: 8 }}>平台默认</Tag>}
          {!e.enabled && <Tag color="grey" style={{ marginLeft: 8 }}>停用</Tag>}
        </span>
      ),
    },
    { title: '厂商', dataIndex: 'vendor', width: 100 },
    { title: '上游模型', dataIndex: 'modelId', width: 200 },
    {
      title: 'BaseURL', dataIndex: 'baseUrl', ellipsis: true,
      render: (v: string) => <span style={{ fontSize: 12, color: '#888' }}>{v}</span>,
    },
    {
      title: '健康（近 20 次）', width: 150,
      render: (_: unknown, e: ModelEntry) => {
        const h = healthFor(e);
        if (!h) return <span style={{ color: '#bbb', fontSize: 12 }}>暂无流量</span>;
        return (
          <Tooltip content={`成功率 ${(h.successRate * 100).toFixed(0)}% · 平均 ${h.avgLatencyMs}ms`}>
            <span style={{ fontSize: 12 }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                marginRight: 6, background: h.healthy ? '#22c55e' : '#ef4444',
              }} />
              {h.total - h.errors}/{h.total} · {h.avgLatencyMs}ms
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '操作', width: 240,
      render: (_: unknown, e: ModelEntry) => (
        <span style={{ display: 'inline-flex', gap: 8 }}>
          {!e.active && (
            <Button size="small" theme="borderless" onClick={() => void setActive(e)}>设为默认</Button>
          )}
          <Button size="small" theme="borderless" onClick={() => openEdit(e)}>编辑</Button>
          <Popconfirm title="确定删除该模型？" onConfirm={() => void remove(e)}>
            <Button size="small" theme="borderless" type="danger">删除</Button>
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 16, gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>模型管理</h2>
          <div style={{ fontSize: 12.5, color: '#888', marginTop: 4 }}>
            自研引擎的模型条目：多模型条目 + 会话级选择 + 思考档位 + 测活与健康账本；未配置任何条目时使用服务端内置默认模型。
          </div>
        </div>
        <Button
          icon={<IconRefresh />}
          theme="borderless"
          onClick={() => void reload()}
        />
        <Button icon={<IconPlus />} theme="solid" style={{ background: ACCENT }} onClick={openCreate}>
          新建模型
        </Button>
      </div>

      {/* 全局设置卡片 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
          background: '#fafafc', border: '1px solid #ececf1', borderRadius: 10, marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 13, color: '#666' }}>
          平台默认：{items.find((i) => i.id === activeModelId)?.displayName || '内置模型'}
        </span>
        <span style={{ fontSize: 13, color: '#666' }}>思考档位（全局）：</span>
        <Select
          value={globalThinking}
          style={{ width: 140 }}
          size="small"
          onChange={async (v) => {
            await agentApi.setGlobalThinking(v as string);
            setGlobalThinking(v as string);
            Toast.success('已更新全局思考档位');
          }}
          optionList={THINKING_OPTIONS.filter((o) => o.value !== '')}
        />
        <span style={{ fontSize: 12, color: '#aaa' }}>
          会话内可单独切换模型（对话输入框右下角）；条目级思考覆盖优先于全局档位
        </span>
      </div>

      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={false}
        empty={
          <div style={{ padding: '28px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
              还没有模型条目，未配置时使用服务端内置默认模型
            </div>
            <Button size="small" icon={<IconPlus />} theme="solid" style={{ background: ACCENT }} onClick={openCreate}>
              新建模型
            </Button>
          </div>
        }
      />

      {/* 新建/编辑抽屉 */}
      <Modal
        title={editing?.id ? '编辑模型' : '新建模型'}
        visible={!!editing}
        onCancel={() => setEditing(null)}
        onOk={() => void save()}
        okText="保存"
        width={560}
      >
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>显示名 *</div>
                <Input value={editing.displayName} placeholder="如：GLM-4.6 生产"
                  onChange={(v) => setEditing({ ...editing, displayName: v })} />
              </div>
              <div style={{ width: 220 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>厂商（决定思考参数映射）</div>
                <Select
                  value={editing.vendor}
                  style={{ width: '100%' }}
                  onChange={(v) => setEditing({
                    ...editing, vendor: v as string,
                    baseUrl: VENDOR_PRESETS[v as string]?.baseUrl ?? editing.baseUrl,
                  })}
                  optionList={Object.entries(VENDOR_PRESETS).map(([value, p]) => ({ value, label: p.label }))}
                />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Base URL *</div>
              <Input value={editing.baseUrl} placeholder="https://.../v1"
                onChange={(v) => setEditing({ ...editing, baseUrl: v })} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>API Key（留空 = 不修改）</div>
                <Input mode="password" value={editing.apiKey} placeholder="sk-..."
                  onChange={(v) => setEditing({ ...editing, apiKey: v })} />
              </div>
              <div style={{ width: 220 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>上游模型 ID *</div>
                <Input value={editing.modelId} placeholder="如 glm-4.6 / qwen3-max"
                  onChange={(v) => setEditing({ ...editing, modelId: v })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 220 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>思考档位覆盖</div>
                <Select
                  value={editing.thinkingOverride}
                  style={{ width: '100%' }}
                  onChange={(v) => setEditing({ ...editing, thinkingOverride: v as string })}
                  optionList={THINKING_OPTIONS}
                />
              </div>
              <div style={{ width: 160 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>maxTokens（可空）</div>
                <Input value={editing.maxTokens != null ? String(editing.maxTokens) : ''}
                  onChange={(v) => setEditing({ ...editing, maxTokens: v ? Number(v) : undefined })} />
              </div>
              <div style={{ paddingTop: 18 }}>
                <Switch checked={editing.enabled}
                  onChange={(v) => setEditing({ ...editing, enabled: v })} />
                <span style={{ fontSize: 12, color: '#666', marginLeft: 6 }}>启用</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                extra_body（厂商私有参数 JSON，优先级最高；可空）
              </div>
              <Input value={editing.extraBody} placeholder='如 {"enable_thinking":false}'
                onChange={(v) => setEditing({ ...editing, extraBody: v })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Button size="small" theme="borderless" icon={<IconRefresh />}
                loading={testing} disabled={!editing.modelId || !editing.baseUrl}
                onClick={() => void testEntry()}>
                测活
              </Button>
              {testResult && (
                <span style={{ fontSize: 12.5, color: testResult.ok ? '#22c55e' : '#ef4444' }}>
                  {testResult.ok ? '✓' : '✗'} {testResult.text}
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
