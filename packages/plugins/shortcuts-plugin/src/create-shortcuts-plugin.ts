/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { bindContributionProvider, definePluginCreator } from '@flowgram.ai/core';

import { ShortcutsRegistry, ShortcutsContribution } from './shortcuts-contribution';
import { ShortcutsLayer } from './layers';

/**
 * @param opts
 *
 * createShortcutsPlugin({
 *   registerShortcuts(registry) {
 *   }
 * })
 */
export const createShortcutsPlugin = definePluginCreator<ShortcutsContribution>({
  onBind: ({ bind }) => {
    bind(ShortcutsRegistry).toSelf().inSingletonScope();
    bindContributionProvider(bind, ShortcutsContribution);
  },
  onInit: (ctx) => {
    ctx.playground.registerLayer(ShortcutsLayer);
  },
  contributionKeys: [ShortcutsContribution],
});
