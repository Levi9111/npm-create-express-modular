/**
 * src/lib/module/index.ts
 *
 * Orchestrator for the `cem add module` command.
 * Prompts the user for module options, then writes all scaffold files
 * and wires the route into `src/app/routes/index.ts`.
 */

import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import * as ui from '../ui';
import { loadCemConfig } from '../configLoader';
import { getDbGenerator } from '../db';
import type { DbChoice, ValidatorChoice } from '../types';
import { pluralize, capitalize } from '../utils/string';
import { injectRoute } from '../utils/inject';
import {
  buildController,
  buildInterface,
  buildRoute,
  buildService,
  buildValidation,
  buildConstants,
  buildUtils,
} from './templates';

/**
 * Detects the validation library used by the project at `projectRoot`.
 * Checks `cem.json` first, then falls back to inspecting `package.json`.
 */
function resolveValidator(projectRoot: string): ValidatorChoice {
  const config = loadCemConfig(projectRoot);
  if (config?.project?.validator) return config.project.validator;

  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
    );
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['joi']) return 'joi';
  } catch {
    // fall through to default
  }
  return 'zod';
}

/**
 * Resolves the database choice used by the project at `projectRoot`.
 * Checks `cem.json` first.
 */
function resolveDb(projectRoot: string): DbChoice | null {
  const config = loadCemConfig(projectRoot);
  return config?.project?.db ?? null;
}

/**
 * Generates one or more feature modules in the current CEM project.
 *
 * For each module name the user is asked two optional questions:
 * - Whether to include a `<name>.constant.ts` file (ENUMs, searchable fields).
 * - Whether to include a `<name>.utils.ts` file (module-specific helpers).
 *
 * All core files (controller, service, route, model, interface, validation)
 * are always created. The route is auto-wired into `src/app/routes/index.ts`
 * when the inject markers are present.
 *
 * @param providedName - One module name, an array of names, or `undefined`
 *                       to prompt the user interactively.
 */
export async function generateModule(providedName?: string | string[]): Promise<void> {
  const projectRoot = process.cwd();

  if (!fs.existsSync(path.join(projectRoot, 'src/app/modules'))) {
    ui.abort(
      'Run this command from the root of a Create Express Modular project.\n' +
        '     Expected to find: src/app/modules/',
    );
  }

  let names: string[] = [];
  if (Array.isArray(providedName)) {
    names = providedName;
  } else if (providedName) {
    names = [providedName];
  }

  ui.printModuleBanner();

  if (names.length === 0) {
    const answer = await inquirer.prompt<{ moduleName: string }>([
      {
        type: 'input',
        name: 'moduleName',
        message: '📦 Module name (e.g. Product, BlogPost):',
        validate: (v: string) => (v.trim() ? true : 'Module name cannot be empty.'),
        filter: (v: string) => capitalize(v.trim()),
      },
    ]);
    names = [answer.moduleName];
  }

  const validator = resolveValidator(projectRoot);
  const dbChoice = resolveDb(projectRoot);

  for (const name of names) {
    const moduleName = capitalize(name.trim());
    const fileName = moduleName.toLowerCase();
    const modulePath = path.join(projectRoot, `src/app/modules/${moduleName}`);

    if (fs.existsSync(modulePath)) {
      ui.warn(`Module '${moduleName}' already exists — skipping.`);
      continue;
    }

    const answers = await inquirer.prompt<{
      includeConstants: boolean;
      includeUtils: boolean;
    }>([
      {
        type: 'confirm',
        name: 'includeConstants',
        message: `📌 Include a constants file for module ${ui.cyan(moduleName)} (ENUMs, search fields)?`,
        default: false,
      },
      {
        type: 'confirm',
        name: 'includeUtils',
        message: `🛠️  Include a utils file for module ${ui.cyan(moduleName)} (helpers)?`,
        default: false,
      },
    ]);

    const { includeConstants, includeUtils } = answers;
    const routePath = `/${pluralize(fileName)}`;

    fs.mkdirSync(modulePath, { recursive: true });

    const modelContent = dbChoice
      ? getDbGenerator(dbChoice).modelStub(moduleName)
      : `// TODO: Define your ${moduleName} model/schema here\n`;

    const files: Record<string, string> = {
      controller: buildController(moduleName, fileName),
      interface: buildInterface(moduleName),
      model: modelContent,
      route: buildRoute(moduleName, fileName),
      service: buildService(moduleName),
      validation: buildValidation(moduleName, validator),
    };

    if (includeConstants) files['constant'] = buildConstants(moduleName);
    if (includeUtils) files['utils'] = buildUtils(moduleName);

    Object.entries(files).forEach(([type, content]) => {
      fs.writeFileSync(path.join(modulePath, `${fileName}.${type}.ts`), content);
    });

    const wired = injectRoute(
      projectRoot,
      `import { ${moduleName}Routes } from '../modules/${moduleName}/${fileName}.route';`,
      `{ path: '${routePath}', route: ${moduleName}Routes },`,
    );

    if (!wired) {
      ui.warn(`Could not auto-wire routes for ${moduleName} — inject markers missing in routes/index.ts.`);
      ui.substep(`Add manually:`);
      ui.substep(`import { ${moduleName}Routes } from '../modules/${moduleName}/${fileName}.route';`);
      ui.substep(`{ path: '${routePath}', route: ${moduleName}Routes },`);
    }

    const extras: string[] = [];
    if (includeConstants) extras.push(`${fileName}.constant.ts`);
    if (includeUtils) extras.push(`${fileName}.utils.ts`);

    ui.printModuleSuccess(moduleName, routePath, validator, extras);
  }
}
