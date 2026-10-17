/**
 * Node data normalization layer.
 * Converts LLM-simplified flat fields into flowgram.ai's real nested form structure.
 */
import { merge } from 'lodash-es';

/**
 * Normalize node data from LLM simplified format to flowgram nested format.
 * Handles: ref shorthand, http flat fields, llm flat fields, start output fields.
 * @param type node type
 * @param data raw data from LLM (may contain flat/simplified fields)
 * @returns normalized data with proper nested structure
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
    case 'start':
      normalizeStartNode(result);
      break;
    case 'end':
      normalizeEndNode(result);
      break;
    case 'code':
    case 'string-format':
      normalizeRefShorthand(result);
      break;
    case 'variable':
    case 'condition':
    case 'branches':
    case 'loop':
      normalizeRefShorthand(result);
      break;
  }

  return result;
}

/**
 * Normalize HTTP node: convert flat method/url/headers/params/body/timeout into the
 * engine's canonical nested shape (data.api / headersValues / paramsValues / data.body / data.timeout).
 * LLM may output: { method: "GET", url: "http://...", headers: {...}, body: "..." }
 * Engine reads:   { api: {method, url}, headersValues: {...}, body: {bodyType, json}, timeout: {timeout} }
 * Also migrates the legacy inputsValues.{method,url,...} shape produced by older normalizers.
 */
function normalizeHttpNode(data: Record<string, any>): void {
  if (!data.api || typeof data.api !== 'object') data.api = {};

  // method / url: data.api wins, then flat fields, then legacy inputsValues wrappers
  if ((!data.api.method || typeof data.api.method !== 'string')) {
    const flat = takeLoose(data, 'method');
    const legacy = takeLegacy(data, 'method');
    const value = flat ?? unwrapConstant(legacy);
    if (typeof value === 'string' && value) data.api.method = value.toUpperCase();
  }
  if (data.api.url === undefined || data.api.url === '') {
    const flat = takeLoose(data, 'url');
    const legacy = takeLegacy(data, 'url');
    const value = flat ?? unwrapConstant(legacy);
    if (value !== undefined && value !== null) data.api.url = value;
  }
  delete data.method;
  delete data.url;
  delete data.inputsValues?.method;
  delete data.inputsValues?.url;

  // headers / params: {k: value} → {k: {type:'constant', content: value}} (engine reads wrapped form)
  migrateHeaderLike(data, 'headers', 'headersValues');
  migrateHeaderLike(data, 'params', 'paramsValues');

  // body: flat string → { bodyType:'JSON', json:{type:'template', content} }
  const flatBody = takeLoose(data, 'body');
  const legacyBody = unwrapConstant(takeLegacy(data, 'body'));
  const bodyCandidate = flatBody ?? legacyBody;
  if (bodyCandidate !== undefined && !(data.body && typeof data.body === 'object' && (data.body as any).bodyType)) {
    const content = typeof bodyCandidate === 'string' ? bodyCandidate : JSON.stringify(bodyCandidate);
    data.body = { bodyType: 'JSON', json: { type: 'template', content } };
  }
  delete data.inputsValues?.body;

  // timeout: number → { timeout: n }
  const flatTimeout = takeLoose(data, 'timeout');
  const legacyTimeout = unwrapConstant(takeLegacy(data, 'timeout'));
  const timeoutCandidate = flatTimeout ?? legacyTimeout;
  if (timeoutCandidate !== undefined && !(data.timeout && typeof data.timeout === 'object' && (data.timeout as any).timeout)) {
    const n = typeof timeoutCandidate === 'number' ? timeoutCandidate : parseInt(String(timeoutCandidate), 10);
    if (!Number.isNaN(n)) data.timeout = { timeout: n };
  }
  delete data.inputsValues?.timeout;
}

/** 取出并删除 data 上的扁平字段 */
function takeLoose(data: Record<string, any>, key: string): any {
  const value = data[key];
  delete data[key];
  return value;
}

/** 取出并删除旧版 inputsValues 包装（旧归一化产物，引擎不读） */
function takeLegacy(data: Record<string, any>, key: string): any {
  const value = data.inputsValues?.[key];
  if (data.inputsValues) delete data.inputsValues[key];
  return value;
}

/** {type:'constant', content:x} → x；其他原样返回 */
function unwrapConstant(wrapper: any): any {
  return wrapper && typeof wrapper === 'object' && wrapper.type === 'constant' ? wrapper.content : wrapper;
}

/** headers/params 简写迁移：flat 字段或旧 inputsValues 包装 → 包好 constant 的目标键值对 */
function migrateHeaderLike(data: Record<string, any>, from: string, to: string): void {
  let source: Record<string, any> | undefined;
  if (data[from] && typeof data[from] === 'object' && !Array.isArray(data[from])) {
    source = data[from];
  } else {
    const legacy = data.inputsValues?.[from];
    if (legacy && typeof legacy === 'object' && legacy.content && typeof legacy.content === 'object') {
      source = legacy.content;
    }
  }
  delete data[from];
  delete data.inputsValues?.[from];
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
 * Normalize LLM node: convert flat prompt/temperature/modelName to nested inputsValues.
 * LLM may output: { prompt: "...", systemPrompt: "...", temperature: 0.7, modelName: "..." }
 * flowgram needs: { inputsValues: { prompt: {type:"template",content:"..."}, ... } }
 */
function normalizeLlmNode(data: Record<string, any>): void {
  if (!data.inputsValues) data.inputsValues = {};

  if (data.prompt && typeof data.prompt === 'string') {
    data.inputsValues.prompt = data.inputsValues.prompt || {
      type: 'template',
      content: data.prompt,
    };
    delete data.prompt;
  }
  if (data.systemPrompt && typeof data.systemPrompt === 'string') {
    data.inputsValues.systemPrompt = data.inputsValues.systemPrompt || {
      type: 'template',
      content: data.systemPrompt,
    };
    delete data.systemPrompt;
  }
  if (data.temperature !== undefined && typeof data.temperature === 'number') {
    data.inputsValues.temperature = data.inputsValues.temperature || {
      type: 'constant',
      content: data.temperature,
    };
    delete data.temperature;
  }
  if (data.modelName && typeof data.modelName === 'string') {
    data.inputsValues.modelName = data.inputsValues.modelName || {
      type: 'constant',
      content: data.modelName,
      schema: { type: 'string' },
    };
    delete data.modelName;
  }
  if (data.apiKey && typeof data.apiKey === 'string') {
    data.inputsValues.apiKey = data.inputsValues.apiKey || {
      type: 'constant',
      content: data.apiKey,
    };
    delete data.apiKey;
  }
  if (data.apiHost && typeof data.apiHost === 'string') {
    data.inputsValues.apiHost = data.inputsValues.apiHost || {
      type: 'constant',
      content: data.apiHost,
      schema: { type: 'string' },
    };
    delete data.apiHost;
  }
}

/**
 * Normalize Start node: auto-fill description and default values for output fields.
 */
function normalizeStartNode(data: Record<string, any>): void {
  if (!data.outputs) data.outputs = { type: 'object', properties: {} };
  if (!data.outputs.properties) data.outputs.properties = {};

  // Auto-fill description and default values for output properties
  if (data.outputs.properties) {
    for (const [key, prop] of Object.entries(data.outputs.properties)) {
      const p = prop as Record<string, any>;
      if (!p.description) {
        p.description = key;
      }
      if (p.default === undefined && p.type) {
        p.default = getDefaultValueForType(p.type);
      }
    }
  }
}

/**
 * Normalize End node: ensure inputsValues and inputs schema exist.
 */
function normalizeEndNode(data: Record<string, any>): void {
  if (!data.inputsValues) data.inputsValues = {};
  if (!data.inputs) data.inputs = { type: 'object', properties: {} };
}

/**
 * Normalize a ref content value to the engine's expected [nodeId, field] array form.
 * The engine (ParameterParseUtils) reads content as a JSON array; string "a.b" fails to
 * parse and the ref silently resolves to null (2026-10-11 editor-run regression).
 */
function toRefContent(value: unknown): unknown {
  if (typeof value === 'string') {
    const dot = value.indexOf('.');
    if (dot > 0) return [value.slice(0, dot), value.slice(dot + 1)];
    return [value];
  }
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Convert ref shorthand {ref: "a.b"} to engine form {type: "ref", content: ["a","b"]}.
 * Also handles {ref: ["a.b", "c.d"]} → array passthrough.
 * Recursively scans inputsValues and other fields.
 */
function normalizeRefShorthand(data: Record<string, any>): void {
  if (!data.inputsValues) return;
  for (const key of Object.keys(data.inputsValues)) {
    const val = data.inputsValues[key];
    if (val && typeof val === 'object' && val.type === 'ref' && typeof val.content === 'string') {
      val.content = toRefContent(val.content);
    }
    if (val && typeof val === 'object' && val.ref !== undefined && !val.type) {
      val.type = 'ref';
      val.content = toRefContent(val.ref);
      delete val.ref;
    }
  }
  // Also handle conditions/branches arrays
  if (Array.isArray(data.conditions)) {
    for (const cond of data.conditions) {
      if (cond && typeof cond === 'object') {
        normalizeConditionRef(cond);
      }
    }
  }
  if (Array.isArray(data.branches)) {
    for (const branch of data.branches) {
      if (branch && typeof branch === 'object' && Array.isArray(branch.conditions)) {
        for (const cond of branch.conditions) {
          normalizeConditionRef(cond);
        }
      }
    }
  }
}

function normalizeConditionRef(cond: Record<string, any>): void {
  if (cond.left && typeof cond.left === 'object' && cond.left.ref !== undefined && !cond.left.type) {
    cond.left.type = 'ref';
    cond.left.content = toRefContent(cond.left.ref);
    delete cond.left.ref;
  }
  if (cond.right && typeof cond.right === 'object' && cond.right.ref !== undefined && !cond.right.type) {
    cond.right.type = 'ref';
    cond.right.content = toRefContent(cond.right.ref);
    delete cond.right.ref;
  }
}

function getDefaultValueForType(type: string): any {
  switch (type) {
    case 'string': return '';
    case 'number': return 0;
    case 'boolean': return false;
    case 'object': return {};
    case 'array': return [];
    default: return null;
  }
}
