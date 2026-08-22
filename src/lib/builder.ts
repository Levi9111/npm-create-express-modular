/**
 * src/lib/builder.ts
 *
 * Implements `cem build` — runs the middleware naming guard, architecture
 * guard, and TypeScript compilation in sequence. Aborts on the first failure.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as ui from './ui';

/** Files to ignore when scanning module directories. */
const IGNORED_FILES = ['.DS_Store', 'README.md', '.gitkeep', '.gitignore'];
/** The three file types every module must have. */
const REQUIRED_TYPES = ['controller', 'service', 'route'];


/**
 * Reads the central routes/index.ts file content.
 *
 * @param projectRoot - Path to target project root.
 * @returns File content string or empty string on error.
 */
function readRoutesFile(projectRoot: string): string {
  try {
    return fs.readFileSync(
      path.join(projectRoot, 'src/app/routes/index.ts'),
      'utf8',
    );
  } catch {
    return '';
  }
}

/**
 * Lists all module folder names inside src/app/modules.
 *
 * @param modulesPath - Absolute path to modules directory.
 * @returns Array of directory names.
 */
function getModules(modulesPath: string): string[] {
  return fs
    .readdirSync(modulesPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

/** Return value for both guard functions. */
interface GuardResult {
  hasError: boolean;
  warnCount: number;
}

/**
 * Validates module architectural constraints (required layer files and router wiring).
 *
 * @param projectRoot - Path to target project root.
 * @returns Result object containing error and warning status.
 */
function runArchitectureGuard(projectRoot: string): GuardResult {
  const modulesPath = path.join(projectRoot, 'src/app/modules');

  if (!fs.existsSync(modulesPath)) return { hasError: false, warnCount: 0 };

  const modules = getModules(modulesPath);
  const routesSrc = readRoutesFile(projectRoot);

  let hasError = false;
  let warnCount = 0;

  modules.forEach((moduleName) => {
    const expectedPrefix = moduleName.toLowerCase();
    const moduleDir = path.join(modulesPath, moduleName);
    const allFiles = fs.readdirSync(moduleDir);
    const files = allFiles.filter((f) => !IGNORED_FILES.includes(f));

    if (files.length === 0) {
      ui.warn(
        `Module [${moduleName}] is empty — remove it with: cem remove module ${moduleName}`,
      );
      warnCount++;
      return;
    }

    files.forEach((file) => {
      if (!file.endsWith('.ts')) {
        ui.warn(`Non-TypeScript file in [${moduleName}]: ${file} — skipping`);
        warnCount++;
      }
    });

    const tsFiles = files.filter((f) => f.endsWith('.ts'));

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

    REQUIRED_TYPES.forEach((type) => {
      const expected = `${expectedPrefix}.${type}.ts`;
      if (!tsFiles.includes(expected)) {
        ui.warn(`Module [${moduleName}] is missing ${expected}`);
        warnCount++;
      }
    });

    if (routesSrc && !routesSrc.includes(moduleName)) {
      ui.warn(
        `Module [${moduleName}] is not registered in routes/index.ts — it will never be reachable`,
      );
      warnCount++;
    }
  });

  return { hasError, warnCount };
}


function runMiddlewareGuard(projectRoot: string): GuardResult {
  const mwPath = path.join(projectRoot, 'src/app/middlewares');
  if (!fs.existsSync(mwPath)) return { hasError: false, warnCount: 0 };

  let hasError = false;
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

/**
 * Runs all three build steps: middleware guard, architecture guard, and tsc.
 * Aborts with a non-zero exit code on the first failure.
 */
export function runBuild(): void {
  const projectRoot = process.cwd();

  ui.step('Running Middleware Convention Guard…');
  ui.nl();

  const mwResult = runMiddlewareGuard(projectRoot);
  if (mwResult.hasError) {
    ui.nl();
    ui.abort(
      'Build aborted — all middleware files must follow the <name>.middleware.ts convention.',
    );
  }
  ui.success('Middleware naming convention valid.');
  ui.nl();

  ui.step('Running Architecture Guard…');
  ui.nl();

  const { hasError, warnCount } = runArchitectureGuard(projectRoot);

  if (hasError) {
    ui.nl();
    ui.abort('Build aborted — fix architecture violations above.');
  }

  if (warnCount > 0) {
    ui.nl();
    ui.step(
      'Architecture Guard',
      `passed with ${warnCount} warning${warnCount > 1 ? 's' : ''}`,
    );
  } else {
    ui.success('Architecture validation passed.');
  }

  ui.nl();

  ui.step('Compiling TypeScript…');
  ui.nl();

  const t = Date.now();

  try {
    execSync('node_modules/.bin/tsc', { stdio: 'inherit', cwd: projectRoot });
    ui.success(`Build successful.  ${ui.gray(Date.now() - t + 'ms')}`);
    ui.nl();
  } catch {
    ui.nl();
    ui.abort('Build failed during TypeScript compilation.');
  }
}
