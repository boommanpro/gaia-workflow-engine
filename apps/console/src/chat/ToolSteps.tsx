/**
 * ToolSteps —— dsh 风格的工具步骤行（figma 122:9479 规格）。
 *
 * 行 chrome：24px 单行 `[16px 业务图标] gap6 [标题 13/400] gap8 [2x2 圆点] gap8 [摘要 截断]`，
 * 无卡片边框、无背景 —— 行即内容；默认 label-tertiary，hover 提亮 label-secondary。
 * running：图标自旋 + 摘要 shimmer；error：摘要替换为错误首行（红）。
 * 展开体：IN/OUT 卡（hairline 边、radius 12、代码底色，IN/OUT gutter 标签，各节独立滚动）。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@douyinfe/semi-icons';

import type { DisplayMessage, ToolCallEvent } from '../agent/types';
import { t } from '../i18n';
import { CHAT } from './theme';

interface ToolStepsProps {
  messages: DisplayMessage[];
  compact?: boolean;
}

// ---------------- 业务图标（16px，stroke currentColor，零依赖） ----------------

type GlyphKind = 'read' | 'edit' | 'run' | 'commit' | 'delete' | 'know' | 'todo' | 'tool' | 'alert';

function glyphOf(action?: string): GlyphKind {
  const name = action || '';
  if (name.startsWith('read_') || name.startsWith('list_')) return 'read';
  if (name.startsWith('edit_')) return 'edit';
  if (name.startsWith('run_')) return 'run';
  if (name === 'write_workflow' || name === 'save_workflow') return 'commit';
  if (name === 'delete_workflow') return 'delete';
  if (name.startsWith('search_knowledge') || name.startsWith('get_node_schema')) return 'know';
  if (name === 'todo_write') return 'todo';
  return 'tool';
}

const Glyph: React.FC<{ kind: GlyphKind; size?: number }> = ({ kind, size = 16 }) => {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (kind) {
    case 'read':
      return (
        <svg {...p}>
          <path d="M2.5 3.5h7.5a1.5 1.5 0 0 1 1.5 1.5v8H4a1.5 1.5 0 0 1-1.5-1.5z" />
          <path d="M2.5 11.5V3.5M13.5 3.5v8.5a1.5 1.5 0 0 1-1.5 1.5H4" opacity="0" />
          <path d="M5 6.5h4M5 8.5h3" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...p}>
          <path d="M9.5 2.5l4 4L6 14H2v-4z" />
          <path d="M8 4l4 4" />
        </svg>
      );
    case 'run':
      return (
        <svg {...p}>
          <path d="M4.5 3l8 5-8 5z" />
        </svg>
      );
    case 'commit':
      return (
        <svg {...p}>
          <path d="M8 2v8M5 7l3 3 3-3" />
          <path d="M2.5 12.5h11" />
        </svg>
      );
    case 'delete':
      return (
        <svg {...p}>
          <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9" />
        </svg>
      );
    case 'know':
      return (
        <svg {...p}>
          <path d="M8 3.5C6.8 2.6 5 2.4 2.5 3v9.5c2.5-.6 4.3-.4 5.5.5 1.2-.9 3-1.1 5.5-.5V3c-2.5-.6-4.3-.4-5.5.5z" />
          <path d="M8 3.5v9.5" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 4.8v3.9M8 11.2v.2" />
        </svg>
      );
    case 'todo':
      return (
        <svg {...p}>
          <path d="M3 4.5l1.5 1.5L7 3.5" />
          <path d="M3 8.5l1.5 1.5L7 7.5" />
          <path d="M9 5h4M9 9h4" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 5v3.5l2 1.5" />
        </svg>
      );
  }
};

// ---------------- 结果解析（含截断宽容） ----------------

interface Violation {
  path?: string;
  issue?: string;
  fix?: string;
}

function parseResult(result?: string): {
  kind: 'violations' | 'error' | 'plain' | 'empty';
  code?: string;
  message?: string;
  violations?: Violation[];
  firstLine?: string;
  text: string;
} {
  if (!result) return { kind: 'empty', text: '' };
  try {
    const parsed = JSON.parse(result);
    const err = parsed?.error;
    if (err && typeof err === 'object') {
      if (Array.isArray(err.violations) && err.violations.length > 0) {
        return { kind: 'violations', code: err.code, message: err.message, violations: err.violations, firstLine: err.message, text: result };
      }
      return { kind: 'error', code: err.code, message: err.message, firstLine: err.message || String(err), text: result };
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.violations)) {
      return { kind: 'violations', code: parsed.code, message: parsed.message, violations: parsed.violations, firstLine: parsed.message, text: result };
    }
    return { kind: 'plain', text: JSON.stringify(parsed, null, 2) };
  } catch {
    // 截断 JSON：宽容提取
    const codeMatch = result.match(/"code"\s*:\s*"([^"]+)"/);
    const msgMatch = result.match(/"message"\s*:\s*"([^"]{0,120})/);
    if (codeMatch || /"error"/.test(result)) {
      const vIssue = result.match(/"issue"\s*:\s*"([^"]{0,120})/);
      const vPath = result.match(/"path"\s*:\s*"([^"]{0,60})/);
      const vFix = result.match(/"fix"\s*:\s*"([^"]{0,160})/);
      if (vIssue || vPath) {
        return {
          kind: 'violations', code: codeMatch?.[1], message: msgMatch?.[1],
          violations: [{ path: vPath?.[1], issue: vIssue?.[1], fix: vFix?.[1] }],
          firstLine: vIssue?.[1] || vPath?.[1], text: result,
        };
      }
      return { kind: 'error', code: codeMatch?.[1], message: msgMatch?.[1] || '…(结果被截断)', firstLine: msgMatch?.[1] || 'error', text: result };
    }
    return { kind: 'plain', text: result };
  }
}

function isFailure(result?: string): boolean {
  if (!result) return false;
  const lower = result.toLowerCase();
  return lower.includes('"error"') || lower.includes('"success":false') || lower.includes('error:');
}

function resultText(result?: string, limit = 600): string {
  if (!result) return '';
  let text = result;
  try {
    text = JSON.stringify(JSON.parse(result), null, 2);
  } catch { /* 原样 */ }
  return text.length > limit ? `${text.slice(0, limit)}\n…` : text;
}

const Mono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
      fontSize: 11.5,
      lineHeight: 1.6,
      color: CHAT.textSub,
      wordBreak: 'break-all',
      whiteSpace: 'pre-wrap',
    }}
  >
    {children}
  </div>
);

/** violations：path → issue → fix（浅红仅限条目） */
const ViolationList: React.FC<{ violations: Violation[] }> = ({ violations }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    {violations.slice(0, 6).map((v, i) => (
      <div
        key={i}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          padding: '3px 8px',
          borderRadius: 6,
          borderLeft: `2px solid ${CHAT.danger}`,
          background: 'var(--g-danger-soft, rgba(228,29,53,0.05))',
        }}
      >
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
          {v.path && (
            <span
              style={{
                flexShrink: 0,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 10.5,
                color: CHAT.danger,
              }}
            >
              {v.path}
            </span>
          )}
          <span style={{ fontSize: 11.5, color: CHAT.textSub }}>{v.issue}</span>
        </div>
        {v.fix && <span style={{ fontSize: 11, color: CHAT.success }}>→ {v.fix}</span>}
      </div>
    ))}
    {violations.length > 6 && (
      <span style={{ fontSize: 11, color: CHAT.textFaint }}>…{violations.length - 6}</span>
    )}
  </div>
);

// ---------------- IN/OUT 卡（dsh ioCard） ----------------

const IoCard: React.FC<{ args: Record<string, unknown>; result?: string; failed: boolean }> = ({
  args, result, failed,
}) => {
  const parsed = useMemo(() => (failed ? parseResult(result) : null), [failed, result]);
  let argsText = '';
  try {
    argsText = Object.keys(args || {}).length > 0 ? JSON.stringify(args, null, 2) : '';
  } catch {
    argsText = String(args);
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        margin: '4px 0 4px 4px',
        border: `0.5px solid ${CHAT.line}`,
        borderRadius: 12,
        background: 'var(--g-bg-sunken)',
        overflow: 'hidden',
      }}
    >
      {argsText && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'max-content 1fr',
            columnGap: 14,
            alignItems: 'baseline',
            padding: '10px 14px',
            maxHeight: 150,
            overflowY: 'auto',
          }}
        >
          <span style={{ color: CHAT.textFaint, fontSize: 11, position: 'sticky', top: 0 }}>IN</span>
          <Mono>{argsText}</Mono>
        </div>
      )}
      {result !== undefined && result !== '' && (
        <>
          {argsText && <div style={{ height: 0.5, background: CHAT.line }} />}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'max-content 1fr',
              columnGap: 14,
              alignItems: 'baseline',
              padding: '10px 14px',
              maxHeight: 180,
              overflowY: 'auto',
            }}
          >
            <span style={{ color: CHAT.textFaint, fontSize: 11, position: 'sticky', top: 0 }}>OUT</span>
            {parsed?.kind === 'violations' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                {parsed.message && (
                  <div style={{ fontSize: 11.5, color: CHAT.danger }}>{parsed.message}</div>
                )}
                <ViolationList violations={parsed.violations || []} />
              </div>
            ) : parsed?.kind === 'error' && parsed.message ? (
              <div style={{ fontSize: 11.5, color: CHAT.danger }}>
                {parsed.code ? `[${parsed.code}] ` : ''}
                {parsed.message}
              </div>
            ) : (
              <Mono>{resultText(result)}</Mono>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ---------------- 摘要 ----------------

function argSummary(args: Record<string, unknown>): string {
  const keys = Object.keys(args || {});
  if (keys.length === 0) return '';
  const first = keys[0];
  const raw = args[first];
  let value: string;
  if (Array.isArray(raw)) value = `[${raw.length} 项]`;
  else if (raw !== null && typeof raw === 'object') value = JSON.stringify(raw);
  else value = String(raw);
  if (value.length > 48) value = `${value.slice(0, 48)}…`;
  return `${first}: ${value}`;
}

// ---------------- 单行 StepRow（dsh DisclosureRow chrome） ----------------
// memo 契约：call 对象引用在结果回填前保持稳定（store 时间线浅拷贝保证），
// 未变化的工具行不随流式帧重渲染。

const StepRowImpl: React.FC<{ call: ToolCallEvent; defaultOpen?: boolean }> = ({ call, defaultOpen }) => {
  const failed = isFailure(call.result);
  const running = call.result === undefined;
  const parsed = useMemo(() => (failed ? parseResult(call.result) : null), [failed, call.result]);
  const [open, setOpen] = useState(!!defaultOpen && (failed || running));
  useEffect(() => {
    if (defaultOpen) setOpen(failed || running);
  }, [defaultOpen, failed, running]);

  const summary = failed
    ? (parsed?.firstLine || t('chat.toolFailed'))
    : argSummary(call.args || {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="dsh-tool-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          height: 24,
          minWidth: 0,
          width: '100%',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          padding: 0,
          color: 'var(--g-text-faint)',
          transition: 'color .1s ease',
        }}
      >
        {/* leading：状态图标（running 自旋 / 失败红 / 成功业务 glyph） */}
        <span
          style={{
            flex: 'none',
            width: 16,
            height: 16,
            marginRight: 6,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: failed ? CHAT.danger : 'inherit',
          }}
        >
          {running ? (
            <span
              style={{
                width: 10,
                height: 10,
                border: `1.5px solid ${CHAT.line}`,
                borderTopColor: CHAT.accent,
                borderRadius: '50%',
                animation: 'chat-spin .9s linear infinite',
                display: 'inline-block',
              }}
            />
          ) : failed ? (
            <Glyph kind="alert" size={16} />
          ) : (
            <Glyph kind={glyphOf(call.action)} />
          )}
        </span>
        {/* 标题（13/400） */}
        <span style={{ flex: 'none', fontSize: 13, fontWeight: 400, lineHeight: '24px' }}>
          {call.action}
        </span>
        {/* 2x2 圆点分隔符 */}
        {summary && (
          <span
            style={{
              flex: 'none',
              width: 2,
              height: 2,
              borderRadius: 1,
              margin: '0 8px',
              background: 'var(--g-text-faint)',
            }}
          />
        )}
        {/* 摘要（截断填充；running shimmer；失败红） */}
        <span
          className={running ? 'dsh-shimmer' : undefined}
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 13,
            lineHeight: '24px',
            color: failed ? CHAT.danger : 'inherit',
          }}
        >
          {running && !summary ? t('chat.toolRunning') : summary}
        </span>
        {/* 错误码徽标（描边小标签） */}
        {!running && parsed?.code && (
          <span
            style={{
              flex: 'none',
              marginLeft: 8,
              fontSize: 10,
              padding: '0 5px',
              borderRadius: 4,
              border: `0.5px solid ${CHAT.danger}`,
              color: CHAT.danger,
              lineHeight: '16px',
            }}
          >
            {parsed.code}
          </span>
        )}
        {/* chevron */}
        <span
          style={{
            flex: 'none',
            marginLeft: 6,
            display: 'inline-flex',
            color: 'var(--g-text-faint)',
            opacity: open ? 1 : 0.55,
          }}
        >
          {open ? <IconChevronDown size="small" /> : <IconChevronRight size="small" />}
        </span>
      </button>
      {open && (
        <IoCard args={call.args || {}} result={call.result} failed={failed} />
      )}
    </div>
  );
};

export const StepRow = React.memo(StepRowImpl);

// ---------------- 容器：无卡片框，行序列直接排 ----------------

export const ToolSteps: React.FC<ToolStepsProps> = ({ messages }) => {
  const calls = useMemo(
    () => messages.map((m) => m.toolCall).filter((c): c is ToolCallEvent => !!c),
    [messages]
  );
  const orphanResults = useMemo(
    () => messages.filter((m) => !m.toolCall && m.content && !m.artifact),
    [messages]
  );
  if (calls.length === 0 && orphanResults.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0' }}>
      {calls.map((call, index) => (
        <StepRow key={call.id || index} call={call} defaultOpen={false} />
      ))}
      {orphanResults.map((m) => {
        const parsed = parseResult(m.content);
        return (
          <div key={m.id} style={{ padding: '2px 0 4px 22px', minWidth: 0 }}>
            {parsed.kind === 'violations' ? (
              <ViolationList violations={parsed.violations || []} />
            ) : parsed.kind === 'error' && parsed.message ? (
              <div style={{ fontSize: 11.5, color: CHAT.danger }}>
                {parsed.code ? `[${parsed.code}] ` : ''}
                {parsed.message}
              </div>
            ) : (
              <Mono>{resultText(m.content)}</Mono>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ToolSteps;
