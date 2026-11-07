/**
 * 节点副标题摘要单测（2026-11-05 摘要重写）：
 * · 取数字段与 node-schemas 对齐——钉住 5 处历史字段 Bug 修复
 *   （start 读 outputs / end 读 inputs / llm modelName 解包 / http url 解包 /
 *    variable 读 assign / workflow 读 workflowName）；
 * · 无信息量内容（空脚本、无变量、纯计数）一律不渲染（undefined）；
 * · condition/branches 不再有「N 个条件/分支」计数副标题（卡片主体逐条渲染）。
 */
import { describe, expect, it } from 'vitest';

import { getNodeVisual } from '../node-visuals';

const nodeOf = (data: unknown) =>
  ({
    toJSON: () => ({ data }),
    flowNodeType: '',
  } as any);

const subtitleOf = (type: string, data: unknown): string | undefined => {
  const node = nodeOf(data);
  node.flowNodeType = type;
  return getNodeVisual(type).subtitle?.(node);
};

describe('node-visuals subtitle（摘要与 schema 对齐）', () => {
  it('llm：模型名解包 constant 包装 + 温度 + JSON 输出', () => {
    expect(
      subtitleOf('llm', {
        outputMode: 'json',
        inputsValues: {
          modelName: { type: 'constant', content: 'GLM-4.7' },
          temperature: { type: 'constant', content: 0.7 },
        },
      })
    ).toBe('GLM-4.7 · 温度 0.7 · JSON 输出');
  });

  it('llm：无模型信息则不渲染（不再兜底显示 “LLM”）', () => {
    expect(subtitleOf('llm', { outputMode: 'text', inputsValues: {} })).toBeUndefined();
  });

  it('http：URL 解包 template 包装，方法 + host/path', () => {
    expect(
      subtitleOf('http', {
        api: {
          method: 'GET',
          url: { type: 'template', content: 'https://api.example.com/users/{{start.uid}}' },
        },
      })
    ).toBe('GET api.example.com/users/x');
  });

  it('http：无 URL 不渲染', () => {
    expect(subtitleOf('http', { api: { method: 'GET', url: '' } })).toBeUndefined();
  });

  it('code：函数名 + 语言（不再显示 “JS · N 行”）', () => {
    expect(
      subtitleOf('code', {
        script: { language: 'javascript', content: 'function main(params){\n  return 1;\n}' },
      })
    ).toBe('main() · JavaScript');
    // 箭头函数命名
    expect(
      subtitleOf('code', { script: { language: 'groovy', content: 'const fmt = (x) => x' } })
    ).toBe('fmt() · Groovy');
  });

  it('code：空脚本不渲染', () => {
    expect(subtitleOf('code', { script: { language: 'javascript', content: '' } })).toBeUndefined();
  });

  it('start：outputs.properties 即工作流输入变量（修复旧实现误读 inputs）', () => {
    expect(
      subtitleOf('start', { outputs: { properties: { question: {}, image: {}, extra: {} } } })
    ).toBe('输入 question · image · extra');
    // 超过 3 个以 … 收尾
    expect(
      subtitleOf('start', {
        outputs: { properties: { a: {}, b: {}, c: {}, d: {} } },
      })
    ).toBe('输入 a · b · c …');
    expect(subtitleOf('start', { outputs: { properties: {} } })).toBeUndefined();
  });

  it('end：inputs.properties 即最终输出变量（修复旧实现误读 outputs）', () => {
    expect(subtitleOf('end', { inputs: { properties: { reply: {} } } })).toBe('输出 reply');
    expect(subtitleOf('end', {})).toBeUndefined();
  });

  it('variable：assign 左值列表（修复旧实现误读 assigns）', () => {
    expect(
      subtitleOf('variable', {
        assign: [
          { left: 'userInfo.name' },
          { left: { type: 'ref', content: ['node_1', 'items', '0'] } },
        ],
      })
    ).toBe('赋值 → userInfo.name · items.0');
    expect(subtitleOf('variable', { assign: [] })).toBeUndefined();
  });

  it('workflow：显示 workflowName（修复旧实现误读 workflowCode）', () => {
    expect(subtitleOf('workflow', { workflowName: '订单审核流程' })).toBe('订单审核流程');
    expect(subtitleOf('workflow', { workflowName: '' })).toBeUndefined();
  });

  it('loop：遍历路径 + 上限（替代恒定 “循环容器”）', () => {
    expect(
      subtitleOf('loop', { loopFor: { type: 'ref', content: ['n1', 'items'] }, maxLoopCount: 10 })
    ).toBe('遍历 items · 最多 10 次');
    expect(subtitleOf('loop', {})).toBeUndefined();
  });

  it('string-format：模板首行预览', () => {
    expect(subtitleOf('string-format', { script: { content: '你好 {name}，再见' } })).toBe(
      '你好 {name}，再见'
    );
  });

  it('condition / branches：无副标题（卡片主体逐条渲染，计数属零信息冗余）', () => {
    expect(subtitleOf('condition', { conditions: [{ key: 'ok' }] })).toBeUndefined();
    expect(subtitleOf('branches', { branches: [{ id: 'b1' }] })).toBeUndefined();
  });
});
