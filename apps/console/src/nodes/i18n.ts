/**
 * Helpers for localizing node labels and descriptions.
 *
 * Nodes carry an English `type` (e.g. `llm`, `multi-condition`). The node
 * panel and form header previously used that raw `type` as the visible label
 * and an English `info.description`. We centralize the lookup here so every
 * surface shows the user-facing language consistently.
 */
import { t } from '../i18n';
import { WorkflowNodeType } from './constants';

/** Map a node `type` string to its localized display label. */
export const getNodeLabel = (type: string): string => {
  switch (type) {
    case WorkflowNodeType.Start:
      return t('node.label.start');
    case WorkflowNodeType.End:
      return t('node.label.end');
    case WorkflowNodeType.LLM:
      return t('node.label.llm');
    case WorkflowNodeType.HTTP:
      return t('node.label.http');
    case WorkflowNodeType.Code:
      return t('node.label.code');
    case WorkflowNodeType.Variable:
      return t('node.label.variable');
    case WorkflowNodeType.Condition:
      return t('node.label.condition');
    case WorkflowNodeType.MultiCondition:
      return t('node.label.multi-condition');
    case WorkflowNodeType.Branches:
      return t('node.label.branches');
    case WorkflowNodeType.Loop:
      return t('node.label.loop');
    case WorkflowNodeType.BlockStart:
      return t('node.label.block-start');
    case WorkflowNodeType.BlockEnd:
      return t('node.label.block-end');
    case WorkflowNodeType.Comment:
      return t('node.label.comment');
    case WorkflowNodeType.Continue:
      return t('node.label.continue');
    case WorkflowNodeType.Break:
      return t('node.label.break');
    case WorkflowNodeType.StringFormat:
      return t('node.label.string-format');
    case WorkflowNodeType.Workflow:
      return t('node.label.workflow');
    case WorkflowNodeType.Assignee:
      return t('node.label.assignee');
    default:
      return type;
  }
};

/** Map a node `type` string to its localized description. */
export const getNodeDescription = (type: string): string => {
  switch (type) {
    case WorkflowNodeType.Start:
      return t('node.desc.start');
    case WorkflowNodeType.End:
      return t('node.desc.end');
    case WorkflowNodeType.LLM:
      return t('node.desc.llm');
    case WorkflowNodeType.HTTP:
      return t('node.desc.http');
    case WorkflowNodeType.Code:
      return t('node.desc.code');
    case WorkflowNodeType.Variable:
      return t('node.desc.variable');
    case WorkflowNodeType.Condition:
      return t('node.desc.condition');
    case WorkflowNodeType.MultiCondition:
      return t('node.desc.multi-condition');
    case WorkflowNodeType.Branches:
      return t('node.desc.branches');
    case WorkflowNodeType.Loop:
      return t('node.desc.loop');
    case WorkflowNodeType.BlockStart:
      return t('node.desc.block-start');
    case WorkflowNodeType.BlockEnd:
      return t('node.desc.block-end');
    case WorkflowNodeType.Continue:
      return t('node.desc.continue');
    case WorkflowNodeType.Break:
      return t('node.desc.break');
    case WorkflowNodeType.StringFormat:
      return t('node.desc.string-format');
    case WorkflowNodeType.Workflow:
      return t('node.desc.workflow');
    case WorkflowNodeType.Assignee:
      return t('node.desc.assignee');
    default:
      return '';
  }
};
