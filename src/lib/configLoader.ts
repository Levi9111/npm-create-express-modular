/**
 * src/lib/configLoader.ts
 *
 * Provides reading, writing, and creating operations for the `cem.json`
 * project configuration file.
 */

import fs from 'fs';
import path from 'path';
import type { CemConfig, DbChoice, ValidatorChoice, TokenDelivery, PackageManager } from './types';

export const CONFIG_FILENAME = 'cem-cli.json';

/**
 * Reads and parses the `cem-cli.json` configuration file from a project root.
 * Returns `null` if the file does not exist or cannot be parsed.
 *
 * @param projectRoot - Directory containing `cem-cli.json` (defaults to cwd)
 */
export function loadCemConfig(projectRoot: string = process.cwd()): CemConfig | null {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content) as CemConfig;
  } catch {
    return null;
  }
}

/**
 * Writes or updates the `cem-cli.json` configuration file.
 *
 * @param config - The CemConfig object to write
 * @param projectRoot - Directory to save `cem-cli.json` in (defaults to cwd)
 */
export function saveCemConfig(config: CemConfig, projectRoot: string = process.cwd()): void {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Factory helper to construct an initial CemConfig object upon project scaffolding.
 */
export function createInitialCemConfig(options: {
  projectName: string;
  db: DbChoice;
  validator: ValidatorChoice;
  useAuth: boolean;
  authTokenDelivery?: TokenDelivery;
  useDocker: boolean;
  useSwagger?: boolean;
  packageManager?: PackageManager;
  version?: string;
}): CemConfig {
  return {
    version: options.version || '3.2.0',
    project: {
      name: options.projectName,
      db: options.db,
      validator: options.validator,
      auth: options.useAuth,
      authTokenDelivery: options.authTokenDelivery,
      docker: options.useDocker,
      packageManager: options.packageManager || 'npm',
    },
    structure: {
      srcDir: 'src',
      appDir: 'src/app',
      modulesDir: 'src/app/modules',
      middlewaresDir: 'src/app/middlewares',
      utilsDir: 'src/app/utils',
      configDir: 'src/app/config',
    },
    features: {
      testing: false,
      websocket: false,
      swagger: !!options.useSwagger,
    },
  };
}
