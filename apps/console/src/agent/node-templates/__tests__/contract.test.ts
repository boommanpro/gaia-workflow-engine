import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

import { cloneDefaultData, createNodeByType, getSupportedNodeTypes } from '../index';
import { normalizeNodeData } from '../normalize';
import { GENERATABLE_NODE_TYPES } from '../../../document/types';

/**
 * 前后端契约测试（2026-10-24 全严格治理版）：
 * 1. 模板默认 data 通过后端严格 schema（additionalProperties:false + enum + 值包装形状）全量校验；
 * 2. 四处「可用节点类型清单」必须一致（前端 GENERATABLE / 后端 SUPPORTED_TYPES /
 *    工具 schema nodeTypes / node-knowledge 条目）——清单漂移是 AI 误用类型的直接来源；
 * 3. 模板 outputs 覆盖 x-gaia-outputs（引擎真实输出键）。
 * 后端契约文件直接从 monorepo 读取，漂移在 CI 红灯。
 */
const SCHEMAS_DIR = new URL(
  '../../../../../../apps/api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/',
  import.meta.url,
);

// ---------- 迷你 JSON Schema 校验器（覆盖本项目 schema 用到的关键字子集，免新增依赖） ----------
function resolveRef(schema: any, root: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  if (schema.$ref && typeof schema.$ref === 'string' && schema.$ref.startsWith('#/')) {
    let target = root;
    for (const seg of schema.$ref.slice(2).split('/')) {
      target = target?.[seg];
    }
    return target;
  }
  return schema;
}

function validate(value: any, schema: any, root: any, path: string, errors: string[]): void {
  schema = resolveRef(schema, root);
  if (!schema) return;
  if (schema.anyOf) {
    const candidates: string[][] = schema.anyOf.map((sub: any) => {
      const subErrors: string[] = [];
      validate(value, sub, root, path, subErrors);
      return subErrors;
    });
    if (candidates.every((e) => e.length > 0)) {
      errors.push(`${path}: 不满足 anyOf 约束——各候选形状的失败原因: ${candidates.map((e) => e[0]).join(' / ')}`);
    }
    return;
  }
  if (schema.enum && !schema.enum.some((v: any) => v === value)) {
    errors.push(`${path}: "${JSON.stringify(value)}" 不在枚举 [${schema.enum.join(', ')}] 内`);
    return;
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const ok = types.some((t: string) => {
      switch (t) {
        case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
        case 'array': return Array.isArray(value);
        case 'string': return typeof value === 'string';
        case 'integer': return typeof value === 'number' && Number.isInteger(value);
        case 'number': return typeof value === 'number';
        case 'boolean': return typeof value === 'boolean';
        case 'null': return value === null;
        default: return true;
      }
    });
    if (!ok) {
      errors.push(`${path}: 期望 ${types.join('|')}，实际 ${Array.isArray(value) ? 'array' : typeof value}`);
      return;
    }
  }
  if (typeof value === 'string' && typeof schema.minLength === 'number' && value.length < schema.minLength) {
    errors.push(`${path}: 长度 ${value.length} < minLength ${schema.minLength}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) {
      errors.push(`${path}: 数组长度 ${value.length} < minItems ${schema.minItems}`);
    }
    if (schema.items) value.forEach((v, i) => validate(v, schema.items, root, `${path}[${i}]`, errors));
  }
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push(`${path}: ${value} < minimum ${schema.minimum}`);
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      errors.push(`${path}: ${value} > maximum ${schema.maximum}`);
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const props = schema.properties ?? {};
    for (const key of schema.required ?? []) {
      if (!(key in value) || value[key] === undefined) {
        errors.push(`${path}: 缺必填字段 "${key}"`);
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in props)) {
          errors.push(`${path}: 未知字段 "${key}"（契约 additionalProperties:false，可用字段: ${Object.keys(props).join(', ') || '无'}）`);
        }
      }
    }
    for (const [key, sub] of Object.entries<any>(props)) {
      if (value[key] !== undefined) validate(value[key], sub, root, `${path}/${key}`, errors);
    }
    // additionalProperties 为 schema 对象时（如 inputsValues 的值包装 anyOf），未声明的键也要校验
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      for (const key of Object.keys(value)) {
        if (!(key in props)) {
          validate(value[key], schema.additionalProperties, root, `${path}/${key}`, errors);
        }
      }
    }
  }
}

function schemaOf(type: string): any {
  return JSON.parse(readFileSync(new URL(`${type}.schema.json`, SCHEMAS_DIR), 'utf-8'));
}

// ------------------------------------------------------------------

describe('前端模板 ↔ 后端 node-schemas 契约（严格版）', () => {
  it('每个模板类型都有后端契约文件', () => {
    const schemaTypes = new Set(
      readdirSync(SCHEMAS_DIR).filter((f) => f.endsWith('.schema.json')).map((f) => f.replace('.schema.json', '')),
    );
    for (const type of getSupportedNodeTypes()) {
      expect(schemaTypes.has(type), `模板类型 "${type}" 缺少后端契约文件`).toBe(true);
    }
  });

  it('模板默认 data 通过严格 schema 全量校验（字段名/类型/枚举/包装形状）', () => {
    for (const type of getSupportedNodeTypes()) {
      const schema = schemaOf(type);
      const node = createNodeByType(type, {});
      const errors: string[] = [];
      validate(node.data, schema, schema, '', errors);
      expect(errors, `${type} 模板违反严格契约:\n${errors.join('\n')}`).toEqual([]);
    }
  });

  it('规范输入通过严格 schema（llm/http）', () => {
    const llm = createNodeByType('llm', { inputsValues: { prompt: { type: 'template', content: '总结' }, temperature: { type: 'constant', content: 0.3 } } });
    const llmErrors: string[] = [];
    let llmSchema = schemaOf('llm');
    validate(llm.data, llmSchema, llmSchema, '', llmErrors);
    expect(llmErrors, `llm 扁平写法归一后违反契约:\n${llmErrors.join('\n')}`).toEqual([]);

    const http = createNodeByType('http', {
      api: { method: 'POST', url: 'https://api.gaia.dev/hook' },
      headersValues: { Authorization: { type: 'constant', content: 'Bearer t' } },
      body: { bodyType: 'JSON', json: { type: 'template', content: '{"k":"v"}' } },
      timeout: { timeout: 8000 },
    });
    const httpErrors: string[] = [];
    const httpSchema = schemaOf('http');
    validate(http.data, httpSchema, httpSchema, '', httpErrors);
    expect(httpErrors, `http 扁平写法归一后违反契约:\n${httpErrors.join('\n')}`).toEqual([]);
  });

  it('典型坏形状被严格 schema 拒绝（拼错字段/ref 形状/枚举值）', () => {
    // llm 拼错字段名
    const llmBad = createNodeByType('llm', { modleName: 'gpt' });
    const llmSchema = schemaOf('llm');
    const e1: string[] = [];
    validate({ ...llmBad.data, inputsValues: { modleName: { type: 'constant', content: 'gpt' } } }, llmSchema, llmSchema, '', e1);
    expect(e1.join('\n')).toContain('modleName');

    // ref content 不是数组
    const e2: string[] = [];
    const endSchema = schemaOf('end');
    validate({ inputsValues: { result: { type: 'ref', content: 'start_0.query' } } }, endSchema, endSchema, '', e2);
    expect(e2.join('\n')).toContain('array');

    // operator 用旧文档的 ne（引擎真值是 neq）
    const e3: string[] = [];
    const condSchema = schemaOf('condition');
    validate({
      conditions: [{ key: 'if_match', value: { left: { type: 'ref', content: ['a', 'b'] }, operator: 'ne', right: { type: 'constant', content: 1 } } }],
    }, condSchema, condSchema, '', e3);
    expect(e3.join('\n')).toContain('neq');

    // code 语言 python
    const e4: string[] = [];
    const codeSchema = schemaOf('code');
    validate({ script: { language: 'python', content: 'x' } }, codeSchema, codeSchema, '', e4);
    expect(e4.join('\n')).toContain('python');
  });

  it('模板 outputs 覆盖契约 x-gaia-outputs（引擎真实输出键）', () => {
    for (const type of getSupportedNodeTypes()) {
      const schema = schemaOf(type);
      const outputs: string[] | undefined = schema['x-gaia-outputs'];
      if (!outputs) continue;
      const node = createNodeByType(type, {});
      const templateOutputs = Object.keys(node.data.outputs?.properties ?? {});
      for (const key of outputs) {
        expect(templateOutputs, `${type} 模板 outputs 缺引擎输出键 "${key}"`).toContain(key);
      }
    }
  });
});

describe('前端可生成类型与目录能力一致性', () => {
  it('可生成类型和模板支持类型精确匹配 aiCreatable 能力', () => {
    const catalog = JSON.parse(readFileSync(new URL('../node-catalog/index.json', SCHEMAS_DIR), 'utf-8'));
    const backendTypes = catalog.nodes.filter((node: any) => node.capabilities.aiCreatable).map((node: any) => node.type).sort();
    const frontendTypes = [...GENERATABLE_NODE_TYPES].sort();
    expect(backendTypes, '目录 aiCreatable 能力与前端可生成类型不一致').toEqual(frontendTypes);
    expect(getSupportedNodeTypes().sort()).toEqual(frontendTypes);
    for (const node of catalog.nodes) {
      if (node.capabilities.aiCreatable) {
        expect(createNodeByType(node.type).type).toBe(node.type);
      } else {
        expect(() => createNodeByType(node.type)).toThrow('不支持的节点类型');
      }
    }
  });
});

describe('http 节点契约', () => {
  it('扁平写法归一化为引擎读取的 data.api 形状', () => {
    const data = normalizeNodeData('http', {
      method: 'post',
      url: 'https://api.gaia.dev/hook',
      headers: { Authorization: 'Bearer t' },
      body: '{"k":"v"}',
      timeout: 8000,
    });
    expect(data.api).toMatchObject({ method: 'POST', url: 'https://api.gaia.dev/hook' });
    expect(data.headersValues.Authorization).toMatchObject({ type: 'constant', content: 'Bearer t' });
    expect(data.body).toMatchObject({ bodyType: 'JSON' });
    expect(data.body.json).toMatchObject({ type: 'template', content: '{"k":"v"}' });
    expect(data.timeout).toEqual({ timeout: 8000 });
  });

  it('旧版 inputsValues.url 死口径不再迁移（严格契约会直接拒绝该字段）', () => {
    const data = normalizeNodeData('http', {
      api: { method: 'GET', url: 'https://api.gaia.dev/api' },
      inputsValues: { url: { type: 'constant', content: 'https://old.gaia.dev/api' } },
    });
    expect(data.api).toEqual({ method: 'GET', url: 'https://api.gaia.dev/api' });
    // inputsValues 残留原样保留——由严格 schema 当 unknown 字段拒绝，不再静默搬家
    expect((data as any).inputsValues?.url).toBeDefined();
  });

  it('模板产出的 http 节点：api 形状 + 引擎真实输出（body/headers/statusCode）', () => {
    const node = createNodeByType('http', { api: { method: 'GET', url: 'https://x.dev' } }, '请求');
    expect(node.data.api).toMatchObject({ method: 'GET', url: 'https://x.dev' });
    const outputs = (node.data.outputs as any).properties;
    expect(Object.keys(outputs).sort()).toEqual(['body', 'headers', 'statusCode']);
  });
});

describe('code 模板契约', () => {
  it('默认值深拷贝，不污染共享目录或其他节点', () => {
    const data = cloneDefaultData('code');
    data.outputs.required.push('changed');
    expect(cloneDefaultData('code').outputs.required).toEqual([]);
  });

  it('未知节点类型不再降级为 variable', () => {
    for (const type of ['unknown', 'toString', '__proto__']) {
      expect(() => createNodeByType(type)).toThrow('不支持的节点类型');
    }
  });

  it('创建不再隐式迁移扁平字段', () => {
    const node = createNodeByType('llm', { prompt: 'legacy' });
    expect(node.data.prompt).toBe('legacy');
    expect(node.data.inputsValues.prompt.content).toBe('');
  });

  it('共享模板不携带模型凭证', () => {
    const data = cloneDefaultData('llm');
    expect(data.inputsValues.apiKey).toBeUndefined();
    expect(data.inputsValues.apiHost).toBeUndefined();
  });

  it('规范 HTTP body 和 timeout 不被删除，输入不被修改', () => {
    const data = { body: { bodyType: 'JSON', json: { type: 'template', content: '{}' } }, timeout: { timeout: 8000, retryTimes: 0 } };
    const before = structuredClone(data);
    const first = createNodeByType('http', data);
    const second = createNodeByType('http', first.data);
    expect(first.data.body).toEqual(data.body);
    expect(first.data.timeout).toEqual(data.timeout);
    expect(second.data).toEqual(first.data);
    expect(data).toEqual(before);
  });

  it('默认语言 javascript（与后端引擎合法值 + 知识库推荐一致）', () => {
    const node = createNodeByType('code', {});
    expect((node.data.script as any).language).toBe('javascript');
  });
});

describe('llm 模板契约', () => {
  it('llm 保持 inputsValues 形状（引擎真实读取路径）', () => {
    const node = createNodeByType('llm', { inputsValues: { prompt: { type: 'template', content: '总结：{{start_0.text}}' } } });
    expect(node.data.inputsValues.prompt).toMatchObject({ type: 'template', content: '总结：{{start_0.text}}' });
  });

  it('llm 模板 inputs 与后端 x-gaia-form-inputs 扩展一致（表单 schema 单一事实源防漂移）', () => {
    const schema = schemaOf('llm');
    const formInputs = schema['x-gaia-form-inputs'];
    expect(formInputs, 'llm.schema.json 缺少 x-gaia-form-inputs 扩展').toBeDefined();
    const node = createNodeByType('llm', {});
    expect(Object.keys(node.data.inputs.properties).sort()).toEqual(Object.keys(formInputs.properties).sort());
    // 后端 NodeDataNormalizer 用同一扩展对齐 AI 生成的 llm 节点——
    // 模板（手工添加）、schema 扩展（AI 归一化）两路产出必须逐字段一致，
    // 否则画布表单展示分叉
  });
});
