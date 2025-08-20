/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type IFormItemMeta, type IFormMeta, type IFormMetaOptions } from '../types';
import { FormPathService } from '../services';

export interface FormMetaTraverseParams {
  formItemMeta: IFormItemMeta;
  parentPath?: string;
  handle: (params: { formItemMeta: IFormItemMeta; path: string }) => any;
}

export class FormMeta implements IFormMeta {
  constructor(root: IFormItemMeta, options: IFormMetaOptions) {
    this._root = root;
    this._options = options;
  }

  protected _root: IFormItemMeta;

  get root(): IFormItemMeta {
    return this._root;
  }

  protected _options: IFormMetaOptions;

  get options(): IFormMetaOptions {
    return this._options;
  }

  static traverse({ formItemMeta, parentPath = '', handle }: FormMetaTraverseParams): void {
    if (!formItemMeta) {
      return;
    }

    const isRoot = !parentPath;

    const path = isRoot
      ? FormPathService.ROOT
      : formItemMeta.name
      ? FormPathService.join([parentPath, formItemMeta.name])
      : parentPath;

    handle({ formItemMeta, path });

    if (formItemMeta.items) {
      this.traverse({
        formItemMeta: formItemMeta.items,
        handle,
        parentPath: FormPathService.toArrayPath(path),
      });
    }

    if (formItemMeta.children && formItemMeta.children.length) {
      formItemMeta.children.forEach((child) => {
        this.traverse({ formItemMeta: child, handle, parentPath: path });
      });
    }
  }
}
