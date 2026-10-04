/**
 * AgentSettingsPanel —— 右栏紧凑版 Agent 设置。
 *
 * 只放与当前对话强相关的两项：模型配置 + 系统提示词。
 * 工具 / 知识图谱 / 权限这类宽表格仍留在完整配置页，这里给一个跳转入口。
 * 数据复用与 /admin/agent-config 完全相同的 agentApi，改完即时生效。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Spin, TextArea, Toast, Typography } from '@douyinfe/semi-ui';
import { IconExternalOpen } from '@douyinfe/semi-icons';

import { agentApi } from '../../agent/api';
import { CHAT } from '../../chat/theme';
import { useLanguage, t } from '../../i18n';

interface ModelForm {
  apiHost: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
}

const DEFAULT_MODEL: ModelForm = {
  apiHost: '',
  apiKey: '',
  model: '',
  temperature: 0.7,
  maxTokens: 4096,
  contextWindow: 8192,
};

const tryParseJson = (raw?: string): Record<string, unknown> | null => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <Typography.Text strong style={{ fontSize: 13 }}>
      {label}
    </Typography.Text>
    <div style={{ marginTop: 6 }}>{children}</div>
  </div>
);

export const AgentSettingsPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const lang = useLanguage();

  const [loading, setLoading] = useState(true);
  const [savingModel, setSavingModel] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [form, setForm] = useState<ModelForm>(DEFAULT_MODEL);
  const [promptKey, setPromptKey] = useState('');
  const [promptText, setPromptText] = useState('');
  const [basePromptText, setBasePromptText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [llmData, prompts] = await Promise.all([
        agentApi.listConfigs('llm_config'),
        agentApi.listConfigs('system_prompt'),
      ]);

      const llm = (llmData || [])[0];
      if (llm) {
        const parsed = tryParseJson(llm.configData) || {};
        setForm({
          apiHost: (parsed.apiHost as string) ?? '',
          apiKey: (parsed.apiKey as string) ?? '',
          model: (parsed.model as string) ?? '',
          temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0.7,
          maxTokens: typeof parsed.maxTokens === 'number' ? parsed.maxTokens : 4096,
          contextWindow: typeof parsed.contextWindow === 'number' ? parsed.contextWindow : 8192,
        });
      }

      const list = (prompts || []) as Array<{ configKey?: string; content?: string }>;
      const matched = list.find((item) =>
        lang === 'en' ? item.configKey?.endsWith('.en') : !item.configKey?.endsWith('.en')
      );
      if (matched) {
        setPromptKey(matched.configKey || '');
        setPromptText(matched.content || '');
        setBasePromptText(matched.content || '');
      }
    } catch (e) {
      Toast.error(`${t('agent.config.loadFailed')}: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveModel = useCallback(async () => {
    setSavingModel(true);
    try {
      await agentApi.saveConfig(
        {
          configKey: 'llm_config',
          configType: 'llm_config',
          title: 'LLM 模型配置',
          configData: JSON.stringify(form),
        },
        true
      );
      Toast.success(t('agent.config.saved'));
    } catch (e) {
      Toast.error(`${t('agent.config.saveFailed')}: ${(e as Error).message}`);
    } finally {
      setSavingModel(false);
    }
  }, [form]);

  const savePrompt = useCallback(async () => {
    if (!promptKey) return;
    setSavingPrompt(true);
    try {
      await agentApi.saveConfig({ configKey: promptKey, configType: 'system_prompt', content: promptText });
      setBasePromptText(promptText);
      Toast.success(t('agent.config.savedAsVersion'));
    } catch (e) {
      Toast.error(`${t('agent.config.saveFailed')}: ${(e as Error).message}`);
    } finally {
      setSavingPrompt(false);
    }
  }, [promptKey, promptText]);

  const num = (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: CHAT.bg,
      }}
    >
      <header
        style={{
          height: 44,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderBottom: `1px solid ${CHAT.lineSoft}`,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: CHAT.text }}>{t('shell.agentSettings')}</span>
        <span style={{ fontSize: 11, color: CHAT.textMuted }}>{t('shell.agentSettingsHint')}</span>
        <button
          type="button"
          onClick={onClose}
          title={t('shell.collapseRail')}
          style={{
            marginLeft: 'auto',
            border: 'none',
            background: 'transparent',
            color: CHAT.textMuted,
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>
      </header>

      <div className="chat-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ---------- 模型 ---------- */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: CHAT.textSub }}>
                {t('agent.config.tabModel')}
              </div>
              <Field label={t('agent.config.modelHost')}>
                <Input value={form.apiHost} onChange={(v) => setForm({ ...form, apiHost: v })} placeholder="https://api.openai.com/v1" />
              </Field>
              <Field label={t('agent.config.modelKey')}>
                <Input value={form.apiKey} onChange={(v) => setForm({ ...form, apiKey: v })} placeholder="sk-..." />
              </Field>
              <Field label={t('agent.config.modelName')}>
                <Input value={form.model} onChange={(v) => setForm({ ...form, model: v })} placeholder="gpt-4o / claude-3-opus / ..." />
              </Field>
              <Field label={t('agent.config.modelTemp')}>
                <Input
                  value={String(form.temperature)}
                  onChange={(v) => setForm({ ...form, temperature: num(v, form.temperature) })}
                />
              </Field>
              <Field label={t('agent.config.modelMaxTokens')}>
                <Input
                  value={String(form.maxTokens)}
                  onChange={(v) => setForm({ ...form, maxTokens: num(v, form.maxTokens) })}
                />
              </Field>
              <Field label={t('agent.config.modelContextWindow')}>
                <Input
                  value={String(form.contextWindow)}
                  onChange={(v) => setForm({ ...form, contextWindow: num(v, form.contextWindow) })}
                />
              </Field>
              <Button
                theme="solid"
                loading={savingModel}
                onClick={() => void saveModel()}
                style={{ borderRadius: 8, background: CHAT.accent, borderColor: CHAT.accent }}
                block
              >
                {t('agent.config.modelSave')}
              </Button>
              <div style={{ fontSize: 11.5, color: CHAT.textMuted, lineHeight: 1.5 }}>{t('agent.config.modelNote')}</div>
            </section>

            <div style={{ height: 1, background: CHAT.lineSoft }} />

            {/* ---------- 系统提示词 ---------- */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: CHAT.textSub }}>
                {t('agent.config.promptGroup')}
              </div>
              {promptKey ? (
                <>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: CHAT.textMuted }}>
                    {promptKey}
                  </div>
                  <TextArea
                    value={promptText}
                    onChange={(v) => setPromptText(v)}
                    autosize={{ minRows: 8, maxRows: 20 }}
                  />
                  <Button
                    theme="solid"
                    loading={savingPrompt}
                    disabled={promptText === basePromptText}
                    onClick={() => void savePrompt()}
                    style={{ borderRadius: 8, background: CHAT.accent, borderColor: CHAT.accent }}
                    block
                  >
                    {t('agent.config.save')}
                  </Button>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: CHAT.textMuted }}>{t('agent.config.noResult')}</div>
              )}
            </section>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, borderTop: `1px solid ${CHAT.lineSoft}`, padding: 10 }}>
        <button
          type="button"
          onClick={() => navigate('/manage/agent-config')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            border: `1px solid ${CHAT.line}`,
            background: 'var(--g-bg-raised)',
            borderRadius: 8,
            padding: '7px 10px',
            fontSize: 12.5,
            color: CHAT.textSub,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <IconExternalOpen size="small" />
          {t('shell.openFullConfig')}
        </button>
      </div>
    </div>
  );
};

export default AgentSettingsPanel;
