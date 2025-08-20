/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';
import { Disposable } from '@flowgram.ai/utils';
import { type NodeFormContext } from '@flowgram.ai/form-core';

import { mergeEffectMap } from './utils';
import { type FormMeta, type FormPluginCtx, type FormPluginSetupMetaCtx } from './types';
import { FormModelV2 } from './form-model-v2';

export interface FormPluginConfig<Opts = any> {
  /**
   * form plugin name, for debug use
   */
  name?: string;

  /**
   * setup formMeta
   * @param ctx
   * @returns
   */
  onSetupFormMeta?: (ctx: FormPluginSetupMetaCtx, opts: Opts) => void;

  /**
   * FormModel 初始化时执行
   * @param ctx
   */
  onInit?: (ctx: FormPluginCtx, opts: Opts) => void;

  /**
   * FormModel 销毁时执行
   */
  onDispose?: (ctx: FormPluginCtx, opts: Opts) => void;
}

export class FormPlugin<Opts = any> implements Disposable {
  readonly name: string;

  readonly pluginId: string;

  readonly config: FormPluginConfig;

  readonly opts?: Opts;

  protected _formModel: FormModelV2;

  constructor(config: FormPluginConfig, opts?: Opts) {
    this.name = config?.name || '';
    this.pluginId = `${this.name}__${nanoid()}`;
    this.config = config;

    this.opts = opts;
  }

  get formModel(): FormModelV2 {
    return this._formModel;
  }

  get ctx(): { formModel: FormModelV2 } & NodeFormContext {
    return {
      formModel: this.formModel,
      ...this.formModel.nodeContext,
    };
  }

  setupFormMeta(formMeta: FormMeta, nodeContext: NodeFormContext): FormMeta {
    const nextFormMeta: FormMeta = {
      ...formMeta,
    };

    this.config.onSetupFormMeta?.(
      {
        mergeEffect: (effect) => {
          nextFormMeta.effect = mergeEffectMap(nextFormMeta.effect || {}, effect);
        },
        mergeValidate: (validate) => {
          nextFormMeta.validate = {
            ...(nextFormMeta.validate || {}),
            ...validate,
          };
        },
        addFormatOnInit: (formatOnInit) => {
          if (!nextFormMeta.formatOnInit) {
            nextFormMeta.formatOnInit = formatOnInit;
            return;
          }
          const legacyFormatOnInit = nextFormMeta.formatOnInit;
          nextFormMeta.formatOnInit = (v, c) => formatOnInit?.(legacyFormatOnInit(v, c), c);
        },
        addFormatOnSubmit: (formatOnSubmit) => {
          if (!nextFormMeta.formatOnSubmit) {
            nextFormMeta.formatOnSubmit = formatOnSubmit;
            return;
          }
          const legacyFormatOnSubmit = nextFormMeta.formatOnSubmit;
          nextFormMeta.formatOnSubmit = (v, c) => formatOnSubmit?.(legacyFormatOnSubmit(v, c), c);
        },
        ...nodeContext,
      },
      this.opts
    );

    return nextFormMeta;
  }

  init(formModel: FormModelV2) {
    this._formModel = formModel;
    this.config?.onInit?.(this.ctx, this.opts);
  }

  dispose() {
    if (this.config?.onDispose) {
      this.config?.onDispose(this.ctx, this.opts);
    }
  }
}

export type FormPluginCreator<Opts> = (opts: Opts) => FormPlugin<Opts>;

export function defineFormPluginCreator<Opts>(
  config: FormPluginConfig<Opts>
): FormPluginCreator<Opts> {
  return function (opts: Opts) {
    return new FormPlugin(config, opts);
  };
}
