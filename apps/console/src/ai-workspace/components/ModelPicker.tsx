/**
 * 模型选择器（owb / ZCode 输入框右下角形态，2026-10-11）：
 * - 紧凑文字按钮（模型名 + ▾），放 ChatComposer 底部工具行（发送按钮左侧）
 * - 下拉分组：思考档位（全局）+ 模型列表（会话绑定 > 全局默认）+ 管理模型入口
 * - 能力判断在服务端（thinking-levels），不支持的档位灰置并给 note
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown } from '@douyinfe/semi-ui';
import { IconChevronDown } from '@douyinfe/semi-icons';
import { agentApi } from '../../agent/api';
import { useAgent } from '../../agent/AgentContext';
import { CHAT } from '../../chat/theme';

interface ModelEntry {
  id: number;
  displayName: string;
  vendor?: string;
  modelId?: string;
  active?: boolean;
  enabled?: boolean;
}

const THINKING_LABELS: Record<string, string> = {
  auto: '思考 · 默认',
  off: '思考 · 关闭',
  low: '思考 · 低',
  medium: '思考 · 中',
  high: '思考 · 高',
};

export const ModelPicker: React.FC = () => {
  const { currentSessionKey } = useAgent();
  const navigate = useNavigate();
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [sessionModelId, setSessionModelId] = useState<number | null>(null);
  const [activeModelId, setActiveModelId] = useState<number | null>(null);
  const [globalThinking, setGlobalThinking] = useState('auto');
  const [levels, setLevels] = useState<{ level: string; supported: boolean; note: string }[]>([]);
  const [visible, setVisible] = useState(false);
  const [engineMode, setEngineMode] = useState<string>('local');

  const reload = useCallback(async () => {
    try {
      const list = await agentApi.listModels();
      setEngineMode(list.engineMode || 'local');
      setModels((list.items || []) as ModelEntry[]);
      setActiveModelId(list.activeModelId ?? null);
      setGlobalThinking(list.globalThinking || 'auto');
      const lv = await agentApi.thinkingLevels(list.activeModelId ?? undefined);
      setLevels(lv.levels || []);
    } catch {
      /* 配置接口不可用时不阻塞对话 */
    }
  }, []);

  useEffect(() => { void reload(); }, [reload, visible]);

  useEffect(() => {
    if (!currentSessionKey) {
      setSessionModelId(null);
      return;
    }
    agentApi.getSessionModel(currentSessionKey)
      .then((r) => setSessionModelId(r.modelId ?? null))
      .catch(() => {});
  }, [currentSessionKey]);

  // 模型管理仅自研引擎：方舟托管的模型由远端 Agent 管理，会话内不提供选择
  if (engineMode === 'ark') {
    return null;
  }

  const current = models.find((m) => m.id === (sessionModelId ?? activeModelId));
  const label = current ? current.displayName : '平台默认模型';

  const pickSessionModel = async (id: number | null) => {
    if (!currentSessionKey) return;
    try {
      await agentApi.setSessionModel(currentSessionKey, id);
      setSessionModelId(id);
    } catch { /* 忽略 */ }
  };

  const pickThinking = async (level: string) => {
    try {
      await agentApi.setGlobalThinking(level);
      setGlobalThinking(level);
      const lv = await agentApi.thinkingLevels(activeModelId ?? undefined);
      setLevels(lv.levels || []);
    } catch { /* 忽略 */ }
  };

  const groupTitle: React.CSSProperties = {
    fontSize: 11, opacity: 0.55, padding: '6px 12px 3px', userSelect: 'none',
  };
  const itemStyle = (selected: boolean, disabled = false): React.CSSProperties => ({
    padding: '6px 12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    background: selected ? 'var(--semi-color-fill-0)' : undefined,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    fontSize: 12.5,
  });

  return (
    <Dropdown
      trigger="custom"
      visible={visible}
      onClickOutSide={() => setVisible(false)}
      render={
        <div style={{ minWidth: 260, padding: '4px 0 6px', maxHeight: 420, overflowY: 'auto' }}>
          <div style={groupTitle}>思考档位（全局）</div>
          {levels.map((lv) => (
            <div
              key={lv.level}
              title={lv.note || undefined}
              style={itemStyle(globalThinking === lv.level, !lv.supported)}
              onClick={() => {
                if (!lv.supported) return;
                void pickThinking(lv.level);
              }}
            >
              <span>{THINKING_LABELS[lv.level] || lv.level}</span>
              {globalThinking === lv.level && <span style={{ color: CHAT.accent, fontSize: 12 }}>✓</span>}
              {!lv.supported && <span style={{ fontSize: 11, opacity: 0.6 }}>不可用</span>}
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${CHAT.lineSoft}`, margin: '4px 0' }} />
          <div style={groupTitle}>对话模型{currentSessionKey ? '（本会话）' : ''}</div>
          <div
            style={itemStyle(sessionModelId === null)}
            onClick={() => { void pickSessionModel(null); }}
          >
            <span>跟随平台默认</span>
            {sessionModelId === null && <span style={{ color: CHAT.accent, fontSize: 12 }}>✓</span>}
          </div>
          {models.map((m) => (
            <div
              key={m.id}
              title={m.enabled === false ? '已停用' : undefined}
              style={itemStyle(sessionModelId === m.id, m.enabled === false)}
              onClick={() => {
                if (m.enabled === false) return;
                void pickSessionModel(m.id);
              }}
            >
              <span>
                {m.displayName}
                <span style={{ fontSize: 11, opacity: 0.55, marginLeft: 6 }}>{m.modelId}</span>
              </span>
              {sessionModelId === m.id
                ? <span style={{ color: CHAT.accent, fontSize: 12 }}>✓</span>
                : m.active
                  ? <span style={{ fontSize: 11, opacity: 0.6 }}>默认</span>
                  : null}
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${CHAT.lineSoft}`, margin: '4px 0' }} />
          <div
            style={{ ...itemStyle(false), color: CHAT.textSub }}
            onClick={() => navigate('/manage/agent-config')}
          >
            <span>管理模型</span>
            <span style={{ fontSize: 11, opacity: 0.55 }}>→</span>
          </div>
        </div>
      }
    >
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          height: 28,
          padding: '0 6px',
          border: 'none',
          borderRadius: 8,
          background: 'transparent',
          color: CHAT.textSub,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 12.5,
          whiteSpace: 'nowrap',
          transition: 'background .14s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = CHAT.hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {label}
        <IconChevronDown size="small" />
      </button>
    </Dropdown>
  );
};
