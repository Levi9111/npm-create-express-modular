'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ui = require('./ui');

function runBuild() {
  const projectRoot = process.cwd();

  // ── Architecture Guard ──────────────────────────────────────
  ui.step('Running Architecture Guard…');

  const modulesPath = path.join(projectRoot, 'src/app/modules');

  if (fs.existsSync(modulesPath)) {
    const modules = fs
      .readdirSync(modulesPath)
      .filter((f) => fs.statSync(path.join(modulesPath, f)).isDirectory());

    let hasError = false;

    modules.forEach((moduleName) => {
      const expectedPrefix = moduleName.toLowerCase();
      const moduleDir = path.join(modulesPath, moduleName);

      fs.readdirSync(moduleDir).forEach((file) => {
        if (!file.startsWith(`${expectedPrefix}.`)) {
          ui.nl();
          ui.err(`Architecture violation in module [${moduleName}]`);
          ui.substep(`File '${file}' does not belong here`);
          ui.substep(`All files must start with '${expectedPrefix}.' — e.g. ${expectedPrefix}.controller.ts`);
          hasError = true;
        }
      });
    });

    if (hasError) {
      ui.nl();
      ui.abort('Build aborted — fix architecture violations above.');
      // abort() calls process.exit(1) internally
    }
  }

  ui.success('Architecture validation passed.');
  ui.nl();

  // ── TypeScript Compilation ──────────────────────────────────
  ui.step('Compiling TypeScript…');

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