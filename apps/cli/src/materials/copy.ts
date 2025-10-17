/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import fs from 'fs';

import { traverseRecursiveTsFiles } from '../utils/ts-file';
import { SyncMaterialContext } from './types';

interface CopyMaterialReturn {
  packagesToInstall: string[];
}

export const copyMaterials = (ctx: SyncMaterialContext): CopyMaterialReturn => {
  const { selectedMaterials, project, formMaterialPkg, targetFormMaterialRoot } = ctx;
  const formMaterialDependencies = formMaterialPkg.dependencies;
  const packagesToInstall: Set<string> = new Set();

  for (const material of selectedMaterials) {
    const sourceDir: string = material.sourceDir;
    const targetDir: string = path.join(targetFormMaterialRoot, material.type, material.name);

    fs.cpSync(sourceDir, targetDir, { recursive: true });

    for (const file of traverseRecursiveTsFiles(targetDir)) {
      for (const importDeclaration of file.imports) {
        const { source } = importDeclaration;

        if (source.startsWith('@/')) {
          // is inner import
          console.log(`Replace Import from ${source} to @flowgram.ai/form-materials`);
          file.replaceImport(
            [importDeclaration],
            [{ ...importDeclaration, source: '@flowgram.ai/form-materials' }]
          );
          packagesToInstall.add(`@flowgram.ai/form-materials@${project.flowgramVersion}`);
        } else if (!source.startsWith('.') && !source.startsWith('react')) {
          // check if is in form material dependencies
          const [dep, version] =
            Object.entries(formMaterialDependencies).find(([_key]) => source.startsWith(_key)) ||
            [];
          if (!dep) {
            continue;
          }
          if (dep.startsWith('@flowgram.ai/')) {
            packagesToInstall.add(`${dep}@${project.flowgramVersion}`);
          } else {
            packagesToInstall.add(`${dep}@${version}`);
          }
        }
      }
    }
  }

  return {
    packagesToInstall: [...packagesToInstall],
  };
};
