/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import chalk from 'chalk';

import { getLatestVersion } from '../utils/npm';
import { traverseRecursiveFiles } from '../utils/file';

export async function updateFlowgramVersion(inputVersion?: string) {
  console.log(chalk.bold('🚀 Welcome to @flowgram.ai update-version helper'));

  // Get latest version
  const latestVersion = await getLatestVersion('@flowgram.ai/editor');
  const currentPath = process.cwd();
  console.log('- Latest flowgram version: ', latestVersion);
  console.log('- Current Path: ', currentPath);

  // User Input flowgram version, default is latestVersion
  const flowgramVersion: string = inputVersion || latestVersion;

  for (const file of traverseRecursiveFiles(currentPath)) {
    if (file.path.endsWith('package.json')) {
      console.log('👀 Find package.json: ', file.path);
      let updated = false;
      const json = JSON.parse(file.content);
      if (json.dependencies) {
        for (const key in json.dependencies) {
          if (key.startsWith('@flowgram.ai/')) {
            updated = true;
            json.dependencies[key] = flowgramVersion;
            console.log(`- Update ${key} to ${flowgramVersion}`);
          }
        }
      }
      if (json.devDependencies) {
        for (const key in json.devDependencies) {
          if (key.startsWith('@flowgram.ai/')) {
            updated = true;
            json.devDependencies[key] = flowgramVersion;
            console.log(`- Update ${key} to ${flowgramVersion}`);
          }
        }
      }

      if (updated) {
        file.write(JSON.stringify(json, null, 2));
        console.log(`✅ ${file.path} Updated`);
      }
    }
  }
}
