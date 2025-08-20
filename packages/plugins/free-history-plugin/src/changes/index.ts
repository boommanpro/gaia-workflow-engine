/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { deleteNodeChange } from './delete-node-change';
import { deleteLineChange } from './delete-line-change';
import { changeLineData } from './change-line-data';
import { addNodeChange } from './add-node-change';
import { addLineChange } from './add-line-change';

export default [addLineChange, deleteLineChange, addNodeChange, deleteNodeChange, changeLineData];
