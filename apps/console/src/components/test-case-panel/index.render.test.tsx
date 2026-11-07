/**
 * 测试用例面板重设计渲染契约（2026-11-06）：
 * · 用例列表 + 状态统计（未运行 n）+ AI 入口常驻
 * · AI 生成：场景文本输入随请求带给后端（定向生成，2026-11-06 用户要求），草稿勾选后只保存所选
 * · 手工新建：非法 JSON 就地报错、不清空不关窗（阶段 1.4 语义不回归）
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';

// jsdom 没有 canvas：Semi 的传递依赖在 import 阶段取 2d context，先补 stub（同 canvas-history 测试）
const ctxStub: any = new Proxy(
  {},
  {
    get: (_t, key) => (key === 'canvas' ? {} : () => ctxStub),
    set: () => true,
  }
);
(HTMLCanvasElement.prototype as any).getContext = () => ctxStub;

// jsdom 没有 ResizeObserver：Semi Tooltip 的 ReactResizeObserver 挂载即崩
class ResizeObserverStub {
  observe() {}

  unobserve() {}

  disconnect() {}
}
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = ResizeObserverStub;
}

const { TestCasePanel } = await import('./index');

let container: HTMLElement;
let root: Root;
const fetchMock = vi.fn();

const jsonResponse = (data: any) => ({ ok: true, json: () => Promise.resolve(data) });

const clickButton = (text: string) => {
  const btn = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(text)
  );
  if (!btn) throw new Error(`button not found: ${text}`);
  return act(async () => {
    btn.click();
  });
};

const setTextarea = (value: string) => {
  const ta = container.querySelector('textarea');
  if (!ta) throw new Error('textarea not found');
  return act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    setter.call(ta, value);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

const mount = (props: Record<string, unknown> = {}) =>
  act(async () => {
    root.render(
      <TestCasePanel
        workflowCode="wf_x"
        getCanvasJson={() => ({ nodes: [] })}
        getNodes={() => []}
        {...props}
      />
    );
  });

describe('测试用例面板重设计', () => {
  it('列表 + 未运行统计 + AI/新建/全部运行入口', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/test-case/list')) {
        return Promise.resolve(
          jsonResponse([
            { id: 1, name: '空输入兜底', nodeId: null, inputsJson: '{}', expectedJson: '[]' },
            { id: 2, name: '长文本截断', nodeId: 'llm_1', inputsJson: '{}', expectedJson: '[]' },
          ])
        );
      }
      return Promise.resolve(jsonResponse({}));
    });
    await mount();
    await act(async () => {});

    expect(container.textContent).toContain('空输入兜底');
    expect(container.textContent).toContain('长文本截断');
    expect(container.textContent).toContain('2 未运行');
    expect(container.textContent).toContain('AI 生成用例');
    expect(container.textContent).toContain('新建');
    expect(container.textContent).toContain('全部运行');
  });

  it('AI 生成：prompt 随请求带出（定向生成），草稿勾选后只保存所选', async () => {
    fetchMock.mockImplementation((url: string, init?: any) => {
      const u = String(url);
      if (u.includes('/test-case/list')) return Promise.resolve(jsonResponse([]));
      if (u.includes('/test-case/ai-generate')) {
        expect(String(init?.body)).toContain('空输入兜底场景');
        return Promise.resolve(
          jsonResponse({
            cases: [
              {
                name: '空输入兜底',
                nodeId: null,
                inputs: {},
                expected: [{ field: 'output', op: 'exists' }],
              },
              {
                name: '超长文本截断',
                nodeId: null,
                inputs: {},
                expected: [{ field: 'output', op: 'equals', value: '20' }],
              },
            ],
          })
        );
      }
      if (u.includes('/test-case/create')) return Promise.resolve(jsonResponse({}));
      return Promise.resolve(jsonResponse({}));
    });
    await mount();
    await act(async () => {});

    await clickButton('AI 生成用例');
    await setTextarea('空输入兜底场景');
    await clickButton('生成建议');
    await act(async () => {});

    expect(container.textContent).toContain('超长文本截断');
    expect(container.textContent).toContain('保存所选（2）');

    const checkboxes = container.querySelectorAll('input[type=checkbox]');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    await act(async () => {
      (checkboxes[0] as HTMLInputElement).click();
    });
    expect(container.textContent).toContain('保存所选（1）');

    await clickButton('保存所选');
    await act(async () => {});

    const createCalls = (fetchMock.mock.calls as any[]).filter(([u]) =>
      String(u).includes('/test-case/create')
    );
    expect(createCalls).toHaveLength(1);
    expect(String(createCalls[0][1]?.body)).toContain('超长文本截断');
    expect(String(createCalls[0][1]?.body)).not.toContain('空输入兜底');
  });

  it('手工新建：非法 mock JSON 就地报错、不清空不关窗', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(String(url).includes('/test-case/list') ? jsonResponse([]) : jsonResponse({}))
    );
    await mount();
    await act(async () => {});

    await clickButton('新建');
    const nameInput = container.querySelector('input[placeholder*="用例名"]') as HTMLInputElement;
    expect(nameInput).toBeTruthy();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(nameInput, '坏 JSON 用例');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // 填一条断言（否则保存按钮禁用，校验逻辑走不到 JSON 解析）
    const fieldInput = container.querySelector('input[placeholder*="字段"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(fieldInput, 'output');
      fieldInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // mock 输入框（TextArea）：输入非法 JSON
    const textareas = container.querySelectorAll('textarea');
    expect(textareas.length).toBeGreaterThan(0);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(textareas[0], '{oops');
      textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clickButton('保存用例');
    await act(async () => {});

    expect(container.textContent).toContain('输入不是合法 JSON');
    // 现场保留：新建表单没有关掉
    expect(container.querySelector('input[placeholder*="用例名"]')).toBeTruthy();
    expect((container.querySelectorAll('textarea')[0] as HTMLTextAreaElement).value).toBe('{oops');
  });
});
