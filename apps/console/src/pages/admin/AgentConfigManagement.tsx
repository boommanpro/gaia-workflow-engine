/**
 * AgentConfigManagement — Agent 配置中心
 * 3 个 Tab：模型配置 / 提示词 & 知识库 / 工具定义
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Tabs,
  TabPane,
  Table,
  Button,
  Modal,
  Input,
  TextArea,
  Select,
  Tag,
  Spin,
  Toast,
  Switch,
  Typography,
  Radio,
  RadioGroup,
} from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { IconHelpCircle } from '@douyinfe/semi-icons';
import { agentApi } from '../../agent/api';
import { t, useLanguage } from '../../i18n';

const ACCENT = 'var(--g-accent)';

/* ---------------- Helpers ---------------- */

const formatDateTime = (iso?: string | number): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const tryParseJson = (raw?: string): any => {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
};

const jsonStringify = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
};

/**
 * AI 生成：调用配置中心一次性 LLM 补全端点，返回生成的内容文本。
 */
async function generateWithAI(prompt: string): Promise<string> {
  const result = await agentApi.generateContent(prompt);
  return result?.content || '';
}

/* ---------------- Shared AI generation modal ---------------- */

interface AiGenModalProps {
  visible: boolean;
  onClose: () => void;
  defaultPrompt: string;
  onApply: (content: string) => void;
}

const AiGenModal: React.FC<AiGenModalProps> = ({ visible, onClose, defaultPrompt, onApply }) => {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    if (visible) {
      setPrompt(defaultPrompt);
      setResult('');
      setGenerating(false);
    }
  }, [visible, defaultPrompt]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      Toast.warning('请输入生成提示词');
      return;
    }
    setGenerating(true);
    setResult('');
    try {
      const content = await generateWithAI(prompt);
      setResult(content);
      if (!content) {
        Toast.warning('生成内容为空');
      }
    } catch (e) {
      Toast.error(`生成失败: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }, [prompt]);

  const handleApply = useCallback(() => {
    if (!result.trim()) {
      Toast.warning('没有可应用的内容');
      return;
    }
    onApply(result);
    onClose();
  }, [result, onApply, onClose]);

  return (
    <Modal
      title="AI 生成"
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={680}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>{t('agent.config.generatePrompt')}</Typography.Text>
          <TextArea
            value={prompt}
            onChange={(v) => setPrompt(v)}
            autosize={{ minRows: 3, maxRows: 6 }}
            placeholder="描述你希望生成的内容…"
            style={{ marginTop: 6 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            theme="solid"
            style={{ background: ACCENT }}
            loading={generating}
            onClick={handleGenerate}
          >
            生成
          </Button>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
        </div>
        {generating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 13 }}>
            <Spin /> {t('agent.config.generating')}
          </div>
        )}
        {result && (
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>{t('agent.config.generateResult')}</Typography.Text>
            <TextArea
              value={result}
              onChange={(v) => setResult(v)}
              autosize={{ minRows: 6, maxRows: 16 }}
              style={{ marginTop: 6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
            />
          </div>
        )}
        {result && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button theme="solid" style={{ background: ACCENT }} onClick={handleApply}>
              应用到表单
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

/* ================================================================
 * ConfigItem — 配置项共享类型（被 PromptEditorTab 等使用）
 * ================================================================ */

interface ConfigItem {
  id?: number;
  configKey: string;
  configType?: string;
  title?: string;
  content?: string;
  description?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  /** RAG 知识块专用字段 */
  source?: string;
  metadata?: any;
  language?: string;
}

/* ================================================================
 * ToolDefinitionTab — 工具定义（系统内置，仅展示与按分组过滤，支持编辑策略/启用）
 * ================================================================ */

interface ToolDefItem {
  id?: number;
  toolName: string;
  toolGroup?: string;
  description?: string;
  parameters?: any;
  pageContexts?: any;
  enabled?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

const ToolDefinitionTab: React.FC = () => {
  useLanguage();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<ToolDefItem[]>([]);
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<ToolDefItem>({
    toolName: '',
    toolGroup: '',
    description: '',
    parameters: '',
    pageContexts: '',
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 提取所有分组（去重）
  const groups = useMemo(() => {
    const set = new Set<string>();
    list.forEach((item) => {
      if (item.toolGroup) set.add(item.toolGroup);
    });
    return Array.from(set).sort();
  }, [list]);

  // 按分组过滤
  const filteredList = useMemo(() => {
    if (!groupFilter) return list;
    return list.filter((item) => item.toolGroup === groupFilter);
  }, [list, groupFilter]);

  const openEdit = (item: ToolDefItem) => {
    setForm({
      ...item,
      parameters: jsonStringify(item.parameters),
      pageContexts: jsonStringify(item.pageContexts),
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
    const parsedContexts = tryParseJson(form.pageContexts as any);
    if (form.pageContexts && parsedContexts === null) {
      Toast.error('pageContexts 不是合法的 JSON 数组');
      return;
    }
    setSaving(true);
    try {
      await agentApi.saveToolDefinition({
        ...form,
        parameters: parsedParams || {},
        pageContexts: Array.isArray(parsedContexts) ? parsedContexts : [],
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

  const columns: ColumnProps<ToolDefItem>[] = [
    { title: 'ToolName', dataIndex: 'toolName', key: 'toolName', width: 180 },
    { title: '分组', dataIndex: 'toolGroup', key: 'toolGroup', width: 100 },
    { title: '描述', dataIndex: 'description', key: 'description', width: 240 },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (val: boolean) => (val ? <Tag color="green" size="small">{t('common.enabled')}</Tag> : <Tag color="grey" size="small">{t('common.disabled')}</Tag>),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_text: any, record: ToolDefItem) => (
        <Button size="small" theme="borderless" style={{ color: ACCENT }} onClick={() => openEdit(record)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* 工具栏：仅分组过滤 + 刷新 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#666', flexShrink: 0 }}>{t('agent.config.filterGroup')}：</span>
        <Select
          value={groupFilter || undefined}
          onChange={(v) => setGroupFilter(v as string || '')}
          style={{ width: 180 }}
          placeholder={t('agent.config.allGroups')}
          optionList={[
            { value: '', label: t('agent.config.allGroups') },
            ...groups.map((g) => ({ value: g, label: g })),
          ]}
        />
        <Button onClick={() => void load()}>{t('agent.config.refresh')}</Button>
        <span style={{ fontSize: 12, color: '#aaa', marginLeft: 'auto' }}>
          共 {filteredList.length} 个工具
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
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>PageContexts (JSON array)</Typography.Text>
            <TextArea
              value={form.pageContexts as any}
              onChange={(v) => setForm({ ...form, pageContexts: v })}
              autosize={{ minRows: 2, maxRows: 6 }}
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
    </div>
  );
};

/* ================================================================
 * ModelConfigTab — LLM 模型配置（apiHost / apiKey / model 等）
 * ================================================================ */

interface ModelConfigForm {
  apiHost: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
}

const DEFAULT_MODEL_CONFIG: ModelConfigForm = {
  apiHost: '',
  apiKey: '',
  model: '',
  temperature: 0.7,
  maxTokens: 4096,
  contextWindow: 8192,
};

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
/** 默认执行引擎配置键（与后端 AgentProviderConfigService.DEFAULT_ENGINE_CONFIG_KEY 对应） */
const ENGINE_CONFIG_KEY = 'agent.engine.default';

interface EngineConfigForm {
  mode: 'local' | 'ark';
}

const DEFAULT_ENGINE_CONFIG: EngineConfigForm = { mode: 'local' };

const ModelConfigTab: React.FC = () => {
  useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ModelConfigForm>(DEFAULT_MODEL_CONFIG);
  const [arkForm, setArkForm] = useState<ArkConfigForm>(DEFAULT_ARK_CONFIG);
  const [savingArk, setSavingArk] = useState(false);
  const [engineForm, setEngineForm] = useState<EngineConfigForm>(DEFAULT_ENGINE_CONFIG);
  const [savingEngine, setSavingEngine] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [llmData, arkData, engineData] = await Promise.all([
        agentApi.listConfigs('llm_config'),
        agentApi.listConfigs('provider_config'),
        agentApi.listConfigs('engine_config'),
      ]);
      const llmItem = (llmData || [])[0];
      if (llmItem) {
        const parsed = tryParseJson(llmItem.configData) || {};
        setForm({
          apiHost: parsed.apiHost ?? '',
          apiKey: parsed.apiKey ?? '',
          model: parsed.model ?? '',
          temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0.7,
          maxTokens: typeof parsed.maxTokens === 'number' ? parsed.maxTokens : 4096,
          contextWindow: typeof parsed.contextWindow === 'number' ? parsed.contextWindow : 8192,
        });
      }
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
      const engineItem = (engineData || []).find((c: any) => c.configKey === ENGINE_CONFIG_KEY);
      if (engineItem) {
        const parsed = tryParseJson(engineItem.configData) || {};
        setEngineForm({ mode: parsed.mode === 'ark' ? 'ark' : 'local' });
      }
    } catch (e) {
      Toast.error(`加载失败: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await agentApi.saveConfig(
        {
          configKey: 'llm_config',
          configType: 'llm_config',
          title: 'LLM 模型配置',
          configData: JSON.stringify(form),
        },
        true,
      );
      Toast.success('保存成功');
    } catch (e) {
      Toast.error(`保存失败: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [form]);

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

  const handleSaveEngine = useCallback(async () => {
    if (engineForm.mode === 'ark' && (!arkForm.apiKey || !arkForm.environmentId)) {
      Toast.warning({
        content: '请先完善下方「火山方舟托管」的 apiKey 与 environmentId，再切换默认引擎为方舟',
        duration: 5,
      });
      return;
    }
    if (engineForm.mode === 'ark' && !validateArkModelRequired()) return;
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
          : '已切换为自研引擎：新会话将走本地编排',
      );
    } catch (e) {
      Toast.error(`保存失败: ${(e as Error).message}`);
    } finally {
      setSavingEngine(false);
    }
  }, [engineForm, arkForm.apiKey, arkForm.environmentId, validateArkModelRequired]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {/* 默认执行引擎切换（管理端全局开关：自研 / 方舟托管） */}
      <div
        style={{
          padding: 14,
          border: '1px solid #e8e8ea',
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <Typography.Title heading={5} style={{ marginBottom: 2 }}>
          默认执行引擎
        </Typography.Title>
        <Typography.Text type="tertiary" style={{ fontSize: 11 }}>
          先选择引擎，下方只显示该引擎需要的配置；保存即时生效，存量会话保持创建时的引擎。
        </Typography.Text>
        <RadioGroup
          type="card"
          value={engineForm.mode}
          onChange={(e) => setEngineForm({ mode: e.target.value as 'local' | 'ark' })}
          style={{ marginTop: 12, width: '100%' }}
        >
          <Radio value="local" style={{ width: '50%' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Typography.Text strong style={{ fontSize: 13 }}>自研引擎</Typography.Text>
              <Typography.Text type="tertiary" style={{ fontSize: 11 }}>
                需配置 OpenAI 兼容端点（apiHost / apiKey / 模型）
              </Typography.Text>
            </div>
          </Radio>
          <Radio value="ark" style={{ width: '50%' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Typography.Text strong style={{ fontSize: 13 }}>方舟托管</Typography.Text>
              <Typography.Text type="tertiary" style={{ fontSize: 11 }}>
                需配置火山方舟 apiKey / environmentId；首次运行自动创建远端 Agent 并同步工具
              </Typography.Text>
            </div>
          </Radio>
        </RadioGroup>
        {engineForm.mode === 'ark' && (!arkForm.apiKey || !arkForm.environmentId || (!arkForm.defaultModelId && !arkForm.defaultAgentId)) && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              background: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: 6,
              fontSize: 12,
              color: '#d46b08',
            }}
          >
            方舟配置未完整：{!arkForm.apiKey || !arkForm.environmentId ? 'apiKey / environmentId ' : ''}
            {!arkForm.defaultModelId && !arkForm.defaultAgentId ? '默认模型 ID' : ''} 缺失，
            请在下方「火山方舟托管」分区补全后再切换。
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <Button theme="solid" style={{ background: ACCENT }} loading={savingEngine} onClick={handleSaveEngine}>
            保存引擎切换
          </Button>
        </div>
      </div>

      {engineForm.mode === 'local' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
        <Typography.Title heading={5} style={{ marginBottom: 0 }}>
          自研引擎（本地模型）
        </Typography.Title>
        <Typography.Text type="tertiary" style={{ fontSize: 11 }}>
          OpenAI 兼容端点直连：推理循环与工具执行都在本地服务。
        </Typography.Text>
        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>{t('agent.config.modelHost')}</Typography.Text>
          <Input
            value={form.apiHost}
            onChange={(v) => setForm({ ...form, apiHost: v })}
            placeholder="https://api.openai.com/v1"
            style={{ marginTop: 6 }}
          />
        </div>
        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>{t('agent.config.modelKey')}</Typography.Text>
          <Input
            value={form.apiKey}
            onChange={(v) => setForm({ ...form, apiKey: v })}
            placeholder="sk-..."
            style={{ marginTop: 6 }}
          />
        </div>
        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>{t('agent.config.modelName')}</Typography.Text>
          <Input
            value={form.model}
            onChange={(v) => setForm({ ...form, model: v })}
            placeholder="gpt-4o / claude-3-opus / ..."
            style={{ marginTop: 6 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>{t('agent.config.modelTemp')}</Typography.Text>
            <Input
              value={String(form.temperature)}
              onChange={(v) => setForm({ ...form, temperature: Number(v) || 0 })}
              style={{ marginTop: 6 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>{t('agent.config.modelMaxTokens')}</Typography.Text>
            <Input
              value={String(form.maxTokens)}
              onChange={(v) => setForm({ ...form, maxTokens: Number(v) || 0 })}
              style={{ marginTop: 6 }}
            />
          </div>
        </div>
        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>{t('agent.config.modelContextWindow')}</Typography.Text>
          <Input
            value={String(form.contextWindow)}
            onChange={(v) => setForm({ ...form, contextWindow: Number(v) || 0 })}
            style={{ marginTop: 6 }}
          />
        </div>
        <div
          style={{
            padding: 12,
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: 8,
            fontSize: 12,
            color: '#d46b08',
          }}
        >
          {t('agent.config.modelNote')}
        </div>
        <div>
          <Button theme="solid" style={{ background: ACCENT }} loading={saving} onClick={handleSave}>
            {t('agent.config.modelSave')}
          </Button>
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
          maxWidth: 640,
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
        <Typography.Text type="tertiary" style={{ fontSize: 11 }}>
          engine=ark 的 Agent（内置 ark-assistant）由方舟托管对话循环；配置完整并保存引擎切换后，新会话走方舟托管。
        </Typography.Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
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
              placeholder="agent-2026...-xxxx（留空则不启用方舟默认引擎）"
              style={{ marginTop: 6 }}
            />
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
            并把本地 13 个 v2 工具（读 / edit_workflow / run_workflow / 落版三件套 / todo_write）声明为 Custom Tool，
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
    </div>
  );
};

/* ================================================================
 * PromptEditorTab — 提示词 & 知识库（VSCode 风格编辑器）
 * ================================================================ */

const PROMPT_EDITOR_BG = '#1e1e2e';
const PROMPT_EDITOR_SIDEBAR_BG = '#252526';
const PROMPT_EDITOR_TEXT = '#cccccc';
const PROMPT_EDITOR_ACTIVE_BG = '#37373d';

const SidebarGroup: React.FC<{
  title: string;
  items: ConfigItem[];
  selectedKey: string;
  onSelect: (item: ConfigItem) => void;
  onCreate?: () => void;
  onRename?: (item: ConfigItem) => void;
  onDelete?: (item: ConfigItem) => void;
}> = ({ title, items, selectedKey, onSelect, onCreate, onRename, onDelete }) => {
  return (
    <div>
      <div
        style={{
          padding: '8px 12px 4px',
          fontSize: 11,
          color: '#888',
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>📁 {title}</span>
        {onCreate && (
          <button
            onClick={onCreate}
            title="新建"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: 14,
              padding: '0 4px',
              lineHeight: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; }}
          >
            +
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '4px 12px 8px 24px', fontSize: 12, color: '#666', fontStyle: 'italic' }}>
          （空）
        </div>
      ) : (
        items.map((item) => {
          const active = item.configKey === selectedKey;
          return (
            <div
              key={item.configKey}
              onClick={() => onSelect(item)}
              title={item.configKey}
              style={{
                padding: '6px 12px 6px 24px',
                fontSize: 13,
                cursor: 'pointer',
                background: active ? PROMPT_EDITOR_ACTIVE_BG : 'transparent',
                color: active ? '#fff' : PROMPT_EDITOR_TEXT,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                borderLeft: active ? '2px solid #4d53e8' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                {item.title || item.configKey}
              </span>
              {item.configKey?.endsWith('.en') && (
                <span style={{ fontSize: 9, color: '#4d53e8', flexShrink: 0, marginLeft: 2 }}>
                  EN
                </span>
              )}
              {active && (onRename || onDelete) && (
                <span style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 4 }}>
                  {onRename && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRename(item); }}
                      title="重命名"
                      style={{
                        background: 'transparent', border: 'none', color: '#888',
                        cursor: 'pointer', fontSize: 11, padding: '0 2px',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; }}
                    >
                      ✎
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                      title="删除"
                      style={{
                        background: 'transparent', border: 'none', color: '#888',
                        cursor: 'pointer', fontSize: 11, padding: '0 2px',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; }}
                    >
                      ✕
                    </button>
                  )}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

const PromptEditorTab: React.FC = () => {
  const lang = useLanguage();
  const [loading, setLoading] = useState(false);
  const [promptList, setPromptList] = useState<ConfigItem[]>([]);
  const [knowledgeList, setKnowledgeList] = useState<ConfigItem[]>([]);
  const [ragList, setRagList] = useState<ConfigItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyKey, setHistoryKey] = useState('');
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);
  // RAG 工具栏状态
  const [aiVisible, setAiVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prompts, knowledge, rags] = await Promise.all([
        agentApi.listConfigs('system_prompt'),
        agentApi.listConfigs('node_knowledge'),
        agentApi.listKnowledge(),
      ]);
      setPromptList(prompts || []);
      setKnowledgeList(knowledge || []);
      // 将 RAG 知识块转换为 ConfigItem 格式以便统一管理
      const ragItems: ConfigItem[] = (rags || []).map((r: any) => ({
        id: r.id,
        configKey: `rag_${r.id}`,
        configType: 'rag_chunk',
        title: r.title,
        content: r.content,
        source: r.source,
        metadata: r.metadata,
        language: r.language || 'zh',
      }));
      setRagList(ragItems);
    } catch (e) {
      Toast.error(`加载失败: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 按当前系统语言过滤：en 显示 .en 后缀的条目，zh 显示无后缀的条目
  const filteredPrompts = useMemo(() => {
    return promptList.filter((item) =>
      lang === 'en' ? item.configKey?.endsWith('.en') : !item.configKey?.endsWith('.en')
    );
  }, [promptList, lang]);

  const filteredKnowledge = useMemo(() => {
    return knowledgeList.filter((item) =>
      lang === 'en' ? item.configKey?.endsWith('.en') : !item.configKey?.endsWith('.en')
    );
  }, [knowledgeList, lang]);

  // RAG 知识块按 language 字段过滤
  const filteredRag = useMemo(() => {
    const langCode = lang === 'en' ? 'en' : 'zh';
    return ragList.filter((item) => (item.language || 'zh') === langCode);
  }, [ragList, lang]);

  // 语言切换时，如果当前选中的条目不属于当前语言，自动选中第一个匹配条目
  useEffect(() => {
    const allFiltered = [...filteredPrompts, ...filteredKnowledge, ...filteredRag];
    if (allFiltered.length === 0) {
      setSelectedKey('');
      setEditContent('');
      return;
    }
    const currentBelongsToLang = allFiltered.some((item) => item.configKey === selectedKey);
    if (!currentBelongsToLang) {
      const first = filteredPrompts[0] || filteredKnowledge[0] || filteredRag[0];
      if (first) {
        setSelectedKey(first.configKey);
        setEditContent(first.content || '');
      }
    }
  }, [lang, filteredPrompts, filteredKnowledge, filteredRag, selectedKey]);

  // 列表加载完成后，自动选中第一个项目
  useEffect(() => {
    if (!selectedKey && (filteredPrompts.length > 0 || filteredKnowledge.length > 0 || filteredRag.length > 0)) {
      const first = filteredPrompts[0] || filteredKnowledge[0] || filteredRag[0];
      if (first) {
        setSelectedKey(first.configKey);
        setEditContent(first.content || '');
      }
    }
  }, [selectedKey, filteredPrompts, filteredKnowledge, filteredRag]);

  const selectedItem = useMemo(() => {
    return [...filteredPrompts, ...filteredKnowledge, ...filteredRag].find((item) => item.configKey === selectedKey);
  }, [filteredPrompts, filteredKnowledge, filteredRag, selectedKey]);

  const handleSelect = useCallback((item: ConfigItem) => {
    setSelectedKey(item.configKey);
    setEditContent(item.content || '');
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      if (selectedItem.configType === 'rag_chunk') {
        // RAG 知识块走 knowledge API
        await agentApi.saveKnowledge({
          id: selectedItem.id,
          title: selectedItem.title || '',
          content: editContent,
          source: selectedItem.source || '',
          metadata: selectedItem.metadata || {},
          language: selectedItem.language || (lang === 'en' ? 'en' : 'zh'),
        });
        Toast.success('保存成功');
      } else {
        await agentApi.saveConfig({
          ...selectedItem,
          content: editContent,
        });
        Toast.success(t('agent.config.savedAsVersion'));
      }
      void load();
    } catch (e) {
      Toast.error(`保存失败: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [selectedItem, editContent, load, lang]);

  const openHistory = useCallback(async () => {
    if (!selectedItem) return;
    setHistoryKey(selectedItem.configKey);
    setHistoryVisible(true);
    setHistoryLoading(true);
    setHistoryList([]);
    try {
      const data = await agentApi.getConfigHistory(selectedItem.configKey);
      setHistoryList(data || []);
    } catch (e) {
      Toast.error(`加载历史失败: ${(e as Error).message}`);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedItem]);

  const handleRevert = useCallback(async (version: number) => {
    try {
      await agentApi.revertConfig(historyKey, version);
      Toast.success(t('agent.config.appliedEffective'));
      setHistoryVisible(false);
      void load();
    } catch (e) {
      Toast.error(`${t('agent.config.applyFailed')}: ${(e as Error).message}`);
    }
  }, [historyKey, load, t]);

  // 新建配置项
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createType, setCreateType] = useState<'system_prompt' | 'node_knowledge' | 'rag_chunk'>('system_prompt');
  const [createForm, setCreateForm] = useState({ configKey: '', title: '', content: '' });

  const openCreate = useCallback((type: 'system_prompt' | 'node_knowledge' | 'rag_chunk') => {
    setCreateType(type);
    setCreateForm({ configKey: '', title: '', content: '' });
    setCreateModalVisible(true);
  }, []);

  const handleCreate = useCallback(async () => {
    if (createType === 'rag_chunk') {
      if (!createForm.title) {
        Toast.warning('请填写标题');
        return;
      }
      try {
        await agentApi.saveKnowledge({
          title: createForm.title,
          content: createForm.content,
          source: 'manual',
          metadata: {},
          language: lang === 'en' ? 'en' : 'zh',
        });
        Toast.success('创建成功');
        setCreateModalVisible(false);
        void load();
      } catch (e) {
        Toast.error(`创建失败: ${(e as Error).message}`);
      }
      return;
    }
    if (!createForm.configKey) {
      Toast.warning('请填写 configKey');
      return;
    }
    try {
      await agentApi.saveConfig({
        configKey: createForm.configKey,
        configType: createType,
        title: createForm.title || createForm.configKey,
        content: createForm.content,
      });
      Toast.success('创建成功');
      setCreateModalVisible(false);
      void load();
      setSelectedKey(createForm.configKey);
    } catch (e) {
      Toast.error(`创建失败: ${(e as Error).message}`);
    }
  }, [createForm, createType, load, lang]);

  // 重命名
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameItem, setRenameItem] = useState<ConfigItem | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  const openRename = useCallback((item: ConfigItem) => {
    setRenameItem(item);
    setRenameTitle(item.title || '');
    setRenameVisible(true);
  }, []);

  const handleRename = useCallback(async () => {
    if (!renameItem) return;
    try {
      if (renameItem.configType === 'rag_chunk') {
        await agentApi.saveKnowledge({
          id: renameItem.id,
          title: renameTitle,
          content: renameItem.content,
          source: renameItem.source || '',
          metadata: renameItem.metadata || {},
          language: renameItem.language || (lang === 'en' ? 'en' : 'zh'),
        });
      } else {
        await agentApi.saveConfig(
          {
            ...renameItem,
            title: renameTitle,
          },
          true,
        );
      }
      Toast.success('重命名成功');
      setRenameVisible(false);
      void load();
    } catch (e) {
      Toast.error(`重命名失败: ${(e as Error).message}`);
    }
  }, [renameItem, renameTitle, load, lang]);

  // 删除
  const handleDelete = useCallback((item: ConfigItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除「${item.title || item.configKey}」吗？此操作不可恢复。`,
      onOk: async () => {
        try {
          if (item.configType === 'rag_chunk' && item.id) {
            await agentApi.deleteKnowledge(item.id);
          } else {
            await agentApi.deleteConfig(item.configKey);
          }
          Toast.success('删除成功');
          if (selectedKey === item.configKey) {
            setSelectedKey('');
            setEditContent('');
          }
          void load();
        } catch (e) {
          Toast.error(`删除失败: ${(e as Error).message}`);
        }
      },
    });
  }, [selectedKey, load]);

  const handleEditorScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  const lineCount = useMemo(() => Math.max(editContent.split('\n').length, 1), [editContent]);

  // RAG: 检索预览
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      Toast.warning('请输入检索内容');
      return;
    }
    setSearching(true);
    setSearchResults([]);
    try {
      const data = await agentApi.searchKnowledge(searchQuery, 5, lang === 'en' ? 'en' : 'zh');
      setSearchResults(data || []);
    } catch (e) {
      Toast.error(`检索失败: ${(e as Error).message}`);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, lang]);

  const totalCount = promptList.length + knowledgeList.length + ragList.length;

  return (
    <div>
      {/* 顶部工具栏：AI 生成 / 检索预览 / 刷新 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <Button theme="solid" style={{ background: ACCENT }} onClick={() => setAiVisible(true)}>
          {t('agent.config.aiGenerate')}
        </Button>
        <Button onClick={() => setSearchVisible(true)}>{t('agent.config.retrievalPreview')}</Button>
        <Button onClick={() => void load()}>{t('agent.config.refresh')}</Button>
        <span style={{ fontSize: 12, color: '#aaa', marginLeft: 'auto' }}>
          {t('agent.config.promptGroup')}: {filteredPrompts.length} / {t('agent.config.knowledgeGroup')}: {filteredKnowledge.length} / {t('agent.config.ragKnowledgeGroup')}: {filteredRag.length}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : totalCount === 0 ? (
        <div style={{ color: '#999', padding: 24, textAlign: 'center' }}>
          暂无配置项，请先创建 system_prompt、node_knowledge 或 RAG 知识块
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            height: 'calc(100vh - 300px)',
            minHeight: 440,
            border: '1px solid #333',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {/* 左侧文件树 */}
          <div
            style={{
              width: 220,
              background: PROMPT_EDITOR_SIDEBAR_BG,
              color: PROMPT_EDITOR_TEXT,
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            <SidebarGroup
              title={t('agent.config.promptGroup')}
              items={filteredPrompts}
              selectedKey={selectedKey}
              onSelect={handleSelect}
              onCreate={() => openCreate('system_prompt')}
              onRename={openRename}
              onDelete={handleDelete}
            />
            <SidebarGroup
              title={t('agent.config.knowledgeGroup')}
              items={filteredKnowledge}
              selectedKey={selectedKey}
              onSelect={handleSelect}
              onCreate={() => openCreate('node_knowledge')}
              onRename={openRename}
              onDelete={handleDelete}
            />
            <SidebarGroup
              title={t('agent.config.ragKnowledgeGroup')}
              items={filteredRag}
              selectedKey={selectedKey}
              onSelect={handleSelect}
              onCreate={() => openCreate('rag_chunk')}
              onRename={openRename}
              onDelete={handleDelete}
            />
          </div>

          {/* 右侧编辑器 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: PROMPT_EDITOR_BG,
              minWidth: 0,
            }}
          >
            {/* 顶部条 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                borderBottom: '1px solid #333',
                background: PROMPT_EDITOR_SIDEBAR_BG,
                gap: 8,
              }}
            >
              <span style={{ color: PROMPT_EDITOR_TEXT, fontSize: 13, fontWeight: 500 }}>
                {selectedItem?.title || selectedItem?.configKey || '—'}
              </span>
              {selectedItem?.configType && (
                <Tag size="small" color="blue">
                  {selectedItem.configType}
                </Tag>
              )}
              {/* 语言标识（跟随系统语言，无需手动切换） */}
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 12,
                  color: '#888',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
              >
                {lang === 'en' ? 'en-US' : 'zh-CN'}
              </span>
              <Button
                theme="solid"
                size="small"
                style={{ background: ACCENT }}
                loading={saving}
                onClick={handleSave}
                disabled={!selectedItem}
              >
                {t('agent.config.save')}
              </Button>
            </div>

            {/* 编辑器主体 */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* 行号 */}
              <div
                ref={lineNumbersRef}
                style={{
                  padding: '12px 8px',
                  color: '#6e7681',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: 13,
                  lineHeight: '1.5',
                  textAlign: 'right',
                  userSelect: 'none',
                  background: PROMPT_EDITOR_BG,
                  overflow: 'hidden',
                  whiteSpace: 'pre',
                  minWidth: 48,
                }}
              >
                {Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')}
              </div>
              {/* 文本编辑区 */}
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onScroll={handleEditorScroll}
                spellCheck={false}
                style={{
                  flex: 1,
                  background: PROMPT_EDITOR_BG,
                  color: '#d4d4d4',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  padding: '12px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: 13,
                  lineHeight: '1.5',
                  overflow: 'auto',
                }}
              />
            </div>

            {/* 底部操作栏 */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: '8px 12px',
                borderTop: '1px solid #333',
                background: PROMPT_EDITOR_SIDEBAR_BG,
              }}
            >
              <Button
                theme="solid"
                style={{ background: ACCENT }}
                loading={saving}
                onClick={handleSave}
                disabled={!selectedItem}
              >
                {t('agent.config.save')}
              </Button>
              <Button onClick={openHistory} disabled={!selectedItem}>
                {t('agent.config.history')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 版本管理 modal */}
      <Modal
        title={`${t('agent.config.versionManage')} — ${historyKey}`}
        visible={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        footer={null}
        width={680}
      >
        <Typography.Text type="tertiary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          {t('agent.config.versionManageTip')}
        </Typography.Text>
        {historyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : historyList.length === 0 ? (
          <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>{t('agent.config.noHistory')}</div>
        ) : (
          <Table
            columns={[
              { title: t('agent.config.versionCol'), dataIndex: 'version', key: 'version', width: 80 },
              { title: t('common.title'), dataIndex: 'title', key: 'title', width: 160 },
              {
                title: t('agent.config.createdAt'),
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 170,
                render: (text: string) => formatDateTime(text),
              },
              {
                title: t('common.action'),
                key: 'action',
                width: 130,
                render: (_t: any, record: any) => (
                  <Button
                    size="small"
                    theme="borderless"
                    style={{ color: ACCENT }}
                    onClick={() => handleRevert(record.version)}
                  >
                    {t('agent.config.applyEffective')}
                  </Button>
                ),
              },
            ]}
            dataSource={historyList}
            rowKey="version"
            pagination={false}
          />
        )}
      </Modal>

      {/* 新建配置项 modal */}
      <Modal
        title={`新建 — ${createType === 'system_prompt' ? '系统提示词' : createType === 'node_knowledge' ? '节点知识库' : 'RAG 知识块'}`}
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {createType !== 'rag_chunk' && (
            <div>
              <Typography.Text strong style={{ fontSize: 13 }}>{t('agent.config.configKey')}</Typography.Text>
              <Input
                value={createForm.configKey}
                onChange={(v) => setCreateForm({ ...createForm, configKey: v })}
                placeholder={createType === 'system_prompt' ? '如 system_prompt.custom' : '如 node_custom'}
                style={{ marginTop: 6 }}
              />
            </div>
          )}
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>{t('common.title')}</Typography.Text>
            <Input
              value={createForm.title}
              onChange={(v) => setCreateForm({ ...createForm, title: v })}
              placeholder="显示名称"
              style={{ marginTop: 6 }}
            />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>{t('common.content')}</Typography.Text>
            <TextArea
              value={createForm.content}
              onChange={(v) => setCreateForm({ ...createForm, content: v })}
              autosize={{ minRows: 4, maxRows: 12 }}
              placeholder="提示词或知识文档内容…"
              style={{ marginTop: 6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateModalVisible(false)}>{t('common.cancel')}</Button>
            <Button theme="solid" style={{ background: ACCENT }} onClick={handleCreate}>
              创建
            </Button>
          </div>
        </div>
      </Modal>

      {/* 重命名 modal */}
      <Modal
        title="重命名"
        visible={renameVisible}
        onCancel={() => setRenameVisible(false)}
        footer={null}
        width={420}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>
              {renameItem?.configType === 'rag_chunk' ? t('common.title') : 'ConfigKey'}
            </Typography.Text>
            <Input
              value={renameItem?.configType === 'rag_chunk' ? (renameItem?.title || '') : (renameItem?.configKey || '')}
              disabled
              style={{ marginTop: 6 }}
            />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 13 }}>{t('agent.config.newTitle')}</Typography.Text>
            <Input
              value={renameTitle}
              onChange={(v) => setRenameTitle(v)}
              style={{ marginTop: 6 }}
              onEnterPress={() => void handleRename()}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setRenameVisible(false)}>{t('common.cancel')}</Button>
            <Button theme="solid" style={{ background: ACCENT }} onClick={handleRename}>
              确认
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI 生成 modal */}
      <AiGenModal
        visible={aiVisible}
        onClose={() => setAiVisible(false)}
        defaultPrompt="请生成一段 Agent 知识库文档内容，用于辅助工作流编辑器中的用户。内容应清晰、结构化，涵盖常见场景与最佳实践。"
        onApply={(content) => {
          // 生成完成后，打开新建 RAG 知识块弹窗并预填内容
          setCreateType('rag_chunk');
          setCreateForm({ configKey: '', title: '', content });
          setCreateModalVisible(true);
        }}
      />

      {/* 检索预览 modal */}
      <Modal
        title="检索预览"
        visible={searchVisible}
        onCancel={() => setSearchVisible(false)}
        footer={null}
        width={720}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Input
            value={searchQuery}
            onChange={(v) => setSearchQuery(v)}
            placeholder="输入检索内容…"
            style={{ flex: 1 }}
            onEnterPress={() => void handleSearch()}
          />
          <Button theme="solid" style={{ background: ACCENT }} loading={searching} onClick={() => void handleSearch()}>
            检索
          </Button>
        </div>
        {searching ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : searchResults.length === 0 ? (
          <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>{t('agent.config.noResult')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {searchResults.map((r, idx) => (
              <div
                key={r.id ?? idx}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.title || `#${idx + 1}`}</span>
                  {r.score !== undefined && (
                    <Tag color="blue" size="small">score: {Number(r.score).toFixed(3)}</Tag>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
                  {(r.content || '').slice(0, 300)}
                  {(r.content || '').length > 300 ? '…' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
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
          <ModelConfigTab />
        </TabPane>
        <TabPane tab={t('agent.config.tabPrompt')} itemKey="prompts">
          <PromptEditorTab />
        </TabPane>
        <TabPane tab={t('agent.config.tabTools')} itemKey="tools">
          <ToolDefinitionTab />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AgentConfigManagement;
