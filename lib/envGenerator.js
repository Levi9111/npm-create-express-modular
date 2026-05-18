'use strict';

const fs = require('fs');
const path = require('path');
const ui = require('./ui');

/**
 * Normalises any key format to UPPER_SNAKE and lower_snake
 * Handles: JWT_REFRESH_SECRET, jwtRefreshSecret, JwtRefreshSecret, jwt_refresh_secret
 */
function normaliseKey(key) {
  const upperKey = key
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toUpperCase();
  const lowerKey = upperKey.toLowerCase();
  return { upperKey, lowerKey };
}

/**
 * Adds a new environment variable to .env, .env.example, and config/index.ts
 * @param {string} key - The key name in any format
 */
function addEnvVar(key) {
  const projectRoot = process.cwd();
  const envPath        = path.join(projectRoot, '.env');
  const envExamplePath = path.join(projectRoot, '.env.example');
  const configPath     = path.join(projectRoot, 'src/app/config/index.ts');

  if (!fs.existsSync(envPath)) {
    ui.abort('.env file not found. Are you inside a cem project?');
  }

  const { upperKey, lowerKey } = normaliseKey(key);

  // ── 1. Update .env ───────────────────────────────────────────────────────
  let envContent = fs.readFileSync(envPath, 'utf8');

  if (envContent.includes(upperKey + '=')) {
    ui.warn(`${upperKey} already exists in .env — skipping.`);
  } else {
    envContent += `${upperKey}=<your_${lowerKey}>\n`;
    fs.writeFileSync(envPath, envContent);
  }

  // ── 2. Update .env.example ───────────────────────────────────────────────
  if (fs.existsSync(envExamplePath)) {
    let exampleContent = fs.readFileSync(envExamplePath, 'utf8');

    if (exampleContent.includes(upperKey + '=')) {
      ui.warn(`${upperKey} already exists in .env.example — skipping.`);
    } else {
      exampleContent += `${upperKey}=\n`;
      fs.writeFileSync(envExamplePath, exampleContent);
    }
  } else {
    // .env.example doesn't exist yet — create it with just this key
    fs.writeFileSync(envExamplePath, `${upperKey}=\n`);
    ui.warn('.env.example was missing — created it.');
  }

  // ── 3. Update config/index.ts ────────────────────────────────────────────
  if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8');

    if (configContent.includes(lowerKey + ':')) {
      ui.warn(`${lowerKey} already exists in config/index.ts — skipping.`);
    } else {
      const injectLine = `  ${lowerKey}: process.env.${upperKey},\n};`;
      configContent = configContent.replace(/};\s*$/, injectLine);
      fs.writeFileSync(configPath, configContent);
    }
  } else {
    ui.warn('config/index.ts not found — skipping config injection.');
  }
}

/**
 * Removes an env var from .env, .env.example, and config/index.ts
 * Called by cem remove env <KEY>
 */
function removeEnvVarFromFiles(key) {
  const projectRoot = process.cwd();
  const envPath        = path.join(projectRoot, '.env');
  const envExamplePath = path.join(projectRoot, '.env.example');
  const configPath     = path.join(projectRoot, 'src/app/config/index.ts');

  const { upperKey, lowerKey } = normaliseKey(key);

  // ── .env ─────────────────────────────────────────────────────────────────
  if (fs.existsSync(envPath)) {
    const updated = fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .filter((line) => !line.startsWith(upperKey + '='))
      .join('\n');
    fs.writeFileSync(envPath, updated);
  }

  // ── .env.example ─────────────────────────────────────────────────────────
  if (fs.existsSync(envExamplePath)) {
    const updated = fs.readFileSync(envExamplePath, 'utf8')
      .split('\n')
      .filter((line) => !line.startsWith(upperKey + '='))
      .join('\n');
    fs.writeFileSync(envExamplePath, updated);
  }

  // ── config/index.ts ──────────────────────────────────────────────────────
  if (fs.existsSync(configPath)) {
    const updated = fs.readFileSync(configPath, 'utf8')
      .split('\n')
      .filter((line) => !line.includes(`process.env.${upperKey}`))
      .join('\n');
    fs.writeFileSync(configPath, updated);
  }
}

module.exports = { addEnvVar, removeEnvVarFromFiles };