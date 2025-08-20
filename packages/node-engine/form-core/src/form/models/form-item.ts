/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { DisposableCollection, Emitter } from '@flowgram.ai/utils';

import { FormItemDomRef, type IFormItemMeta } from '..';
import { type FormModel } from '.';

export abstract class FormItem {
  readonly meta: IFormItemMeta;

  readonly path: string;

  readonly formModel: FormModel;

  readonly onInitEventEmitter = new Emitter<FormItem>();

  readonly onInit = this.onInitEventEmitter.event;

  protected toDispose: DisposableCollection = new DisposableCollection();

  readonly onDispose = this.toDispose.onDispose;

  // todo(heyuan): 将dom 相关逻辑拆到form item插件里
  private _domRef: FormItemDomRef;

  protected constructor(meta: IFormItemMeta, path: string, formModel: FormModel) {
    this.meta = meta;
    this.path = path;
    this.formModel = formModel;
    this.toDispose.push(this.onInitEventEmitter);
  }

  abstract get value(): any;

  abstract set value(value: any);

  abstract validate(): void;

  set domRef(domRef: FormItemDomRef) {
    this._domRef = domRef;
  }

  get domRef() {
    return this._domRef;
  }

  dispose(): void {
    this.toDispose.dispose();
  }
}
