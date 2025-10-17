/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { isEmpty, isEqual } from 'lodash-es';

import { Glob } from '../utils';
import { Errors, Feedback, OnFormValuesChangePayload, ValidateTrigger, Warnings } from '../types';
import { Path } from './path';

export function updateFeedbacksName(feedbacks: Feedback<any>[], name: string) {
  return (feedbacks || []).map((f) => ({
    ...f,
    name,
  }));
}

export function mergeFeedbacks<T extends Errors | Warnings>(origin?: T, source?: T) {
  if (!source) {
    return origin;
  }
  if (!origin) {
    return { ...source };
  }
  const changed = Object.keys(source).some(
    (sourceKey) => !isEqual(origin[sourceKey], source[sourceKey])
  );

  if (changed) {
    return {
      ...origin,
      ...source,
    };
  }
  return origin;
}

export function clearFeedbacks<T extends Errors | Warnings>(name: string, origin?: T) {
  if (!origin) {
    return origin;
  }
  if (name in origin) {
    delete origin[name];
  }
  return origin;
}

export function shouldValidate(currentTrigger: ValidateTrigger, formTrigger?: ValidateTrigger) {
  return currentTrigger === formTrigger;
}

export function getValidByErrors(errors: Errors | undefined) {
  return errors ? Object.keys(errors).every((name) => isEmpty(errors[name])) : true;
}

export namespace FieldEventUtils {
  export function shouldTriggerFieldChangeEvent(
    payload: OnFormValuesChangePayload,
    fieldName: string
  ) {
    const { name: changedName, options } = payload;

    // 如果 Field 是 变更path 的 ancestor 则触发
    if (Glob.isMatchOrParent(fieldName, changedName)) {
      return true;
    }

    // 如果 Field 是 变更path 的 child 或 grandchild 有条件触发
    if (new Path(changedName).isChildOrGrandChild(fieldName)) {
      // 数组情况下部分子项不触发变更

      // 1. 数组 append 触发的FormValuesChange 不需要触发其子 Field 的 onValueChange
      if (options?.action === 'array-append') {
        return !new Path(changedName).isChildOrGrandChild(fieldName);
      }
      // 2. 数组 splice 触发的FormValuesChange 无需触发第一个删除项前的所有子  Field 的 onValueChange
      else if (options?.action === 'array-splice' && options?.indexes?.length) {
        return (
          (Path.compareArrayPath(
            new Path(fieldName),
            new Path(changedName).concat(options.indexes[0])
          ) as number) >= 0
        );
      }

      // 其余情况都需要触发
      return true;
    }
    return false;
  }

  export function shouldTriggerFieldValidateWhenChange(
    payload: OnFormValuesChangePayload,
    fieldName: string
  ) {
    const { name: changedName, options } = payload;

    if (options?.action === 'array-splice' || options?.action === 'array-swap') {
      // const splicedIndexes = options?.indexes || [];
      //
      // const splicedPaths = splicedIndexes.map(index => new Path(changedName).concat(index));
      // const removedPaths = Array.from({ length: splicedIndexes.length }, (_, i) =>
      //   new Path(changedName).concat(prevValues[changedName].length - i - 1),
      // );
      //
      // const ignoredPathOrParentPaths = [...splicedPaths, ...removedPaths];
      // // const ignoredPathOrParentPaths = splicedPaths;
      // if (
      //   ignoredPathOrParentPaths.some(
      //     path => path.toString() === fieldName || path.isChildOrGrandChild(fieldName),
      //   )
      // ) {
      //   return false;
      // }

      // splice 和 swap 都属于数组跟级别的变更，仅需触发数组field的校验, 无需校验子项
      return fieldName === changedName;
    }

    return FieldEventUtils.shouldTriggerFieldChangeEvent(payload, fieldName);
  }
}
