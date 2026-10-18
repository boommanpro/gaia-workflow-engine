import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

import { createNodeByType, getSupportedNodeTypes } from '../index';
import { normalizeNodeData } from '../normalize';

/**
 * 前端模板 ↔ 后端契约（L4）：直接读取 monorepo 里的后端契约文件
 * （gaia-workflow-app/src/main/resources/node-schemas/*.schema.json），
 * 模板产出必须满足契约的 required 与 x-gaia-outputs——模板漂移在 CI 红灯。
 */
const SCHEMAS_DIR = new URL(
  '../../../../../../apps/api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/',
  import.meta.url,
);

describe('前端模板 ↔ 后端 node-schemas 契约', () => {
  it('每个模板类型都有后端契约文件（assignee 已移除，不再有模板）', () => {
    const schemaFiles = readdirSync(SCHEMAS_DIR).filter((f) => f.endsWith('.schema.json'));
    const schemaTypes = new Set(schemaFiles.map((f) => f.replace('.schema.json', '')));
    for (const type of getSupportedNodeTypes()) {
      if (['comment'].includes(type)) continue; // 纯标注类型无参数契约
      expect(schemaTypes.has(type), `模板类型 "${type}" 缺少后端契约文件`).toBe(true);
    }
  });

  it('模板默认 data 满足契约 required 字段', () => {
    const schemaFiles = readdirSync(SCHEMAS_DIR).filter((f) => f.endsWith('.schema.json'));
    for (const file of schemaFiles) {
      const schema = JSON.parse(readFileSync(new URL(file, SCHEMAS_DIR), 'utf-8'));
      const type = file.replace('.schema.json', '');
      if (!Array.isArray(schema.required) || !getSupportedNodeTypes().includes(type)) continue;
      const node = createNodeByType(type, {});
      for (const key of schema.required) {
        expect(node.data, `${type} 模板缺契约必填字段 "${key}"`).toHaveProperty(key);
      }
    }
  });

  it('模板 outputs 覆盖契约 x-gaia-outputs（引擎真实输出键）', () => {
    const schemaFiles = readdirSync(SCHEMAS_DIR).filter((f) => f.endsWith('.schema.json'));
    for (const file of schemaFiles) {
      const schema = JSON.parse(readFileSync(new URL(file, SCHEMAS_DIR), 'utf-8'));
      const type = file.replace('.schema.json', '');
      const outputs: string[] | undefined = schema['x-gaia-outputs'];
      if (!outputs || !getSupportedNodeTypes().includes(type)) continue;
      const node = createNodeByType(type, {});
      const templateOutputs = Object.keys(node.data.outputs?.properties ?? {});
      for (const key of outputs) {
        expect(templateOutputs, `${type} 模板 outputs 缺引擎输出键 "${key}"`).toContain(key);
      }
    }
  });
});

/**
 * 前端模板 ↔ 执行引擎契约（L4 的第一块）：
 * 模板/归一化的产出形状必须与后端引擎真实读取路径一致。
 * 引擎事实（HttpNodeParser）：只读 data.api / headersValues / paramsValues / data.body / data.timeout，
 * 输出固定为 body/headers/statusCode。
 */
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
    expect(data.inputsValues).toBeUndefined();
  });

  it('旧版 inputsValues.url 形状迁移为 data.api', () => {
    const data = normalizeNodeData('http', {
      api: { method: 'GET' },
      inputsValues: {
        url: { type: 'constant', content: 'https://old.gaia.dev/api' },
        timeout: { type: 'constant', content: 3000 },
      },
    });
    expect(data.api).toEqual({ method: 'GET', url: 'https://old.gaia.dev/api' });
    expect(data.timeout).toEqual({ timeout: 3000 });
  });

  it('模板产出的 http 节点：api 形状 + 引擎真实输出（body/headers/statusCode）', () => {
    const node = createNodeByType('http', { api: { method: 'GET', url: 'https://x.dev' } }, '请求');
    expect(node.data.api).toMatchObject({ method: 'GET', url: 'https://x.dev' });
    const outputs = (node.data.outputs as any).properties;
    expect(Object.keys(outputs).sort()).toEqual(['body', 'headers', 'statusCode']);
  });
});

describe('code 模板契约', () => {
  it('默认语言与后端 prompt 推荐一致（js 系）', () => {
    const node = createNodeByType('code', {});
    expect((node.data.script as any).language).toBe('javascript');
  });
});

describe('llm 模板契约', () => {
  it('llm 保持 inputsValues 形状（引擎真实读取路径）', () => {
    const node = createNodeByType('llm', { prompt: '总结：{{ start_0.text }}' });
    expect((node.data.inputsValues as any).prompt).toMatchObject({ type: 'template', content: '总结：{{ start_0.text }}' });
  });

  it('llm 模板 inputs 与后端 x-gaia-form-inputs 扩展一致（表单 schema 单一事实源防漂移）', () => {
    const schema = JSON.parse(
      readFileSync(new URL('llm.schema.json', SCHEMAS_DIR), 'utf-8'),
    );
    const formInputs = schema['x-gaia-form-inputs'];
    expect(formInputs, 'llm.schema.json 缺少 x-gaia-form-inputs 扩展').toBeDefined();
    const node = createNodeByType('llm', {});
    expect(node.data.inputs).toEqual(formInputs);
    // 后端 NodeDataNormalizer 用同一扩展对齐 AI 生成的 llm 节点——
    // 模板（手工添加）、schema 扩展（AI 归一化）两路产出必须逐字段一致，
    // 否则画布表单展示分叉
  });
});
