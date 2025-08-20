/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';

@injectable()
export class FormPathService {
  static readonly ROOT = '/';

  static readonly DIVIDER = '/';

  static readonly RELATIVE_PARENT = '..';

  static readonly RELATIVE_CURRENT = '.';

  static readonly ARRAY = '[]';

  static normalize(path: string) {
    if (path === FormPathService.ROOT) {
      return path;
    }
    // 去掉末尾的斜杠
    if (path.endsWith(FormPathService.DIVIDER)) {
      path = path.slice(0, -1);
    }
    return path;
  }

  static join(paths: string[]): string {
    if (paths[1].startsWith(FormPathService.ROOT)) {
      throw new Error(
        `FormPathService Error: join failed, invalid paths[1], paths[1]= ${paths[1]}`,
      );
    }
    if (paths[0].endsWith(FormPathService.DIVIDER)) {
      return `${paths[0]}${paths[1]}`;
    }
    return paths.join(FormPathService.DIVIDER);
  }

  static toArrayPath(path: string): string {
    return FormPathService.join([path, FormPathService.ARRAY]);
  }

  static parseArrayItemPath(path: string) {
    const names = path.split('/');

    let i = 0;
    while (i < names.length) {
      const itemIndex = parseInt(names[i]);

      if (!isNaN(itemIndex)) {
        const arrayPath = FormPathService.toArrayPath(
          names.slice(0, i).join(FormPathService.DIVIDER),
        );
        const restPath = names.slice(i + 1).join(FormPathService.DIVIDER);
        const itemMetaPath = FormPathService.join([arrayPath, restPath]);
        return { itemIndex, arrayPath, itemMetaPath };
      }
      i = i + 1;
    }
    return null;
  }

  simplify(path: string) {
    const segments = path.split(FormPathService.DIVIDER);
    const resSegments: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      if (!segments[i]) {
        throw new Error('FormPathService: join failed');
      }

      if (segments[i] === FormPathService.RELATIVE_CURRENT) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (segments[i] === FormPathService.RELATIVE_PARENT) {
        resSegments.pop();
      }
      resSegments.push(segments[i]);
    }
    return resSegments.join(FormPathService.DIVIDER);
  }
}
