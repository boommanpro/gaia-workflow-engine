/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Disposable, Emitter } from '@flowgram.ai/utils';
import { ConfigEntity, EntityOpts } from '../../../common';
import type { PlaygroundConfigEntity } from './playground-config-entity';

/**
 * 编辑态
 */
export interface EditorState {
  id: string;
  disabled?: boolean | ((config: PlaygroundConfigEntity) => boolean);
  cursor?: string; // 光标类型
  shortcut?: string; // 快捷键
  shortcutAutoEsc?: boolean; // 点击快捷键后自动退出到默认
  // 仅在状态发生变化时，当前快捷键才会生效
  shortcutWorksOnlyOnStateChanged?: boolean;
  handle?: (config: PlaygroundConfigEntity, e?: EditorStateChangeEvent) => void; // 触发逻辑
  disableSelector?: boolean; // 切换后会把选择器隐藏了
  cancelMode:
    | 'esc' // 按住 esc 则退
    | 'once' // 触发一次后则退出
    | 'hold' // 点击会保持该状态
  onEsc?: (config: PlaygroundConfigEntity, e?: KeyboardEvent) => void;
}

export namespace EditorState {
  export const STATE_SELECT: EditorState = {
    id: 'STATE_SELECT',
    cursor: '',
    shortcut: '',
    cancelMode: 'hold',
  };

  /** 鼠标友好模式状态 */
  export const STATE_MOUSE_FRIENDLY_SELECT: EditorState = {
    id: 'STATE_MOUSE_FRIENDLY_SELECT',
    cursor: 'grab', // 初始为小手状态
    shortcut: '',
    cancelMode: 'hold',
  };

  export const STATE_GRAB: EditorState = {
    id: 'STATE_GRAB',
    cursor: 'grab',
    shortcut: 'SPACE', // 如果是鼠标模式，这里不用按住 SPACE 就可以拖动
    shortcutAutoEsc: true,
    shortcutWorksOnlyOnStateChanged: true,
    cancelMode: 'hold',
  };
}
export const EDITOR_STATE_DEFAULTS: EditorState[] = [
  EditorState.STATE_SELECT,
  EditorState.STATE_MOUSE_FRIENDLY_SELECT,
  EditorState.STATE_GRAB,
];

export interface EditorStateChangeEvent {
  state: EditorState;
  event?: React.MouseEvent;
  lastState?: EditorState;
}

/**
 * 编辑状态管理
 */
export class EditorStateConfigEntity extends ConfigEntity {
  static type = 'EditorStateConfigEntity';

  private _isPressingSpaceBar: boolean = false;
  private _isPressingShift: boolean = false;

  protected states = EDITOR_STATE_DEFAULTS.slice();

  protected selected: string = EditorState.STATE_SELECT.id;

  protected onStateChangeEmitter = new Emitter<EditorStateChangeEvent>();

  readonly onStateChange = this.onStateChangeEmitter.event;

  constructor(opts: EntityOpts) {
    super(opts);
    this.toDispose.push(this.onStateChangeEmitter);
  }

  get isPressingSpaceBar(): boolean {
    return this._isPressingSpaceBar;
  }

  set isPressingSpaceBar(isPressing: boolean) {
    this._isPressingSpaceBar = isPressing;
  }

  get isPressingShift(): boolean {
    return this._isPressingShift;
  }

  set isPressingShift(isPressing: boolean) {
    this._isPressingShift = isPressing;
  }

  /**
   * 取消指定状态后触发
   * @param stateId
   * @param fn
   */
  onCancel(stateId: string, fn: () => void): Disposable {
    return this.onStateChange(e => {
      if (e.lastState && e.lastState.id === stateId) {
        fn();
      }
    });
  }

  getCurrentState(): EditorState | undefined {
    return this.states.find(s => s.id === this.selected);
  }

  is(stateId: string): boolean {
    return this.selected === stateId;
  }

  changeState(stateId: string, event?: React.MouseEvent): void {
    const state = this.states.find(s => s.id === stateId);
    if (!state) throw new Error(`Unknown editor state ${stateId}`);
    if (this.selected !== stateId) {
      const lastState = this.getCurrentState();
      this.selected = stateId;
      this.onStateChangeEmitter.fire({ state, event, lastState });
      this.fireChange();
    }
  }

  toDefaultState(): void {
    this.changeState(EditorState.STATE_SELECT.id);
  }

  registerState(state: EditorState): void {
    this.states.push(state);
    // this.sortStates();
    this.fireChange();
  }

  getStates(): EditorState[] {
    return this.states;
  }

  /**
   * 是否为鼠标友好模式
   */
  isMouseFriendlyMode(): boolean {
    return this.getCurrentState() === EditorState.STATE_MOUSE_FRIENDLY_SELECT;
  }


  getStateFromShortcut(e: KeyboardEvent): EditorState | undefined {
    return this.states.find(s => {
      const shortcut =
        s.shortcut === 'SPACE' ? ' ' : (s.shortcut || '').toLowerCase();
      if (shortcut === e.key.toLowerCase()) {
        return s;
        // switch (e.key.toLowerCase()) {
        //   case '=':
        //   case '-':
        //   case '0':
        //     if (e.ctrlKey) {
        //       return s;
        //     }
        //     break;
        //   default:
        //     return s;
        // }
      }
      return undefined;
    });
  }
}
