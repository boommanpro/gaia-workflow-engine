/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import fs from 'fs';

import ignore, { Ignore } from 'ignore';

export class File {
  content: string;

  isUtf8: boolean;

  relativePath: string;

  path: string;

  suffix: string;

  constructor(filePath: string, public root: string = '/') {
    this.path = filePath;
    this.relativePath = path.relative(this.root, this.path);
    this.suffix = path.extname(this.path);

    // Check if exists
    if (!fs.existsSync(this.path)) {
      throw Error(`File ${path} Not Exists`);
    }

    // If no utf-8, skip
    try {
      this.content = fs.readFileSync(this.path, 'utf-8');
      this.isUtf8 = true;
    } catch (e) {
      this.isUtf8 = false;
      return;
    }
  }

  replace(updater: (content: string) => string) {
    if (!this.isUtf8) {
      console.warn('Not UTF-8 file skipped: ', this.path);
      return;
    }
    this.content = updater(this.content);
    fs.writeFileSync(this.path, this.content, 'utf-8');
  }

  write(nextContent: string) {
    this.content = nextContent;
    fs.writeFileSync(this.path, this.content, 'utf-8');
  }
}

export function* traverseRecursiveFilePaths(
  folder: string,
  ig: Ignore = ignore().add('.git'),
  root: string = folder
): Generator<string> {
  const files = fs.readdirSync(folder);

  // add .gitignore to ignore if exists
  if (fs.existsSync(path.join(folder, '.gitignore'))) {
    ig.add(fs.readFileSync(path.join(folder, '.gitignore'), 'utf-8'));
  }

  for (const file of files) {
    const filePath = path.join(folder, file);

    if (ig.ignores(path.relative(root, filePath))) {
      continue;
    }

    if (fs.statSync(filePath).isDirectory()) {
      yield* traverseRecursiveFilePaths(filePath, ig, root);
    } else {
      yield filePath;
    }
  }
}

export function* traverseRecursiveFiles(folder: string): Generator<File> {
  for (const filePath of traverseRecursiveFilePaths(folder)) {
    yield new File(filePath, folder);
  }
}
