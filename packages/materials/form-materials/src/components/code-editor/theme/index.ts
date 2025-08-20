/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { themes } from '@coze-editor/editor/preset-code';

import { lightTheme } from './light';
import { darkTheme } from './dark';

themes.register('dark', darkTheme);
themes.register('light', lightTheme);
