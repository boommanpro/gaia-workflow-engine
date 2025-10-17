/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import chalk from 'chalk';

import { traverseRecursiveTsFiles } from '../utils/ts-file';
import { Project } from '../utils/project';
import { loadNpm } from '../utils/npm';
import { Material } from '../materials/material';

export async function findUsedMaterials() {
  // materialName can be undefined
  console.log(chalk.bold('🚀 Welcome to @flowgram.ai form-materials CLI!'));

  const project = await Project.getSingleton();
  project.printInfo();

  const formMaterialPkg = await loadNpm('@flowgram.ai/form-materials');
  const materials: Material[] = Material.listAll(formMaterialPkg);

  const allUsedMaterials = new Set<Material>();

  const exportName2Material = new Map<string, Material>();

  for (const material of materials) {
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
    const fileMaterials = new Set<Material>();

    let fileImportPrinted = false;
    for (const importDeclaration of tsFile.imports) {
      if (
        !importDeclaration.source.startsWith('@flowgram.ai/form-materials') ||
        !importDeclaration.namedImports?.length
      ) {
        continue;
      }

      if (!fileImportPrinted) {
        fileImportPrinted = true;
        console.log(chalk.bold(`\n👀 Searching ${tsFile.path}`));
      }

      console.log(`🔍 ${importDeclaration.statement}`);

      if (importDeclaration.namedImports) {
        importDeclaration.namedImports.forEach((namedImport) => {
          const material = exportName2Material.get(namedImport.imported);

          if (material) {
            fileMaterials.add(material);
            allUsedMaterials.add(material);
            console.log(`import ${chalk.bold(material.fullName)} by ${namedImport.imported}`);
          }
        });
      }
    }
  }

  console.log(chalk.bold('\n📦 All used materials:'));
  console.log([...allUsedMaterials].map((_material) => _material.fullName).join(','));
}
