'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ui = require('./ui');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const IGNORED_FILES   = ['.DS_Store', 'README.md', '.gitkeep', '.gitignore'];
const REQUIRED_TYPES  = ['controller', 'service', 'route'];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function readRoutesFile(projectRoot) {
  try {
    return fs.readFileSync(
      path.join(projectRoot, 'src/app/routes/index.ts'),
      'utf8',
    );
  } catch {
    return '';
  }
}

function getModules(modulesPath) {
  return fs
    .readdirSync(modulesPath)
    .filter((f) => fs.statSync(path.join(modulesPath, f)).isDirectory());
}

// ─── ARCHITECTURE GUARD ───────────────────────────────────────────────────────
function runArchitectureGuard(projectRoot) {
  const modulesPath = path.join(projectRoot, 'src/app/modules');

  if (!fs.existsSync(modulesPath)) return true; // nothing to validate

  const modules   = getModules(modulesPath);
  const routesSrc = readRoutesFile(projectRoot);

  let hasError  = false;
  let warnCount = 0;

  modules.forEach((moduleName) => {
    const expectedPrefix = moduleName.toLowerCase();
    const moduleDir      = path.join(modulesPath, moduleName);
    const allFiles       = fs.readdirSync(moduleDir);
    const files          = allFiles.filter((f) => !IGNORED_FILES.includes(f));

    // ── Empty module ───────────────────────────────────────────
    if (files.length === 0) {
      ui.warn(
        `Module [${moduleName}] is empty — remove it with: cem remove module ${moduleName}`,
      );
      warnCount++;
      return;
    }

    // ── Non-.ts files ──────────────────────────────────────────
    files.forEach((file) => {
      if (!file.endsWith('.ts')) {
        ui.warn(`Non-TypeScript file in [${moduleName}]: ${file} — skipping`);
        warnCount++;
      }
    });

    const tsFiles = files.filter((f) => f.endsWith('.ts'));

    // ── Naming convention ──────────────────────────────────────
    tsFiles.forEach((file) => {
      if (!file.startsWith(`${expectedPrefix}.`)) {
        ui.nl();
        ui.err(`Architecture violation in module [${moduleName}]`);
        ui.substep(`File '${file}' does not belong here`);
        ui.substep(
          `All files must start with '${expectedPrefix}.' — e.g. ${expectedPrefix}.controller.ts`,
        );
        hasError = true;
      }
    });

    // ── Required files ─────────────────────────────────────────
    REQUIRED_TYPES.forEach((type) => {
      const expected = `${expectedPrefix}.${type}.ts`;
      if (!tsFiles.includes(expected)) {
        ui.warn(`Module [${moduleName}] is missing ${expected}`);
        warnCount++;
      }
    });

    // ── Orphan check ───────────────────────────────────────────
    if (routesSrc && !routesSrc.includes(moduleName)) {
      ui.warn(
        `Module [${moduleName}] is not registered in routes/index.ts — it will never be reachable`,
      );
      warnCount++;
    }
  });

  return { hasError, warnCount };
}

// ─── MIDDLEWARE GUARD ─────────────────────────────────────────────────────────────────────
/**
 * Validates that every .ts file inside src/app/middlewares/ follows the
 * <name>.middleware.ts naming convention.
 * Core generated files are identified by their correct .middleware.ts names.
 * Any file ending in .ts but NOT in <name>.middleware.ts format is an error.
 */
function runMiddlewareGuard(projectRoot) {
  const mwPath = path.join(projectRoot, 'src/app/middlewares');
  if (!fs.existsSync(mwPath)) return { hasError: false, warnCount: 0 };

  let hasError  = false;
  let warnCount = 0;

  const allFiles = fs.readdirSync(mwPath).filter((f) => f.endsWith('.ts'));

  allFiles.forEach((file) => {
    if (!file.endsWith('.middleware.ts')) {
      ui.nl();
      ui.err(`Middleware naming violation: '${file}'`);
      ui.substep(`Expected: '${file.replace(/\.ts$/, '')}.middleware.ts'`);
      ui.substep(`Rename the file and update any imports that reference it.`);
      hasError = true;
    }
  });

  return { hasError, warnCount };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function runBuild() {
  const projectRoot = process.cwd();

  // ── Middleware Naming Guard ──────────────────────────────────────────────────────────
  ui.step('Running Middleware Convention Guard…');
  ui.nl();

  const mwResult = runMiddlewareGuard(projectRoot);
  if (mwResult.hasError) {
    ui.nl();
    ui.abort('Build aborted — all middleware files must follow the <name>.middleware.ts convention.');
  }
  ui.success('Middleware naming convention valid.');
  ui.nl();

  // ── Architecture Guard ────────────────────────────────────────────────────────────────────
  ui.step('Running Architecture Guard…');
  ui.nl();

  const { hasError, warnCount } = runArchitectureGuard(projectRoot);

  if (hasError) {
    ui.nl();
    ui.abort('Build aborted — fix architecture violations above.');
  }

  if (warnCount > 0) {
    ui.nl();
    ui.step('Architecture Guard', `passed with ${warnCount} warning${warnCount > 1 ? 's' : ''}`);
  } else {
    ui.success('Architecture validation passed.');
  }

  ui.nl();

  // ── TypeScript Compilation ─────────────────────────────────────────────────
  ui.step('Compiling TypeScript…');
  ui.nl();

  const t = Date.now();

  try {
    execSync('npx tsc', { stdio: 'inherit', cwd: projectRoot });
    ui.success(`Build successful.  ${ui.gray(Date.now() - t + 'ms')}`);
    ui.nl();
  } catch {
    ui.nl();
    ui.abort('Build failed during TypeScript compilation.');
  }
}

module.exports = { runBuild };