/**
 * SseReader 增量解析契约测试：分片喂入、\r\n、多行 data、id/comment 字段。
 * 大事件分多个 chunk 到达时不再重扫整个缓冲（O(n²) 旧根因），语义必须与整串解析一致。
 */
import { describe, expect, it } from 'vitest';

import { SseReader } from '../sse-reader';

/** 按 1 字符一片喂入（最严苛的分片） */
function feedByteByByte(reader: SseReader, text: string) {
  const frames = [];
  for (const ch of text) {
    frames.push(...reader.push(ch));
  }
  return frames;
}

describe('SseReader', () => {
  it('标准两帧：event + data + 空行分隔', () => {
    const reader = new SseReader();
    const frames = reader.push('event: token\ndata: {"content":"你好"}\n\nevent: done\ndata: {}\n\n');
    expect(frames).toEqual([
      { event: 'token', data: '{"content":"你好"}' },
      { event: 'done', data: '{}' },
    ]);
  });

  it('跨 chunk 的事件：分片喂入与整串解析结果一致', () => {
    const wire = 'event: document\ndata: {"dsl":{"nodes":[{"id":"n1"},{"id":"n2"}]}}\n\n';
    const whole = new SseReader().push(wire);
    const split = feedByteByByte(new SseReader(), wire);
    expect(split).toEqual(whole);
    expect(split[0].event).toBe('document');
  });

  it('\\r\\n 与单独 \\r 行尾均按一行处理', () => {
    const reader = new SseReader();
    const frames = reader.push('event: a\r\ndata: 1\r\n\r\n event: b\rdata: 2\r\r'.replace(' event', 'event'));
    expect(frames.map((f) => f.event)).toEqual(['a', 'b']);
  });

  it('多行 data 以 \\n 连接（SSE 规范）', () => {
    const reader = new SseReader();
    const frames = reader.push('event: m\ndata: line1\ndata: line2\n\n');
    expect(frames[0].data).toBe('line1\nline2');
  });

  it('id 字段透传（Last-Event-ID 续传依据），comment 忽略', () => {
    const reader = new SseReader();
    const frames = reader.push(': ping\n\nevent: token\nid: 42\ndata: {"content":"x"}\n\n');
    expect(frames).toHaveLength(1);
    expect(frames[0].id).toBe('42');
    expect(frames[0].event).toBe('token');
  });

  it('冒号后可选空格剥离；data: 空值仍是有效帧', () => {
    const reader = new SseReader();
    const frames = reader.push('event: e\ndata:\n\n');
    expect(frames).toEqual([{ event: 'e', data: '' }]);
  });

  it('无事件的裸 data 帧 → event 缺省 message', () => {
    const reader = new SseReader();
    const frames = reader.push('data: hi\n\n');
    expect(frames).toEqual([{ event: 'message', data: 'hi' }]);
  });
});
