/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable, named, optional, postConstruct } from 'inversify';
import { Command, CommandRegistry, ContributionProvider } from '@flowgram.ai/core';

export interface ShortcutsHandler {
  commandId: string;
  commandDetail?: Omit<Command, 'id'>;
  shortcuts: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isEnabled?: (...args: any[]) => boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (...args: any[]) => void;
}

export const ShortcutsContribution = Symbol('ShortcutsContribution');

export interface ShortcutsContribution {
  registerShortcuts: (registry: ShortcutsRegistry) => void;
}

@injectable()
export class ShortcutsRegistry {
  @inject(ContributionProvider)
  @named(ShortcutsContribution)
  @optional()
  protected contribs: ContributionProvider<ShortcutsContribution>;

  @inject(CommandRegistry) protected commandRegistry: CommandRegistry;

  readonly shortcutsHandlers: ShortcutsHandler[] = [];

  addHandlers(...handlers: ShortcutsHandler[]): void {
    // 注册 command
    handlers.forEach((handler) => {
      if (!this.commandRegistry.getCommand(handler.commandId)) {
        this.commandRegistry.registerCommand(
          { id: handler.commandId, ...(handler.commandDetail || {}) },
          { execute: handler.execute, isEnabled: handler.isEnabled }
        );
      } else {
        this.commandRegistry.registerHandler(handler.commandId, {
          execute: handler.execute,
          isEnabled: handler.isEnabled,
        });
      }
    });
    // Insert before for override pre handlers
    this.shortcutsHandlers.unshift(...handlers);
  }

  addHandlersIfNotFound(...handlers: ShortcutsHandler[]): void {
    handlers.forEach((handler) => {
      if (!this.has(handler.commandId)) {
        this.addHandlers(handler);
      }
    });
  }

  has(commandId: string): boolean {
    return this.shortcutsHandlers.some((handler) => handler.commandId === commandId);
  }

  @postConstruct()
  protected init(): void {
    this.contribs?.forEach((contrib) => contrib.registerShortcuts(this));
  }
}
