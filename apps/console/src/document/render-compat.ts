/**
 * 展示层兼容归一（render-compat）—— DSL 进入前端文档前的形状收敛。
 *
 * 背景（2026-10-25 会话 b9019b24 实证）：
 * · 后端 schema 对 http 的 api.url / body.json 允许裸字符串（anyOf string|template|constant，
 *   引擎 parseUrl/parseBody 双形状兼容），但画布表单控件按 IFlowTemplateValue 包装读取——
 *   裸字符串 URL 在编辑器里显示为空。后端 NodeDataNormalizer 已对新写入做包装；
 *   这里负责存量数据与绕过归一化路径（版本历史、旧会话草稿）的展示修复。
 * · 模板 token 带空格（{{ a.b }}）时官方渲染层（form-materials variable-tag）按 `.` 拆段
 *   不 trim，合法引用显示 Unknown。后端 canonicalizeTemplateTokens 同口径收敛；
 *   这里在接入侧对已是包装形状的 template 值补同样收敛。
 * · llm 表单 schema（data.inputs）以 llm.schema.json 的 x-gaia-form-inputs 为单一事实源
 *   （required / extra.formComponent / description 均来自它，后端 NodeDataNormalizer.alignFormInputs
 *   同源）——存量草稿里的旧口径（5 项全必填 / 仅 prompt 必填 / 裸 inputs 无 formComponent）接入时整体对齐，
 *   内容相同只是键序不同的不动（渲染顺序由表单按 schema 顺序决定）。
 *
 * 全部转换语义无损、幂等；不改 id/type/meta/连线结构。
 */
import { isEqual } from 'lodash-es';

import { formInputsSchemaOf } from '../agent/node-templates';
import { canonicalizeTemplateTokens } from '../agent/node-templates/normalize';

/** 裸字符串 → template 包装（含 token 空格收敛）；已是包装/缺失的原样返回 */
function toTemplateValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return { type: 'template', content: canonicalizeTemplateTokens(value) };
}

/** 递归收敛对象树里所有 {type:'template', content:string} 的 token 空格；无变化时原样返回引用 */
function canonicalizeTemplates(value: any, seen: Set<any>): any {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((item) => {
      const next = canonicalizeTemplates(item, seen);
      if (next !== item) changed = true;
      return next;
    });
    return changed ? out : value;
  }
  if (value.type === 'template' && typeof value.content === 'string') {
    const collapsed = canonicalizeTemplateTokens(value.content);
    return collapsed === value.content ? value : { ...value, content: collapsed };
  }
  let changed = false;
  const out: Record<string, any> = {};
  for (const key of Object.keys(value)) {
    const next = canonicalizeTemplates(value[key], seen);
    if (next !== value[key]) changed = true;
    out[key] = next;
  }
  return changed ? out : value;
}

/** 按节点类型做展示层形状收敛；无变化时原样返回 data 引用 */
function normalizeNodeData(type: string, data: any): any {
  if (!data || typeof data !== 'object') return data;
  let next = data;

  if (type === 'http') {
    // api.url / body.json 裸字符串 → template 包装（表单控件只认包装形状）
    if (next.api && typeof next.api.url === 'string') {
      next = { ...next, api: { ...next.api, url: toTemplateValue(next.api.url) } };
    }
    if (next.body && typeof next.body.json === 'string') {
      next = { ...next, body: { ...next.body, json: toTemplateValue(next.body.json) } };
    }
  }

  if (type === 'llm') {
    // 表单 schema 整体对齐契约（与后端 alignFormInputs 同源）；isEqual 不比键序，
    // 只有 required / 字段声明 / formComponent 实际不同的存量数据才被替换
    const canonical = formInputsSchemaOf('llm');
    if (canonical && !isEqual(next.inputs, canonical)) {
      next = { ...next, inputs: canonical };
    }
  }

  return canonicalizeTemplates(next, new Set());
}

/**
 * 对象输出声明的「引用驱动补全」（与后端 NodeDataNormalizer.completeObjectOutputDeclarations
 * 同口径，2026-10-25 会话 84bf1596 实证）：code 声明 buyer:{type:object} 不写 properties 时，
 * 下游模板 {{code.buyer.country}} 在前端变量树查不到子字段——渲染成 Unknown（运行期 SpEL
 * 深路径解析正常，纯展示契约缺失）。扫描全图引用（ref 深路径 + 模板 token），把「被引用而
 * 未声明」的子字段补进 object 声明（类型默认 string，深层补中间层 object）。
 * length/size 是运行时内置访问器，跳过。
 */
function completeObjectOutputDeclarations(nodes: any[]): boolean {
  const outputsByNode = new Map<string, any>();
  for (const node of nodes) {
    const props = node?.data?.outputs?.properties;
    if (node?.id && props && typeof props === 'object') {
      outputsByNode.set(node.id, props);
    }
  }
  if (outputsByNode.size === 0) return false;
  let changed = false;

  const ensureSub = (parent: any, field: string, isLast: boolean): any => {
    // 原地补全：parent.properties 缺失则创建；返回子字段声明（存在则复用）
    if (!parent.properties || typeof parent.properties !== 'object') {
      parent.properties = {};
      changed = true;
    }
    let child = parent.properties[field];
    if (!child || typeof child !== 'object') {
      child = { type: isLast ? 'string' : 'object' };
      parent.properties[field] = child;
      changed = true;
    }
    return child;
  };

  const seedDeep = (path: string[]) => {
    if (path.length < 3) return;
    const properties = outputsByNode.get(path[0]);
    if (!properties || typeof properties !== 'object') return;
    let current = properties[path[1]];
    if (!current || typeof current !== 'object' || current.type !== 'object') {
      return;
    }
    for (let i = 2; i < path.length; i++) {
      const field = path[i];
      if (field === 'length' || field === 'size') return;
      current = ensureSub(current, field, i === path.length - 1);
      if (current.type !== 'object' && i < path.length - 1) {
        current.type = 'object';
        changed = true;
      }
    }
  };

  const walk = (value: any, seen: Set<any>) => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) walk(item, seen);
      return;
    }
    if (value.type === 'ref' && Array.isArray(value.content)) {
      seedDeep(value.content.map((seg: any) => String(seg)));
      return;
    }
    if (value.type === 'template' && typeof value.content === 'string') {
      const tokenReg = /\{\{\s*([^{}]+?)\s*}}/g;
      let token: RegExpExecArray | null;
      while ((token = tokenReg.exec(value.content))) {
        // path[0] 即节点 id；含空格/运算符的表达式（a + b）拆出的头段不在 map 里，自然跳过
        const path = token[1].trim().split('.').map((s) => s.trim()).filter((s) => s !== '');
        seedDeep(path);
      }
      return;
    }
    for (const key of Object.keys(value)) walk(value[key], seen);
  };

  for (const node of nodes) {
    walk(node?.data, new Set());
  }
  return changed;
}

/**
 * 对整份 DSL 做展示层兼容归一（不可变：无变化时返回原引用，不修改输入对象）。
 * 接入点：WorkflowDocument.fromJSON 与编辑器的原始数据入口。
 */
export function applyRenderCompat(dsl: any): any {
  if (!dsl || !Array.isArray(dsl.nodes)) return dsl;
  let changed = false;
  const nodes = dsl.nodes.map((node: any) => {
    if (!node || typeof node !== 'object') return node;
    const data = normalizeNodeData(String(node.type || ''), node.data);
    if (data === node.data) return node;
    changed = true;
    return { ...node, data };
  });
  // 引用驱动的对象声明补全是原地修改——在深拷贝上探测，有变化才用克隆结果替换，
  // 保证「无变化返回原引用、不修改输入对象」契约（测试断言依赖）
  const probe = JSON.parse(JSON.stringify(nodes));
  if (completeObjectOutputDeclarations(probe)) {
    return { ...dsl, nodes: probe };
  }
  return changed ? { ...dsl, nodes } : dsl;
}
