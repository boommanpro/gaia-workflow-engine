/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import inquirer from 'inquirer';
import chalk from 'chalk';

import { LoadedNpmPkg } from '../utils/npm';
import { MaterialCliOptions } from './types';
import { Material } from './material';

export const getSelectedMaterials = async (
  cliOpts: MaterialCliOptions,
  formMaterialPkg: LoadedNpmPkg
) => {
  const { materialName, selectMultiple } = cliOpts;

  const materials: Material[] = Material.listAll(formMaterialPkg);

  let selectedMaterials: Material[] = [];

  // 1. Check if materialName is provided and exists in materials
  if (materialName) {
    selectedMaterials = materialName
      .split(',')
      .map((_name) => materials.find((_m) => _m.fullName === _name.trim())!)
      .filter(Boolean);
  }

  // 2. If material not found or materialName not provided, prompt user to select
  if (!selectedMaterials.length) {
    console.log(chalk.yellow(`Material "${materialName}" not found. Please select from the list:`));

    const choices = materials.map((_material) => ({
      name: _material.fullName,
      value: _material,
    }));
    if (selectMultiple) {
      // User select one component
      const result = await inquirer.prompt<{
        material: Material[]; // Specify type for prompt result
      }>([
        {
          type: 'checkbox',
          name: 'material',
          message: 'Select multiple materials to add:',
          choices: choices,
        },
      ]);
      selectedMaterials = result.material;
    } else {
      // User select one component
      const result = await inquirer.prompt<{
        material: Material; // Specify type for prompt result
      }>([
        {
          type: 'list',
          name: 'material',
          message: 'Select one material to add:',
          choices: choices,
        },
      ]);
      selectedMaterials = [result.material];
    }
  }

  return selectedMaterials;
};
