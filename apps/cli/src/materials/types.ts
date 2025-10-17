/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Project } from '../utils/project';
import { LoadedNpmPkg } from '../utils/npm';
import { Material } from './material';

export interface MaterialCliOptions {
  materialName?: string;
  refreshProjectImports?: boolean;
  targetMaterialRootDir?: string;
  selectMultiple?: boolean;
}

export interface SyncMaterialContext {
  selectedMaterials: Material[];
  project: Project;
  formMaterialPkg: LoadedNpmPkg;
  cliOpts: MaterialCliOptions;
  targetFormMaterialRoot: string;
}
