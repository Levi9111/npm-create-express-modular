/**
 * src/lib/envGenerator.ts
 *
 * Manages environment variable lifecycle for CEM projects:
 * adds / removes keys from `.env`, `.env.example`, and `src/app/config/index.ts`.
 */

import fs from 'fs';
import path from 'path';
import * as ui from './ui';

export interface NormalisedKey {
  upperKey: string;
  lowerKey: string;
}

/**
 * Normalises any key format to UPPER_SNAKE and lower_snake
 * Handles: JWT_REFRESH_SECRET, jwtRefreshSecret, JwtRefreshSecret, jwt_refresh_secret
 */
export function normaliseKey(key: string): NormalisedKey {
  const upperKey = key
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toUpperCase();
  const lowerKey = upperKey.toLowerCase();
  return { upperKey, lowerKey };
}

/**
 * Adds one or more new environment variables to .env, .env.example, and config/index.ts
 */
export function addEnvVar(key: string | string[]): void {
  const keys = Array.isArray(key) ? key : [key];
  if (keys.length === 0) return;

  const projectRoot = process.cwd();
  const envPath = path.join(projectRoot, '.env');
  const envExamplePath = path.join(projectRoot, '.env.example');
  const configPath = path.join(projectRoot, 'src/app/config/index.ts');

  if (!fs.existsSync(envPath)) {
    ui.abort('.env file not found. Are you inside a cem project?');
  }

  // 1. Update .env
  let envContent = fs.readFileSync(envPath, 'utf8');
  let envUpdated = false;

  for (const k of keys) {
    const { upperKey, lowerKey } = normaliseKey(k);
    if (envContent.includes(upperKey + '=')) {
      ui.warn(`${upperKey} already exists in .env — skipping.`);
    } else {
      envContent += `${upperKey}=<your_${lowerKey}>\n`;
      envUpdated = true;
    }
  }

  if (envUpdated) {
    fs.writeFileSync(envPath, envContent);
  }

  // 2. Update .env.example
  if (fs.existsSync(envExamplePath)) {
    let exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    let exampleUpdated = false;

    for (const k of keys) {
      const { upperKey } = normaliseKey(k);
      if (exampleContent.includes(upperKey + '=')) {
        ui.warn(`${upperKey} already exists in .env.example — skipping.`);
      } else {
        exampleContent += `${upperKey}=\n`;
        exampleUpdated = true;
      }
    }

    if (exampleUpdated) {
      fs.writeFileSync(envExamplePath, exampleContent);
    }
  } else {
    let exampleContent = '';
    for (const k of keys) {
      const { upperKey } = normaliseKey(k);
      exampleContent += `${upperKey}=\n`;
    }
    fs.writeFileSync(envExamplePath, exampleContent);
    ui.warn('.env.example was missing — created it.');
  }

  // 3. Update config/index.ts
  if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8');
    let configUpdated = false;
    let injectBlock = '';

    for (const k of keys) {
      const { upperKey, lowerKey } = normaliseKey(k);
      if (configContent.includes(lowerKey + ':')) {
        ui.warn(`${lowerKey} already exists in config/index.ts — skipping.`);
      } else {
        injectBlock += `  ${lowerKey}: process.env.${upperKey},\n`;
        configUpdated = true;
      }
    }

    if (configUpdated) {
      configContent = configContent.replace(/([^,\s{])(\s*};\s*)$/, '$1,$2');
      const injectLine = injectBlock + '};';
      configContent = configContent.replace(/};\s*$/, injectLine);
      fs.writeFileSync(configPath, configContent);
    }
  } else {
    ui.warn('config/index.ts not found — skipping config injection.');
  }
}

/**
 * Removes an env var from .env, .env.example, and config/index.ts
 */
export function removeEnvVarFromFiles(key: string): void {
  const projectRoot = process.cwd();
  const envPath = path.join(projectRoot, '.env');
  const envExamplePath = path.join(projectRoot, '.env.example');
  const configPath = path.join(projectRoot, 'src/app/config/index.ts');

  const { upperKey } = normaliseKey(key);

  if (fs.existsSync(envPath)) {
    const updated = fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .filter((line) => !line.startsWith(upperKey + '='))
      .join('\n');
    fs.writeFileSync(envPath, updated);
  }

  if (fs.existsSync(envExamplePath)) {
    const updated = fs.readFileSync(envExamplePath, 'utf8')
      .split('\n')
      .filter((line) => !line.startsWith(upperKey + '='))
      .join('\n');
    fs.writeFileSync(envExamplePath, updated);
  }

  if (fs.existsSync(configPath)) {
    const updated = fs.readFileSync(configPath, 'utf8')
      .split('\n')
      .filter((line) => !line.includes(`process.env.${upperKey}`))
      .join('\n');
    fs.writeFileSync(configPath, updated);
  }
}
