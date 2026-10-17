/**
 * SkillLibraryEditor — 技能库多文件编辑器（VS Code 风格，2026-10-17 反馈重设计）。
 *
 * 两个视图：
 * - 列表视图：表格展示全部技能（启用开关/文件数/分类/操作），点击「编辑」进入编辑器
 * - 编辑器视图：左侧文件树 + 右侧多 tab 编辑器 + 底部保存/版本操作（VS Code 同款布局）
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, Typography, Popconfirm } from '@douyinfe/semi-ui';
import { IconPlus, IconDelete } from '@douyinfe/semi-icons';
import { getApiBaseUrl } from '../../utils/apiConfig';

// ===== 类型 =====
interface SkillSummary {
  name: string;
  description: string;
  kind: string;
  enabled: boolean;
  source: string;
  fileCount: number;
  updatedAt: string;
}

interface SkillVersion {
  version: number;
  changedBy: string;
  createdAt: string;
}

const ACCENT = '#4d53e8';
const kindTag = (k: string) => {
  const map: Record<string, [string, string]> = {
    domain: ['领域手册', '#fdf3e0'], node: ['节点技能', '#f0f0ff'],
    pattern: ['编排模式', '#f3e8ff'], general: ['通用', '#f0f0f0'],
  };
  return map[k] || ['通用', '#f0f0f0'];
};

// ===== API =====
const api = {
  list: () => fetchJson<SkillSummary[]>('/admin/agent-config/skills'),
  detail: (name: string) => fetchJson<any>(`/admin/agent-config/skills/${encodeURIComponent(name)}`),
  save: (body: any) => send('/api/admin/agent-config/skills/save', body),
  toggle: (name: string) => send(`/api/admin/agent-config/skills/${encodeURIComponent(name)}/toggle`, {}),
  remove: (name: string) => send(`/admin/agent-config/skills/${encodeURIComponent(name)}`, {}, 'DELETE'),
  history: (name: string) => fetchJson<SkillVersion[]>(`/admin/agent-config/skills/${encodeURIComponent(name)}/history`),
  versionFiles: (name: string, version: number) =>
    fetchJson<any>(`/admin/agent-config/skills/${encodeURIComponent(name)}/history/${version}`),
  rollback: (name: string, version: number) =>
    send(`/admin/agent-config/skills/${encodeURIComponent(name)}/rollback/${version}`, {}),
};

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
async function send(path: string, body: any, method = 'POST'): Promise<any> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ===== 主组件 =====
export const SkillLibraryEditor: React.FC = () => {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [loading, setLoading] = useState(true);
  // 编辑器状态
  const [editName, setEditName] = useState('');
  const [editMeta, setEditMeta] = useState({ description: '', kind: 'general', enabled: true });
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState('SKILL.md');
  const [openTabs, setOpenTabs] = useState<string[]>(['SKILL.md']);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<SkillVersion[]>([]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try { setSkills(await api.list()); } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  const openEditor = useCallback(async (name: string) => {
    try {
      const detail = await api.detail(name);
      const fileMap: Record<string, string> = {};
      for (const f of detail.files || []) fileMap[f.path] = f.content;
      setEditName(name);
      setEditMeta({ description: detail.description || '', kind: detail.kind || 'general', enabled: detail.enabled !== false });
      setFiles(fileMap);
      const tabs = Object.keys(fileMap).sort();
      setOpenTabs(tabs.length > 0 ? tabs : ['SKILL.md']);
      setActiveFile(tabs.includes('SKILL.md') ? 'SKILL.md' : tabs[0] || 'SKILL.md');
      setDirty(new Set());
      setView('editor');
    } catch { /* ignore */ }
  }, []);

  const saveAll = useCallback(async () => {
    if (dirty.size === 0) return;
    const changedFiles = Array.from(dirty).map(path => ({ path, content: files[path] || '' }));
    await api.save({ name: editName, description: editMeta.description, kind: editMeta.kind, enabled: editMeta.enabled, files: changedFiles });
    setDirty(new Set());
    await loadList();
  }, [editName, editMeta, dirty, files, loadList]);

  const addFile = useCallback((path: string) => {
    if (!path || files[path] !== undefined) return;
    setFiles(prev => ({ ...prev, [path]: '' }));
    setOpenTabs(prev => [...prev, path]);
    setActiveFile(path);
    setDirty(prev => new Set(prev).add(path));
  }, [files]);


  const setFileContent = useCallback((path: string, content: string) => {
    setFiles(prev => ({ ...prev, [path]: content }));
    setDirty(prev => new Set(prev).add(path));
  }, []);

  // ===== 列表视图 =====
  if (view === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text type="tertiary" size="small">
            技能 = 多文件知识包（SKILL.md 入口 + references/）。挂载后目录注入系统提示词，模型按需 skill(name) 加载。
          </Typography.Text>
          <Button size="small" theme="solid" icon={<IconPlus />}
            onClick={() => { setEditName(''); setFiles({ 'SKILL.md': '' }); setOpenTabs(['SKILL.md']); setActiveFile('SKILL.md'); setDirty(new Set()); setEditMeta({ description: '', kind: 'general', enabled: true }); setView('editor'); }}>
            新建技能
          </Button>
        </div>
        <div style={{ background: 'var(--card, #fff)', borderRadius: 10, border: '1px solid var(--line, #e0e0ee)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['', '技能名', '文件数', '分类', '来源', '更新时间', '操作'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 12, color: '#888', borderBottom: '1px solid #e0e0ee' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#888' }}>加载中…</td></tr>}
              {skills.map(s => (
                <tr key={s.name}>
                  <td style={{ padding: '8px 14px' }}>
                    <label style={{ position: 'relative', width: 36, height: 20, display: 'inline-block', cursor: 'pointer' }}>
                      <input type="checkbox" checked={s.enabled} style={{ display: 'none' }}
                        onChange={() => api.toggle(s.name).then(loadList)} />
                      <span style={{ position: 'absolute', inset: 0, background: s.enabled ? ACCENT : '#ccc', borderRadius: 10, transition: '.2s' }} />
                      <span style={{ position: 'absolute', width: 16, height: 16, left: s.enabled ? 18 : 2, top: 2, background: '#fff', borderRadius: '50%', transition: '.2s' }} />
                    </label>
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12.5 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#888, marginTop: 2' }}>{s.description}</div>
                  </td>
                  <td style={{ padding: '8px 14px', fontSize: 12 }}>{s.fileCount}</td>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: kindTag(s.kind)[1] }}>{kindTag(s.kind)[0]}</span>
                  </td>
                  <td style={{ padding: '8px 14px', fontSize: 12 }}>{s.source === 'seed' ? '内置' : '自定义'}</td>
                  <td style={{ padding: '8px 14px', fontSize: 12, color: '#888' }}>{s.updatedAt?.substring(0, 16)}</td>
                  <td style={{ padding: '8px 14px', display: 'flex', gap: 4 }}>
                    <Button size="small" onClick={() => openEditor(s.name)}>编辑</Button>
                    <Popconfirm title={`删除 ${s.name}?`} onConfirm={() => api.remove(s.name).then(loadList)}>
                      <Button size="small" type="danger" theme="borderless" icon={<IconDelete size="small" />} />
                    </Popconfirm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ===== 编辑器视图（VS Code 风格）=====
  const filePaths = Object.keys(files).sort();
  const folders = new Map<string, string[]>();
  filePaths.forEach(p => {
    const slash = p.indexOf('/');
    const folder = slash > 0 ? p.substring(0, slash) : '';
    if (!folders.has(folder)) folders.set(folder, []);
    folders.get(folder)!.push(p);
  });

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', background: '#1e1e2e', borderRadius: 10, overflow: 'hidden' }}>
      {/* 文件树 */}
      <div style={{ width: 220, background: '#252536', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', justifyContent: 'space-between' }}>
          <span>{editName}</span>
          <button style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14 }}
            title="新建文件"
            onClick={() => { const p = prompt('文件路径（如 references/new-file.md）'); if (p) addFile(p); }}>＋</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
          {filePaths.filter(p => !p.includes('/')).map(p => (
            <FileTreeItem key={p} path={p} active={activeFile === p} dirty={dirty.has(p)} onClick={() => { setActiveFile(p); if (!openTabs.includes(p)) setOpenTabs(t => [...t, p]); }} />
          ))}
          {Array.from(folders.keys()).filter(f => f).sort().map(folder => (
            <FileFolder key={folder} label={folder} files={folders.get(folder)!}
              activeFile={activeFile} dirty={dirty} onOpen={openFileWrapper(setActiveFile, setOpenTabs)} />
          ))}
        </div>
        <div style={{ padding: 10, borderTop: '1px solid #33334a', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <VsButton onClick={() => openHistory(editName, setVersions, setShowHistory)}>📜 版本对比</VsButton>
          <VsButton onClick={saveAll} primary>💾 保存全部 ({dirty.size} dirty)</VsButton>
          <VsButton onClick={() => setView('list')}>← 返回列表</VsButton>
        </div>
      </div>
      {/* 编辑区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', background: '#252536', borderBottom: '1px solid #33334a', overflowX: 'auto' }}>
          {openTabs.map(p => (
            <div key={p} onClick={() => setActiveFile(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
                background: activeFile === p ? '#1e1e2e' : 'transparent', color: activeFile === p ? '#fff' : '#666', borderRight: '1px solid #33334a', borderTop: activeFile === p ? '2px solid #7c7cf0' : '2px solid transparent' }}>
              {p.split('/').pop()}
              {dirty.has(p) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c7cf0', display: 'inline-block' }} />}
              <span style={{ marginLeft: 4, opacity: .5, cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); setOpenTabs(t => t.filter(t2 => t2 !== p)); if (activeFile === p) setActiveFile(openTabs.find(t2 => t2 !== p) || ''); }}>✕</span>
            </div>
          ))}
        </div>
        <textarea
          style={{ flex: 1, background: '#1e1e2e', color: '#ccc', border: 'none', outline: 'none', fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 13, lineHeight: 1.65, padding: 16, resize: 'none' }}
          value={files[activeFile] ?? ''}
          onChange={e => setFileContent(activeFile, e.target.value)}
          spellCheck={false}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 14px', background: '#4d53e8', color: '#fff', fontSize: 11 }}>
          <span>{activeFile}</span>
          <span>{dirty.has(activeFile) ? '● modified' : '✓ saved'}</span>
        </div>
      </div>

      {/* 版本历史弹窗 */}
      {showHistory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowHistory(false)}>
          <div style={{ background: '#fff', borderRadius: 12, width: 640, maxHeight: '80vh', padding: 20, overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <Typography.Title heading={5}>📜 {editName} 版本历史</Typography.Title>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(versions || []).map(v => (
                <div key={v.version} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: ACCENT, fontFamily: 'monospace', minWidth: 32 }}>v{v.version}</span>
                  <span style={{ color: '#666' }}>{v.changedBy}</span>
                  <span style={{ color: '#999', fontSize: 12 }}>{v.createdAt?.substring(0, 16)}</span>
                  <Button size="small" style={{ marginLeft: 'auto' }}
                    onClick={async () => { await api.rollback(editName, v.version); await openEditor(editName); setShowHistory(false); }}>
                    回滚
                  </Button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Button size="small" onClick={() => setShowHistory(false)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== 子组件 =====
const FileTreeItem: React.FC<{ path: string; active: boolean; dirty: boolean; onClick: () => void }> = ({ path, active, dirty, onClick }) => (
  <div onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 13, borderRadius: 4,
      background: active ? '#37374d' : 'transparent', color: active ? '#fff' : '#ccc' }}>
    <span style={{ width: 16, textAlign: 'center' }}>📝</span>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{path.split('/').pop()}</span>
    {dirty && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#7c7cf0' }} />}
  </div>
);

const FileFolder: React.FC<{ label: string; files: string[]; activeFile: string; dirty: Set<string>; onOpen: (p: string) => void }> = ({ label, files, activeFile, dirty, onOpen }) => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div onClick={() => setOpen(v => !v)}
        style={{ padding: '4px 8px', fontSize: 12, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, transform: open ? 'rotate(90deg)' : '', transition: 'transform .15s' }}>▸</span>
        📁 {label}
      </div>
      {open && files.map(p => (
        <div key={p} style={{ marginLeft: 16 }}>
          <FileTreeItem path={p} active={activeFile === p} dirty={dirty.has(p)} onClick={() => onOpen(p)} />
        </div>
      ))}
    </>
  );
};

const VsButton: React.FC<{ onClick: () => void; primary?: boolean; children: React.ReactNode }> = ({ onClick, primary, children }) => (
  <button onClick={onClick}
    style={{ padding: '5px 10px', borderRadius: 4, border: '1px solid #33334a', cursor: 'pointer', fontSize: 12,
      background: primary ? '#4d53e8' : '#2a2a3e', color: primary ? '#fff' : '#ccc', textAlign: 'center' }}>
    {children}
  </button>
);

// ===== 工具函数 =====
function openFileWrapper(
  setActiveFile: (p: string) => void,
  setOpenTabs: (fn: (tabs: string[]) => string[]) => void
) {
  return (path: string) => {
    setActiveFile(path);
    setOpenTabs(tabs => tabs.includes(path) ? tabs : [...tabs, path]);
  };
}

async function openHistory(name: string, setVersions: (v: SkillVersion[]) => void, setShow: (v: boolean) => void) {
  const versions = await api.history(name);
  setVersions(versions);
  setShow(true);
}
