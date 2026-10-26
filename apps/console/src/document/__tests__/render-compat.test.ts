/**
 * render-compat 回归（2026-10-25 会话 b9019b24 实证驱动）：
 * · http api.url / body.json 裸字符串 → template 包装（表单控件按包装形状读取，裸串显示空）；
 * · 已是包装形状的 template 值收敛 {{ a.b }} → {{a.b}}（官方渲染层拆段不 trim，带空格显示 Unknown）；
 * · llm 存量 inputs（旧 5 项必填 / 仅 prompt / 裸声明）整体对齐契约 x-gaia-form-inputs（凭证三字段必填）；
 * · 全程不可变 + 幂等：无变化返回原引用，不修改输入对象。
 */
import { describe, expect, it } from 'vitest';

import { applyRenderCompat } from '../render-compat';
import { formInputsSchemaOf } from '../../agent/node-templates';

describe('applyRenderCompat', () => {
  it('http 裸字符串 url / body.json 包装为 template', () => {
    const dsl = {
      nodes: [
        {
          id: 'http_1',
          type: 'http',
          data: {
            title: '汇率',
            api: { method: 'GET', url: 'https://api.x.dev/{{ start_1.currency }}' },
            body: { bodyType: 'JSON', json: '{"a":1}' },
          },
        },
      ],
      edges: [],
    };
    const out: any = applyRenderCompat(dsl);
    const data = out.nodes[0].data;
    expect(data.api.url).toEqual({
      type: 'template',
      content: 'https://api.x.dev/{{start_1.currency}}',
    });
    expect(data.body.json).toEqual({ type: 'template', content: '{"a":1}' });
  });

  it('已是包装形状的 template token 空格收敛（含嵌套 inputsValues/headersValues）', () => {
    const dsl = {
      nodes: [
        {
          id: 'llm_1',
          type: 'llm',
          data: {
            inputsValues: {
              prompt: { type: 'template', content: 'A {{ start_1.q }} B {{ c + d }}' },
            },
            inputs: { type: 'object', required: ['prompt'], properties: {} },
          },
        },
        {
          id: 'http_1',
          type: 'http',
          data: {
            api: { method: 'POST', url: { type: 'template', content: 'https://x.dev/{{ a.b }}' } },
            headersValues: { 'X-K': { type: 'template', content: 'pre {{ code_1.result }} post' } },
          },
        },
      ],
      edges: [],
    };
    const out: any = applyRenderCompat(dsl);
    expect(out.nodes[0].data.inputsValues.prompt.content).toBe('A {{start_1.q}} B {{c + d}}');
    expect(out.nodes[1].data.api.url.content).toBe('https://x.dev/{{a.b}}');
    expect(out.nodes[1].data.headersValues['X-K'].content).toBe('pre {{code_1.result}} post');
  });

  it('llm 表单 schema 整体对齐契约 x-gaia-form-inputs：旧 5 项 required / 仅 prompt / 裸 inputs 都收敛；键序不同但内容相同的不动', () => {
    const canonical = formInputsSchemaOf('llm')!;
    const reversedProperties = Object.fromEntries(
      Object.keys(canonical.properties).reverse().map((key) => [key, canonical.properties[key]])
    );
    const sameContentDifferentOrder = { ...canonical, properties: reversedProperties };
    const dsl = {
      nodes: [
        {
          id: 'llm_1',
          type: 'llm',
          data: {
            inputsValues: { prompt: { type: 'template', content: 'p' } },
            inputs: {
              type: 'object',
              required: ['modelName', 'apiKey', 'apiHost', 'temperature', 'prompt'],
              properties: { prompt: { type: 'string' } },
            },
          },
        },
        {
          id: 'llm_2',
          type: 'llm',
          data: {
            inputsValues: { prompt: { type: 'template', content: 'q' } },
            inputs: {
              type: 'object',
              required: ['prompt'],
              properties: { prompt: { type: 'string' } },
            },
          },
        },
        {
          id: 'llm_3',
          type: 'llm',
          data: {
            inputsValues: { prompt: { type: 'template', content: 'r' } },
            inputs: sameContentDifferentOrder,
          },
        },
      ],
      edges: [],
    };
    const out: any = applyRenderCompat(dsl);
    expect(out.nodes[0].data.inputs).toEqual(canonical);
    expect(out.nodes[1].data.inputs).toEqual(canonical);
    // 凭证三字段必填 + prompt 大编辑器：手动节点与 AI 归一化节点同一形状
    expect(out.nodes[0].data.inputs.required).toEqual(
      expect.arrayContaining(['modelName', 'apiKey', 'apiHost', 'prompt'])
    );
    expect(out.nodes[0].data.inputs.properties.prompt.extra.formComponent).toBe('prompt-editor');
    // 后端 JSONObject 不保序：内容相同只是键序不同的不改数据（渲染顺序由表单按契约顺序决定）
    expect(out.nodes[2]).toBe(dsl.nodes[2]);
  });

  it('不可变：不改输入对象；无关节点返回原引用；幂等', () => {
    const untouched = { id: 'start_1', type: 'start', data: { outputs: { type: 'object' } } };
    const dsl = {
      nodes: [
        untouched,
        { id: 'http_1', type: 'http', data: { api: { method: 'GET', url: 'https://x.dev' } } },
      ],
      edges: [],
    };
    const snapshot = JSON.stringify(dsl);
    const out: any = applyRenderCompat(dsl);
    expect(JSON.stringify(dsl)).toBe(snapshot);
    expect(out.nodes[0]).toBe(untouched);
    expect(out).not.toBe(dsl);

    const again = applyRenderCompat(out);
    expect(again).toBe(out);
  });

  it('对象输出声明补全：被引用的 object 子字段自动补进声明（会话 84bf1596 buyer.country 实证）', () => {
    const dsl = {
      nodes: [
        { id: 'start_1', type: 'start', data: { outputs: { type: 'object', properties: { q: { type: 'string' } } } } },
        {
          id: 'code_1',
          type: 'code',
          data: {
            outputs: {
              type: 'object',
              properties: {
                buyer: { type: 'object' }, // 未声明 properties
                items: { type: 'array' },
              },
            },
          },
        },
        {
          id: 'llm_1',
          type: 'llm',
          data: {
            inputsValues: {
              prompt: {
                type: 'template',
                content: '国家：{{code_1.buyer.country}} 邮箱：{{code_1.buyer.email}} 数量：{{code_1.items.length}}',
              },
            },
          },
        },
      ],
      edges: [],
    };
    const snapshot = JSON.stringify(dsl);
    const out: any = applyRenderCompat(dsl);
    expect(JSON.stringify(dsl)).toBe(snapshot);

    const buyer = out.nodes[1].data.outputs.properties.buyer;
    expect(buyer.properties.country).toEqual({ type: 'string' });
    expect(buyer.properties.email).toEqual({ type: 'string' });
    // length 是内置访问器，不给数组声明塞 length 字段
    expect(out.nodes[1].data.outputs.properties.items.properties).toBeUndefined();
    // 幂等
    expect(applyRenderCompat(out)).toBe(out);
  });

  it('对象输出声明补全：ref 深路径与中间层 object 补全；非对象字段的越界引用不猜', () => {
    const dsl = {
      nodes: [
        {
          id: 'code_1',
          type: 'code',
          data: {
            outputs: {
              type: 'object',
              properties: {
                order: { type: 'object', properties: { buyer: { type: 'object' } } },
                plain: { type: 'string' },
              },
            },
          },
        },
        {
          id: 'end_1',
          type: 'end',
          data: {
            inputsValues: {
              a: { type: 'ref', content: ['code_1', 'order', 'buyer', 'country'] },
              b: { type: 'ref', content: ['code_1', 'plain', 'sub'] },
            },
          },
        },
      ],
      edges: [],
    };
    const out: any = applyRenderCompat(dsl);
    const order = out.nodes[0].data.outputs.properties.order;
    expect(order.properties.buyer.properties.country).toEqual({ type: 'string' });
    // plain 是 string：深层越界引用不猜（校验器的事）
    expect(out.nodes[0].data.outputs.properties.plain.properties).toBeUndefined();
  });

  it('非对象/缺 nodes 的输入原样返回', () => {
    expect(applyRenderCompat(null)).toBeNull();
    expect(applyRenderCompat({})).toEqual({});
    expect(applyRenderCompat({ nodes: 'x' })).toEqual({ nodes: 'x' });
  });
});
