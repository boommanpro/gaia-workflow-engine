/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { mapValues } from 'lodash-es';
import { inject, injectable, multiInject, optional, postConstruct } from 'inversify';
import { Emitter } from '@flowgram.ai/utils';
import { injectPlaygroundContext, PlaygroundContext } from '@flowgram.ai/core';

import { AbilityClass, FormItemAbility } from '../models/form-item-ability';
import { FormAbilityExtensionRegistry, FormModel } from '../models';
import { FormContribution } from '../form-contribution';
import {
  DecoratorAbility,
  DecoratorExtension,
  SetterAbility,
  SetterExtension,
  SetterHoc,
} from '../abilities';
import { FormContextMaker, FormPathService } from './index';

@injectable()
export class FormManager {
  readonly abilityRegistry: Map<string, FormItemAbility> = new Map();

  readonly setterHocs: SetterHoc[] = [];

  readonly extensionRegistryMap: Map<string, FormAbilityExtensionRegistry> = new Map();

  @inject(FormPathService) readonly pathManager: FormPathService;

  @inject(FormContextMaker) readonly formContextMaker: FormContextMaker;

  @injectPlaygroundContext() readonly playgroundContext: PlaygroundContext;

  @multiInject(FormContribution) @optional() protected formContributions: FormContribution[] = [];

  private readonly onFormModelWillInitEmitter = new Emitter<{
    model: FormModel;
    data: any;
  }>();

  readonly onFormModelWillInit = this.onFormModelWillInitEmitter.event;

  get components(): Record<string, any> {
    return mapValues(
      this.extensionRegistryMap.get(SetterAbility.type)?.objectMap || {},
      (setter: SetterExtension) => setter.component
    );
  }

  get decorators(): Record<string, any> {
    return mapValues(
      this.extensionRegistryMap.get(DecoratorAbility.type)?.objectMap || {},
      (decorator: DecoratorExtension) => decorator.component
    );
  }

  registerAbilityExtension(type: string, extension: any): void {
    if (!this.extensionRegistryMap.get(type)) {
      this.extensionRegistryMap.set(type, new FormAbilityExtensionRegistry());
    }
    const registry = this.extensionRegistryMap.get(type);
    if (!registry) {
      return;
    }
    registry.register(extension);
  }

  getAbilityExtension(abilityType: string, extensionKey: string): any {
    return this.extensionRegistryMap.get(abilityType)?.get(extensionKey);
  }

  registerAbility(Ability: AbilityClass): void {
    const ability = new Ability();
    this.abilityRegistry.set(ability.type, ability);
  }

  registerAbilities(Abilities: AbilityClass[]): void {
    Abilities.forEach(this.registerAbility.bind(this));
  }

  getAbility<ExtendAbility>(type: string): (FormItemAbility & ExtendAbility) | undefined {
    return this.abilityRegistry.get(type) as FormItemAbility & ExtendAbility;
  }

  /**
   * @deprecated
   * Setter Hoc and setter are no longer supported in NodeEngineV2
   * @param hoc
   */
  registerSetterHoc(hoc: SetterHoc): void {
    this.setterHocs.push(hoc);
  }

  fireFormModelWillInit(model: FormModel, data: any) {
    this.onFormModelWillInitEmitter.fire({
      model,
      data,
    });
  }

  dispose() {
    this.onFormModelWillInitEmitter.dispose();
  }

  @postConstruct()
  protected init(): void {
    this.formContributions.forEach((contrib) => contrib.onRegister?.(this));
  }
}
