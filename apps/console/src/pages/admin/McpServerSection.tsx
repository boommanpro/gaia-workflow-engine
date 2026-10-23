/**
 * McpServerSection —— 工具定义 Tab 的「MCP 服务器」小节。
 *
 * 外部工具来源管理：服务器卡片（状态/传输/连接/编辑/删除）+ 添加服务器弹窗
 * （表单 ⇄ JSON 双模式，与 Claude Desktop / Cursor 的 mcpServers 同构）+
 * 工具管理弹窗（按工具粒度启停 + 试调用）。工具目录数据在 agent_tool_definition，
 * 启停与下方工具表格共用 /agent/tool-definition/save。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal, Switch, TextArea, Toast, Typography } from '@douyinfe/semi-ui';
import { IconPlus, IconRefresh } from '@douyinfe/semi-icons';

import { agentApi, type McpServerItem, type McpServerSaveInput, type McpServerTool } from '../../agent/api';

const ACCENT = 'var(--g-accent)';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

interface McpServerSectionProps {
  /** 工具目录刷新（MCP 工具同步进 agent_tool_definition 后联动下方表格） */
  onToolsChanged: () => void;
}

/* ---------------- 表单模型（表单 ⇄ JSON 双模式的中间态） ---------------- */

interface ServerForm {
  serverName: string;
  transport: 'stdio' | 'sse' | 'http';
  command: string;
  argsText: string;      // 每行一个
  envText: string;       // 每行 KEY=VALUE
  url: string;
  headersText: string;   // 每行 KEY: VALUE
  enabled: boolean;
  /** 编辑已有服务器时锁定名称（命名空间不能变，变了工具就成了另一批） */
  lockName: boolean;
}

const EMPTY_FORM: ServerForm = {
  serverName: '',
  transport: 'stdio',
  command: 'npx',
  argsText: '',
  envText: '',
  url: '',
  headersText: '',
  enabled: true,
  lockName: false,
};

const formToJson = (f: ServerForm): string => {
  const args = f.argsText.split('\n').map((s) => s.trim()).filter(Boolean);
  const env: Record<string, string> = {};
  f.envText.split('\n').forEach((line) => {
    const i = line.indexOf('=');
    if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  const headers: Record<string, string> = {};
  f.headersText.split('\n').forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  const cfg: Record<string, unknown> = f.transport === 'stdio'
    ? { command: f.command.trim() || 'npx', args, ...(Object.keys(env).length ? { env } : {}) }
    : { type: f.transport, url: f.url.trim(), ...(Object.keys(headers).length ? { headers } : {}) };
  return JSON.stringify({ mcpServers: { [f.serverName.trim() || 'server']: cfg } }, null, 2);
};

/** 解析 mcpServers JSON → 表单；错误信息给 UI，不 throw */
const jsonToForm = (raw: string, fallback: ServerForm): { form?: ServerForm; error?: string } => {
  const text = raw.trim();
  if (!text) return { form: fallback };
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { error: `JSON 解析失败：${(e as Error).message}` };
  }
  const servers = parsed && typeof parsed === 'object' && parsed.mcpServers && typeof parsed.mcpServers === 'object'
    ? parsed.mcpServers
    : parsed;
  if (!servers || typeof servers !== 'object') {
    return { error: '需要 {"mcpServers": {"名称": {…}}} 结构' };
  }
  const names = Object.keys(servers);
  if (names.length === 0) return { error: '缺少服务器定义' };
  const name = fallback.lockName ? fallback.serverName : names[0];
  const cfg = servers[names[0]] || {};
  const form: ServerForm = { ...EMPTY_FORM, serverName: name, enabled: fallback.enabled, lockName: fallback.lockName };
  if (cfg.command) {
    form.transport = 'stdio';
    form.command = cfg.command || '';
    form.argsText = (cfg.args || []).join('\n');
    form.envText = Object.keys(cfg.env || {}).map((k) => `${k}=${cfg.env[k]}`).join('\n');
  } else if (cfg.url) {
    form.transport = cfg.type === 'sse' ? 'sse' : 'http';
    form.url = cfg.url;
    form.headersText = Object.keys(cfg.headers || {}).map((k) => `${k}: ${cfg.headers[k]}`).join('\n');
  } else {
    return { error: '无法识别的配置：需要 stdio（command/args）或远程（url）字段' };
  }
  return { form };
};

/* ---------------- 组件 ---------------- */

export const McpServerSection: React.FC<McpServerSectionProps> = ({ onToolsChanged }) => {
  const [servers, setServers] = useState<McpServerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // 编辑弹窗
  const [editVisible, setEditVisible] = useState(false);
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [form, setForm] = useState<ServerForm>(EMPTY_FORM);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 工具管理弹窗
  const [toolsServer, setToolsServer] = useState<string | null>(null);
  const [tools, setTools] = useState<McpServerTool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [calling, setCalling] = useState<string | null>(null);
  const [callResult, setCallResult] = useState<{ tool: string; ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await agentApi.listMcpServers();
      setServers(list || []);
    } catch (e) {
      Toast.error(`MCP 服务器加载失败: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /* ---------- 编辑弹窗 ---------- */

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setMode('form');
    setJsonError(null);
    setEditVisible(true);
  };

  const openEdit = (srv: McpServerItem) => {
    setForm({
      serverName: srv.serverName,
      transport: srv.transport || 'stdio',
      command: srv.command || 'npx',
      argsText: (srv.args || []).join('\n'),
      envText: Object.keys(srv.env || {}).map((k) => `${k}=${(srv.env as any)[k]}`).join('\n'),
      url: srv.url || '',
      headersText: Object.keys(srv.headers || {}).map((k) => `${k}: ${(srv.headers as any)[k]}`).join('\n'),
      enabled: srv.enabled,
      lockName: true,
    });
    setMode('form');
    setJsonError(null);
    setEditVisible(true);
  };

  const switchMode = (next: 'form' | 'json') => {
    if (next === mode) return;
    if (next === 'json') {
      setJsonText(formToJson(form));
      setJsonError(null);
    } else {
      const parsed = jsonToForm(jsonText, form);
      if (parsed.error) {
        setJsonError(parsed.error + '（修正后再切换，或直接用 JSON 保存）');
        return;
      }
      if (parsed.form) setForm(parsed.form);
      setJsonError(null);
    }
    setMode(next);
  };

  const handleSave = async () => {
    let finalForm = form;
    if (mode === 'json') {
      const parsed = jsonToForm(jsonText, form);
      if (parsed.error || !parsed.form) {
        setJsonError(parsed.error || 'JSON 解析失败');
        return;
      }
      finalForm = parsed.form;
      setForm(parsed.form);
    }
    const body: McpServerSaveInput = {
      serverName: finalForm.serverName.trim(),
      transport: finalForm.transport,
    };
    if (finalForm.transport === 'stdio') {
      body.command = finalForm.command.trim();
      body.args = finalForm.argsText.split('\n').map((s) => s.trim()).filter(Boolean);
      const env: Record<string, string> = {};
      finalForm.envText.split('\n').forEach((line) => {
        const i = line.indexOf('=');
        if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });
      if (Object.keys(env).length) body.env = env;
    } else {
      body.url = finalForm.url.trim();
      const headers: Record<string, string> = {};
      finalForm.headersText.split('\n').forEach((line) => {
        const i = line.indexOf(':');
        if (i > 0) headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });
      if (Object.keys(headers).length) body.headers = headers;
    }
    body.enabled = finalForm.enabled;

    setSaving(true);
    try {
      const res = await agentApi.saveMcpServer(body);
      if (res.ok) {
        Toast.success(`已连接：发现 ${res.toolCount ?? 0} 个工具，已进入工具目录`);
      } else {
        Toast.warning(`保存成功，但连接失败：${res.error || '详见服务器卡片'}`);
      }
      setEditVisible(false);
      await load();
      onToolsChanged();
    } catch (e) {
      Toast.error(`保存失败: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- 连接 / 删除 ---------- */

  const toggleConnect = async (srv: McpServerItem) => {
    setBusy(srv.serverName);
    try {
      if (srv.status === 'connected') {
        await agentApi.disconnectMcpServer(srv.serverName);
        Toast.success('已断开，工具已从 Agent 目录移除（配置保留）');
      } else {
        const res = await agentApi.connectMcpServer(srv.serverName);
        if (res.ok) {
          Toast.success(`连接成功：发现 ${res.toolCount ?? 0} 个工具，已进入工具目录`);
        } else {
          Toast.error(`连接失败：${res.lastError || res.error || '未知错误'}`);
        }
      }
      await load();
      onToolsChanged();
    } catch (e) {
      Toast.error(`${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = (srv: McpServerItem) => {
    Modal.confirm({
      title: '删除 MCP 服务器',
      content: `确认删除「${srv.serverName}」？其工具（mcp__${srv.serverName}__*）将一并从工具目录移除。`,
      okType: 'danger',
      onOk: async () => {
        try {
          await agentApi.deleteMcpServer(srv.serverName);
          Toast.success('已删除');
          await load();
          onToolsChanged();
        } catch (e) {
          Toast.error(`删除失败: ${(e as Error).message}`);
        }
      },
    });
  };

  /* ---------- 工具管理弹窗 ---------- */

  const openTools = async (srv: McpServerItem) => {
    setToolsServer(srv.serverName);
    setTools([]);
    setCallResult(null);
    setToolsLoading(true);
    try {
      const list = await agentApi.listMcpServerTools(srv.serverName);
      setTools(list || []);
    } catch (e) {
      Toast.error(`工具加载失败: ${(e as Error).message}`);
    } finally {
      setToolsLoading(false);
    }
  };

  const toggleTool = async (tool: McpServerTool) => {
    try {
      await agentApi.setToolDefinitionEnabled(tool.fullName, !tool.enabled);
      setTools((prev) => prev.map((x) => (x.fullName === tool.fullName ? { ...x, enabled: !tool.enabled } : x)));
      onToolsChanged();
    } catch (e) {
      Toast.error(`启停失败: ${(e as Error).message}`);
    }
  };

  const tryCall = async (tool: McpServerTool) => {
    if (!toolsServer) return;
    // 参数取 schema 的默认/示例：从 inputSchema.properties 取 type 对应的示例值
    const sampleArgs: Record<string, unknown> = {};
    const props = (tool.inputSchema as any)?.properties || {};
    Object.keys(props).slice(0, 3).forEach((key) => {
      const type = props[key]?.type;
      if (type === 'number' || type === 'integer') sampleArgs[key] = 1;
      else if (type === 'boolean') sampleArgs[key] = true;
      else sampleArgs[key] = props[key]?.enum?.[0] ?? props[key]?.default ?? 'example';
    });
    setCalling(tool.name);
    setCallResult(null);
    try {
      const res = await agentApi.callMcpTool(toolsServer, { tool: tool.name, arguments: sampleArgs });
      setCallResult({
        tool: tool.name,
        ok: res.ok,
        text: res.ok ? (res.payload || '(空结果)') : (res.error || '调用失败'),
      });
    } catch (e) {
      setCallResult({ tool: tool.name, ok: false, text: (e as Error).message });
    } finally {
      setCalling(null);
    }
  };

  /* ---------- 渲染 ---------- */

  const statusMeta = (srv: McpServerItem): { color: string; label: string } => {
    if (srv.status === 'connected') return { color: 'var(--g-success, #1f9d61)', label: `已连接 · ${srv.toolCount} 个工具` };
    if (srv.status === 'error') return { color: 'var(--g-danger, #d5303e)', label: '连接失败' };
    return { color: 'var(--g-text-muted, #9a9aa5)', label: '已停止' };
  };

  const transportSummary = (srv: McpServerItem): string => {
    if (srv.transport === 'stdio') {
      return [srv.command, ...(srv.args || [])].filter(Boolean).join(' ');
    }
    return srv.url || '';
  };

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>MCP 服务器</span>
        <span style={{ fontSize: 11.5, color: 'var(--g-text-muted, #9a9aa5)', flex: 1 }}>
          外部工具来源：连接后工具自动进入下方工具目录，命名空间 mcp__服务器名__工具名
        </span>
        <Button size="small" icon={<IconRefresh />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
        <Button size="small" theme="solid" icon={<IconPlus />} style={{ background: ACCENT }} onClick={openCreate}>
          添加服务器
        </Button>
      </div>

      {servers.length === 0 && !loading && (
        <div
          style={{
            border: '1px dashed var(--g-line, #e8e8ec)',
            borderRadius: 10,
            padding: '18px 20px',
            textAlign: 'center',
            color: 'var(--g-text-muted, #9a9aa5)',
            fontSize: 12.5,
            lineHeight: 1.8,
            background: 'var(--g-bg-raised, #fff)',
          }}
        >
          暂无 MCP 服务器。点击「添加服务器」接入外部能力，例如 chrome-devtools：
          <div style={{ fontFamily: MONO, fontSize: 11, marginTop: 6 }}>
            npx chrome-devtools-mcp@latest
          </div>
        </div>
      )}

      {servers.map((srv) => {
        const st = statusMeta(srv);
        return (
          <div
            key={srv.serverName}
            style={{
              border: '1px solid var(--g-line, #e8e8ec)',
              borderRadius: 10,
              background: 'var(--g-bg-raised, #fff)',
              padding: '10px 14px',
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span
                title={st.label}
                style={{
                  width: 8, height: 8, borderRadius: '50%', flex: '0 0 auto',
                  background: st.color,
                  boxShadow: `0 0 0 3px color-mix(in srgb, ${st.color} 16%, transparent)`,
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{srv.serverName}</span>
              <span
                style={{
                  fontSize: 10.5, padding: '2px 7px', borderRadius: 99,
                  border: '1px solid var(--g-line, #e8e8ec)', color: 'var(--g-text-muted)',
                  fontFamily: MONO,
                }}
              >
                {srv.transport}
              </span>
              <span style={{ fontSize: 11.5, color: st.color === 'var(--g-text-muted, #9a9aa5)' ? 'var(--g-text-muted)' : st.color }}>
                {st.label}
                {srv.status === 'error' && srv.lastError ? ` · ${srv.lastError.slice(0, 60)}` : ''}
              </span>
              <span style={{ flex: 1 }} />
              <Button
                size="small" theme="borderless"
                disabled={srv.status !== 'connected'}
                onClick={() => void openTools(srv)}
              >
                工具 ({srv.toolCount})
              </Button>
              <Button
                size="small" theme="borderless"
                loading={busy === srv.serverName}
                onClick={() => void toggleConnect(srv)}
              >
                {srv.status === 'connected' ? '断开' : srv.status === 'error' ? '重连' : '连接'}
              </Button>
              <Button size="small" theme="borderless" onClick={() => openEdit(srv)}>编辑</Button>
              <Button size="small" theme="borderless" type="danger" onClick={() => handleDelete(srv)}>删除</Button>
            </div>
            <div
              style={{
                marginTop: 6, fontSize: 11, color: 'var(--g-text-muted)',
                fontFamily: MONO, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
              title={transportSummary(srv)}
            >
              {transportSummary(srv)}
            </div>
          </div>
        );
      })}

      {/* ---------- 添加/编辑弹窗：表单 ⇄ JSON 双模式 ---------- */}
      <Modal
        title={form.lockName ? `编辑 MCP 服务器 · ${form.serverName}` : '添加 MCP 服务器'}
        visible={editVisible}
        onCancel={() => setEditVisible(false)}
        footer={null}
        width={620}
        closeOnEsc
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'inline-flex', padding: 3, border: '1px solid var(--g-line)', borderRadius: 9 }}>
            {(['form', 'json'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  border: 'none', padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: mode === m ? 'var(--g-bg-raised, #fff)' : 'transparent',
                  color: mode === m ? 'var(--g-text)' : 'var(--g-text-muted)',
                  fontWeight: mode === m ? 500 : 400,
                }}
              >
                {m === 'form' ? '表单配置' : 'JSON 配置'}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--g-text-muted)' }}>两种模式内容互通，切回来不丢</span>
        </div>

        {mode === 'form' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <Typography.Text strong style={{ fontSize: 12.5 }}>服务器名称（即工具命名空间）</Typography.Text>
              <Input
                value={form.serverName}
                disabled={form.lockName}
                placeholder="chrome-devtools"
                onChange={(v) => setForm({ ...form, serverName: v })}
                style={{ marginTop: 5 }}
              />
              <div style={{ fontSize: 11, color: 'var(--g-text-muted)', marginTop: 4 }}>
                Agent 看到的工具名为 mcp__{form.serverName || '…'}__工具名；仅小写字母、数字、中划线
              </div>
            </div>
            <div>
              <Typography.Text strong style={{ fontSize: 12.5 }}>传输类型</Typography.Text>
              <div style={{ display: 'inline-flex', gap: 6, marginTop: 5 }}>
                {([
                  { key: 'stdio', label: 'stdio（本地进程）' },
                  { key: 'sse', label: 'SSE' },
                  { key: 'http', label: 'Streamable HTTP' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setForm({ ...form, transport: opt.key })}
                    style={{
                      border: `1px solid ${form.transport === opt.key ? ACCENT : 'var(--g-line)'}`,
                      background: form.transport === opt.key ? 'color-mix(in srgb, var(--g-accent) 8%, transparent)' : 'transparent',
                      color: form.transport === opt.key ? ACCENT : 'var(--g-text-muted)',
                      borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {form.transport === 'stdio' ? (
              <>
                <div>
                  <Typography.Text strong style={{ fontSize: 12.5 }}>命令</Typography.Text>
                  <Input
                    value={form.command}
                    onChange={(v) => setForm({ ...form, command: v })}
                    placeholder="npx"
                    style={{ marginTop: 5, fontFamily: MONO }}
                  />
                </div>
                <div>
                  <Typography.Text strong style={{ fontSize: 12.5 }}>参数（每行一个）</Typography.Text>
                  <TextArea
                    value={form.argsText}
                    onChange={(v) => setForm({ ...form, argsText: v })}
                    placeholder={'chrome-devtools-mcp@latest\n--headless=true'}
                    rows={2}
                    style={{ marginTop: 5, fontFamily: MONO }}
                  />
                </div>
                <div>
                  <Typography.Text strong style={{ fontSize: 12.5 }}>环境变量（每行 KEY=VALUE）</Typography.Text>
                  <TextArea
                    value={form.envText}
                    onChange={(v) => setForm({ ...form, envText: v })}
                    placeholder="GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxx"
                    rows={2}
                    style={{ marginTop: 5, fontFamily: MONO }}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Typography.Text strong style={{ fontSize: 12.5 }}>服务器地址</Typography.Text>
                  <Input
                    value={form.url}
                    onChange={(v) => setForm({ ...form, url: v })}
                    placeholder="http://127.0.0.1:3910/mcp"
                    style={{ marginTop: 5, fontFamily: MONO }}
                  />
                </div>
                <div>
                  <Typography.Text strong style={{ fontSize: 12.5 }}>请求头（每行 KEY: VALUE，鉴权用）</Typography.Text>
                  <TextArea
                    value={form.headersText}
                    onChange={(v) => setForm({ ...form, headersText: v })}
                    placeholder="Authorization: Bearer xxx"
                    rows={2}
                    style={{ marginTop: 5, fontFamily: MONO }}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            <Typography.Text strong style={{ fontSize: 12.5 }}>mcpServers JSON</Typography.Text>
            <TextArea
              value={jsonText}
              onChange={(v) => { setJsonText(v); setJsonError(null); }}
              rows={13}
              style={{ marginTop: 5, fontFamily: MONO, fontSize: 12 }}
            />
            <div style={{ fontSize: 11, color: 'var(--g-text-muted)', marginTop: 5, lineHeight: 1.7 }}>
              与 Claude Desktop / Cursor 的配置同构；服务器名称取自 JSON 键。stdio 用 command / args / env，远程用 type + url + headers。
            </div>
            {jsonError && (
              <div style={{ fontSize: 11.5, color: 'var(--g-danger)', marginTop: 6 }}>{jsonError}</div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <Switch checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} />
          <span style={{ fontSize: 12.5 }}>保存后立即连接并发现工具</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <Button onClick={() => setEditVisible(false)}>取消</Button>
          <Button theme="solid" style={{ background: ACCENT }} loading={saving} onClick={() => void handleSave()}>
            保存并连接
          </Button>
        </div>
      </Modal>

      {/* ---------- 工具管理弹窗（按工具粒度启停 + 试调用） ---------- */}
      <Modal
        title={`${toolsServer || ''} · 工具管理（${tools.length}）`}
        visible={toolsServer != null}
        onCancel={() => setToolsServer(null)}
        footer={null}
        width={680}
      >
        {toolsLoading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--g-text-muted)' }}>加载中…</div>
        ) : tools.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--g-text-muted)' }}>
            未发现工具（连接后自动同步）
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tools.map((tool) => (
              <div
                key={tool.fullName}
                style={{
                  border: '1px solid var(--g-line, #e8e8ec)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  opacity: tool.enabled ? 1 : 0.62,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--g-bg-sunken, #fbfbfc)', padding: '8px 12px', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, textDecoration: tool.enabled ? 'none' : 'line-through' }}>
                      {tool.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--g-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tool.description || '（无描述）'}
                    </div>
                  </div>
                  <Button size="small" theme="borderless" loading={calling === tool.name} onClick={() => void tryCall(tool)}>
                    试调用
                  </Button>
                  <Switch checked={tool.enabled} onChange={() => void toggleTool(tool)} />
                </div>
                {tool.inputSchema && Object.keys(tool.inputSchema).length > 0 && (
                  <pre
                    style={{
                      margin: 0, padding: '8px 12px', fontSize: 10.5, lineHeight: 1.6,
                      color: 'var(--g-text-muted)', background: 'var(--g-bg-raised)',
                      borderTop: '1px solid var(--g-line-soft, #f0f0f3)',
                      maxHeight: 130, overflow: 'auto', fontFamily: MONO,
                    }}
                  >
{JSON.stringify(tool.inputSchema, null, 2)}
                  </pre>
                )}
                {callResult?.tool === tool.name && (
                  <pre
                    style={{
                      margin: 0, padding: '8px 12px', fontSize: 10.5, lineHeight: 1.6,
                      color: callResult.ok ? 'var(--g-text)' : 'var(--g-danger)',
                      background: 'var(--g-bg-sunken, #fbfbfc)',
                      borderTop: '1px solid var(--g-line-soft, #f0f0f3)',
                      maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      fontFamily: MONO,
                    }}
                  >
{callResult.ok ? callResult.text : `✗ ${callResult.text}`}
                  </pre>
                )}
              </div>
            ))}
            <div style={{ fontSize: 11, color: 'var(--g-text-muted)', lineHeight: 1.7, marginTop: 4 }}>
              停用的工具立即退出 Agent 工具目录，配置保留；服务器重连只更新 schema/描述，不覆盖启停。与下方「工具目录」表格的行开关是同一份数据。
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default McpServerSection;
