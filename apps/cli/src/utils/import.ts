/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export interface NamedImport {
  local?: string;
  imported: string;
  typeOnly?: boolean;
}

/**
 * Cases
 * import { A, B } from 'module';
 * import A from 'module';
 * import * as C from 'module';
 * import D, { type E, F } from 'module';
 * import A, { B as B1 } from 'module';
 */
export interface ImportDeclaration {
  // origin statement
  statement: string;

  // import { A, B } from 'module';
  namedImports?: NamedImport[];

  // import A from 'module';
  defaultImport?: string;

  // import * as C from 'module';
  namespaceImport?: string;

  source: string;
}

export function assembleImport(declaration: ImportDeclaration): string {
  const { namedImports, defaultImport, namespaceImport, source } = declaration;
  const importClauses = [];
  if (namedImports) {
    importClauses.push(
      `{ ${namedImports
        .map(
          ({ local, imported, typeOnly }) =>
            `${typeOnly ? 'type ' : ''}${imported}${local ? ` as ${local}` : ''}`
        )
        .join(', ')} }`
    );
  }
  if (defaultImport) {
    importClauses.push(defaultImport);
  }
  if (namespaceImport) {
    importClauses.push(`* as ${namespaceImport}`);
  }
  return `import ${importClauses.join(', ')} from '${source}';`;
}

export function replaceImport(
  fileContent: string,
  origin: ImportDeclaration,
  replaceTo: ImportDeclaration[]
): string {
  const replaceImportStatements = replaceTo.map(assembleImport);
  // replace origin statement
  return fileContent.replace(origin.statement, replaceImportStatements.join('\n'));
}

export function* traverseFileImports(fileContent: string): Generator<ImportDeclaration> {
  // 匹配所有 import 语句的正则表达式
  const importRegex =
    /import\s+([^{}*,]*?)?(?:\s*\*\s*as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*,?)?(?:\s*\{([^}]*)\}\s*,?)?(?:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*,?)?\s*from\s*['"`]([^'"`]+)['"`]\;?/g;

  let match;
  while ((match = importRegex.exec(fileContent)) !== null) {
    const [fullMatch, defaultPart, namespacePart, namedPart, defaultPart2, source] = match;

    const declaration: ImportDeclaration = {
      statement: fullMatch,
      source: source,
    };

    // 处理默认导入
    const defaultImport = defaultPart?.trim() || defaultPart2?.trim();
    if (defaultImport && !namespacePart && !namedPart) {
      declaration.defaultImport = defaultImport;
    } else if (defaultImport && (namespacePart || namedPart)) {
      declaration.defaultImport = defaultImport;
    }

    // 处理命名空间导入 (* as)
    if (namespacePart) {
      declaration.namespaceImport = namespacePart.trim();
    }

    // 处理命名导入
    if (namedPart) {
      const namedImports = [];
      const namedItems = namedPart
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      for (const item of namedItems) {
        const typeOnly = item.startsWith('type ');
        const cleanItem = typeOnly ? item.slice(5).trim() : item;

        if (cleanItem.includes(' as ')) {
          const [imported, local] = cleanItem.split(' as ').map((s) => s.trim());
          namedImports.push({
            imported,
            local,
            typeOnly,
          });
        } else {
          namedImports.push({
            imported: cleanItem,
            typeOnly,
          });
        }
      }

      if (namedImports.length > 0) {
        declaration.namedImports = namedImports;
      }
    }

    yield declaration;
  }
}
