import { isNil } from 'lodash-es';
import {
  ExecutionContext,
  ExecutionResult,
  FlowGramNode,
  INodeExecutor,
  WorkflowVariableType,
} from '@flowgram.ai/runtime-interface';

import { ConditionItem, ConditionValue, Conditions } from './type';
import { conditionRules } from './rules';
import { conditionHandlers } from './handlers';

export class ConditionExecutor implements INodeExecutor {
  public type = FlowGramNode.Condition;

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const conditions: Conditions = context.node.data?.conditions;
    if (!conditions) {
      return {
        outputs: {},
      };
    }
    const parsedConditions = conditions
      .map((item) => this.parseCondition(item, context))
      .filter((item) => this.checkCondition(item));
    const activatedCondition = parsedConditions.find((item) => this.handleCondition(item));
    if (!activatedCondition) {
      return {
        outputs: {},
      };
    }
    return {
      outputs: {},
      branch: activatedCondition.key,
    };
  }

  private parseCondition(item: ConditionItem, context: ExecutionContext): ConditionValue {
    const { key, value } = item;
    const { left, operator, right } = value;
    const parsedLeft = context.runtime.state.parseRef(left);
    const leftValue = parsedLeft?.value ?? null;
    const leftType = parsedLeft?.type ?? WorkflowVariableType.Null;
    const parsedRight = Boolean(right) ? context.runtime.state.parseValue(right) : null;
    const rightValue = parsedRight?.value ?? null;
    const rightType = parsedRight?.type ?? WorkflowVariableType.Null;
    return {
      key,
      leftValue,
      leftType,
      rightValue,
      rightType,
      operator,
    };
  }

  private checkCondition(condition: ConditionValue): boolean {
    const rule = conditionRules[condition.leftType];
    if (isNil(rule)) {
      throw new Error(`condition left type ${condition.leftType} is not supported`);
    }
    const ruleType = rule[condition.operator];
    if (isNil(ruleType)) {
      throw new Error(`condition operator ${condition.operator} is not supported`);
    }
    if (ruleType !== condition.rightType) {
      // throw new Error(`condition right type expected ${ruleType}, got ${condition.rightType}`);
      return false;
    }
    return true;
  }

  private handleCondition(condition: ConditionValue): boolean {
    const handler = conditionHandlers[condition.leftType];
    if (!handler) {
      throw new Error(`condition left type ${condition.leftType} is not supported`);
    }
    const isActive = handler(condition);
    return isActive;
  }
}
