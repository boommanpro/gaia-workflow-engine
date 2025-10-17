/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import https from 'https';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

import * as tar from 'tar';
import fs from 'fs-extra';

export class LoadedNpmPkg {
  constructor(public name: string, public version: string, public path: string) {}

  get srcPath() {
    return path.join(this.path, 'src');
  }

  get distPath() {
    return path.join(this.path, 'dist');
  }

  protected _packageJson: Record<string, any>;

  get packageJson() {
    if (!this._packageJson) {
      this._packageJson = JSON.parse(readFileSync(path.join(this.path, 'package.json'), 'utf8'));
    }
    return this._packageJson;
  }

  get dependencies(): Record<string, string> {
    return this.packageJson.dependencies;
  }
}

// 使用 https 下载文件
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });

    file.on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

export async function getLatestVersion(packageName: string): Promise<string> {
  return execSync(`npm view ${packageName} version --tag=latest`).toString().trim();
}

export async function loadNpm(packageName: string): Promise<LoadedNpmPkg> {
  const packageLatestVersion = await getLatestVersion(packageName);

  const packagePath = path.join(__dirname, `./.download/${packageName}-${packageLatestVersion}`);

  if (existsSync(packagePath)) {
    return new LoadedNpmPkg(packageName, packageLatestVersion, packagePath);
  }

  try {
    // 获取 tarball 地址
    const tarballUrl = execSync(`npm view ${packageName}@${packageLatestVersion} dist.tarball`)
      .toString()
      .trim();

    // 临时 tarball 路径
    const tempTarballPath = path.join(
      __dirname,
      `./.download/${packageName}-${packageLatestVersion}.tgz`
    );

    // 确保目录存在
    fs.ensureDirSync(path.dirname(tempTarballPath));

    // 下载 tarball
    await downloadFile(tarballUrl, tempTarballPath);

    fs.ensureDirSync(packagePath);

    // 解压到目标目录
    await tar.x({
      file: tempTarballPath,
      cwd: packagePath,
      strip: 1,
    });

    // 删除临时文件
    fs.unlinkSync(tempTarballPath);

    return new LoadedNpmPkg(packageName, packageLatestVersion, packagePath);
  } catch (error) {
    console.error(`Error downloading or extracting package`);
    console.error(error);
    throw error;
  }
}
