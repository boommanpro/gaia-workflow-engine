/**
 * 节点契约 Schema 前端索引（P-01 单一来源）：直接 import 后端 node-schemas 资源，
 * 供「参数 Schema」查看器派生渲染——前端不复制第二套字段规则（NC-04）。
 * 与 index.ts 导入 defaults/index 的相对路径约定一致。
 */
import workflow from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/workflow.schema.json';
import variable from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/variable.schema.json';
import stringFormat from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/string-format.schema.json';
import start from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/start.schema.json';
import loop from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/loop.schema.json';
import llm from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/llm.schema.json';
import http from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/http.schema.json';
import end from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/end.schema.json';
import cont from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/continue.schema.json';
import condition from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/condition.schema.json';
import comment from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/comment.schema.json';
import code from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/code.schema.json';
import brk from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/break.schema.json';
import branches from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/branches.schema.json';
import blockStart from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/block-start.schema.json';
import blockEnd from '../../../../api/gaia-workflow/gaia-workflow-app/src/main/resources/node-schemas/block-end.schema.json';

const SCHEMAS: Record<string, Record<string, any>> = {
  'block-end': blockEnd,
  'block-start': blockStart,
  branches,
  break: brk,
  code,
  comment,
  condition,
  continue: cont,
  end,
  http,
  llm,
  loop,
  start,
  'string-format': stringFormat,
  variable,
  workflow,
};

/** 类型的契约 Schema（只读引用，勿修改）；未登记返回 null */
export function nodeSchemaOf(type: string | undefined | null): Record<string, any> | null {
  if (!type) return null;
  return SCHEMAS[String(type)] ?? null;
}
