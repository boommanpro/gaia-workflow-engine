/**
 * ProcessFold —— 回合内「执行过程折叠区」（对标 owb proc-wrap，2026-10-11）。
 *
 * 结论永远在外面，过程默认收起，但收起 ≠ 失明：
 * 折叠条一行摘要（步数/错误/产出）+ 轨迹徽章条（同名合并 ×N，点击展开并直达该步）。
 * 历史与直播共用步骤卡本体（ToolSteps），只有折叠容器是这里新增的。
 */
import React, { useMemo, useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@douyinfe/semi-icons';
import { CHAT } from './theme';

export interface FoldStep {
  id: string;
  /** 工具名（trace 徽章用短名） */
  tool: string;
  /** 是否失败 */
  error?: boolean;
}

/** 工具名 → 2-3 字短徽章（轨迹条用） */
const shortName = (tool: string): string => {
  const map: Record<string, string> = {
    write_workflow: '写', edit_workflow: '改', run_workflow: '跑', read_workflow: '读流程',
    read_node: '读节点', list_workflows: '列', list_runs: '日志', list_templates: '模板',
    search_knowledge: '搜', get_node_schema: '结构', delete_workflow: '删', todo_write: '清单',
    ask_user: '问', get_knowledge: '知识',
  };
  if (map[tool]) return map[tool];
  if (tool.startsWith('get_')) return tool.slice(4, 6);
  return tool.slice(0, 3);
};

export const ProcessFold: React.FC<{
  /** 折叠条摘要：如「6 步工具调用 · 1 次验证通过」 */
  steps: FoldStep[];
  /** 步骤本体（现有 ToolSteps 渲染结果直接作为 children 传入） */
  children: React.ReactNode;
  /** 附加摘要尾部（如验证结论） */
  footerNote?: string;
  defaultOpen?: boolean;
}> = ({ steps, children, footerNote, defaultOpen = false }) => {
  // 偏好记忆（owb owb_proc_open 等价）：默认收起
  const [open, setOpen] = useState(() => {
    try {
      const pref = localStorage.getItem('gaia_proc_open');
      return pref !== null ? pref === '1' : defaultOpen;
    } catch {
      return defaultOpen;
    }
  });

  const errors = steps.filter((s) => s.error).length;
  const badges = useMemo(() => {
    // 连续同名合并 ×N
    const out: { tool: string; count: number; error: boolean; firstIndex: number }[] = [];
    steps.forEach((s, i) => {
      const last = out[out.length - 1];
      if (last && last.tool === s.tool) {
        last.count += 1;
        last.error = last.error || !!s.error;
      } else {
        out.push({ tool: s.tool, count: 1, error: !!s.error, firstIndex: i });
      }
    });
    return out;
  }, [steps]);

  const summaryParts = [`${steps.length} 步`];
  if (errors > 0) summaryParts.push(`${errors} 步出错`);
  if (footerNote) summaryParts.push(footerNote);

  return (
    <div style={{ margin: '2px 0' }}>
      <div
        onClick={() => {
          setOpen((v) => {
            try { localStorage.setItem('gaia_proc_open', v ? '1' : '0'); } catch { /* 忽略 */ }
            return v;
          });
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 8,
          background: CHAT.bgSunken || 'rgba(0,0,0,0.03)',
          cursor: 'pointer',
          fontSize: 12,
          color: CHAT.textSub,
          userSelect: 'none',
          maxWidth: '100%',
          transition: 'background .14s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = CHAT.hover || 'rgba(0,0,0,0.06)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = CHAT.bgSunken || 'rgba(0,0,0,0.03)'; }}
      >
        {open ? <IconChevronDown size="small" /> : <IconChevronRight size="small" />}
        <span>{open ? '收起过程' : `已执行 ${summaryParts.join(' · ')}`}</span>
        {/* 轨迹徽章条（收起时展示）：同名合并 ×N，出错标红 */}
        {!open && (
          <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', overflow: 'hidden' }}>
            {badges.slice(0, 12).map((b) => (
              <span
                key={`${b.tool}-${b.firstIndex}`}
                title={`${b.tool}${b.count > 1 ? ` ×${b.count}` : ''}`}
                style={{
                  fontSize: 10.5,
                  padding: '1px 5px',
                  borderRadius: 5,
                  background: b.error ? 'rgba(239,68,68,0.12)' : 'var(--g-bg-raised, #fff)',
                  border: `1px solid ${b.error ? 'rgba(239,68,68,0.35)' : CHAT.line || '#eee'}`,
                  color: b.error ? '#ef4444' : CHAT.textFaint,
                  whiteSpace: 'nowrap',
                }}
              >
                {shortName(b.tool)}{b.count > 1 ? `×${b.count}` : ''}
              </span>
            ))}
            {badges.length > 12 && <span style={{ fontSize: 10.5, color: CHAT.textFaint }}>+{badges.length - 12}</span>}
          </span>
        )}
      </div>
      {open && <div style={{ padding: '6px 0 2px' }}>{children}</div>}
    </div>
  );
};
