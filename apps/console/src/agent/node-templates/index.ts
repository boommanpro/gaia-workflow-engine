import { cloneDeep, mergeWith } from 'lodash-es';
import { nanoid } from 'nanoid';

import defaults from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-catalog/defaults.json';
import catalog from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-catalog/index.json';

export interface NodeTemplate {
  id: string;
  type: string;
  data: Record<string, any>;
}

const templates: Record<string, Record<string, any>> = defaults;
const supportedTypes = catalog.nodes.filter((node) => node.capabilities.aiCreatable).map((node) => node.type);

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
  return cloneDeep(templates[type]);
}
