/**
 * Node data normalization（零兼容版，2026-10-24）——与后端 NodeDataNormalizer 保持同一口径：
 * 只保留「AI 扁平简写 → 规范形状」的转换（llm 六字段、http method/url/headers/params/body/timeout），
 * 不再做 ref 简写、语言别名、裸 script 字符串、旧版 inputsValues 迁移——
 * 非规范形状一律交给严格 schema 打回（错误带字段路径，可自修）。
 */
import { merge } from 'lodash-es';

/**
 * Normalize node data: flat AI-friendly fields → engine canonical shape.
 * @param type node type
 * @param data raw data（可能含扁平简写字段）
 */
export function normalizeNodeData(type: string, data: Record<string, any>): Record<string, any> {
  if (!data) return {};
  const result = merge({}, data);

  switch (type) {
    case 'http':
      normalizeHttpNode(result);
      break;
    case 'llm':
      normalizeLlmNode(result);
      break;
  }

  return result;
}

/**
 * HTTP：扁平 method/url/headers/params/body/timeout → data.api/headersValues/paramsValues/body/timeout
 * （引擎 HttpNodeParser 只读这些路径；inputsValues 是死字段，写入会被严格 schema 拒绝）
 */
function normalizeHttpNode(data: Record<string, any>): void {
  if (!data.api || typeof data.api !== 'object') data.api = {};

  if (!data.api.method || typeof data.api.method !== 'string') {
    const value = takeLoose(data, 'method');
    if (typeof value === 'string' && value) data.api.method = value.toUpperCase();
  }
  if (typeof data.api.method === 'string') {
    data.api.method = data.api.method.toUpperCase();
  }
  if (data.api.url === undefined || data.api.url === '') {
    const value = takeLoose(data, 'url');
    if (value !== undefined && value !== null) data.api.url = value;
  }
  delete data.method;
  delete data.url;

  migrateHeaderLike(data, 'headers', 'headersValues');
  migrateHeaderLike(data, 'params', 'paramsValues');

  const flatBody = data.body;
  if (flatBody !== undefined && !(data.body && typeof data.body === 'object' && (data.body as any).bodyType)) {
    const content = typeof flatBody === 'string' ? flatBody : JSON.stringify(flatBody);
    data.body = { bodyType: 'JSON', json: { type: 'template', content } };
  }

  const flatTimeout = data.timeout;
  if (flatTimeout !== undefined && !(flatTimeout && typeof flatTimeout === 'object' && 'timeout' in flatTimeout)) {
    const n = typeof flatTimeout === 'number' ? flatTimeout : parseInt(String(flatTimeout), 10);
    if (!Number.isNaN(n)) data.timeout = { timeout: n };
  }
}

/** headers/params 简写：{k: 原值} → {k: {type:'constant', content: 原值}} */
function migrateHeaderLike(data: Record<string, any>, from: string, to: string): void {
  const source =
    data[from] && typeof data[from] === 'object' && !Array.isArray(data[from])
      ? (data[from] as Record<string, any>)
      : undefined;
  delete data[from];
  if (!source) return;
  if (!data[to] || typeof data[to] !== 'object') data[to] = {};
  for (const [key, value] of Object.entries(source)) {
    if (data[to][key] === undefined) {
      data[to][key] =
        value && typeof value === 'object' && (value as any).type
          ? value
          : { type: 'constant', content: value, schema: { type: 'string' } };
    }
  }
}

/**
 * LLM：扁平 prompt/systemPrompt/temperature/modelName/apiKey/apiHost → inputsValues 包装
 * （prompt/systemPrompt 用 template——可在内容里写 {{ 上游id.字段 }} 引用）
 */
function normalizeLlmNode(data: Record<string, any>): void {
  if (!data.inputsValues) data.inputsValues = {};

  moveTo(data, 'prompt', 'template');
  moveTo(data, 'systemPrompt', 'template');
  moveTo(data, 'temperature', 'constant');
  moveTo(data, 'modelName', 'constant');
  moveTo(data, 'apiKey', 'constant');
  moveTo(data, 'apiHost', 'constant');
}

/** 扁平字段 → inputsValues 包装（已是包装形状的原样移动；已有值不覆盖） */
function moveTo(data: Record<string, any>, key: string, wrapperType: string): void {
  if (!(key in data)) return;
  if (data.inputsValues[key] === undefined) {
    const content = data[key];
    if (content && typeof content === 'object' && (content as any).type) {
      data.inputsValues[key] = content;
    } else {
      data.inputsValues[key] = {
        type: wrapperType,
        content: wrapperType === 'template' ? canonicalizeTemplateTokens(content) : content,
      };
    }
  }
  delete data[key];
}

/**
 * {{ a.b }} → {{a.b}}：只收敛定界符内侧首尾空白，不动表达式内部。
 * 前端变量校验按 `.` 拆 key 段且不 trim——带空格形式会被误报 Unknown Variable 并拦住试运行；
 * 与后端 NodeDataNormalizer.canonicalizeTemplateTokens 保持同一规范形。
 */
export function canonicalizeTemplateTokens(content: unknown): unknown {
  if (typeof content !== 'string' || !content.includes('{{')) return content;
  return content.replace(/\{\{\s*([^{}]*?)\s*}}/g, '{{$1}}');
}

/** 取出并删除 data 上的扁平字段 */
function takeLoose(data: Record<string, any>, key: string): any {
  const value = data[key];
  delete data[key];
  return value;
}
