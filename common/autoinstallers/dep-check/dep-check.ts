/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import path from 'node:path'
import fs from 'node:fs'
import { RushConfiguration } from '@rushstack/rush-sdk';
import depcheck from 'depcheck';

// 获取 Rush Monorepo 的 `rush.json`
const rushConfig = RushConfiguration.loadFromDefaultLocation({
  startingFolder: process.cwd(),
});
const rushConfigPath = path.join(rushConfig.rushJsonFolder, './');
if (!fs.existsSync(rushConfigPath)) {
  console.error("❌ rush.json not found. Please run this script from the root of your Rush monorepo.");
  process.exit(1);
}

// 解析 Rush 项目列表
const packages = rushConfig.projects.map((p) => p.projectFolder);

// depcheck 配置
const options = {
  ignorePatterns: ["node_modules", "dist", "build", "coverage"], // 忽略目录
  ignoreMatches: ["typescript", "@types/*", "vitest", "inversify", "reflect-metadata", "@flowgram.ai/ts-config", "@flowgram.ai/eslint-config", "eslint", "@vitest/coverage-v8", "@testing-library/react", "zod"], // 忽略类型依赖
};

// 异步检查未使用的依赖
const checkUnusedDependencies = async (packagePath): Promise<number> => {
  let unUsedNum = 0;
  const packageJsonPath = path.join(packagePath, "package.json");
  if (!fs.existsSync(packageJsonPath)) return unUsedNum;

  if (packagePath.includes('/apps/') || packagePath.includes('/common/') || packagePath.includes('/config/')) {
    console.log('✅ skip apps & common & config')
    return unUsedNum;
  }
  console.log(`\n🔍 Checking unused dependencies in ${packagePath}...`);
  const result = await depcheck(packagePath, options);

  if (result.dependencies.length || result.devDependencies.length) {
    console.log(`🚨 Unused dependencies found in ${packagePath}:`);
    if (result.dependencies.length) {
      unUsedNum += result.dependencies.length
      console.log(`  📦 Unused dependencies: ${result.dependencies.join(", ")}`);
    }
    if (result.devDependencies.length) {
      unUsedNum += result.devDependencies.length
      console.log(`  📦 Unused devDependencies: ${result.devDependencies.join(", ")}`);
    }
  } else {
    console.log(`✅ No unused dependencies found in ${packagePath}`);
  }
  return unUsedNum;
};

export async function runCheckDep(): Promise<void> {
  // 遍历所有 Rush 项目
  (async () => {
    let unUsedNum = 0
    for (const pkgPath of packages) {
      const fullPath = pkgPath;
      if (fs.existsSync(path.join(fullPath, "package.json"))) {
        const newNum = await checkUnusedDependencies(fullPath);
        unUsedNum += newNum;
      }
    }
    console.log(`\n✅ Unused dependency check completed! find ${unUsedNum} Error`);
  })();
}

runCheckDep();
