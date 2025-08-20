/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { Layer, SelectionService, Command } from '@flowgram.ai/core';

import { isShortcutsMatch } from '../shortcuts-utils';
import { ShortcutsRegistry } from '../shortcuts-contribution';

@injectable()
export class ShortcutsLayer extends Layer<object> {
  static type = 'ShortcutsLayer';

  @inject(ShortcutsRegistry) shortcuts: ShortcutsRegistry;

  @inject(SelectionService) selection: SelectionService;

  onReady(): void {
    this.shortcuts.addHandlersIfNotFound(
      /**
       * 放大
       */
      {
        commandId: Command.Default.ZOOM_IN,
        shortcuts: ['meta =', 'ctrl ='],
        execute: () => {
          // TODO 这里要判断 CurrentEditor
          this.config.zoomin();
        },
      },
      /**
       * 缩小
       */
      {
        commandId: Command.Default.ZOOM_OUT,
        shortcuts: ['meta -', 'ctrl -'],
        execute: () => {
          // TODO 这里要判断 CurrentEditor
          this.config.zoomout();
        },
      },
    );
    this.toDispose.pushAll([
      // 监听画布鼠标移动事件
      this.listenPlaygroundEvent('keydown', (e: KeyboardEvent) => {
        if (!this.isFocused || e.target !== this.playgroundNode) {
          return;
        }
        this.shortcuts.shortcutsHandlers.some(shortcutsHandler => {
          if (
            isShortcutsMatch(e, shortcutsHandler.shortcuts) &&
            (!shortcutsHandler.isEnabled || shortcutsHandler.isEnabled(e))
          ) {
            shortcutsHandler.execute(e);
            e.preventDefault();
            return true;
          }
        });
      }),
    ]);
  }
}
