/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Disposable, Emitter } from '@flowgram.ai/utils';
import { FlowNodeEntity } from '@flowgram.ai/document';
import { EntityData } from '@flowgram.ai/core';

import { FlowNodeErrorData } from '../error';
import { FormMetaOrFormMetaGenerator } from './types';
import { FormModel, type FormModelFactory } from './models';

interface Options {
  formModelFactory: FormModelFactory;
}

export interface DetailChangeEvent {
  path: string;
  oldValue: any;
  value: any;
  initialized: boolean;
}

export interface OnFormValuesChangePayload {
  values: any;
  prevValues: any;
  name: string;
}

export class FlowNodeFormData extends EntityData {
  static type = 'FlowNodeEntityFormData';

  readonly formModel: FormModel;

  protected flowNodeEntity: FlowNodeEntity;

  /**
   * @deprecated rehaje 版表单form Values change 事件
   * @protected
   */
  protected onDetailChangeEmitter = new Emitter<DetailChangeEvent>();

  /**
   * @deprecated 该方法为旧版引擎（rehaje）表单数据变更事件, 新版节点引擎请使用
   * this.getFormModel<FormModelV2>().onFormValuesChange.
   * @protected
   */
  readonly onDetailChange = this.onDetailChangeEmitter.event;

  constructor(entity: FlowNodeEntity, opts: Options) {
    super(entity);

    this.flowNodeEntity = entity;
    this.formModel = opts.formModelFactory(entity);

    this.toDispose.push(this.onDetailChangeEmitter);

    this.toDispose.push(
      Disposable.create(() => {
        this.formModel.dispose();
      })
    );
  }

  getFormModel<TFormModel>(): TFormModel {
    // @ts-ignore
    return this.formModel as TFormModel;
  }

  getDefaultData(): any {
    return {};
  }

  createForm(formMetaOrFormMetaGenerator: any, initialValue?: any): void {
    const errorData = this.flowNodeEntity.getData<FlowNodeErrorData>(FlowNodeErrorData);

    errorData.setError(null);
    try {
      this.formModel.init(formMetaOrFormMetaGenerator, initialValue);
    } catch (e) {
      errorData.setError(e as Error);
    }
  }

  updateFormValues(value: any) {
    this.formModel.updateFormValues(value);
  }

  recreateForm(formMetaOrFormMetaGenerator: FormMetaOrFormMetaGenerator, initialValue?: any): void {
    this.createForm(formMetaOrFormMetaGenerator, initialValue);
  }

  toJSON(): any {
    return this.formModel.toJSON();
  }

  dispose(): void {
    super.dispose();
  }

  /**
   * @deprecated rehaje 版表单form Values change 事件触发函数
   * @protected
   */
  fireDetaiChange(detailChangeEvent: DetailChangeEvent) {
    this.onDetailChangeEmitter.fire(detailChangeEvent);
  }
}
