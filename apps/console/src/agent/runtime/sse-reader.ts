/**
 * SSE 增量解析器 —— 按字节流喂入，按帧吐出。
 *
 * 对比旧实现（每来一个 chunk 就对整个缓冲区 split('\n')）：
 *  · 只从上次扫描位置继续找行尾，大事件分多个 chunk 到达时不再 O(n²) 重扫；
 *  · 正确处理 \r\n / 单独 \r 行结尾与多行 data:（SSE 规范：多个 data: 行以 \n 连接）；
 *  · comment（:开头）与未知字段按规范忽略；空行触发帧分发。
 */

export interface SseFrame {
  /** 事件名（缺省 message） */
  event: string;
  /** data 体（多行以 \n 连接；可能为空串） */
  data: string;
  /** id: 字段（事件序号，Last-Event-ID 续传依据；缺省 undefined） */
  id?: string;
}

interface PendingFrame {
  event: string;
  id?: string;
  dataLines: string[];
  hasData: boolean;
}

export class SseReader {
  private buf = '';
  /** buf 内已确认为「不完整行」之前的完整扫描位置 */
  private scanPos = 0;
  private pending: PendingFrame | null = null;

  /** 喂入一段解码后的文本，返回本次解析出的完整帧（可能为空数组） */
  push(chunk: string): SseFrame[] {
    this.buf += chunk;
    const frames: SseFrame[] = [];
    const len = this.buf.length;
    let lineStart = this.scanPos;
    let i = this.scanPos;

    const takeLine = (): { line: string; eol: number } | null => {
      // 从 i 开始找下一个行尾（\n 或 \r 或 \r\n）；找不到返回 null（行不完整）
      while (i < len) {
        const code = this.buf.charCodeAt(i);
        if (code === 10) { // \n
          const line = this.buf.slice(lineStart, i);
          return { line, eol: i + 1 };
        }
        if (code === 13) { // \r，可能是 \r\n
          const line = this.buf.slice(lineStart, i);
          return { line, eol: i + 1 + (this.buf.charCodeAt(i + 1) === 10 ? 1 : 0) };
        }
        i++;
      }
      return null;
    };

    let found: { line: string; eol: number } | null;
    // eslint-disable-next-line no-cond-assign
    while ((found = takeLine()) !== null) {
      const { line, eol } = found;
      lineStart = i = eol;
      this.scanPos = eol;
      this.consumeLine(line, frames);
    }
    // 丢弃已消费部分，保留未完成的尾巴（防止缓冲无限增长）
    if (lineStart > 0) {
      this.buf = this.buf.slice(lineStart);
      this.scanPos = 0;
    }
    return frames;
  }

  private consumeLine(line: string, out: SseFrame[]): void {
    if (line === '') {
      // 空行：一帧结束
      if (this.pending && this.pending.hasData) {
        out.push({
          event: this.pending.event || 'message',
          data: this.pending.dataLines.join('\n'),
          ...(this.pending.id != null ? { id: this.pending.id } : {}),
        });
      }
      this.pending = null;
      return;
    }
    if (line.startsWith(':')) {
      return; // comment / retry 提示：忽略
    }
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1); // 规范：冒号后可选单空格
    if (field === 'event' || field === 'data' || field === 'id') {
      if (!this.pending) {
        this.pending = { event: '', dataLines: [], hasData: false };
      }
      if (field === 'event') {
        this.pending.event = value;
      } else if (field === 'data') {
        this.pending.dataLines.push(value);
        this.pending.hasData = true;
      } else if (field === 'id' && !value.includes('\0')) {
        this.pending.id = value;
      }
    }
    // 其余字段（retry 等）按规范忽略
  }
}
