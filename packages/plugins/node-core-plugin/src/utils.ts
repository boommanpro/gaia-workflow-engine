/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  DecoratorAbility,
  DecoratorExtension,
  EffectAbility,
  EffectExtension,
  FormManager,
  NodeManager,
  registerNodeErrorRender,
  registerNodePlaceholderRender,
  SetterAbility,
  SetterExtension,
  ValidationAbility,
  ValidationExtension,
} from '@flowgram.ai/form-core';

import { NodeEngineMaterialOptions } from './types';

interface RegisterNodeMaterialProps {
  nodeManager: NodeManager;
  formManager: FormManager;
  material: NodeEngineMaterialOptions;
}

export function registerNodeMaterial({
  nodeManager,
  formManager,
  material,
}: RegisterNodeMaterialProps) {
  const {
    setters = [],
    decorators = [],
    effects = [],
    validators = [],
    nodeErrorRender,
    nodePlaceholderRender,
  } = material;

  if (nodeErrorRender) {
    registerNodeErrorRender(nodeManager, nodeErrorRender);
  }
  if (nodePlaceholderRender) {
    registerNodePlaceholderRender(nodeManager, nodePlaceholderRender);
  }
  setters.forEach((setter: SetterExtension) => {
    formManager.registerAbilityExtension(SetterAbility.type, setter);
  });
  decorators.forEach((decorator: DecoratorExtension) => {
    formManager.registerAbilityExtension(DecoratorAbility.type, decorator);
  });
  effects.forEach((effect: EffectExtension) => {
    formManager.registerAbilityExtension(EffectAbility.type, effect);
  });
  validators.forEach((validator: ValidationExtension) => {
    formManager.registerAbilityExtension(ValidationAbility.type, validator);
  });
}
