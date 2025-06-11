import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

import { ProjectInfo } from './project'; // Import ProjectInfo

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Added type definitions
export interface Material {
  name: string;
  type: string;
  path: string;
  depPackages?: string[];
  depMaterials?: string[];
  [key: string]: any; // For other properties from config.json
}

const _types: string[] = ['components', 'effects', 'utils', 'typings'];

export function listAllMaterials(): Material[] {
  const _materials: Material[] = [];

  for (const _type of _types) {
    // 在 Node.js 中，import.meta.dirname 不可用，可使用 import.meta.url 结合 url 模块来获取目录路径

    const materialsPath: string = path.join(__dirname, '..', 'src', _type);
    _materials.push(
      ...fs
        .readdirSync(materialsPath)
        .map((_path: string) => {
          if (_path === 'index.ts') {
            return null;
          }

          const configPath = path.join(materialsPath, _path, 'config.json');
          // Check if config.json exists before reading
          if (!fs.existsSync(configPath)) {
            console.warn(
              `Warning: config.json not found for material at ${path.join(materialsPath, _path)}`
            );
            return null;
          }
          const configContent = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(configContent);

          return {
            ...config,
            name: _path, // Assuming the folder name is the material name
            type: _type,
            path: path.join(materialsPath, _path),
          } as Material;
        })
        .filter((material): material is Material => material !== null)
    );
  }

  return _materials;
}

interface BfsResult {
  allMaterials: Material[];
  allPackages: string[];
}

export function bfsMaterials(material: Material, _materials: Material[] = []): BfsResult {
  function findConfigByName(name: string): Material | undefined {
    return _materials.find(
      (_config) => _config.name === name || `${_config.type}/${_config.name}` === name
    );
  }

  const queue: (Material | undefined)[] = [material]; // Queue can hold undefined if findConfigByName returns undefined
  const allMaterials = new Set<Material>();
  const allPackages = new Set<string>();

  while (queue.length > 0) {
    const _material = queue.shift();
    if (!_material || allMaterials.has(_material)) {
      // Check if _material is defined
      continue;
    }
    allMaterials.add(_material);

    if (_material.depPackages) {
      for (const _package of _material.depPackages) {
        allPackages.add(_package);
      }
    }

    if (_material.depMaterials) {
      for (const _materialName of _material.depMaterials) {
        const depMaterial = findConfigByName(_materialName);
        if (depMaterial) {
          // Ensure dependent material is found before adding to queue
          queue.push(depMaterial);
        } else {
          console.warn(
            `Warning: Dependent material "${_materialName}" not found for material "${_material.name}".`
          );
        }
      }
    }
  }

  return {
    allMaterials: Array.from(allMaterials),
    allPackages: Array.from(allPackages),
  };
}

export const copyMaterial = (material: Material, projectInfo: ProjectInfo): void => {
  const sourceDir: string = material.path;
  const materialRoot: string = path.join(
    projectInfo.projectPath,
    'src',
    'form-materials',
    `${material.type}`
  );
  const targetDir = path.join(materialRoot, material.name);
  fs.cpSync(sourceDir, targetDir, { recursive: true });

  let materialRootIndexTs: string = '';
  const indexTsPath = path.join(materialRoot, 'index.ts');
  if (fs.existsSync(indexTsPath)) {
    materialRootIndexTs = fs.readFileSync(indexTsPath, 'utf8');
  }
  if (!materialRootIndexTs.includes(material.name)) {
    fs.writeFileSync(
      indexTsPath,
      `${materialRootIndexTs}${materialRootIndexTs.endsWith('\n') ? '' : '\n'}export * from './${
        material.name
      }';\n`
    );
  }
};
