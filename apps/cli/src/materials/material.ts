/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import { readdirSync } from 'fs';

import { getIndexTsFile } from '../utils/ts-file';
import { LoadedNpmPkg } from '../utils/npm';

export class Material {
  protected static _all_materials_cache: Material[] = [];

  static ALL_TYPES = [
    'components',
    'effects',
    'plugins',
    'shared',
    'validate',
    'form-plugins',
    'hooks',
  ];

  constructor(public type: string, public name: string, public formMaterialPkg: LoadedNpmPkg) {}

  get fullName() {
    return `${this.type}/${this.name}`;
  }

  get sourceDir() {
    return path.join(this.formMaterialPkg.srcPath, this.type, this.name);
  }

  get indexFile() {
    return getIndexTsFile(this.sourceDir);
  }

  get allExportNames() {
    return this.indexFile?.allExportNames || [];
  }

  static listAll(formMaterialPkg: LoadedNpmPkg): Material[] {
    if (!this._all_materials_cache.length) {
      this._all_materials_cache = Material.ALL_TYPES.map((type) => {
        const materialsPath: string = path.join(formMaterialPkg.srcPath, type);
        return readdirSync(materialsPath)
          .map((_path: string) => {
            if (_path === 'index.ts') {
              return null;
            }

            return new Material(type, _path, formMaterialPkg);
          })
          .filter((material): material is Material => material !== null);
      }).flat();
    }

    return this._all_materials_cache;
  }
}
