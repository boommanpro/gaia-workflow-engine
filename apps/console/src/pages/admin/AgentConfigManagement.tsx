/**
 * AgentConfigManagement — Agent 配置中心
 * 4 个 Tab：模型配置 / Agent 指令 / 技能库 / 工具定义
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Tabs,
  TabPane,
  Button,
  Input,
  TextArea,
  Select,
  Table,
  Modal,
  Switch,
  Tag,
  Spin,
  Toast,
  Typography,
  Radio,
  MarkdownRender,
} from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { IconHelpCircle, IconInfoCircle } from '@douyinfe/semi-icons';
import { agentApi } from '../../agent/api';
import { ModelManagement } from './ModelManagement';
import { McpServerSection } from './McpServerSection';
import { t, useLanguage } from '../../i18n';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { SkillLibraryEditor } from './SkillLibraryEditor';

interface ToolDefItem {
  id?: number;
  toolName: string;
  toolGroup?: string;
  description?: string;
  parameters?: any;
  enabled?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

const jsonStringify = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val, null, 2); } catch { return String(val); }
};

const ToolDefinitionTab: React.FC = () => {
  useLanguage();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<ToolDefItem[]>([]);
  /** 分组过滤（多选）：默认只看内置两组；mcp:服务器名 为 MCP 细分项 */
  const [groupFilter, setGroupFilter] = useState<string[]>(['common', 'workflow']);
  const [modalVisible, setModalVisible] = useState(false);
  // web_search 密钥配置（agent_config: tool:web_search → {apiKey}）
  const [keyVisible, setKeyVisible] = useState(false);
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [form, setForm] = useState<ToolDefItem>({
    toolName: '',
    toolGroup: '',
    description: '',
    parameters: '',
    enabled: true,
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await agentApi.listToolDefinitions();
      setList(data || []);
    } catch (e) {
      Toast.error(`加载失败: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
    // web_search 密钥配置状态（不阻塞主列表）
    agentApi.getConfig('tool:web_search')
      .then((cfg) => {
        const key = cfg?.configData ? (() => { try { return JSON.parse(cfg.configData).apiKey; } catch { return null; } })() : null;
        setApiKeyConfigured(!!(key && String(key).trim()));
      })
      .catch(() => setApiKeyConfigured(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 已接入的 MCP 服务器（从工具名前缀 mcp__<server>__ 提取），作为过滤细分项
  const mcpServers = useMemo(() => {
    const set = new Set<string>();
    list.forEach((item) => {
      if (item.toolName && item.toolName.startsWith('mcp__')) {
        const parts = item.toolName.split('__');
        if (parts.length >= 3) set.add(parts[1]);
      }
    });
    return Array.from(set).sort();
  }, [list]);

  // 按分组过滤（多选）：组级 common/workflow/mcp + 服务器级 mcp:<name>
  const filteredList = useMemo(() => {
    if (groupFilter.length === 0) return list; // 未选 = 全部
    return list.filter((item) =>
      groupFilter.some((v) => {
        if (v === 'mcp') return item.toolGroup === 'mcp';
        if (v.startsWith('mcp:')) return (item.toolName || '').startsWith(`mcp__${v.slice(4)}__`);
        return item.toolGroup === v;
      }),
    );
  }, [list, groupFilter]);

  const openEdit = (item: ToolDefItem) => {
    setForm({
      ...item,
      parameters: jsonStringify(item.parameters),
    });
    setModalVisible(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.toolName) {
      Toast.warning('请填写 toolName');
      return;
    }
    const parsedParams = tryParseJson(form.parameters as any);
    if (form.parameters && parsedParams === null) {
      Toast.error('parameters 不是合法的 JSON');
      return;
    }
    setSaving(true);
    try {
      await agentApi.saveToolDefinition({
        ...form,
        parameters: parsedParams || {},
      });
      Toast.success('保存成功');
      setModalVisible(false);
      void load();
    } catch (e) {
      Toast.error(`保存失败: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  /** MCP 工具的来源徽标：mcp__server__tool → server */
  const sourceOf = (toolName: string): string | null => {
    if (!toolName || !toolName.startsWith('mcp__')) return null;
    const parts = toolName.split('__');
    return parts.length >= 3 ? parts[1] : 'mcp';
  };

  const toggleEnabled = async (item: ToolDefItem) => {
    // web_search 未配密钥就开启：给出配置入口提示（不阻止，调用时会得到可读指引）
    if (item.toolName === 'web_search' && !item.enabled && !apiKeyConfigured) {
      Toast.warning('web_search 需要 Tavily API Key（操作列「配置」），未配置时调用会返回开启指引');
    }
    try {
      await agentApi.setToolDefinitionEnabled(item.toolName, !item.enabled);
      setList((prev) => prev.map((x) => (x.toolName === item.toolName ? { ...x, enabled: !item.enabled } : x)));
    } catch (e) {
      Toast.error(`启停失败: ${(e as Error).message}`);
    }
  };

  const openKeyConfig = () => {
    setApiKeyValue('');
    setKeyVisible(true);
  };

  const saveApiKey = async () => {
    const key = apiKeyValue.trim();
    if (!key) {
      Toast.warning('请填写 Tavily API Key');
      return;
    }
    setSavingKey(true);
    try {
      await agentApi.saveConfig({
        configType: 'tool_config',
        configKey: 'tool:web_search',
        title: 'web_search · Tavily',
        configData: JSON.stringify({ apiKey: key }),
      });
      Toast.success('密钥已保存，立即生效（工具开关仍需开启才可用）');
      setKeyVisible(false);
      setApiKeyConfigured(true);
    } catch (e) {
      Toast.error(`保存失败: ${(e as Error).message}`);
    } finally {
      setSavingKey(false);
    }
  };

  const columns: ColumnProps<ToolDefItem>[] = [
    { title: 'ToolName', dataIndex: 'toolName', key: 'toolName', width: 260 },
    { title: '分组', dataIndex: 'toolGroup', key: 'toolGroup', width: 90 },
    {
      title: '来源',
      key: 'source',
      width: 110,
      render: (_text: any, record: ToolDefItem) => {
        const src = sourceOf(record.toolName);
        return src ? (
          <Tag size="small" color="violet">{src}</Tag>
        ) : (
          <Tag size="small" color="grey">内置</Tag>
        );
      },
    },
    { title: '描述', dataIndex: 'description', key: 'description', width: 220, ellipsis: true },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (val: boolean, record: ToolDefItem) => (
        <Switch checked={!!val} onChange={() => void toggleEnabled(record)} />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_text: any, record: ToolDefItem) => (
        <span style={{ display: 'inline-flex', gap: 4 }}>
          {record.toolName === 'web_search' && (
            <Button size="small" theme="borderless" style={{ color: apiKeyConfigured ? 'var(--g-success, #1f9d61)' : 'var(--g-warn, #c98a0a)' }} onClick={openKeyConfig}>
              配置{apiKeyConfigured ? '✓' : ''}
            </Button>
          )}
          <Button size="small" theme="borderless" style={{ color: ACCENT }} onClick={() => openEdit(record)}>
            编辑
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* MCP 服务器小节：外部工具来源（连接后工具自动进入下方目录） */}
      <McpServerSection onToolsChanged={() => void load()} />

      {/* 工具栏：分组多选过滤（含 MCP 服务器细分）+ 刷新 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#666', flexShrink: 0 }}>{t('agent.config.filterGroup')}：</span>
        <Select
          multiple
          value={groupFilter}
          onChange={(v) => setGroupFilter((v as string[]) || [])}
          style={{ width: 340 }}
          placeholder="全部"
          maxTagCount={3}
          optionList={[
            { value: 'common', label: '公共工具 (common)' },
            { value: 'workflow', label: '工作流工具 (workflow)' },
            ...(mcpServers.length > 0 ? [{ value: 'mcp', label: 'MCP 工具（全部）' }] : []),
            ...mcpServers.map((s) => ({ value: `mcp:${s}`, label: `MCP · ${s}` })),
          ]}
        />
        <Button onClick={() => void load()}>{t('agent.config.refresh')}</Button>
        <span style={{ fontSize: 12, color: '#aaa', marginLeft: 'auto' }}>
          共 {filteredList.length} 个工具{filteredList.length !== list.length ? ` / 总 ${list.length}` : ''}
        </span>
      </div>

      <Table
        columns={columns}
        dataSource={filteredList}
        rowKey="toolName"
        loading={loading}
        pagination={false}
      />

      {/* 编辑弹窗（仅编辑策略/启用等，不可新建） */}
      <Modal
        title="编辑工具定义"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={680}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>ToolName</Typography.Text>
            <Input
              value={form.toolName}
              disabled
              style={{ marginTop: 6 }}
            />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>ToolGroup</Typography.Text>
            <Input
              value={form.toolGroup}
              disabled
              style={{ marginTop: 6 }}
            />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>{t('common.description')}</Typography.Text>
            <Input
              value={form.description}
              disabled
              style={{ marginTop: 6 }}
            />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>Parameters (JSON)</Typography.Text>
            <TextArea
              value={form.parameters as any}
              onChange={(v) => setForm({ ...form, parameters: v })}
              autosize={{ minRows: 5, maxRows: 14 }}
              style={{ marginTop: 6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>{t('common.enabled')}</Typography.Text>
            <Switch
              checked={!!form.enabled}
              onChange={(v) => setForm({ ...form, enabled: v })}
            />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>{t('common.sort')}</Typography.Text>
            <Input
              value={String(form.sortOrder ?? 0)}
              onChange={(v) => setForm({ ...form, sortOrder: Number(v) || 0 })}
              style={{ marginTop: 6, width: 120 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setModalVisible(false)}>{t('common.cancel')}</Button>
            <Button theme="solid" style={{ background: ACCENT }} loading={saving} onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
      </Modal>

      {/* web_search · Tavily API Key 配置（存 agent_config，保存即生效） */}
      <Modal
        title="web_search · Tavily API Key"
        visible={keyVisible}
        onCancel={() => setKeyVisible(false)}
        footer={null}
        width={480}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12.5, color: 'var(--g-text-muted, #666)', lineHeight: 1.7 }}>
            密钥保存到数据库（agent_config），立即生效；也兼容服务端环境变量 TAVILY_API_KEY（库配置优先）。
            获取密钥：<a href="https://app.tavily.com" target="_blank" rel="noreferrer">app.tavily.com</a>
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>API Key</Typography.Text>
            <Input
              mode="password"
              value={apiKeyValue}
              onChange={(v) => setApiKeyValue(v)}
              placeholder={apiKeyConfigured ? '已配置（输入以覆盖）' : 'tvly-…'}
              style={{ marginTop: 6 }}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--g-text-muted)' }}>
            当前状态：{apiKeyConfigured ? '✓ 已配置' : '未配置 —— web_search 默认关闭，配置后请在列表中开启'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setKeyVisible(false)}>{t('common.cancel')}</Button>
            <Button theme="solid" style={{ background: ACCENT }} loading={savingKey} onClick={() => void saveApiKey()}>
              保存
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const ACCENT = 'var(--g-accent)';

/* ---------------- Helpers ---------------- */


const tryParseJson = (raw?: string): any => {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
};


/**
 * AI 生成：调用配置中心一次性 LLM 补全端点，返回生成的内容文本。
 */

/* ---------------- Shared AI generation modal ---------------- */



/* ================================================================
 * ConfigItem — 配置项共享类型（被 PromptEditorTab 等使用）
 * ================================================================ */


/* ================================================================
 * ToolDefinitionTab — 工具定义（系统内置，仅展示与按分组过滤，支持编辑策略/启用）
 * ================================================================ */



/* ================================================================
 * ModelConfigTab — LLM 模型配置（apiHost / apiKey / model 等）
 * ================================================================ */

/** 方舟托管（Managed Agents）连接配置：provider_config:ark */
interface ArkConfigForm {
  baseUrl: string;
  apiKey: string;
  environmentId: string;
  defaultAgentId: string;
  defaultModelId: string;
}

const DEFAULT_ARK_CONFIG: ArkConfigForm = {
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: '',
  environmentId: '',
  defaultAgentId: '',
  defaultModelId: '',
};

const ARK_CONFIG_KEY = 'provider_config:ark';
const AS_SERVICE_CONFIG_KEY = 'provider_config:as-service';
/** 默认执行引擎配置键（与后端 AgentProviderConfigService.DEFAULT_ENGINE_CONFIG_KEY 对应） */
const ENGINE_CONFIG_KEY = 'agent.engine.default';

interface EngineConfigForm {
  mode: 'local' | 'ark' | 'as-service';
}

const DEFAULT_ENGINE_CONFIG: EngineConfigForm = { mode: 'local' };

interface AsServiceConfigForm {
  baseUrl: string;
  apiKey: string;
  adminUsername: string;
  adminPassword: string;
  tenant: string;
  namespace: string;
  mcpPublicUrl: string;
  model: string;
}

const DEFAULT_AS_SERVICE_CONFIG: AsServiceConfigForm = {
  baseUrl: 'http://localhost:18080',
  apiKey: '',
  adminUsername: 'admin',
  adminPassword: '',
  tenant: 'default',
  namespace: 'default',
  mcpPublicUrl: 'http://host.docker.internal:48080',
  model: 'dashscope:qwen-max',
};

type EngineMode = 'local' | 'ark' | 'as-service';

/** 引擎卡片元信息：名称 / 定位标签 / 描述 / 文档链接（2026-10-17 布局优化） */
interface EngineCardMeta {
  mode: EngineMode;
  name: string;
  tag: string;
  tagColor: 'violet' | 'blue' | 'teal';
  desc: string;
  hint?: string;
  link?: { href: string; label: string };
}

const ENGINE_CARDS: EngineCardMeta[] = [
  {
    mode: 'local',
    name: '自研引擎',
    tag: '本地编排',
    tagColor: 'violet',
    desc: '内置 Harness ReAct 循环在本地编排；模型条目在下方「模型管理」配置，支持多模型、会话级切换、思考档位与健康账本，无需外部依赖。',
    hint: '模型在下方「模型管理」维护',
  },
  {
    mode: 'ark',
    name: '火山方舟托管',
    tag: '云端托管',
    tagColor: 'blue',
    desc: '对话循环由火山方舟 Managed Agents 托管；首次运行自动创建远端 Agent，并把本地 8 个工具同步为 Custom Tool。',
    link: { href: 'https://docs.volcengine.com/docs/ark/quick-start?lang=zh', label: '方舟官方文档' },
  },
  {
    mode: 'as-service',
    name: 'AgentScope Service',
    tag: '自托管',
    tagColor: 'teal',
    desc: '对话循环由自托管 AgentScope Runtime Service 托管；工具经 MCP 端点回连本地执行，画布变更实时推送前端。',
    link: { href: 'https://runtime.agentscope.io', label: 'AgentScope 文档' },
  },
];

interface ModelConfigTabProps {
  /** 已保存生效的引擎（来自 listModels().engineMode），用于「当前生效」标记 */
  savedEngine: EngineMode;
  /** 引擎切换保存成功后回调，父组件据此刷新生效引擎 */
  onEngineSaved?: () => void;
  /** 前端点选（草稿）变化回调：模型管理区跟随点选即时显隐 */
  onDraftModeChange?: (mode: EngineMode) => void;
}

const ModelConfigTab: React.FC<ModelConfigTabProps> = ({ savedEngine, onEngineSaved, onDraftModeChange }) => {
  useLanguage();
  const [loading, setLoading] = useState(false);
  const [arkForm, setArkForm] = useState<ArkConfigForm>(DEFAULT_ARK_CONFIG);
  const [savingArk, setSavingArk] = useState(false);
  const [asServiceForm, setAsServiceForm] = useState<AsServiceConfigForm>(DEFAULT_AS_SERVICE_CONFIG);
  const [savingAsService, setSavingAsService] = useState(false);
  const [engineForm, setEngineForm] = useState<EngineConfigForm>(DEFAULT_ENGINE_CONFIG);
  const [savingEngine, setSavingEngine] = useState(false);

  /** 点选/回填引擎草稿的唯一入口：同步通知父组件，联动下方模型管理区显隐 */
  const applyMode = useCallback((mode: EngineMode) => {
    setEngineForm({ mode });
    onDraftModeChange?.(mode);
  }, [onDraftModeChange]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [arkData, asServiceData, engineData] = await Promise.all([
        agentApi.listConfigs('provider_config'),
        agentApi.listConfigs('provider_config'),
        agentApi.listConfigs('engine_config'),
      ]);
      const arkItem = (arkData || []).find((c: any) => c.configKey === ARK_CONFIG_KEY);
      if (arkItem) {
        const parsed = tryParseJson(arkItem.configData) || {};
        setArkForm({
          baseUrl: parsed.baseUrl ?? DEFAULT_ARK_CONFIG.baseUrl,
          apiKey: parsed.apiKey ?? '',
          environmentId: parsed.environmentId ?? '',
          defaultAgentId: parsed.defaultAgentId ?? '',
          defaultModelId: parsed.defaultModelId ?? '',
        });
      }
      const asServiceItem = (asServiceData || []).find((c: any) => c.configKey === AS_SERVICE_CONFIG_KEY);
      if (asServiceItem) {
        const parsed = tryParseJson(asServiceItem.configData) || {};
        setAsServiceForm({
          baseUrl: parsed.baseUrl ?? DEFAULT_AS_SERVICE_CONFIG.baseUrl,
          apiKey: parsed.apiKey ?? '',
          adminUsername: parsed.adminUsername ?? DEFAULT_AS_SERVICE_CONFIG.adminUsername,
          adminPassword: parsed.adminPassword ?? '',
          tenant: parsed.tenant ?? DEFAULT_AS_SERVICE_CONFIG.tenant,
          namespace: parsed.namespace ?? DEFAULT_AS_SERVICE_CONFIG.namespace,
          mcpPublicUrl: parsed.mcpPublicUrl ?? DEFAULT_AS_SERVICE_CONFIG.mcpPublicUrl,
          model: parsed.model ?? DEFAULT_AS_SERVICE_CONFIG.model,
        });
      }
      const engineItem = (engineData || []).find((c: any) => c.configKey === ENGINE_CONFIG_KEY);
      if (engineItem) {
        const parsed = tryParseJson(engineItem.configData) || {};
        applyMode(parsed.mode === 'ark' ? 'ark' : parsed.mode === 'as-service' ? 'as-service' : 'local');
      }
    } catch (e) {
      Toast.error(`加载失败: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [applyMode]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 方舟配置校验：走自动同步（defaultAgentId 为空）时，defaultModelId 必填 —— 方舟创建 Agent 必须指定模型 */
  const validateArkModelRequired = useCallback((): boolean => {
    const arkTouched = !!(arkForm.apiKey || arkForm.environmentId);
    if (arkTouched && !arkForm.defaultAgentId && !arkForm.defaultModelId) {
      Toast.warning({
        content: '「默认模型 ID」为必填：自动创建方舟 Agent 时必须指定模型（如 deepseek-v4-1-flash-260910）；'
          + '仅当填写「默认方舟 Agent ID」手动绑定时可留空',
        duration: 6,
      });
      return false;
    }
    return true;
  }, [arkForm.apiKey, arkForm.environmentId, arkForm.defaultAgentId, arkForm.defaultModelId]);

  const handleSaveArk = useCallback(async () => {
    if (!validateArkModelRequired()) return;
    setSavingArk(true);
    try {
      await agentApi.saveConfig(
        {
          configKey: ARK_CONFIG_KEY,
          configType: 'provider_config',
          title: '火山方舟 Managed Agents 连接配置',
          configData: JSON.stringify(arkForm),
        },
        true,
      );
      Toast.success('保存成功，方舟托管配置即时生效');
    } catch (e) {
      Toast.error(`保存失败: ${(e as Error).message}`);
    } finally {
      setSavingArk(false);
    }
  }, [arkForm]);

  const handleSaveAsService = useCallback(async () => {
    if (!asServiceForm.apiKey || !asServiceForm.adminPassword) {
      Toast.warning({
        content: '请填写应用 API Key（数据面凭据）与管理面密码（按会话自动同步托管 Agent 用）',
        duration: 5,
      });
      return;
    }
    setSavingAsService(true);
    try {
      await agentApi.saveConfig(
        {
          configKey: AS_SERVICE_CONFIG_KEY,
          configType: 'provider_config',
          title: 'AgentScope Service 自托管连接配置',
          configData: JSON.stringify(asServiceForm),
        },
        true,
      );
      Toast.success('保存成功，AgentScope Service 配置即时生效');
    } catch (e) {
      Toast.error(`保存失败: ${(e as Error).message}`);
    } finally {
      setSavingAsService(false);
    }
  }, [asServiceForm]);

  const handleSaveEngine = useCallback(async () => {
    if (engineForm.mode === 'ark' && (!arkForm.apiKey || !arkForm.environmentId)) {
      Toast.warning({
        content: '请先完善下方「火山方舟托管」的 apiKey 与 environmentId，再切换默认引擎为方舟',
        duration: 5,
      });
      return;
    }
    if (engineForm.mode === 'ark' && !validateArkModelRequired()) return;
    if (engineForm.mode === 'as-service' && (!asServiceForm.apiKey || !asServiceForm.adminPassword)) {
      Toast.warning({
        content: '请先完善下方「AgentScope Service」的 API Key 与管理面密码，再切换默认引擎',
        duration: 5,
      });
      return;
    }
    setSavingEngine(true);
    try {
      await agentApi.saveConfig(
        {
          configKey: ENGINE_CONFIG_KEY,
          configType: 'engine_config',
          title: '默认执行引擎',
          configData: JSON.stringify(engineForm),
        },
        true,
      );
      Toast.success(
        engineForm.mode === 'ark'
          ? '已切换为方舟托管：新会话将走火山方舟（存量会话保持原引擎）'
          : engineForm.mode === 'as-service'
            ? '已切换为 AgentScope Service 托管：新会话将走自托管 Service（存量会话保持原引擎）'
            : '已切换为自研引擎：新会话将走本地编排',
      );
      onEngineSaved?.();
    } catch (e) {
      Toast.error(`保存失败: ${(e as Error).message}`);
    } finally {
      setSavingEngine(false);
    }
  }, [engineForm, arkForm.apiKey, arkForm.environmentId, validateArkModelRequired, asServiceForm.apiKey, asServiceForm.adminPassword, onEngineSaved]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div>
      {/* 默认执行引擎：三列卡片选择，描述与文档链接直接可见（2026-10-17 布局优化） */}
      <Typography.Title heading={5} style={{ marginBottom: 4 }}>
        默认执行引擎
      </Typography.Title>
      <Typography.Text type="tertiary" style={{ fontSize: 12.5, display: 'block' }}>
        为新会话选择执行引擎，保存即时生效；存量会话保持创建时的引擎
      </Typography.Text>
      <div
        role="radiogroup"
        aria-label="默认执行引擎"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 14 }}
      >
        {ENGINE_CARDS.map((card) => {
          const selected = engineForm.mode === card.mode;
          return (
            <div
              key={card.mode}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onClick={() => applyMode(card.mode)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  applyMode(card.mode);
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '14px 16px 12px',
                background: selected ? 'rgba(77, 83, 232, 0.04)' : 'transparent',
                border: selected ? '1px solid var(--g-accent, #4d53e8)' : '1px solid #e8e8ea',
                borderRadius: 10,
                boxShadow: selected ? 'inset 0 0 0 1px var(--g-accent, #4d53e8)' : 'none',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: selected ? '1.5px solid var(--g-accent, #4d53e8)' : '1.5px solid #c6c9d0',
                    background: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selected && (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--g-accent, #4d53e8)' }} />
                  )}
                </span>
                <Typography.Text strong style={{ fontSize: 14 }}>
                  {card.name}
                </Typography.Text>
                <Tag size="small" color={card.tagColor}>
                  {card.tag}
                </Tag>
                {savedEngine === card.mode && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      flexShrink: 0,
                      fontSize: 11,
                      lineHeight: '18px',
                      padding: '0 8px',
                      borderRadius: 999,
                      color: 'var(--g-accent, #4d53e8)',
                      background: 'rgba(77, 83, 232, 0.07)',
                      border: '1px solid rgba(77, 83, 232, 0.28)',
                    }}
                  >
                    当前生效
                  </span>
                )}
              </div>
              <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.7, color: '#5c6168' }}>{card.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 20 }}>
                {card.hint ? (
                  <Typography.Text type="quaternary" style={{ fontSize: 12 }}>
                    {card.hint}
                  </Typography.Text>
                ) : (
                  <span />
                )}
                {card.link && (
                  <a
                    href={card.link.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--g-accent, #4d53e8)',
                      textDecoration: 'none',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                  >
                    <IconHelpCircle size="small" />
                    {card.link.label}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {engineForm.mode === 'ark' && (!arkForm.apiKey || !arkForm.environmentId || (!arkForm.defaultModelId && !arkForm.defaultAgentId)) && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 13px',
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: 8,
            fontSize: 12.5,
            color: '#d46b08',
          }}
        >
          方舟配置未完整：{!arkForm.apiKey || !arkForm.environmentId ? 'apiKey / environmentId ' : ''}
          {!arkForm.defaultModelId && !arkForm.defaultAgentId ? '默认模型 ID' : ''} 缺失，
          请在下方「火山方舟托管」分区补全后再切换。
        </div>
      )}
      {engineForm.mode === 'as-service' && (!asServiceForm.apiKey || !asServiceForm.adminPassword) && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 13px',
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: 8,
            fontSize: 12.5,
            color: '#d46b08',
          }}
        >
          AgentScope Service 配置未完整：{!asServiceForm.apiKey ? '应用 API Key ' : ''}
          {!asServiceForm.adminPassword ? '管理面密码 ' : ''}缺失，
          请在下方「AgentScope Service」分区补全后再切换。
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <Button theme="solid" style={{ background: ACCENT }} loading={savingEngine} onClick={handleSaveEngine}>
          保存引擎切换
        </Button>
      </div>

      {/* 自研引擎无需连接配置：模型条目由下方「模型管理」承载（条目缺失时服务端用内置默认模型兜底） */}
      {engineForm.mode === 'local' && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px dashed #e8e8ea' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 13px',
              background: '#f7f8fa',
              border: '1px solid #ececf1',
              borderRadius: 8,
              fontSize: 12.5,
              color: '#6b7078',
            }}
          >
            <IconInfoCircle size="small" style={{ color: 'var(--g-accent, #4d53e8)', flexShrink: 0 }} />
            <span>自研引擎无需连接配置：模型条目在下方「模型管理」维护，未配置时使用内置默认模型。</span>
          </div>
        </div>
      )}

      {/* 方舟托管（Managed Agents）配置分区：仅选中方舟引擎时显示 */}
      {engineForm.mode === 'ark' && (
      <div
        style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px dashed #e8e8ea',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Typography.Title heading={5} style={{ marginBottom: 4 }}>
            火山方舟托管（Managed Agents）
          </Typography.Title>
          <a
            href="https://docs.volcengine.com/docs/ark/quick-start?lang=zh"
            target="_blank"
            rel="noreferrer"
            title="火山方舟 Managed Agents 官方帮助文档"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--g-accent, #4d53e8)',
              textDecoration: 'none',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            <IconHelpCircle size="small" />
            方舟托管帮助文档
          </a>
        </div>
        <Typography.Text type="tertiary" style={{ fontSize: 12.5, display: 'block' }}>
          engine=ark 的 Agent（内置 ark-assistant）由方舟托管对话循环；配置完整并保存引擎切换后，新会话走方舟托管。
        </Typography.Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16, maxWidth: 660 }}>
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>Base URL</Typography.Text>
            <Input
              value={arkForm.baseUrl}
              onChange={(v) => setArkForm({ ...arkForm, baseUrl: v })}
              placeholder="https://ark.cn-beijing.volces.com/api/v3"
              style={{ marginTop: 6 }}
            />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>API Key</Typography.Text>
            <Input
              value={arkForm.apiKey}
              onChange={(v) => setArkForm({ ...arkForm, apiKey: v })}
              placeholder="方舟 API Key（ark-...）"
              style={{ marginTop: 6 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Typography.Text strong style={{ fontSize: 13 }}>Environment ID</Typography.Text>
              <Input
                value={arkForm.environmentId}
                onChange={(v) => setArkForm({ ...arkForm, environmentId: v })}
                placeholder="env-2026...-xxxx（方舟控制台 → Environments）"
                style={{ marginTop: 6 }}
              />
            </div>
            <div>
              <Typography.Text strong style={{ fontSize: 13 }}>默认方舟 Agent ID</Typography.Text>
              <Input
                value={arkForm.defaultAgentId}
                onChange={(v) => setArkForm({ ...arkForm, defaultAgentId: v })}
                placeholder="agent-2026...-xxxx（留空 = 自动创建远端 Agent）"
                style={{ marginTop: 6 }}
              />
            </div>
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>
              {arkForm.defaultAgentId ? '默认模型 ID（手动绑定时可选）' : (
                <span>默认模型 ID<span style={{ color: '#f54a45' }}> *</span></span>
              )}
            </Typography.Text>
            <Input
              value={arkForm.defaultModelId}
              onChange={(v) => setArkForm({ ...arkForm, defaultModelId: v })}
              placeholder="deepseek-v4-1-flash-260910"
              validateStatus={!arkForm.defaultAgentId && !arkForm.defaultModelId ? 'error' : 'default'}
              style={{ marginTop: 6 }}
            />
            <Typography.Text type="tertiary" style={{ fontSize: 11 }}>
              自动创建方舟 Agent 时必填（用你账号已开通的模型 ID）；填了「默认方舟 Agent ID」手动绑定时可留空。
            </Typography.Text>
          </div>
          <div
            style={{
              padding: 12,
              background: '#f9f0ff',
              border: '1px solid #d3adf7',
              borderRadius: 8,
              fontSize: 12,
              color: '#531dab',
            }}
          >
            无需在方舟控制台手动创建 Agent：engine=ark 的 Agent 首次运行时会自动在方舟创建远端资源，
            并把本地 8 个工具（get / node / edge / run / test_case / skill / ask_user / todo_write）声明为 Custom Tool，
            定义变更时自动带版本号同步。若你在「默认方舟 Agent ID」填入自己创建的 agent-...，则视为手动绑定，系统不再改动它。
          </div>
          <div>
            <Button theme="solid" style={{ background: ACCENT }} loading={savingArk} onClick={handleSaveArk}>
              保存方舟配置
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* AgentScope Service（自托管）配置分区：仅选中 as-service 引擎时显示 */}
      {engineForm.mode === 'as-service' && (
      <div
        style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px dashed #e8e8ea',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <Typography.Title heading={5} style={{ marginBottom: 4 }}>
              AgentScope Service（自托管）
            </Typography.Title>
            <Typography.Text type="tertiary" style={{ fontSize: 12.5, display: 'block' }}>
              engine=as-service 的 Agent（内置 as-service-assistant）由自托管 Service 托管对话循环；
              模型走 dataplane 的 DashScope 协议扩展（可指向官方端点或协议适配器）。
            </Typography.Text>
          </div>
          <a
            href="https://runtime.agentscope.io"
            target="_blank"
            rel="noreferrer"
            title="AgentScope Runtime 官方文档"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--g-accent, #4d53e8)',
              textDecoration: 'none',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            <IconHelpCircle size="small" />
            AgentScope Runtime 文档
          </a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16, maxWidth: 660 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Typography.Text strong style={{ fontSize: 13 }}>Base URL</Typography.Text>
              <Input
                value={asServiceForm.baseUrl}
                onChange={(v) => setAsServiceForm({ ...asServiceForm, baseUrl: v })}
                placeholder="http://localhost:18080"
                style={{ marginTop: 6 }}
              />
            </div>
            <div>
              <Typography.Text strong style={{ fontSize: 13 }}>应用 API Key</Typography.Text>
              <Input
                value={asServiceForm.apiKey}
                onChange={(v) => setAsServiceForm({ ...asServiceForm, apiKey: v })}
                placeholder="ass_...（scopes 含 invoke/read/interact）"
                style={{ marginTop: 6 }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Typography.Text strong style={{ fontSize: 13 }}>管理面账号</Typography.Text>
              <Input
                value={asServiceForm.adminUsername}
                onChange={(v) => setAsServiceForm({ ...asServiceForm, adminUsername: v })}
                placeholder="admin"
                style={{ marginTop: 6 }}
              />
            </div>
            <div>
              <Typography.Text strong style={{ fontSize: 13 }}>管理面密码</Typography.Text>
              <Input
                value={asServiceForm.adminPassword}
                onChange={(v) => setAsServiceForm({ ...asServiceForm, adminPassword: v })}
                placeholder="Service 控制台 admin 密码（.env CONTROL_PLANE_BOOTSTRAP_PASSWORD）"
                style={{ marginTop: 6 }}
              />
              <Typography.Text type="tertiary" style={{ fontSize: 11 }}>
                用于按会话自动在 Service 创建托管 Agent，无需手工建 Agent。
              </Typography.Text>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Typography.Text strong style={{ fontSize: 13 }}>MCP 回连基址</Typography.Text>
              <Input
                value={asServiceForm.mcpPublicUrl}
                onChange={(v) => setAsServiceForm({ ...asServiceForm, mcpPublicUrl: v })}
                placeholder="http://host.docker.internal:48080"
                style={{ marginTop: 6 }}
              />
              <Typography.Text type="tertiary" style={{ fontSize: 11 }}>
                Service 数据面容器回连本服务 MCP 端点的地址（Docker Desktop 用 host.docker.internal）。
              </Typography.Text>
            </div>
            <div>
              <Typography.Text strong style={{ fontSize: 13 }}>模型（ModelRegistry 串）</Typography.Text>
              <Input
                value={asServiceForm.model}
                onChange={(v) => setAsServiceForm({ ...asServiceForm, model: v })}
                placeholder="dashscope:qwen-max"
                style={{ marginTop: 6 }}
              />
              <Typography.Text type="tertiary" style={{ fontSize: 11 }}>
                provider:model 形态；base URL 由 Service .env 的 DASHSCOPE_BASE_URL 决定。
              </Typography.Text>
            </div>
          </div>
          <div
            style={{
              padding: 12,
              background: '#f9f0ff',
              border: '1px solid #d3adf7',
              borderRadius: 8,
              fontSize: 12,
              color: '#531dab',
            }}
          >
            无需在 Service 控制台手动创建 Agent：engine=as-service 的会话首次运行时会按会话自动创建
            托管 Agent（工具经 MCP 端点 /mcp/gaia/&#123;sessionKey&#125; 回连本地执行，画布变更实时推前端）。
          </div>
          <div>
            <Button theme="solid" style={{ background: ACCENT }} loading={savingAsService} onClick={handleSaveAsService}>
              保存 AgentScope Service 配置
            </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

/* ================================================================
 * Main page
 * ================================================================ */

export const AgentConfigManagement: React.FC = () => {
  useLanguage();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const text = await agentApi.exportConfig();
      // 触发浏览器下载
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      a.download = `agent-config-export-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Toast.success('导出成功');
    } catch (e) {
      Toast.error(`导出失败: ${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 重置 input 以便相同文件可再次选择
    e.target.value = '';
    setImporting(true);
    try {
      const text = await file.text();
      // 简单校验是否为合法 JSON
      try {
        JSON.parse(text);
      } catch {
        Toast.error('文件不是合法的 JSON');
        return;
      }
      const result = await agentApi.importConfig(text);
      const parts: string[] = [];
      if (result && typeof result === 'object') {
        for (const [k, v] of Object.entries(result)) {
          parts.push(`${k}: ${v}`);
        }
      }
      Toast.success(`导入成功${parts.length ? `（${parts.join('，')}）` : ''}`);
    } catch (e) {
      Toast.error(`导入失败: ${(e as Error).message}`);
    } finally {
      setImporting(false);
    }
  }, []);

  return (
    <div style={{ background: 'var(--g-bg-raised)', borderRadius: 8, padding: 20, minHeight: 'calc(100vh - 120px)' }}>
      <Tabs
        type="line"
        tabBarExtraContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
            <Button loading={exporting} onClick={() => void handleExport()}>
              {t('agent.config.export')}
            </Button>
            <Button theme="solid" style={{ background: ACCENT }} loading={importing} onClick={handleImportClick}>
              {t('agent.config.import')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => void handleFileChange(e)}
            />
          </div>
        }
      >
        <TabPane tab={t('agent.config.tabModel')} itemKey="model">
          <ModelTabContent />
        </TabPane>
        <TabPane tab="Agent 指令" itemKey="persona">
          <PersonaTabContent />
        </TabPane>
        <TabPane tab="技能库" itemKey="skills">
          <SkillLibraryEditor />
        </TabPane>
        <TabPane tab="工具定义" itemKey="tools">
          <ToolDefinitionTab />
        </TabPane>
      </Tabs>
    </div>
  );
};

/**
 * 模型配置 tab 内容：引擎选择先行（自研/方舟/AgentScope Service）。
 * 模型管理区跟随「前端点选」的引擎即时显隐：选中自研引擎才渲染；
 * 方舟/Service 的模型由远端管理，不渲染任何占位（2026-10-17 反馈）。
 */
const ModelTabContent: React.FC = () => {
  const [engineMode, setEngineMode] = useState<'local' | 'ark' | 'as-service'>('local');
  /** 前端点选的引擎草稿（未保存也即时联动模型管理区） */
  const [draftMode, setDraftMode] = useState<'local' | 'ark' | 'as-service'>('local');

  const reloadEngine = useCallback(async () => {
    try {
      const r = await agentApi.listModels();
      setEngineMode(r.engineMode === 'ark' ? 'ark' : r.engineMode === 'as-service' ? 'as-service' : 'local');
    } catch {
      // 拉取失败保持当前值，避免「当前生效」标记闪烁
    }
  }, []);

  useEffect(() => { void reloadEngine(); }, [reloadEngine]);

  return (
    <>
      {/* 引擎选择 + 该引擎所需的连接配置（llm 兜底 / 方舟三要素 / Service 连接） */}
      <ModelConfigTab
        savedEngine={engineMode}
        onEngineSaved={() => void reloadEngine()}
        onDraftModeChange={setDraftMode}
      />
      {draftMode === 'local' && (
        <div style={{ marginTop: 28, borderTop: '1px solid #ececf1', paddingTop: 22 }}>
          <ModelManagement />
        </div>
      )}
    </>
  );
};

export default AgentConfigManagement;


/**
 * Agent 指令 tab（2026-10-17 期4）：IDENTITY / SOUL / AGENTS / COMPACTION 四个配置文件的编辑。
 * 数据面 /api/admin/agent-config/prompt；保存即版本自增，清空内容=恢复 classpath 默认。
 *
 * 布局（2026-10-17 展示优化）：
 * - 去掉状态行与「xxx.md」文件名标题栏，元信息收敛进工具栏（覆盖时显示「自定义 vN」Tag）。
 * - 左右两栏共享同一个外层滚动容器：预览与 autosize 编辑器各自铺满内容自然高度，
 *   一根滚动条同时滚两边（修复 Semi TextArea 被 wrapper 包裹导致 flex:1 失效、
 *   内容只显示 rows=4 的截断问题）。
 * - 未保存保护：dirty 检测（保存按钮 disabled 联动）、切换/恢复默认前弹确认。
 */
const PersonaTabContent: React.FC = () => {
  useLanguage();
  const [configs, setConfigs] = useState<Record<string, { key: string; title: string; content: string; overridden: boolean; version: number }>>({});
  const [activeKey, setActiveKey] = useState<string>('identity');
  const [draft, setDraft] = useState<string>('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const editorBoxRef = useRef<HTMLDivElement | null>(null);

  const stripComments = (text: string) => text.replace(/<!--[\s\S]*?-->\n?/g, '');

  /** 编辑器撑高到内容自然高度（Semi 自带 autosize 测高偏小，这里手动保证 scrollHeight 全展示） */
  const fitEditorHeight = useCallback(() => {
    const el = editorBoxRef.current?.querySelector('textarea');
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // 无依赖数组：外层 Semi Tabs 的隐藏面板（display:none）里量高为 0，
  // 每次提交后重算才能在面板激活时得到正确高度；输入草稿变化也靠它触发
  useEffect(() => {
    fitEditorHeight();
  });

  useEffect(() => {
    const el = editorBoxRef.current?.querySelector('textarea');
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => fitEditorHeight());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitEditorHeight]);

  const fetchConfigs = useCallback(async () => {
    const res = await fetch(`${getApiBaseUrl()}/admin/agent-config/prompt`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchConfigs();
        if (cancelled) return;
        setConfigs(data);
        setDraft(stripComments(data['identity']?.content || ''));
        setLoaded(true);
      } catch (e) {
        Toast.error(`加载失败: ${(e as Error).message}`);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchConfigs]);

  const current = configs[activeKey];
  /** 草稿相对服务端内容有无改动（初始加载完成前视为无改动） */
  const dirty = loaded && draft !== stripComments(current?.content ?? '');

  /** 只提交内容到服务端；不触碰本地草稿 */
  const persist = useCallback(async (content: string): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/agent-config/prompt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: activeKey, content }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) { Toast.error(data.error || '保存失败'); return false; }
      return true;
    } catch (e) { Toast.error(`保存失败: ${(e as Error).message}`); return false; }
    finally { setSaving(false); }
  }, [activeKey]);

  const handleSave = useCallback(async () => {
    if (!dirty || !(await persist(draft))) return;
    Toast.success('已保存，全部引擎即时生效');
    try { setConfigs(await fetchConfigs()); } catch { /* 版本号刷新失败不影响保存结果 */ }
  }, [dirty, draft, persist, fetchConfigs]);

  const handleRestoreDefault = useCallback(() => {
    Modal.confirm({
      title: '恢复系统默认？',
      content: '当前自定义内容将被清除，恢复为内置默认提示词。',
      okText: '恢复默认',
      onOk: async () => {
        // 必须显式提交空串：setDraft 是异步的，不能依赖闭包里的 draft
        if (await persist('')) {
          try {
            const data = await fetchConfigs();
            setConfigs(data);
            setDraft(stripComments(data[activeKey]?.content || ''));
            Toast.success('已恢复系统默认');
          } catch (e) { Toast.error(`刷新失败: ${(e as Error).message}`); }
        }
      },
    });
  }, [persist, fetchConfigs, activeKey]);

  const doSwitch = useCallback((key: string) => {
    setActiveKey(key);
    setDraft(stripComments(configs[key]?.content || ''));
    scrollRef.current?.scrollTo({ top: 0 });
  }, [configs]);

  const switchKey = useCallback((key: string) => {
    if (key === activeKey) return;
    if (dirty) {
      Modal.confirm({
        title: '有未保存的修改',
        content: '切换后将丢弃当前未保存的修改。',
        okText: '丢弃并切换',
        onOk: () => doSwitch(key),
      });
    } else {
      doSwitch(key);
    }
  }, [activeKey, dirty, doSwitch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 176px)', minHeight: 480 }}>
      {/* 工具栏：radio + 状态 Tag + 操作按钮，一行 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 10px 0', flexShrink: 0 }}>
        <Radio.Group type='button' buttonSize='small' value={activeKey} onChange={e => switchKey(e.target.value)}>
          <Radio value="identity">IDENTITY</Radio>
          <Radio value="soul">SOUL</Radio>
          <Radio value="agents">AGENTS</Radio>
          <Radio value="compaction">COMPACTION</Radio>
        </Radio.Group>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {current?.overridden && (
            <Tag size="small" color="amber">自定义 v{current.version}</Tag>
          )}
          <Button size="small" theme="light" onClick={() => setShowPreview(v => !v)}>
            {showPreview ? '纯编辑' : '双栏'}
          </Button>
          {current?.overridden && (
            <Button size="small" onClick={handleRestoreDefault}>恢复默认</Button>
          )}
          <Button
            size="small"
            theme="solid"
            disabled={!dirty}
            loading={saving}
            // 仅 dirty 时给主题色：disabled 阶段不能带内联背景，否则盖住 Semi 的置灰样式、看起来像可点
            style={dirty ? { background: ACCENT } : undefined}
            onClick={() => void handleSave()}
          >
            保存
          </Button>
        </div>
      </div>
      {/* 双栏共享外层滚动：一根滚动条同时滚预览与编辑器，两侧内容始终完整展示。
          必须 flex-start：stretch 会把两栏压成容器高度，长内容会溢出/被裁剪 */}
      <div
        ref={scrollRef}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', gap: 12, alignItems: 'flex-start' }}
      >
        {showPreview && (
          <div style={{
            flex: 1, minWidth: 0,
            border: '1px solid #e0e0ee', borderRadius: 8, padding: '16px 20px', background: '#fafbfc',
          }}>
            <MarkdownRender raw={draft} />
          </div>
        )}
        <div ref={editorBoxRef} style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          border: '1px solid #d8d8ea', borderRadius: 8, overflow: 'hidden',
        }}>
          <TextArea
            style={{
              border: 'none', borderRadius: 0, resize: 'none', overflow: 'hidden',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
              fontSize: 12.5, lineHeight: 1.65, padding: 12,
            }}
            value={draft}
            onChange={setDraft}
          />
        </div>
      </div>
    </div>
  );
};
