/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { get, groupBy, isEmpty, isNil, mapKeys, uniq } from 'lodash-es';
import { Disposable, DisposableCollection, Emitter } from '@flowgram.ai/utils';
import {
  FlowNodeFormData,
  FormFeedback,
  FormItem,
  FormManager,
  FormModel,
  FormModelValid,
  IFormItem,
  NodeFormContext,
  OnFormValuesChangePayload,
} from '@flowgram.ai/form-core';
import {
  createForm,
  FieldArrayModel,
  FieldName,
  FieldValue,
  type FormControl,
  FormModel as NativeFormModel,
  FormValidateReturn,
  Glob,
  IField,
  IFieldArray,
  toForm,
} from '@flowgram.ai/form';
import { FlowNodeEntity } from '@flowgram.ai/document';
import { PlaygroundContext, PluginContext } from '@flowgram.ai/core';

import {
  convertGlobPath,
  findMatchedInMap,
  formFeedbacksToNodeCoreFormFeedbacks,
  mergeEffectReturn,
  runAndDeleteEffectReturn,
} from './utils';
import {
  DataEvent,
  Effect,
  EffectOptions,
  EffectReturn,
  FormMeta,
  onFormValueChangeInPayload,
} from './types';
import { renderForm } from './form-render';
import { FormPlugin } from './form-plugin';

const DEFAULT = {
  // Different formModel should have different reference
  EFFECT_MAP: () => ({}),
  EFFECT_RETURN_MAP: () =>
    new Map([
      [DataEvent.onValueInitOrChange, {}],
      [DataEvent.onValueChange, {}],
      [DataEvent.onValueInit, {}],
      [DataEvent.onArrayAppend, {}],
      [DataEvent.onArrayDelete, {}],
    ]),
  FORM_FEEDBACKS: () => [],
  VALID: null,
};

export class FormModelV2 extends FormModel implements Disposable {
  protected effectMap: Record<string, EffectOptions[]> = DEFAULT.EFFECT_MAP();

  protected effectReturnMap: Map<DataEvent, Record<string, EffectReturn>> =
    DEFAULT.EFFECT_RETURN_MAP();

  protected plugins: FormPlugin[] = [];

  protected node: FlowNodeEntity;

  protected formFeedbacks: FormValidateReturn | undefined = DEFAULT.FORM_FEEDBACKS();

  protected onInitializedEmitter = new Emitter<FormModel>();

  protected onValidateEmitter = new Emitter<FormModel>();

  readonly onValidate = this.onValidateEmitter.event;

  readonly onInitialized = this.onInitializedEmitter.event;

  protected onDisposeEmitter = new Emitter<void>();

  readonly onDispose = this.onDisposeEmitter.event;

  protected toDispose = new DisposableCollection();

  protected onFormValuesChangeEmitter = new Emitter<OnFormValuesChangePayload>();

  readonly onFormValuesChange = this.onFormValuesChangeEmitter.event;

  protected onValidChangeEmitter = new Emitter<FormModelValid>();

  readonly onValidChange = this.onValidChangeEmitter.event;

  protected onFeedbacksChangeEmitter = new Emitter<FormFeedback[]>();

  readonly onFeedbacksChange = this.onFeedbacksChangeEmitter.event;

  constructor(node: FlowNodeEntity) {
    super();
    this.node = node;
    this.toDispose.pushAll([
      this.onInitializedEmitter,
      this.onValidateEmitter,
      this.onValidChangeEmitter,
      this.onFeedbacksChangeEmitter,
      this.onFormValuesChangeEmitter,
    ]);
  }

  protected _valid: FormModelValid = DEFAULT.VALID;

  get valid(): FormModelValid {
    return this._valid;
  }

  private set valid(valid: FormModelValid) {
    this._valid = valid;
    this.onValidChangeEmitter.fire(valid);
  }

  get flowNodeEntity() {
    return this.node;
  }

  get formManager() {
    return this.node.getService(FormManager);
  }

  protected _formControl?: FormControl<any>;

  get formControl() {
    return this._formControl;
  }

  protected _formMeta: FormMeta;

  get formMeta(): FormMeta {
    return this._formMeta || (this.node.getNodeRegistry().formMeta as FormMeta);
  }

  get values() {
    return this.nativeFormModel?.values;
  }

  protected _feedbacks: FormFeedback[] = [];

  get feedbacks(): FormFeedback[] {
    return this._feedbacks;
  }

  updateFormValues(value: any) {
    if (this.nativeFormModel) {
      const finalValue = this.formMeta.formatOnInit
        ? this.formMeta.formatOnInit(value, this.nodeContext)
        : value;
      this.nativeFormModel.values = finalValue;
    }
  }

  private set feedbacks(feedbacks: FormFeedback[]) {
    this._feedbacks = feedbacks;
    this.onFeedbacksChangeEmitter.fire(feedbacks);
  }

  get formItemPathMap(): Map<string, IFormItem> {
    return new Map<string, IFormItem>();
  }

  protected _initialized: boolean = false;

  get initialized(): boolean {
    return this._initialized;
  }

  get nodeContext(): NodeFormContext {
    return {
      node: this.node,
      playgroundContext: this.node.getService(PlaygroundContext),
      clientContext: this.node.getService(PluginContext),
    };
  }

  get nativeFormModel(): NativeFormModel | undefined {
    return this._formControl?._formModel;
  }

  render() {
    return renderForm(this);
  }

  initPlugins(plugins: FormPlugin[]) {
    if (!plugins.length) {
      return;
    }

    this.plugins = plugins;
    plugins.forEach((plugin) => {
      plugin.init(this);
    });
  }

  init(formMeta: FormMeta, rawInitialValues?: any) {
    /* 透传 onFormValuesChange 事件给 FlowNodeFormData */
    const formData = this.node.getData<FlowNodeFormData>(FlowNodeFormData);
    this.onFormValuesChange(() => {
      this._valid = null;
      formData.fireChange();
    });

    (formMeta.plugins || [])?.forEach((_plugin) => {
      if (_plugin.setupFormMeta) {
        formMeta = _plugin.setupFormMeta(formMeta, this.nodeContext);
      }
    });

    this._formMeta = formMeta;

    const { validateTrigger, validate, effect } = formMeta;
    if (effect) {
      this.effectMap = effect;
    }

    // 计算初始值: defaultValues 是默认表单值，不需要被format, 而rawInitialValues 是用户创建form 时传入的初始值，可能不同于表单数据格式，需要被format
    const defaultValues =
      typeof formMeta.defaultValues === 'function'
        ? formMeta.defaultValues(this.nodeContext)
        : formMeta.defaultValues;

    const initialValues = formMeta.formatOnInit
      ? formMeta.formatOnInit(rawInitialValues, this.nodeContext)
      : rawInitialValues;

    // 初始化底层表单
    const { control } = createForm({
      initialValues: initialValues || defaultValues,
      validateTrigger,
      context: this.nodeContext,
      validate: validate,
      disableAutoInit: true,
    });

    this._formControl = control;
    const nativeFormModel = control._formModel;
    this.toDispose.push(nativeFormModel);

    // forward onFormValuesChange event
    nativeFormModel.onFormValuesChange((props) => {
      this.onFormValuesChangeEmitter.fire(props);
    });

    if (formMeta.plugins) {
      this.initPlugins(formMeta.plugins);
    }

    // Form 数据变更时触发对应的effect
    nativeFormModel.onFormValuesChange(({ values, prevValues, name, options }) => {
      Object.keys(this.effectMap).forEach((pattern) => {
        // 找到匹配 pattern 的数据路径
        const paths = uniq([
          ...Glob.findMatchPaths(values, pattern),
          ...Glob.findMatchPaths(prevValues, pattern),
        ]).filter(
          (path) =>
            // trigger effect by compare if value changed
            get(values, path) !== get(prevValues, path)
        );

        if (Glob.isMatchOrParent(pattern, name)) {
          const currentName = Glob.getParentPathByPattern(pattern, name);
          if (!paths.includes(currentName)) {
            // trigger effect anyway
            paths.push(currentName);
          }
        }

        const effectOptionsArr = this.effectMap[pattern];

        paths.forEach((path) => {
          let eventList = [DataEvent.onValueChange, DataEvent.onValueInitOrChange];
          const isPrevNil = isNil(get(prevValues, path));

          if (isPrevNil) {
            // HACK: For array append, onFormValuesInit will auto triggered for array[index]
            if (options?.action === 'array-append' && Glob.isMatch(`${name}.*`, path)) {
              eventList = [];
            } else {
              eventList = [DataEvent.onValueInit, DataEvent.onValueInitOrChange];
            }
          }

          // 对触发 init 事件的 name 或他的字 path 触发 effect
          runAndDeleteEffectReturn(this.effectReturnMap, path, eventList);

          // 执行该事件配置下所有 onValueChange 事件的 effect
          effectOptionsArr.forEach(({ effect, event }: EffectOptions) => {
            if (eventList.includes(event)) {
              // 执行 effect
              const effectReturn = (effect as Effect)({
                name: path,
                value: get(values, path),
                prevValue: get(prevValues, path),
                formValues: values,
                form: toForm(this.nativeFormModel!),
                context: this.nodeContext,
              });

              // 更新 effect return
              if (
                effectReturn &&
                typeof effectReturn === 'function' &&
                this.effectReturnMap.has(event)
              ) {
                const eventMap = this.effectReturnMap.get(event) as Record<string, EffectReturn>;
                eventMap[path] = mergeEffectReturn(eventMap[path], effectReturn);
              }
            }
          });
        });
      });
    });

    // Form 数据初始化时触发对应的 effect
    nativeFormModel.onFormValuesInit(({ values, name, prevValues }) => {
      Object.keys(this.effectMap).forEach((pattern) => {
        // 找到匹配 pattern 的数据路径
        const paths = Glob.findMatchPaths(values, pattern);

        // 获取配置在该 pattern上的所有effect配置
        const effectOptionsArr = this.effectMap[pattern];

        paths.forEach((path) => {
          if (Glob.isMatchOrParent(name, path) || name === path) {
            // 对触发 init 事件的 name 或他的字 path 触发 effect
            runAndDeleteEffectReturn(this.effectReturnMap, path, [
              DataEvent.onValueInit,
              DataEvent.onValueInitOrChange,
            ]);

            effectOptionsArr.forEach(({ event, effect }: EffectOptions) => {
              if (event === DataEvent.onValueInit || event === DataEvent.onValueInitOrChange) {
                const effectReturn = (effect as Effect)({
                  name: path,
                  value: get(values, path),
                  formValues: values,
                  prevValue: get(prevValues, path),
                  form: toForm(this.nativeFormModel!),
                  context: this.nodeContext,
                });

                // 更新 effect return
                if (
                  effectReturn &&
                  typeof effectReturn === 'function' &&
                  this.effectReturnMap.has(event)
                ) {
                  const eventMap = this.effectReturnMap.get(event) as Record<string, EffectReturn>;
                  eventMap[path] = mergeEffectReturn(eventMap[path], effectReturn);
                }
              }
            });
          }
        });
      });
    });

    // 为 Field 添加 effect, 主要针对array
    nativeFormModel.onFieldModelCreate((field) => {
      // register effect
      const effectOptionsArr = findMatchedInMap<EffectOptions[]>(field, this.effectMap);
      if (effectOptionsArr?.length) {
        // 按事件聚合
        const eventMap = groupBy(effectOptionsArr, 'event');

        mapKeys(eventMap, (optionsArr, event) => {
          const combinedEffect = (props: any) => {
            // 该事件下执行所有effect
            optionsArr.forEach(({ effect }) =>
              effect({
                ...props,
                formValues: nativeFormModel.values,
                form: toForm(this.nativeFormModel!),
                context: this.nodeContext,
              })
            );
          };

          switch (event) {
            case DataEvent.onArrayAppend:
              if (field instanceof FieldArrayModel) {
                (field as FieldArrayModel).onAppend(combinedEffect);
              }
              break;
            case DataEvent.onArrayDelete:
              if (field instanceof FieldArrayModel) {
                (field as FieldArrayModel).onDelete(combinedEffect);
              }
              break;
          }
        });
      }
    });

    // 手动初始化form
    this._formControl.init();

    this._initialized = true;

    this.onInitializedEmitter.fire(this);

    this.onDispose(() => {
      this._initialized = false;
      this.effectMap = {};
      nativeFormModel.dispose();
    });
  }

  toJSON() {
    if (this.formMeta.formatOnSubmit) {
      return this.formMeta.formatOnSubmit(this.nativeFormModel?.values, this.nodeContext);
    }
    return this.nativeFormModel?.values;
  }

  clearValid() {}

  async validate() {
    this.formFeedbacks = await this.nativeFormModel?.validate();
    this.valid = isEmpty(this.formFeedbacks?.filter((f) => f.level === 'error'));
    this.onValidateEmitter.fire(this);
    return this.valid;
  }

  getValues<T = any>(): T | undefined {
    return this._formControl?._formModel.values;
  }

  getField<
    TValue = FieldValue,
    TField extends IFieldArray<TValue> | IField<TValue> = IField<TValue>
  >(name: FieldName): TField | undefined {
    let finalName = name.includes('/') ? convertGlobPath(name) : name;

    return this.formControl?.getField<TValue, TField>(finalName) as TField;
  }

  getValueIn<TValue>(name: FieldName): TValue | undefined {
    let finalName = name.includes('/') ? convertGlobPath(name) : name;

    return this.nativeFormModel?.getValueIn(finalName);
  }

  setValueIn(name: FieldName, value: any) {
    let finalName = name.includes('/') ? convertGlobPath(name) : name;

    this.nativeFormModel?.setValueIn(finalName, value);
  }

  /**
   * 监听表单某个路径下的值变化
   * @param name 路径
   * @param callback 回调函数
   */
  onFormValueChangeIn<TValue = FieldValue, TFormValue = FieldValue>(
    name: FieldName,
    callback: (payload: onFormValueChangeInPayload<TValue, TFormValue>) => void
  ): Disposable {
    if (!this._initialized) {
      throw new Error(
        `[NodeEngine] FormModel Error: onFormValueChangeIn can not be called before initialized`
      );
    }

    return this.formControl!._formModel.onFormValuesChange(
      ({ name: changedName, values, prevValues }) => {
        if (changedName === name) {
          callback({
            value: get(values, name),
            prevValue: get(prevValues, name),
            formValues: values,
            prevFormValues: prevValues,
          });
        }
      }
    );
  }

  /**
   * @deprecated 该方法用于兼容 V1 版本 FormModel接口，如果确定是FormModelV2 请使用 FormModel.getValueIn
   * @param path glob path
   */
  getFormItemValueByPath(globPath: string) {
    if (!globPath) {
      return;
    }
    if (globPath === '/') {
      return this._formControl?._formModel.values;
    }
    const name = convertGlobPath(globPath);
    return this.getValueIn(name!);
  }

  async validateWithFeedbacks(): Promise<FormFeedback[]> {
    await this.validate();
    return formFeedbacksToNodeCoreFormFeedbacks(this.formFeedbacks!);
  }

  /**
   * @deprecated 该方法用于兼容 V1 版本 FormModel接口，如果确定是FormModelV2, 请使用FormModel.getValueIn 和 FormModel.setValueIn
   * @param path glob path
   */
  getFormItemByPath(path: string): FormItem | undefined {
    if (!this.nativeFormModel) {
      return;
    }

    const that = this;

    if (path === '/') {
      return {
        get value() {
          return that.nativeFormModel!.values;
        },
        set value(v) {
          that.nativeFormModel!.values = v;
        },
      } as FormItem;
    }

    const name = convertGlobPath(path);
    const formItemValue = that.getValueIn(name!);
    return {
      get value() {
        return formItemValue;
      },
      set value(v) {
        that.setValueIn(name, v);
      },
    } as FormItem;
  }

  dispose(): void {
    this.onDisposeEmitter.fire();

    // 执行所有effect return
    this.effectReturnMap.forEach((eventMap) => {
      Object.values(eventMap).forEach((effectReturn) => {
        effectReturn();
      });
    });

    this.effectMap = DEFAULT.EFFECT_MAP();
    this.effectReturnMap = DEFAULT.EFFECT_RETURN_MAP();

    this.plugins.forEach((p) => {
      p.dispose();
    });

    this.plugins = [];

    this.formFeedbacks = DEFAULT.FORM_FEEDBACKS();
    this._valid = DEFAULT.VALID;

    this._formControl = undefined;
    this._initialized = false;
    this.toDispose.dispose();
  }
}
