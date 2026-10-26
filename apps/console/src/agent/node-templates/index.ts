import { cloneDeep, mergeWith } from 'lodash-es';
import { nanoid } from 'nanoid';

import defaults from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-catalog/defaults.json';
import catalog from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-catalog/index.json';
import llmSchema from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/llm.schema.json';

export interface NodeTemplate {
  id: string;
  type: string;
  data: Record<string, any>;
}

const templates: Record<string, Record<string, any>> = defaults;
const supportedTypes = catalog.nodes.filter((node) => node.capabilities.aiCreatable).map((node) => node.type);

/**
 * 表单 schema 扩展（node-schemas/*.schema.json 的 x-gaia-form-inputs）按类型索引。
 * 有扩展的类型，data.inputs 一律由它派生——与后端 NodeDataNormalizer.alignFormInputs 同一事实源。
 * 此前 defaults.json 里另存一份裸 inputs（无 required / 无 extra.formComponent），手动添加的 llm
 * 节点与 AI 归一化出的节点表单分叉（prompt 不是大编辑器、无必填星）。新增带扩展的 schema 时在此登记
 * （contract 测试守卫：每个带扩展的 schema 都必须登记）。
 */
const FORM_INPUTS_BY_TYPE: Record<string, Record<string, any> | undefined> = {
  llm: (llmSchema as Record<string, any>)['x-gaia-form-inputs'],
};

/** 类型的规范表单 schema（深拷贝）；无扩展返回 null */
export function formInputsSchemaOf(type: string): Record<string, any> | null {
  const extension = FORM_INPUTS_BY_TYPE[type];
  return extension && extension.properties ? cloneDeep(extension) : null;
}

/** 规范表单字段顺序（渲染顺序以此为准，不受存量数据键序影响） */
export function formInputOrderOf(type: string): string[] {
  const extension = FORM_INPUTS_BY_TYPE[type];
  return extension && extension.properties ? Object.keys(extension.properties) : [];
}

export function createNodeByType(
  type: string,
  data?: Record<string, any>,
  title?: string
): NodeTemplate {
  const mergedData = mergeWith(cloneDefaultData(type), data ?? {}, (_current: unknown, incoming: unknown) =>
    Array.isArray(incoming) ? cloneDeep(incoming) : undefined
  );
  if (title !== undefined) mergedData.title = title;
  return { id: `${type}_${nanoid(6)}`, type, data: mergedData };
}

export function getSupportedNodeTypes(): string[] {
  return [...supportedTypes];
}

export function cloneDefaultData(type: string): Record<string, any> {
  if (!supportedTypes.includes(type) || !Object.prototype.hasOwnProperty.call(templates, type)) {
    throw new Error(`不支持的节点类型：${type}`);
  }
  const data = cloneDeep(templates[type]);
  const formInputs = formInputsSchemaOf(type);
  if (formInputs) data.inputs = formInputs;
  return data;
}
