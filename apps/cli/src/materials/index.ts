/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import path from 'path';

import chalk from 'chalk';

import { Project } from '../utils/project';
import { loadNpm } from '../utils/npm';
import { MaterialCliOptions, SyncMaterialContext } from './types';
import { getSelectedMaterials } from './select';
import { executeRefreshProjectImport } from './refresh-project-import';
import { Material } from './material';
import { copyMaterials } from './copy';

export async function syncMaterial(cliOpts: MaterialCliOptions) {
  const { refreshProjectImports, targetMaterialRootDir } = cliOpts;

  // materialName can be undefined
  console.log(chalk.bold('🚀 Welcome to @flowgram.ai form-materials CLI!'));

  const project = await Project.getSingleton();
  project.printInfo();

  // where to place all material in target project
  const targetFormMaterialRoot =
    targetMaterialRootDir || path.join(project.projectPath, 'src', 'form-materials');
  console.log(chalk.black(`  - Target material root: ${targetFormMaterialRoot}`));

  if (!project.flowgramVersion) {
    throw new Error(
      chalk.red(
        '❌ Please install @flowgram.ai/fixed-layout-editor or @flowgram.ai/free-layout-editor'
      )
    );
  }

  const formMaterialPkg = await loadNpm('@flowgram.ai/form-materials');

  let selectedMaterials: Material[] = await getSelectedMaterials(cliOpts, formMaterialPkg);

  // Ensure material is defined before proceeding
  if (!selectedMaterials.length) {
    console.error(chalk.red('No material selected. Exiting.'));
    process.exit(1);
  }

  const context: SyncMaterialContext = {
    selectedMaterials: selectedMaterials,
    project,
    formMaterialPkg,
    cliOpts,
    targetFormMaterialRoot,
  };

  // Copy the materials to the project
  console.log(chalk.bold('🚀 The following materials will be added to your project'));
  console.log(selectedMaterials.map((material) => `📦 ${material.fullName}`).join('\n'));
  console.log('\n');

  let { packagesToInstall } = copyMaterials(context);

  // Refresh project imports
  if (refreshProjectImports) {
    console.log(chalk.bold('🚀 Refresh imports in your project'));
    executeRefreshProjectImport(context);
  }

  // Install the dependencies
  await project.addDependencies(packagesToInstall);
  console.log(chalk.bold('\n✅ These npm dependencies is added to your package.json'));
  packagesToInstall.forEach((_package) => {
    console.log(`- ${_package}`);
  });
  console.log(chalk.bold(chalk.bold('\n➡️ Please run npm install to install dependencies\n')));
}
