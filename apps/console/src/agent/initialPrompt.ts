/**
 * 首页（DeepSeek 风对话入口）发起的「首条消息」承接。
 *
 * 首页创建会话后把「目标会话 + 用户输入」暂存到这里，再由 AI 工作区消费一次
 * （取走即清空）。带 sessionKey 是为了：工作区挂载时若 URL 还没落到目标会话，
 * 就**先不动这条消息**，避免被工作区的一次早期渲染消费掉后丢失。
 */
export interface PendingPrompt {
  /** 目标会话；缺省表示不校验会话 */
  sessionKey?: string;
  text: string;
  /** 随首条消息一起发出的图片（base64 data URL） */
  images?: string[];
}

let pending: PendingPrompt | null = null;

export const setInitialPrompt = (text: string | null, sessionKey?: string, images?: string[]) => {
  const hasText = !!text;
  const hasImages = !!images && images.length > 0;
  pending = hasText || hasImages ? { text: text ?? '', sessionKey, images } : null;
};

/**
 * 取出待发送的首条消息（取走即清空）。
 * 传入 sessionKey 时，仅当它与暂存的目标会话一致才消费；不一致则保留、返回 null。
 */
export const takeInitialPrompt = (sessionKey?: string): PendingPrompt | null => {
  if (!pending) return null;
  if (pending.sessionKey && sessionKey && pending.sessionKey !== sessionKey) return null;
  const prompt = pending;
  pending = null;
  return prompt;
};

/** 不做消费、仅探测（调试用）；返回整个待发消息，便于判断是否含图片 */
export const peekInitialPrompt = (): PendingPrompt | null => pending;
