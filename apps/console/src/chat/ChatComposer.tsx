/**
 * ChatComposer —— 对话输入区（通用模式与专家模式共用）。
 *
 * 参考成熟对话产品的输入形态：一张圆角卡片，底部左侧放「加东西」的入口（图片），
 * 右下角是一颗圆形发送键；流式输出时它变成「停止」。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toast, Tooltip } from '@douyinfe/semi-ui';
import { IconSend, IconStop, IconImage, IconClose, IconFile, IconLoading } from '@douyinfe/semi-icons';

import { useAgent, useRunStreaming } from '../agent/AgentContext';
import { useRuntime, shallowEqual } from '../agent/runtime/store';
import { useLanguage, t } from '../i18n';
import { CHAT, ChatStyles } from './theme';
import { inlineAttachments } from './attachments';

const MAX_IMAGES = 4;
/** 文本附件：内容读取后内联进消息正文（模型上下文才是真正的容量约束） */
const MAX_FILES = 4;
const MAX_FILE_BYTES = 100 * 1024;
/** 支持的文本类附件：MIME text/* / json / yaml 之外再按扩展名兜底（拖拽文件常无 MIME） */
const TEXT_EXT_RE =
  /\.(txt|md|markdown|json|csv|tsv|xml|yaml|yml|log|ini|conf|toml|properties|js|ts|jsx|tsx|py|java|go|rs|c|cpp|h|hpp|cs|php|rb|sql|sh|bat|css|scss|less|html|vue|svelte|dockerfile|makefile)$/i;

function isTextLikeFile(f: File): boolean {
  return f.type.startsWith('text/') || /json|xml|yaml|toml/i.test(f.type) || TEXT_EXT_RE.test(f.name);
}

function formatBytes(n: number): string {
  return n >= 1024 ? `${(n / 1024).toFixed(1)}KB` : `${n}B`;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

interface ChatComposerProps {
  /** 侧边栏等窄容器使用 */
  compact?: boolean;
  /** 无会话时禁用（发出去也无处落） */
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  /** 底部工具行右侧插槽（发送按钮左侧）：模型选择器 / 上下文容量 pill 等 */
  toolbarSlot?: React.ReactNode;
  /** 与对话列对齐的最大宽度；欢迎态传 clamp() 随视口伸缩 */
  maxWidth?: number | string;
  /** 卡片顶部插槽（例如「已选中某节点」的引用条） */
  headerSlot?: React.ReactNode;
  /**
   * 发送时给正文加的前缀。
   * 用于把「我正指着画布上哪个节点」这个上下文一并说给模型听 ——
   * 用户看得见自己发了什么，比暗地里塞进 system 里更可信。
   */
  prefixBuilder?: () => string;
  /** 受控草稿：外部（快捷动作）预填时用；不传则内部自管 */
  draft?: string;
  onDraftChange?: (text: string) => void;
  /** hero：欢迎态的居中大输入卡（更高、更宽），首条消息发出后回落到底部常驻位 */
  variant?: 'default' | 'hero';
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  compact = false,
  disabled = false,
  placeholder,
  hint,
  toolbarSlot,
  maxWidth = 780,
  headerSlot,
  prefixBuilder,
  draft,
  onDraftChange,
  variant = 'default',
}) => {
  useLanguage();
  const { sendMessage, stopStreaming, currentSessionKey, renameSession } = useAgent();
  // 运行态细粒度订阅：高频变化不再拖着重输入区整棵重渲染
  const streaming = useRunStreaming();
  // 停止中状态：请求已发出、等后端终态确认 —— 期间按钮转圈禁点；
  // emptyHistory 只在跨 0 变化（首条消息顺带改会话名的判定）
  const { stopping, emptyHistory } = useRuntime(
    (s) => ({ stopping: s.stopping, emptyHistory: s.messages.length === 0 }),
    shallowEqual
  );

  const [innerValue, setInnerValue] = useState('');
  const controlled = draft !== undefined;
  const value = controlled ? draft : innerValue;
  const setValue = useCallback(
    (next: string) => {
      if (controlled) onDraftChange?.(next);
      else setInnerValue(next);
    },
    [controlled, onDraftChange]
  );
  const [images, setImages] = useState<string[]>([]);
  /** 文本附件（name/size/content）：发送时以「【附件 名】+ 代码块」拼进正文 */
  const [files, setFiles] = useState<{ name: string; size: number; content: string }[]>([]);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /** 供 addImages 读取当前图片数，避免把副作用写进 setState 更新函数 */
  const imagesRef = useRef<string[]>([]);
  /** 供 addFiles 读取当前文件数（同上） */
  const filesRef = useRef<{ name: string; size: number; content: string }[]>([]);
  /** 提交在途标志：延迟清空输入后，防止发送请求未返回时的重复提交 */
  const submittingRef = useRef(false);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const blocked = disabled;
  const canSend =
    (value.trim().length > 0 || images.length > 0 || files.length > 0) && !blocked;

  // 自适应高度：随内容长高，到上限后内部滚动
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = compact ? 140 : 220;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [value, compact]);

  const addImages = useCallback(async (files: File[]) => {
    const onlyImages = files.filter((f) => f.type.startsWith('image/'));
    if (onlyImages.length === 0) return;
    const room = MAX_IMAGES - imagesRef.current.length;
    if (room <= 0) {
      Toast.warning(t('chat.imageLimit', { count: MAX_IMAGES }));
      return;
    }
    if (onlyImages.length > room) Toast.warning(t('chat.imageLimit', { count: MAX_IMAGES }));
    const urls = await Promise.all(onlyImages.slice(0, room).map(readAsDataURL));
    setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
  }, []);

  /** 文本附件入口：类型/大小/数量校验后读出内容（图片走 addImages，互不影响配额） */
  const addFiles = useCallback(async (incoming: File[]) => {
    const accepted: File[] = [];
    for (const f of incoming) {
      if (f.size > MAX_FILE_BYTES) {
        Toast.warning(t('chat.fileTooLarge', { name: f.name, size: `${MAX_FILE_BYTES / 1024}KB` }));
        continue;
      }
      if (!isTextLikeFile(f)) {
        Toast.warning(t('chat.fileUnsupported', { name: f.name }));
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length === 0) return;
    const room = MAX_FILES - filesRef.current.length;
    if (accepted.length > room) Toast.warning(t('chat.fileLimit', { count: MAX_FILES }));
    const slice = accepted.slice(0, Math.max(0, room));
    if (slice.length === 0) return;
    const contents = await Promise.all(slice.map(readAsText));
    setFiles((prev) => [
      ...prev,
      ...slice.map((f, i) => ({ name: f.name, size: f.size, content: contents[i] })),
    ]);
  }, []);

  /** 选择/粘贴/拖拽统一入口：图片与文本文件分流 */
  const addIncoming = useCallback(
    (incoming: File[]) => {
      void addImages(incoming.filter((f) => f.type.startsWith('image/')));
      void addFiles(incoming.filter((f) => !f.type.startsWith('image/')));
    },
    [addImages, addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (selected && selected.length > 0) addIncoming(Array.from(selected));
      if (fileRef.current) fileRef.current.value = '';
    },
    [addIncoming]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const picked: File[] = [];
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) picked.push(file);
        }
      }
      if (picked.length === 0) return;
      e.preventDefault();
      addIncoming(picked);
    },
    [addIncoming]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const dropped = Array.from(e.dataTransfer?.files || []);
      if (dropped.length > 0) addIncoming(dropped);
    },
    [addIncoming]
  );

  const submit = useCallback(() => {
    if (blocked || submittingRef.current) return;
    const raw = value.trim();
    if (!raw && images.length === 0 && files.length === 0) return;
    const prefix = prefixBuilder?.() ?? '';
    // 文本附件内联进正文（模型与用户看到同一份内容）；气泡渲染时按同一约定折叠回 chips。
    // 附件拼在输入之后：会话命名（slice 0..24）与标题派生均不受附件影响
    const text = `${prefix}${raw}${inlineAttachments(files)}`;
    const payload = images.length > 0 ? images : undefined;
    // 这段对话的第一句话顺便当会话名，免得会话列表里全是「新对话」
    if (emptyHistory && raw && currentSessionKey) {
      void renameSession(currentSessionKey, raw.length > 24 ? `${raw.slice(0, 24)}…` : raw);
    }
    // 先发再清空：sendMessage 被拦截（画布同步失败 / 会话创建失败）时输入保留，
    // 用户可原地重试，而不是重新打一遍字（阶段 3.3 的同一处根因）
    submittingRef.current = true;
    void sendMessage(text, payload)
      .then((sent) => {
        if (sent) {
          setValue('');
          setImages([]);
          setFiles([]);
        }
      })
      .finally(() => {
        submittingRef.current = false;
      });
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [blocked, value, images, files, emptyHistory, sendMessage, currentSessionKey, renameSession, prefixBuilder, setValue]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // 中文输入法合成期间回车不应发送
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        submit();
      }
    },
    [submit]
  );

  const borderColor = dragging
    ? CHAT.accent
    : focused
      ? CHAT.accentBorder
      : CHAT.line;
  const boxShadow = focused
    ? '0 0 0 3px rgba(13, 13, 13, 0.06)'
    : '0 1px 3px rgba(20, 20, 40, 0.05)';

  const hintText = useMemo(
    () => hint ?? t('chat.inputHint'),
    [hint]
  );

  return (
    <div
      style={{
        padding: variant === 'hero' ? 0 : compact ? '0 10px 10px' : '0 24px 18px',
        flexShrink: 0,
      }}
    >
      <ChatStyles />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          maxWidth: compact ? '100%' : maxWidth,
          margin: '0 auto',
          border: `1px solid ${borderColor}`,
          borderRadius: CHAT.radius,
          background: 'var(--g-bg-raised)',
          boxShadow,
          transition: 'border-color .15s, box-shadow .15s',
          position: 'relative',
        }}
      >
        {/* 顶部插槽：引用条 / 本轮改动条 */}
        {headerSlot}

        {/* 附件 chip 行：图片缩略图 + 文件（名称/大小）+ 移除 */}
        {(images.length > 0 || files.length > 0) && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              padding: compact ? '10px 10px 0' : '12px 14px 0',
            }}
          >
            {images.map((src, index) => (
              <div
                key={index}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '4px 8px 4px 4px',
                  borderRadius: 10,
                  border: `1px solid ${CHAT.line}`,
                  background: CHAT.bgSunken,
                }}
              >
                <img
                  src={src}
                  alt=""
                  style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 7, display: 'block' }}
                />
                <span style={{ fontSize: 12, color: CHAT.textSub, whiteSpace: 'nowrap' }}>
                  {t('chat.imageName', { n: index + 1 })}
                </span>
                <button
                  type="button"
                  title={t('chat.removeImage')}
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: 'none',
                    background: CHAT.hover,
                    color: CHAT.textMuted,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <IconClose size="extra-small" />
                </button>
              </div>
            ))}
            {files.map((f, index) => (
              <div
                key={`file-${f.name}-${index}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '4px 8px 4px 4px',
                  borderRadius: 10,
                  border: `1px solid ${CHAT.line}`,
                  background: CHAT.bgSunken,
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: CHAT.textMuted,
                    background: CHAT.bg,
                    border: `1px solid ${CHAT.lineSoft}`,
                  }}
                >
                  <IconFile />
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: CHAT.textSub,
                    whiteSpace: 'nowrap',
                    maxWidth: 180,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={f.name}
                >
                  {f.name}
                  <span style={{ color: CHAT.textFaint, marginLeft: 6 }}>{formatBytes(f.size)}</span>
                </span>
                <button
                  type="button"
                  title={t('chat.removeFile')}
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: 'none',
                    background: CHAT.hover,
                    color: CHAT.textMuted,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <IconClose size="extra-small" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={compact ? 2 : variant === 'hero' ? 3 : 1}
          disabled={disabled}
          placeholder={placeholder ?? t('chat.placeholder')}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: compact ? '10px 12px 2px' : variant === 'hero' ? '20px 20px 4px' : '15px 16px 2px',
            fontSize: compact ? 13 : variant === 'hero' ? 15 : 14,
            lineHeight: variant === 'hero' ? 1.7 : 1.65,
            color: CHAT.text,
            background: 'transparent',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            display: 'block',
            minHeight: variant === 'hero' ? 140 : undefined,
            maxHeight: compact ? 140 : 220,
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: compact ? '4px 8px 8px' : '6px 10px 10px',
          }}
        >
          {/* 左侧：「加东西」入口 + 模型 / 上下文等配置插槽 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.txt,.md,.markdown,.json,.csv,.tsv,.xml,.yaml,.yml,.log,.ini,.conf,.toml,.properties,.js,.ts,.jsx,.tsx,.py,.java,.go,.rs,.c,.cpp,.h,.hpp,.cs,.php,.rb,.sql,.sh,.bat,.css,.scss,.less,.html,.vue,.svelte,.dockerfile,.makefile"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <Tooltip content={t('chat.attach')} position="top">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={disabled}
                aria-label={t('chat.attach')}
                style={{
                  width: 30,
                  height: 30,
                  border: 'none',
                  borderRadius: 8,
                  background: 'transparent',
                  color: CHAT.textMuted,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background .14s, color .14s',
                }}
                onMouseEnter={(e) => {
                  if (disabled) return;
                  e.currentTarget.style.background = CHAT.hover;
                  e.currentTarget.style.color = CHAT.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = CHAT.textMuted;
                }}
              >
                <IconImage />
              </button>
            </Tooltip>
            {toolbarSlot}
          </div>

          {/* 右侧：完整快捷键提示 + 发送 / 停止 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
            {!compact && (
              <span
                style={{
                  fontSize: 11.5,
                  color: CHAT.textFaint,
                  whiteSpace: 'nowrap',
                }}
              >
                {disabled ? t('chat.noSessionHint') : hintText}
              </span>
            )}
            {streaming ? (
            <Tooltip content={stopping ? t('chat.stopping') : t('chat.stop')} position="top">
              <button
                type="button"
                onClick={stopStreaming}
                disabled={stopping}
                title={stopping ? t('chat.stopping') : t('chat.stop')}
                style={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  border: `1px solid ${CHAT.line}`,
                  borderRadius: '50%',
                  background: 'var(--g-bg-raised)',
                  color: CHAT.textSub,
                  cursor: stopping ? 'not-allowed' : 'pointer',
                  opacity: stopping ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {stopping ? <IconLoading size="small" /> : <IconStop size="small" />}
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              title={t('chat.send')}
              style={{
                width: 32,
                height: 32,
                flexShrink: 0,
                border: 'none',
                borderRadius: '50%',
                background: canSend ? CHAT.accent : 'var(--g-line)',
                color: 'var(--g-bg-raised)',
                cursor: canSend ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background .15s',
              }}
              onMouseEnter={(e) => {
                if (canSend) e.currentTarget.style.background = CHAT.accentHover;
              }}
              onMouseLeave={(e) => {
                if (canSend) e.currentTarget.style.background = CHAT.accent;
              }}
            >
              <IconSend size="small" />
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatComposer;
