/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { Emitter } from '@flowgram.ai/utils';
import { IJsonSchema } from '@flowgram.ai/json-schema';

import { MonitorData } from '../utils';
import {
  type TypeEditorColumnType,
  type TypeEditorRowData,
  TypeEditorDropInfo,
  TypeEditorColumnConfig,
  TypeEditorPos,
  TypeEditorColumnViewConfig,
  ShortcutContext,
} from '../types';
import { TypeRegistryCreatorsAdapter } from '../contexts';
import { ROOT_FIELD_ID } from '../components/type-editor/common';
import { TypeEditorRegistryManager } from './type-registry-manager';
import { ClipboardService } from './clipboard-service';

@injectable()
export class TypeEditorService<TypeSchema extends Partial<IJsonSchema>> {
  private _configs: Map<TypeEditorColumnType, TypeEditorColumnConfig<TypeSchema>> = new Map();

  private _activePos: TypeEditorPos = { x: -1, y: -1 };

  // -1 为 header
  private _dropInfo: TypeEditorDropInfo = {
    rowDataId: '',
    indent: -1,
    index: -2,
  };

  public errorMsgs = new MonitorData<{ pos: TypeEditorPos; msg?: string }[]>([]);

  public editValue: unknown;

  public onChange: (
    typeSchema?: TypeSchema,
    ctx?: {
      storeState?: boolean;
    }
  ) => void;

  public onRemoveEmptyLine: (id: string) => void;

  public onGlobalAdd: ((id: string) => void) | undefined;

  public typeRegistryCreators?: TypeRegistryCreatorsAdapter<TypeSchema>[];

  private dataSource: TypeEditorRowData<TypeSchema>[] = [];

  public dataSourceMap: Record<string, TypeEditorRowData<TypeSchema>> = {};

  public dataSourceTouchedMap: Record<string, boolean> = {};

  public blink = new MonitorData(false);

  public columnViewConfig: TypeEditorColumnViewConfig[] = [];

  public onActivePosChange = new Emitter<TypeEditorPos>();

  public onDropInfoChange = new Emitter<TypeEditorDropInfo>();

  @inject(ClipboardService)
  public clipboard: ClipboardService;

  @inject(TypeEditorRegistryManager)
  public typeDefinition: TypeEditorRegistryManager<TypeSchema>;

  public rootTypeSchema: TypeSchema;

  public setErrorMsg = (pos: TypeEditorPos, msg?: string) => {
    const newMsgs = [...this.errorMsgs.data];
    const item = newMsgs.find((v) => v.pos.x === pos.x && v.pos.y === pos.y);
    if (item) {
      item.msg = msg;
    } else {
      newMsgs.push({ pos, msg });
    }
    this.errorMsgs.update(newMsgs);
  };

  public refreshErrorMsgAfterRemove = (index: number) => {
    // 删除被删去那行的 errorMsgs
    const newMsgs = this.errorMsgs.data.filter((msg) => msg.pos.y !== index);

    newMsgs.forEach((msg) => {
      if (msg.pos.y > index) {
        msg.pos.y = msg.pos.y - 1;
      }
    });

    this.errorMsgs.update(newMsgs);
  };

  public checkActivePosError = () => {
    const pos = this.activePos;

    return !!this.errorMsgs.data.find((v) => v.pos.x === pos.x && v.pos.y === pos.y && v.msg);
  };

  public setEditValue = (val: unknown) => {
    this.editValue = val;
  };

  public registerConfigs(
    config: TypeEditorColumnConfig<TypeSchema> | TypeEditorColumnConfig<TypeSchema>[]
  ): void {
    const configs = Array.isArray(config) ? config : [config];

    configs.map((c) => {
      this._configs.set(c.type, c);
    });
  }

  public addConfigProps(
    type: TypeEditorColumnType,
    config: Partial<Omit<TypeEditorColumnConfig<TypeSchema>, 'type'>>
  ): void {
    const configByType = this.getConfigByType(type);

    if (!configByType) {
      return;
    }

    const newConfig = {
      ...configByType,
      ...config,
    };

    this._configs.set(type, newConfig);
  }

  public getConfigs = (): TypeEditorColumnConfig<TypeSchema>[] =>
    Array.from(this._configs.values());

  public getConfigByType(
    type: TypeEditorColumnType
  ): TypeEditorColumnConfig<TypeSchema> | undefined {
    return this._configs.get(type);
  }

  public triggerShortcutEvent(
    event: 'enter' | 'tab' | 'left' | 'right' | 'up' | 'down' | 'copy' | 'paste' | 'delete'
  ): void {
    const column = this.columnViewConfig[this.activePos.x];

    const columnConfig = this.getConfigByType(column?.type);
    if (!columnConfig) {
      return;
    }

    const ctx: ShortcutContext<TypeSchema> = {
      value: this.editValue,
      rowData: this.dataSource[this.activePos.y],
      onRemoveEmptyLine: this.onRemoveEmptyLine,
      onChange: this.onChange,
      typeEditor: this,
      typeDefinitionService: this.typeDefinition,
    };

    switch (event) {
      case 'enter': {
        columnConfig.shortcuts?.onEnter?.(ctx);
        return;
      }
      case 'tab': {
        columnConfig.shortcuts?.onTab?.(ctx);
        return;
      }
      case 'down': {
        columnConfig.shortcuts?.onDown?.(ctx);
        return;
      }
      case 'up': {
        columnConfig.shortcuts?.onUp?.(ctx);
        return;
      }
      case 'left': {
        columnConfig.shortcuts?.onLeft?.(ctx);
        return;
      }
      case 'right': {
        columnConfig.shortcuts?.onRight?.(ctx);
        return;
      }
      case 'copy': {
        columnConfig.shortcuts?.onCopy?.(ctx);
        return;
      }
      case 'paste': {
        columnConfig.shortcuts?.onPaste?.(ctx);
        return;
      }
      case 'delete': {
        columnConfig.shortcuts?.onDelete?.(ctx);
        return;
      }

      default: {
        return;
      }
    }
  }

  public get activePos(): TypeEditorPos {
    return this._activePos;
  }

  private checkRowDataColumnCanEdit = (
    rowData: TypeEditorRowData<TypeSchema>,
    column: TypeEditorColumnType
  ): boolean =>
    !(rowData.disableEditColumn || []).map((v) => v.column).includes(column) &&
    this.getConfigByType(column)?.focusable !== false;

  /**
   * 获取可编辑的下一列/上一列
   */
  private getCanEditColumn(originPos: TypeEditorPos, direction: 'next' | 'last'): TypeEditorPos {
    const newX =
      (originPos.x + this.columnViewConfig.length + (direction === 'next' ? 1 : -1)) %
      this.columnViewConfig.length;

    const newPos = {
      y: originPos.y,
      x: newX,
    };

    if (
      this.checkRowDataColumnCanEdit(
        this.dataSource[newPos.y],
        this.columnViewConfig[newPos.x].type
      )
    ) {
      return newPos;
    }

    return this.getCanEditColumn(newPos, direction);
  }

  /**
   * 获取可编辑的下一行/上一行
   */
  private getCanEditLine(originPos: TypeEditorPos, direction: 'next' | 'last'): TypeEditorPos {
    const newY =
      (originPos.y + this.dataSource.length + (direction === 'next' ? 1 : -1)) %
      this.dataSource.length;

    const newPos = {
      y: newY,
      x: originPos.x,
    };

    if (
      this.checkRowDataColumnCanEdit(
        this.dataSource[newPos.y],
        this.columnViewConfig[newPos.x].type
      )
    ) {
      return newPos;
    }

    return this.getCanEditLine(newPos, direction);
  }

  /**
   * 获取下一个可编辑的
   */
  private getNextEditItem = (pos: TypeEditorPos): TypeEditorPos => {
    const newPos = { ...pos };

    if (newPos.x === this.columnViewConfig.length - 1) {
      newPos.y = (1 + newPos.y) % this.dataSource.length;
      newPos.x = 0;
    } else {
      newPos.x = newPos.x + 1;
    }

    if (
      this.checkRowDataColumnCanEdit(
        this.dataSource[newPos.y],
        this.columnViewConfig[newPos.x].type
      )
    ) {
      return newPos;
    }

    return this.getNextEditItem(newPos);
  };

  public moveActivePosToNextLine(): void {
    const newPos = this.getCanEditLine(this.activePos, 'next');

    this.setActivePos(newPos);
  }

  public moveActivePosToNextLineWithAddLine(rowData: TypeEditorRowData<TypeSchema>): void {
    const newPos = { ...this.activePos };

    if (!rowData.parentId) {
      return;
    }

    const parentData = this.dataSourceMap[rowData.parentId] || this.dataSourceMap[ROOT_FIELD_ID];

    const id = this.dataSourceMap[rowData.parentId] ? rowData.parentId : ROOT_FIELD_ID;
    const addChild = parentData.index + parentData.deepChildrenCount === rowData.index;

    if (addChild) {
      if (this.onGlobalAdd) {
        this.onGlobalAdd(id);
        newPos.y = newPos.y + 1;
      } else {
        newPos.y = -1;
      }
    } else {
      newPos.y = newPos.y + 1;
    }
    this.setActivePos(newPos);
  }

  public moveActivePosToLastLine(): void {
    const newPos = this.getCanEditLine(this.activePos, 'last');

    this.setActivePos(newPos);
  }

  public moveActivePosToLastColumn(): void {
    const newPos = this.getCanEditColumn(this.activePos, 'last');
    this.setActivePos(newPos);
  }

  public moveActivePosToNextColumn(): void {
    const newPos = this.getCanEditColumn(this.activePos, 'next');

    this.setActivePos(newPos);
  }

  public moveActivePosToNextItem(): void {
    const newPos = this.getNextEditItem(this.activePos);

    this.setActivePos(newPos);
  }

  public setActivePos(pos: TypeEditorPos): void {
    if (this.checkActivePosError()) {
      return;
    }
    this._activePos = pos;

    this.onActivePosChange.fire(this._activePos);
  }

  public clearActivePos(): void {
    this._activePos = { x: -1, y: -1 };
    this.onActivePosChange.fire(this._activePos);
  }

  public setDataSource(newData: TypeEditorRowData<TypeSchema>[]): void {
    this.dataSource = newData;
  }

  public getDataSource(): TypeEditorRowData<TypeSchema>[] {
    return this.dataSource;
  }

  public setColumnViewConfig(config: TypeEditorColumnViewConfig[]): void {
    this.columnViewConfig = config;
  }

  public get dropInfo(): TypeEditorDropInfo {
    return this._dropInfo;
  }

  public setDropInfo(dropInfo: TypeEditorDropInfo): void {
    if (
      dropInfo.indent === this.dropInfo.indent &&
      this.dropInfo.rowDataId === dropInfo.rowDataId &&
      this.dropInfo.index === dropInfo.index
    ) {
      return;
    }
    this._dropInfo = dropInfo;
    this.onDropInfoChange.fire(dropInfo);
  }

  public clearDropInfo(): void {
    this.setDropInfo({ rowDataId: '', indent: -1, index: -2 });
  }
}
