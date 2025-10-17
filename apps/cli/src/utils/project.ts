/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import chalk from 'chalk';

import { getLatestVersion } from './npm';

interface PackageJson {
  dependencies: { [key: string]: string };
  devDependencies?: { [key: string]: string };
  peerDependencies?: { [key: string]: string };
  [key: string]: any;
}

export class Project {
  flowgramVersion?: string;

  projectPath: string;

  packageJsonPath: string;

  packageJson: PackageJson;

  srcPath: string;

  protected constructor() {}

  async init() {
    // get nearest package.json
    let projectPath: string = process.cwd();

    while (projectPath !== '/' && !existsSync(path.join(projectPath, 'package.json'))) {
      projectPath = path.join(projectPath, '..');
    }
    if (projectPath === '/') {
      throw new Error('Please run this command in a valid project');
    }

    this.projectPath = projectPath;

    this.srcPath = path.join(projectPath, 'src');
    this.packageJsonPath = path.join(projectPath, 'package.json');
    this.packageJson = JSON.parse(readFileSync(this.packageJsonPath, 'utf8'));

    this.flowgramVersion =
      this.packageJson.dependencies['@flowgram.ai/fixed-layout-editor'] ||
      this.packageJson.dependencies['@flowgram.ai/free-layout-editor'] ||
      this.packageJson.dependencies['@flowgram.ai/editor'];
  }

  async addDependency(dependency: string) {
    let name: string;
    let version: string;

    // 处理作用域包（如 @types/react@1.0.0）
    const lastAtIndex = dependency.lastIndexOf('@');

    if (lastAtIndex <= 0) {
      // 没有@符号 或者@在开头（如 @types/react）
      name = dependency;
      version = await getLatestVersion(name);
    } else {
      // 正常分割包名和版本
      name = dependency.substring(0, lastAtIndex);
      version = dependency.substring(lastAtIndex + 1);

      // 如果版本部分为空，获取最新版本
      if (!version.trim()) {
        version = await getLatestVersion(name);
      }
    }

    this.packageJson.dependencies[name] = version;
    writeFileSync(this.packageJsonPath, JSON.stringify(this.packageJson, null, 2));
  }

  async addDependencies(dependencies: string[]) {
    for (const dependency of dependencies) {
      await this.addDependency(dependency);
    }
  }

  writeToPackageJsonFile() {
    writeFileSync(this.packageJsonPath, JSON.stringify(this.packageJson, null, 2));
  }

  printInfo() {
    console.log(chalk.bold('Project Info:'));
    console.log(chalk.black(`  - Flowgram Version: ${this.flowgramVersion}`));
    console.log(chalk.black(`  - Project Path: ${this.projectPath}`));
  }

  static async getSingleton() {
    const info = new Project();
    await info.init();
    return info;
  }
}
