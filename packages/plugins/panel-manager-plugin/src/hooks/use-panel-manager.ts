/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useService } from '@flowgram.ai/core';

import { PanelManager } from '../services/panel-manager';

export const usePanelManager = () => useService<PanelManager>(PanelManager);
