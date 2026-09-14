/**
 * ChatComposer —— 对话输入区（通用模式与专家模式共用）。
 *
 * 参考成熟对话产品的输入形态：一张圆角卡片，底部左侧放「加东西」的入口（图片），
 * 右下角是一颗圆形发送键；流式输出时它变成「停止」。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toast, Tooltip } from '@douyinfe/semi-ui';
import { IconSend, IconStop, IconImage, IconClose } from '@douyinfe/semi-icons';

import { useAgent } from '../agent/AgentContext';
import { useLanguage, t } from '../i18n';
import { CHAT, ChatStyles } from './theme';

const MAX_IMAGES = 4;

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface ChatComposerProps {
  /** 侧边栏等窄容器使用 */
  compact?: boolean;
  /** 无会话时禁用（发出去也无处落） */
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  /** 与对话列对齐的最大宽度 */
  maxWidth?: number;
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
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  compact = false,
  disabled = false,
  placeholder,
  hint,
  maxWidth = 780,
  headerSlot,
  prefixBuilder,
  draft,
  onDraftChange,
}) => {
  useLanguage();
  const { sendMessage, streaming, stopStreaming, messages, currentSessionKey, renameSession } = useAgent();

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
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /** 供 addImages 读取当前图片数，避免把副作用写进 setState 更新函数 */
  const imagesRef = useRef<string[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const blocked = disabled;
  const canSend = (value.trim().length > 0 || images.length > 0) && !blocked;

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

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) void addImages(Array.from(files));
      if (fileRef.current) fileRef.current.value = '';
    },
    [addImages]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length === 0) return;
      e.preventDefault();
      void addImages(files);
    },
    [addImages]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) void addImages(files);
    },
    [addImages]
  );

  const submit = useCallback(() => {
    if (blocked) return;
    const raw = value.trim();
    if (!raw && images.length === 0) return;
    const prefix = prefixBuilder?.() ?? '';
    const text = `${prefix}${raw}`;
    const payload = images.length > 0 ? images : undefined;
    // 这段对话的第一句话顺便当会话名，免得会话列表里全是「新对话」
    if (messages.length === 0 && raw && currentSessionKey) {
      void renameSession(currentSessionKey, raw.length > 24 ? `${raw.slice(0, 24)}…` : raw);
    }
    setValue('');
    setImages([]);
    void sendMessage(text, payload);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [blocked, value, images, sendMessage, messages.length, currentSessionKey, renameSession, prefixBuilder, setValue]);

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
    ? '0 0 0 3px rgba(77,83,232,0.10)'
    : '0 1px 3px rgba(20,20,40,0.05)';

  const hintText = useMemo(
    () => hint ?? t('chat.inputHint'),
    [hint]
  );

  return (
    <div
      style={{
        padding: compact ? '0 10px 10px' : '0 24px 18px',
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
          background: '#fff',
          boxShadow,
          transition: 'border-color .15s, box-shadow .15s',
          position: 'relative',
        }}
      >
        {/* 顶部插槽：引用条 / 本轮改动条 */}
        {headerSlot}

        {/* 图片预览 */}
        {images.length > 0 && (
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
                  position: 'relative',
                  width: compact ? 52 : 60,
                  height: compact ? 52 : 60,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: `1px solid ${CHAT.line}`,
                }}
              >
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button
                  type="button"
                  title={t('chat.removeImage')}
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
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
          rows={compact ? 2 : 1}
          disabled={disabled}
          placeholder={placeholder ?? t('chat.placeholder')}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: compact ? '10px 12px 2px' : '15px 16px 2px',
            fontSize: compact ? 13 : 14,
            lineHeight: 1.65,
            color: CHAT.text,
            background: 'transparent',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            display: 'block',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <Tooltip content={t('chat.attachImage')} position="top">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={disabled}
                aria-label={t('chat.attachImage')}
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
            <span
              style={{
                fontSize: 11.5,
                color: CHAT.textFaint,
                paddingLeft: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {disabled ? t('chat.noSessionHint') : hintText}
            </span>
          </div>

          {streaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              title={t('chat.stop')}
              style={{
                width: 32,
                height: 32,
                flexShrink: 0,
                border: `1px solid ${CHAT.line}`,
                borderRadius: '50%',
                background: '#fff',
                color: CHAT.textSub,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconStop size="small" />
            </button>
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
                background: canSend ? CHAT.accent : '#dedee6',
                color: '#fff',
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
  );
};

export default ChatComposer;
