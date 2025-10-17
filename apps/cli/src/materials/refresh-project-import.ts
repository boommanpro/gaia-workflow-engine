/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import path from 'path';

import chalk from 'chalk';

import { traverseRecursiveTsFiles } from '../utils/ts-file';
import { ImportDeclaration, NamedImport } from '../utils/import';
import { SyncMaterialContext } from './types';
import { Material } from './material';

export function executeRefreshProjectImport(context: SyncMaterialContext) {
  const { selectedMaterials, project, targetFormMaterialRoot } = context;

  const exportName2Material = new Map<string, Material>();

  const targetModule = `@/${path.relative(project.srcPath, targetFormMaterialRoot)}`;

  for (const material of selectedMaterials) {
    if (!material.indexFile) {
      console.warn(`Material ${material.name} not found`);
      return;
    }

    console.log(`👀 The exports of ${material.name} is ${material.allExportNames.join(',')}`);

    material.allExportNames.forEach((exportName) => {
      exportName2Material.set(exportName, material);
    });
  }

  for (const tsFile of traverseRecursiveTsFiles(project.srcPath)) {
    for (const importDeclaration of tsFile.imports) {
      if (importDeclaration.source.startsWith('@flowgram.ai/form-materials')) {
        // Import Module and its related named Imported
        const restImports: NamedImport[] = [];
        const importMap: Record<string, NamedImport[]> = {};

        if (!importDeclaration.namedImports) {
          continue;
        }

        for (const nameImport of importDeclaration.namedImports) {
          const material = exportName2Material.get(nameImport.imported);
          if (material) {
            const importModule = `${targetModule}/${material.fullName}`;
            importMap[importModule] = importMap[importModule] || [];
            importMap[importModule].push(nameImport);
          } else {
            restImports.push(nameImport);
          }
        }

        if (Object.keys(importMap).length === 0) {
          continue;
        }

        const nextImports: ImportDeclaration[] = Object.entries(importMap).map(
          ([importModule, namedImports]) => ({
            ...importDeclaration,
            namedImports,
            source: importModule,
          })
        );

        if (restImports?.length) {
          nextImports.unshift({
            ...importDeclaration,
            namedImports: restImports,
          });
        }

        tsFile.replaceImport([importDeclaration], nextImports);
        console.log(chalk.green(`🔄 Refresh Imports In: ${tsFile.path}`));

        console.log(
          `From:\n${importDeclaration.statement}\nTo:\n${nextImports
            .map((item) => item.statement)
            .join('\n')}`
        );
      }
    }
  }
}
