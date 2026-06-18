'use strict';

const fs = require('fs');
const path = require('path');

// ─── DETECTION ───────────────────────────────────────────────────────────────
/**
 * Detect the package manager from the current context.
 * Priority: lock file → npm_config_user_agent → default npm.
 *
 * @param {string} [cwd=process.cwd()] - Project root to check for lock files
 * @returns {'npm' | 'yarn' | 'pnpm'}
 */
function detectPM(cwd = process.cwd()) {
  // 1. Lock file (strongest signal — existing project)
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock')))      return 'yarn';
  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) return 'npm';

  // 2. User agent (set by the PM that invoked the CLI)
  const ua = process.env.npm_config_user_agent || '';
  if (ua.startsWith('pnpm')) return 'pnpm';
  if (ua.startsWith('yarn')) return 'yarn';

  // 3. Default
  return 'npm';
}

// ─── COMMAND MAPS ────────────────────────────────────────────────────────────
/** @type {Record<string, Record<string, string>>} */
const COMMANDS = {
  npm: {
    install:    'npm install',
    installDev: 'npm install -D',
    ci:         'npm ci',
    run:        'npm run',
    exec:       'npx',
    global:     'npm i -g',
    lockfile:   'package-lock.json',
  },
  yarn: {
    install:    'yarn add',
    installDev: 'yarn add -D',
    ci:         'yarn install --frozen-lockfile',
    run:        'yarn',
    exec:       'yarn dlx',
    global:     'yarn global add',
    lockfile:   'yarn.lock',
  },
  pnpm: {
    install:    'pnpm add',
    installDev: 'pnpm add -D',
    ci:         'pnpm install --frozen-lockfile',
    run:        'pnpm',
    exec:       'pnpm dlx',
    global:     'pnpm add -g',
    lockfile:   'pnpm-lock.yaml',
  },
};

/**
 * Get the full command set for a PM.
 * @param {'npm'|'yarn'|'pnpm'} pm
 */
function commands(pm) {
  return COMMANDS[pm] || COMMANDS.npm;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Build a "run script" command string.
 * npm needs the "run" keyword; yarn/pnpm can omit it.
 *
 * @param {'npm'|'yarn'|'pnpm'} pm
 * @param {string} script
 * @returns {string}
 */
function runScript(pm, script) {
  return pm === 'npm' ? `npm run ${script}` : `${pm} ${script}`;
}

/**
 * Build a package-install command string.
 *
 * @param {'npm'|'yarn'|'pnpm'} pm
 * @param {string[]} packages
 * @param {{ dev?: boolean }} [opts]
 * @returns {string}
 */
function installCmd(pm, packages, { dev = false } = {}) {
  const base = dev ? commands(pm).installDev : commands(pm).install;
  return `${base} ${packages.join(' ')}`;
}

/**
 * Build the initial "install all" command (equivalent to `npm install`).
 * Used during scaffolding to install everything from the template package.json.
 *
 * @param {'npm'|'yarn'|'pnpm'} pm
 * @returns {string}
 */
function initialInstallCmd(pm) {
  switch (pm) {
    case 'yarn': return 'yarn install';
    case 'pnpm': return 'pnpm install';
    default:     return 'npm install --loglevel=error';
  }
}

module.exports = { detectPM, commands, runScript, installCmd, initialInstallCmd };
