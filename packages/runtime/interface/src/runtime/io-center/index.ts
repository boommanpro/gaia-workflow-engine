/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowInputs, WorkflowOutputs } from '../base';

export interface IOData {
  inputs: WorkflowInputs;
  outputs: WorkflowOutputs;
}

/** Input & Output */
export interface IIOCenter {
  inputs: WorkflowInputs;
  outputs: WorkflowOutputs;
  setInputs(inputs: WorkflowInputs): void;
  setOutputs(outputs: WorkflowOutputs): void;
  init(inputs: WorkflowInputs): void;
  dispose(): void;
  export(): IOData;
}
