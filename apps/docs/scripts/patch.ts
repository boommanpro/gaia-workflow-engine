/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// @ts-ignore
import path from 'path';
// @ts-ignore
import fs from 'fs/promises'; // 使用 fs/promises 简化异步操作

async function patchLinks(outputDir: string) {
  /**
   * 修复 Markdown 文件中的链接。
   * 1. [foo](bar) -> [foo](./bar)
   * 2. [foo](./bar) -> [foo](./bar) (保持不变)
   * 3. [foo](http(s)://...) -> [foo](http(s)://...) (保持不变)
   */
  const normalizeLinksInFile = async (filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const newContent = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, p1, p2) => {
        // 如果链接以 '/' 或 './' 开头，则保持不变
        if (['/', '.'].includes(p2[0]) || p2.startsWith('http://') || p2.startsWith('https://')) {
          return `[${p1}](${p2})`;
        }
        // 否则添加 './'
        return `[${p1}](./${p2})`;
      });

      if (newContent !== content) {
        await fs.writeFile(filePath, newContent);
        // console.log(`Updated links in file: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  };

  const traverse = async (dir: string) => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await traverse(fullPath);
          } else if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
            await normalizeLinksInFile(fullPath);
          }
        })
      );
    } catch (error) {
      console.error(`Error traversing directory ${dir}:`, error);
    }
  };

  await traverse(outputDir);
}

export async function patchGeneratedApiDocs(absoluteApiDir: string) {
  console.log(`Patching links in API docs at: ${absoluteApiDir}`);
  await patchLinks(absoluteApiDir);
}
