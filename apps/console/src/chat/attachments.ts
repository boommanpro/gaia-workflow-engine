/**
 * 文本附件的内联约定 —— 发送方（ChatComposer）与展示方（消息列表）共用，单一来源。
 *
 * 附件内容以「【附件 名】+ 代码围栏」拼进用户消息正文：模型与用户看到同一份内容，
 * 不另建隐藏通道；气泡渲染时按同一约定把附件块折叠回文件名 chips。
 * 会话标题等派生文案（首条消息截断）也用它剥离附件块，避免标题混入附件标记。
 */
export interface AttachedFile {
  name: string;
  size: number;
  content: string;
}

/** 把附件拼成追加在正文之后的块（lang 取文件扩展名，帮助模型识别） */
export function inlineAttachments(files: AttachedFile[]): string {
  return files
    .map((f) => {
      const lang = (f.name.split('.').pop() || '').toLowerCase();
      return `\n\n【附件 ${f.name}】\n\`\`\`${lang}\n${f.content}\n\`\`\``;
    })
    .join('');
}

const ATTACH_ITEM_RE = /【附件 (.+?)】\n```/g;
const ATTACH_HEAD_RE = /\n?【附件 .+?】\n```/;

/** 正文中的附件块拆出来：text 为去尾随空白的正文，files 为附件名（无附件则原样返回） */
export function splitAttachments(content: string): { text: string; files: string[] } {
  const idx = content.search(ATTACH_HEAD_RE);
  if (idx < 0) return { text: content, files: [] };
  const files = [...content.slice(idx).matchAll(ATTACH_ITEM_RE)].map((m) => m[1]);
  return { text: content.slice(0, idx).replace(/\s+$/, ''), files };
}
