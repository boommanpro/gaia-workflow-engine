import { isArray, isObject } from 'lodash';
import {
  DataEvent,
  Effect,
  EffectOptions,
  VariableFieldKeyRenameService,
} from '@flowgram.ai/editor';

import { IFlowRefValue } from '../../typings';

/**
 * Auto rename ref when form item's key is renamed
 *
 * Example:
 *
 * formMeta: {
 *  effects: {
 *    "inputsValues": autoRenameRefEffect,
 *  }
 * }
 */
export const autoRenameRefEffect: EffectOptions[] = [
  {
    event: DataEvent.onValueInit,
    effect: ((params) => {
      const { context, form, name } = params;

      const renameService = context.node.getService(VariableFieldKeyRenameService);

      const disposable = renameService.onRename(({ before, after }) => {
        const beforeKeyPath = [
          ...before.parentFields.map((_field) => _field.key).reverse(),
          before.key,
        ];
        const afterKeyPath = [
          ...after.parentFields.map((_field) => _field.key).reverse(),
          after.key,
        ];

        // traverse rename refs inside form item 'name'
        traverseRef(name, form.getValueIn(name), (_drilldownName, _v) => {
          if (isRefMatch(_v, beforeKeyPath)) {
            _v.content = [...afterKeyPath, ...(_v.content || [])?.slice(beforeKeyPath.length)];
            form.setValueIn(_drilldownName, _v);
          }
        });
      });

      return () => {
        disposable.dispose();
      };
    }) as Effect,
  },
];

/**
 * If ref value's keyPath is the under as targetKeyPath
 * @param value
 * @param targetKeyPath
 * @returns
 */
function isRefMatch(value: IFlowRefValue, targetKeyPath: string[]) {
  return targetKeyPath.every((_key, index) => _key === value.content?.[index]);
}

/**
 * If value is ref
 * @param value
 * @returns
 */
function isRef(value: any): value is IFlowRefValue {
  return (
    value?.type === 'ref' && Array.isArray(value?.content) && typeof value?.content[0] === 'string'
  );
}

/**
 * Traverse value to find ref
 * @param value
 * @param options
 * @returns
 */
function traverseRef(name: string, value: any, cb: (name: string, _v: IFlowRefValue) => void) {
  if (isObject(value)) {
    if (isRef(value)) {
      cb(name, value);
      return;
    }

    Object.entries(value).forEach(([_key, _value]) => {
      traverseRef(`${name}.${_key}`, _value, cb);
    });
    return;
  }

  if (isArray(value)) {
    value.forEach((_value, idx) => {
      traverseRef(`${name}[${idx}]`, _value, cb);
    });
    return;
  }

  return;
}
