import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Added type definitions
interface PackageJson {
  dependencies: { [key: string]: string };
  devDependencies?: { [key: string]: string };
  peerDependencies?: { [key: string]: string };
  [key: string]: any;
}

export interface ProjectInfo {
  projectPath: string;
  packageJsonPath: string;
  packageJson: PackageJson;
  flowgramVersion: string;
}

export function getProjectInfo(): ProjectInfo {
  // get nearest package.json
  let projectPath: string = process.cwd();

  while (projectPath !== '/' && !fs.existsSync(path.join(projectPath, 'package.json'))) {
    projectPath = path.join(projectPath, '..');
  }

  if (projectPath === '/') {
    throw new Error('Please run this command in a valid project');
  }

  const packageJsonPath: string = path.join(projectPath, 'package.json');
  const packageJson: PackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // fixed layout or free layout
  const flowgramVersion: string | undefined =
    packageJson.dependencies['@flowgram.ai/fixed-layout-editor'] ||
    packageJson.dependencies['@flowgram.ai/free-layout-editor'] ||
    packageJson.dependencies['@flowgram.ai/editor'];

  if (!flowgramVersion) {
    throw new Error(
      'Please install @flowgram.ai/fixed-layout-editor or @flowgram.ai/free-layout-editor'
    );
  }

  return {
    projectPath,
    packageJsonPath,
    packageJson,
    flowgramVersion, // TypeScript will ensure this is string due to the check above
  };
}

export function findRushJson(startPath: string): string | null {
  let currentPath: string = startPath;
  while (currentPath !== '/' && !fs.existsSync(path.join(currentPath, 'rush.json'))) {
    currentPath = path.join(currentPath, '..');
  }
  if (fs.existsSync(path.join(currentPath, 'rush.json'))) {
    return path.join(currentPath, 'rush.json');
  }
  return null;
}

export function installDependencies(packages: string[], projectInfo: ProjectInfo): void {
  if (fs.existsSync(path.join(projectInfo.projectPath, 'yarn.lock'))) {
    execSync(`yarn add ${packages.join(' ')}`, { stdio: 'inherit' });
    return;
  }

  if (fs.existsSync(path.join(projectInfo.projectPath, 'pnpm-lock.yaml'))) {
    execSync(`pnpm add ${packages.join(' ')}`, { stdio: 'inherit' });
    return;
  }

  //  rush monorepo
  if (findRushJson(projectInfo.projectPath)) {
    execSync(`rush add ${packages.map((pkg) => `--package ${pkg}`).join(' ')}`, {
      stdio: 'inherit',
    });
    return;
  }

  execSync(`npm install ${packages.join(' ')}`, { stdio: 'inherit' });
}
