import { describe, expect, it } from 'vitest';

import { upstreamVariables } from '../upstream-variables';

/**
 * 前端可用变量推断 ↔ 后端引擎同口径（反馈3）：
 * condition 必须暴露 if_match/else 布尔输出（此前前端看不到）。
 */
describe('upstreamVariables（与后端 inferOutputFields 同口径）', () => {
  const nodes = [
    { id: 'start_0', type: 'start', data: { outputs: { type: 'object', properties: { q: { type: 'string' } } } } },
    { id: 'cond_0', type: 'condition', data: { conditions: [{ key: 'if_match', value: {} }] } },
    { id: 'code_0', type: 'code', data: { outputs: { type: 'object', properties: { result: { type: 'string' } } } } },
    { id: 'end_0', type: 'end', data: {} },
  ];
  const edges = [
    { sourceNodeID: 'start_0', targetNodeID: 'cond_0' },
    { sourceNodeID: 'cond_0', targetNodeID: 'code_0' },
    { sourceNodeID: 'code_0', targetNodeID: 'end_0' },
  ];

  it('condition 节点暴露 if_match + else 布尔输出', () => {
    const vars = upstreamVariables(nodes as any, edges as any, 'end_0');
    const cond = vars.find((v) => v.nodeId === 'cond_0');
    expect(cond).toBeDefined();
    const names = cond!.fields.map((f) => f.name);
    expect(names).toContain('if_match');
    expect(names).toContain('else');
  });

  it('start/code 暴露 outputs.properties 声明字段', () => {
    const vars = upstreamVariables(nodes as any, edges as any, 'end_0');
    const start = vars.find((v) => v.nodeId === 'start_0')!;
    expect(start.fields.map((f) => f.name)).toContain('q');
    const code = vars.find((v) => v.nodeId === 'code_0')!;
    expect(code.fields.map((f) => f.name)).toContain('result');
  });

  it('http 节点暴露引擎静态输出 body/headers/statusCode', () => {
    const httpNodes = [
      { id: 's', type: 'start', data: { outputs: { type: 'object', properties: { q: { type: 'string' } } } } },
      { id: 'h', type: 'http', data: {} },
      { id: 'e', type: 'end', data: {} },
    ];
    const httpEdges = [
      { sourceNodeID: 's', targetNodeID: 'h' },
      { sourceNodeID: 'h', targetNodeID: 'e' },
    ];
    const vars = upstreamVariables(httpNodes as any, httpEdges as any, 'e');
    const http = vars.find((v) => v.nodeId === 'h')!;
    expect(http.fields.map((f) => f.name).sort()).toEqual(['body', 'headers', 'statusCode']);
  });

  it('目标节点不存在时返回空', () => {
    expect(upstreamVariables(nodes as any, edges as any, 'ghost')).toEqual([]);
  });
});
