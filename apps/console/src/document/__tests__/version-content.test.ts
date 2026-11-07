/**
 * 内容键契约（2026-11-04 用户决策·B「完全按直觉」）：
 *  · 任何序列化差异都算内容变更——节点坐标（meta.position）参与比对，
 *    拖动节点即产生「未发布的修改」，可发布携带新坐标的新版本
 *  · 参数 / 结构变更同样改变内容键
 *  · versionContentKey 与 canvasContentKey 走同一序列化管线，可直接比对
 */
import { describe, expect, it } from 'vitest';

import { WorkflowDocument } from '../workflow-document';
import { canvasContentKey, versionContentKey } from '../version-content';

const baseDsl = {
  nodes: [
    { id: 'n1', type: 'start', meta: { position: { x: 0, y: 0 } }, data: { a: 1 } },
    { id: 'n2', type: 'llm', meta: { position: { x: 200, y: 0 } }, data: { prompt: 'p' } },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
};

const movedDsl = {
  nodes: [
    { id: 'n1', type: 'start', meta: { position: { x: 999, y: 999 } }, data: { a: 1 } },
    { id: 'n2', type: 'llm', meta: { position: { x: 200, y: 0 } }, data: { prompt: 'p' } },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
};

const editedDsl = {
  nodes: [
    { id: 'n1', type: 'start', meta: { position: { x: 0, y: 0 } }, data: { a: 2 } },
    { id: 'n2', type: 'llm', meta: { position: { x: 200, y: 0 } }, data: { prompt: 'p' } },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
};

describe('内容键（version-content）', () => {
  it('纯坐标移动 → 内容键改变（拖动即「未发布的修改」，B 标准）', () => {
    expect(canvasContentKey(movedDsl)).not.toBe(canvasContentKey(baseDsl));
  });

  it('参数变更 → 内容键改变', () => {
    expect(canvasContentKey(editedDsl)).not.toBe(canvasContentKey(baseDsl));
  });

  it('versionContentKey 与 canvasContentKey 同管线：同一内容判等', () => {
    const fromVersion = versionContentKey(JSON.stringify(baseDsl));
    const fromCanvas = canvasContentKey(WorkflowDocument.fromJSON(baseDsl).toJSON());
    expect(fromVersion).not.toBeNull();
    expect(fromCanvas).toBe(fromVersion);
  });

  it('空/非法输入：versionContentKey 返回 null，canvasContentKey 不抛错', () => {
    expect(versionContentKey(undefined)).toBeNull();
    expect(versionContentKey('not json{{')).not.toBeNull(); // fromJSON 容错回退空文档，仍产出键
    expect(canvasContentKey(null)).toBe('null');
  });
});
