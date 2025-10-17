#!/usr/bin/env node

/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

const fs = require('fs');
const path = require('path');

/**
 * Convert wildcard exports to named exports in index.ts files across multiple folders
 * This script analyzes each exported file and extracts their named exports
 */

const folders = ['components', 'hooks', 'plugins', 'shared', 'validate', 'form-plugins', 'effects'];
const SRC_DIR = path.join(__dirname, '..', 'src');

/**
 * Extract all named exports from a file, distinguishing between values and types
 * @param {string} filePath - Path of the file to analyze
 * @returns {{values: string[], types: string[]}} - Object containing value exports and type exports
 */
function extractNamedExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const valueExports = [];
    const typeExports = [];

    // Collect all type definition names
    const typeDefinitions = new Set();
    const typePatterns = [
      /\b(?:type|interface)\s+(\w+)/g,
      /\bexport\s+(?:type|interface)\s+(\w+)/g,
    ];

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
        if (typeDefinitions.has(name)) {
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
  } catch (error) {
    console.error(`Failed to read file: ${filePath}`, error.message);
    return { values: [], types: [] };
  }
}

/**
 * Process named export conversion for a single folder
 * @param {string} folderName - Folder name
 * @param {string} baseDir - Base directory
 */
function processFolder(folderName, baseDir = SRC_DIR) {
  const folderPath = path.join(baseDir, folderName);
  const indexFile = path.join(folderPath, 'index.ts');

  console.log(`🔍 Processing folder: ${folderName}`);

  try {
    // Check if folder exists
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      console.warn(`⚠️  Folder does not exist: ${folderName}`);
      return;
    }

    // Generate new named export content
    let newContent = '';

    // Collect all subdirectory exports
    const subDirs = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((item) => item.isDirectory() && !item.name.startsWith('.'))
      .map((item) => item.name);

    const namedExportsList = [];

    // Process all subdirectories
    for (const subDir of subDirs) {
      const subDirPath = path.join(folderPath, subDir);
      const subPossiblePaths = [
        path.join(subDirPath, 'index.ts'),
        path.join(subDirPath, 'index.tsx'),
        path.join(subDirPath, `${subDir}.ts`),
        path.join(subDirPath, `${subDir}.tsx`),
      ];

      const subFullPath = subPossiblePaths.find(fs.existsSync);
      if (!subFullPath) continue;

      const { values: subValues, types: subTypes } = extractNamedExports(subFullPath);
      if (subValues.length === 0 && subTypes.length === 0) continue;

      namedExportsList.push({ importPath: `./${subDir}`, values: subValues, types: subTypes });
      console.log(
        `✅ Found exports in ${folderName}/${subDir}:\n (${subValues.length} values and ${subTypes.length} types)`
      );
    }

    // Generate import statements
    for (const { importPath, values, types } of namedExportsList) {
      const imports = [];
      if (values.length > 0) {
        imports.push(...values);
      }
      if (types.length > 0) {
        imports.push(...types.map((type) => `type ${type}`));
      }

      if (imports.length > 0) {
        newContent += `export { ${imports.join(', ')} } from '${importPath}';
`;
      }
    }

    // Write new content
    fs.writeFileSync(indexFile, newContent);
    console.log(`✅ Successfully updated ${folderName}/index.ts\n\n`);
  } catch (error) {
    console.error(`❌ Failed to process ${folderName}:`, error.message);
    console.error(error.stack);
  }
}

/**
 * Main function: Process all configured folders
 */
function convertAllFolders() {
  console.log('🚀 Starting to process all configured folders...\n');

  for (const folder of folders) {
    processFolder(folder);
  }

  console.log('\n🎉 All folders processed successfully!');

  processFolder('.');

  console.log('\n🎉 Index of form materials is updated!');
}

// If this script is run directly
if (require.main === module) {
  convertAllFolders();
}

module.exports = { convertAllFolders, extractNamedExports };
