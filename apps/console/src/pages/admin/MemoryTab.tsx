/**
 * 记忆管理（owb 双层记忆对标，2026-10-11）：
 * 手写区（平台约定，界面编辑）+ 条目区（agent remember 工具自记，可删）。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Toast, Popconfirm } from '@douyinfe/semi-ui';
import { agentApi } from '../../agent/api';
import { useLanguage } from '../../i18n';

const ACCENT = '#4d53e8';

interface MemoryEntry {
  id: number;
  content: string;
  source: string;
  updatedAt?: string;
}

const MANUAL_PLACEHOLDER = [
  '如：',
  '- 工作流命名用中文语义名',
  '- code 节点优先 js',
  '- 交付前必须正反两组输入验证',
].join('\n');

export const MemoryTab: React.FC = () => {
  useLanguage();
  const [manual, setManual] = useState('');
  const [items, setItems] = useState<MemoryEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const r = await agentApi.getMemory().catch(() => null);
    if (r) {
      setManual(r.manual || '');
      setItems(r.items || []);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const saveManual = async () => {
    setSaving(true);
    try {
      await agentApi.saveMemoryManual(manual);
      Toast.success('手写区已保存（下次运行生效）');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 手写区 */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>手写区 · 平台约定</div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
          跨会话注入系统提示词（预算内截断）。适合写平台级约定：命名规范、输出风格、固定偏好。
        </div>
        <textarea
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          rows={5}
          placeholder={MANUAL_PLACEHOLDER}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            border: '1px solid #e0e0e6', borderRadius: 8, fontSize: 13,
            fontFamily: 'inherit', resize: 'vertical', outline: 'none', background: '#fff',
          }}
        />
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button theme="solid" style={{ background: ACCENT }} loading={saving} onClick={() => void saveManual()}>
            保存手写区
          </Button>
          <span style={{ fontSize: 12, color: '#aaa' }}>{manual.length} 字符（注入预算 2000）</span>
        </div>
      </div>

      {/* 条目区 */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          条目区 · agent 记住的偏好与事实（{items.length}/30）
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
          由对话中的 memory(remember) 工具写入（自动去重、拦密钥、超量丢最旧）。
        </div>
        {items.length === 0 ? (
          <div style={{ padding: 18, textAlign: 'center', color: '#bbb', fontSize: 13, background: '#fafafc', borderRadius: 8 }}>
            还没有记忆条目 —— 在对话里让 AI「记住这个偏好」即可写入
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: '#fafafc', border: '1px solid #ececf1', borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>
                  {m.source === 'agent' ? 'AI 记的' : '手写'}
                </span>
                <span style={{ fontSize: 13, color: '#333', flex: 1, minWidth: 0 }}>{m.content}</span>
                <Popconfirm title="删除这条记忆？" onConfirm={async () => { await agentApi.deleteMemoryEntry(m.id); void reload(); }}>
                  <Button size="small" theme="borderless" type="danger">删除</Button>
                </Popconfirm>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
