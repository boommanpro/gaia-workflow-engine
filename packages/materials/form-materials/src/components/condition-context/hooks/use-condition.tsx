/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { I18n } from '@flowgram.ai/editor';

import { useTypeManager } from '@/plugins';

import { IConditionRule, ConditionOpConfigs } from '../types';
import { useConditionContext } from '../context';

interface HooksParams {
  leftSchema?: IJsonSchema;
  operator?: string;

  /**
   * custom rule config
   */
  ruleConfig?: {
    ops?: ConditionOpConfigs;
    rules?: Record<string, IConditionRule>;
  };
}

export function useCondition({ leftSchema, operator, ruleConfig }: HooksParams) {
  const typeManager = useTypeManager();
  const { rules: contextRules, ops: contextOps } = useConditionContext();

  // 合并用户规则和上下文规则
  const userRules = useMemo(
    () => ruleConfig?.rules || contextRules || {},
    [contextRules, ruleConfig?.rules]
  );

  // 合并用户操作符和上下文操作符
  const allOps = useMemo(() => ruleConfig?.ops || contextOps || {}, [contextOps, ruleConfig?.ops]);

  // 获取类型配置
  const config = useMemo(
    () => (leftSchema ? typeManager.getTypeBySchema(leftSchema) : undefined),
    [leftSchema, typeManager]
  );

  // 计算规则
  const rule = useMemo(() => {
    if (!config) {
      return undefined;
    }
    if (userRules[config.type]) {
      return userRules[config.type];
    }
    if (typeof config.conditionRule === 'function') {
      return config.conditionRule(leftSchema);
    }
    return config.conditionRule;
  }, [userRules, leftSchema, config]);

  // 计算操作符选项列表
  const opOptionList = useMemo(
    () =>
      Object.keys(rule || {})
        .filter((_op) => allOps[_op])
        .map((_op) => ({
          ...(allOps?.[_op] || {}),
          value: _op,
          label: I18n.t(allOps?.[_op]?.label || _op),
        })),
    [rule, allOps]
  );

  // get target schema
  const targetSchema = useMemo(() => {
    const targetType: string | IJsonSchema | null = rule?.[operator || ''] || null;

    if (!targetType) {
      return undefined;
    }

    if (typeof targetType === 'string') {
      return { type: targetType, extra: { weak: true } };
    }

    return targetType;
  }, [rule, operator]);

  // get current operator config
  const opConfig = useMemo(() => allOps[operator || ''], [operator, allOps]);

  return {
    rule,
    opConfig,
    opOptionList,
    targetSchema,
  };
}
