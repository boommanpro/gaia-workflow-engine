#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('🚀 Starting to generate export files...');

    // 1. Get the package.json path of @coze-editor/editor package
    const packagePath = path.resolve(__dirname, '../node_modules/@coze-editor/editor/package.json');

    if (!fs.existsSync(packagePath)) {
      console.error('❌ @coze-editor/editor package not found, please run npm install first');
      process.exit(1);
    }

    // 2. Read package.json content
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);

    if (!packageJson.exports) {
      console.error('❌ No exports field found in @coze-editor/editor package.json');
      process.exit(1);
    }

    console.log(`📦 Found ${Object.keys(packageJson.exports).length} export items`);

    // 3. Process each export item
    const exports = packageJson.exports;
    const srcDir = path.resolve(__dirname, '../src');

    // Ensure src directory exists
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    }

    // Read current package.json
    const currentPackagePath = path.resolve(__dirname, '../package.json');
    const currentPackageContent = fs.readFileSync(currentPackagePath, 'utf8');
    const currentPackageJson = JSON.parse(currentPackageContent);

    let newExportsAdded = 0;

    for (const [exportPath, exportConfig] of Object.entries(exports)) {
      // Get export name (remove leading ./, root directory uses index)
      const exportName = exportPath === '.' ? 'index' : exportPath.replace(/^\.\//, '');

      // 3.1 Create corresponding .ts file
      const filePath = path.join(srcDir, `${exportName}.ts`);

      const contentParts = [];

      const baseImportPath =
        exportPath === '.' ? '@coze-editor/editor' : `@coze-editor/editor/${exportName}`;
      contentParts.push(`export * from '${baseImportPath}';`);

      // if is preset, add default export
      if (exportName.startsWith('preset')) {
        contentParts.push(`export { default } from '@coze-editor/editor/${exportName}';`);
      }

      const fileContent = contentParts.join('\n') + '\n';

      // Ensure directory exists (handle subdirectory case)
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // Only create file when it doesn't exist
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, fileContent);
        console.log(`✅ Created file: ${path.relative(process.cwd(), filePath)}`);
      } else {
        console.log(`⏭️  File already exists: ${path.relative(process.cwd(), filePath)}`);
      }

      // 3.2 Update exports field in package.json
      const exportKey = exportName === 'index' ? '.' : `./${exportName}`;

      if (!currentPackageJson.exports[exportKey]) {
        currentPackageJson.exports[exportKey] = {
          types: `./dist/types/${exportName}.d.ts`,
          require: `./dist/cjs/${exportName}.js`,
          import: `./dist/esm/${exportName}.mjs`,
        };
        newExportsAdded++;
        console.log(`📝 Added export configuration: ${exportKey}`);
      } else {
        console.log(`⏭️  Export configuration already exists: ${exportKey}`);
      }
    }

    // Save updated package.json
    fs.writeFileSync(currentPackagePath, JSON.stringify(currentPackageJson, null, 2) + '\n');

    console.log(`\n🎉 Completed!`);
    console.log(`📁 Created ${Object.keys(exports).length} export files`);
    console.log(`📦 Added ${newExportsAdded} new export configurations`);
    console.log(`💡 Remember to run npm run build to build new exports`);
  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    process.exit(1);
  }
}

// Run this script directly
if (require.main === module) {
  main();
}

module.exports = { main };
