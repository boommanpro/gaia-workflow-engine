/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export function extractNamedExports(content: string) {
  const valueExports = [];
  const typeExports = [];

  // Collect all type definition names
  const typeDefinitions = new Set();
  const typePatterns = [/\b(?:type|interface)\s+(\w+)/g, /\bexport\s+(?:type|interface)\s+(\w+)/g];

  let match;
  for (const pattern of typePatterns) {
    while ((match = pattern.exec(content)) !== null) {
      typeDefinitions.add(match[1]);
    }
  }

  // Match various export patterns
  const exportPatterns = [
    // export const/var/let/function/class/type/interface
    /\bexport\s+(const|var|let|function|class|type|interface)\s+(\w+)/g,
    // export { name1, name2 }
    /\bexport\s*\{([^}]+)\}/g,
    // export { name as alias }
    /\bexport\s*\{[^}]*\b(\w+)\s+as\s+(\w+)[^}]*\}/g,
    // export default function name()
    /\bexport\s+default\s+(?:function|class)\s+(\w+)/g,
    // export type { Type1, Type2 }
    /\bexport\s+type\s*\{([^}]+)\}/g,
    // export type { Original as Alias }
    /\bexport\s+type\s*\{[^}]*\b(\w+)\s+as\s+(\w+)[^}]*\}/g,
  ];

  // Handle first pattern: export const/var/let/function/class/type/interface
  exportPatterns[0].lastIndex = 0;
  while ((match = exportPatterns[0].exec(content)) !== null) {
    const [, kind, name] = match;
    if (kind === 'type' || kind === 'interface' || typeDefinitions.has(name)) {
      typeExports.push(name);
    } else {
      valueExports.push(name);
    }
  }

  // Handle second pattern: export { name1, name2 }
  exportPatterns[1].lastIndex = 0;
  while ((match = exportPatterns[1].exec(content)) !== null) {
    const exportsList = match[1]
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item && !item.includes(' as '));

    for (const name of exportsList) {
      if (name.startsWith('type ')) {
        typeExports.push(name.replace('type ', '').trim());
      } else if (typeDefinitions.has(name)) {
        typeExports.push(name);
      } else {
        valueExports.push(name);
      }
    }
  }

  // Handle third pattern: export { name as alias }
  exportPatterns[2].lastIndex = 0;
  while ((match = exportPatterns[2].exec(content)) !== null) {
    const [, original, alias] = match;
    if (typeDefinitions.has(original)) {
      typeExports.push(alias);
    } else {
      valueExports.push(alias);
    }
  }

  // Handle fourth pattern: export default function name()
  exportPatterns[3].lastIndex = 0;
  while ((match = exportPatterns[3].exec(content)) !== null) {
    const name = match[1];
    if (typeDefinitions.has(name)) {
      typeExports.push(name);
    } else {
      valueExports.push(name);
    }
  }

  // Handle fifth pattern: export type { Type1, Type2 }
  exportPatterns[4].lastIndex = 0;
  while ((match = exportPatterns[4].exec(content)) !== null) {
    const exportsList = match[1]
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item && !item.includes(' as '));

    for (const name of exportsList) {
      typeExports.push(name);
    }
  }

  // Handle sixth pattern: export type { Original as Alias }
  exportPatterns[5].lastIndex = 0;
  while ((match = exportPatterns[5].exec(content)) !== null) {
    const [, original, alias] = match;
    typeExports.push(alias);
  }

  // Deduplicate and sort
  return {
    values: [...new Set(valueExports)].sort(),
    types: [...new Set(typeExports)].sort(),
  };
}
