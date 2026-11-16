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
import { loadCemConfig, updateCemState } from '../configLoader';
import { getDbGenerator } from '../db';
import type { DbChoice, ValidatorChoice } from '../types';
import { pluralize, capitalize, isValidIdentifier } from '../utils/string';
import { injectRoute } from '../utils/inject';
import {
  buildController,
  buildInterface,
  buildMongooseModel,
  buildRoute,
  buildService,
  buildValidation,
  buildConstants,
  buildUtils,
} from './templates';
import {
  type ParsedField,
  drizzleTableBlock,
  parseFields,
  prismaModelBlock,
} from './fields';

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
export async function generateModule(
  providedName?: string | string[],
  fieldsSpec?: string,
): Promise<string[]> {
  let parsedFields: ParsedField[] = [];
  if (fieldsSpec) {
    try {
      parsedFields = parseFields(fieldsSpec);
    } catch (err: unknown) {
      ui.abort((err as Error).message);
    }
  }

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

  const useDefaults =
    names.some((n) => n === '-y' || n === '--yes') || ui.isSilent() || !process.stdin.isTTY;
  const wantConstants = names.some((n) => n === '--constants');
  const wantUtils = names.some((n) => n === '--utils');
  names = names.filter((n) => !n.startsWith('-'));

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
  const created: string[] = [];

  for (const name of names) {
    const moduleName = capitalize(name.trim());
    if (!isValidIdentifier(moduleName)) {
      ui.abort(`Invalid module name "${name}". Use only letters, numbers, and underscores, starting with a letter.`);
    }
    const fileName = moduleName.toLowerCase();
    const modulePath = path.join(projectRoot, `src/app/modules/${moduleName}`);

    if (fs.existsSync(modulePath)) {
      ui.warn(`Module '${moduleName}' already exists — skipping.`);
      continue;
    }

    let includeConstants = wantConstants;
    let includeUtils = wantUtils;

    if (!useDefaults && !wantConstants && !wantUtils) {
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
      includeConstants = answers.includeConstants;
      includeUtils = answers.includeUtils;
    }

    const routePath = `/${pluralize(fileName)}`;

    fs.mkdirSync(modulePath, { recursive: true });

    let modelContent: string;
    if (dbChoice === 'mongoose' || !dbChoice) {
      modelContent = buildMongooseModel(moduleName, fileName, parsedFields);
    } else {
      modelContent = getDbGenerator(dbChoice).modelStub(moduleName);
      if (parsedFields.length > 0) {
        if (dbChoice === 'prisma') {
          const schemaPath = path.join(projectRoot, 'prisma/schema.prisma');
          if (fs.existsSync(schemaPath)) {
            const existing = fs.readFileSync(schemaPath, 'utf8');
            if (!existing.includes(`model ${moduleName}`)) {
              fs.appendFileSync(schemaPath, `\n${prismaModelBlock(moduleName, parsedFields)}\n`);
            }
          }
        } else if (dbChoice === 'drizzle') {
          const schemaPath = path.join(projectRoot, 'src/app/db/schema.ts');
          const tableName = pluralize(fileName);
          if (fs.existsSync(schemaPath)) {
            let existing = fs.readFileSync(schemaPath, 'utf8');
            if (!existing.includes(`export const ${tableName} =`)) {
              const neededImports = ['pgTable', 'text', 'timestamp', 'uuid'];
              if (parsedFields.some((f) => f.baseType === 'number')) neededImports.push('doublePrecision');
              if (parsedFields.some((f) => f.baseType === 'boolean')) neededImports.push('boolean');
              existing = existing.replace(
                /import\s*\{[^}]*\}\s*from\s*'drizzle-orm\/pg-core';/,
                `import { ${neededImports.join(', ')} } from 'drizzle-orm/pg-core';`,
              );
              fs.writeFileSync(schemaPath, `${existing.trimEnd()}\n\n${drizzleTableBlock(tableName, parsedFields)}\n`);
            }
          }
        }
      }
    }

    const effectiveDb = dbChoice || 'mongoose';
    const files: Record<string, string> = {
      controller: buildController(moduleName, fileName),
      interface: buildInterface(moduleName, parsedFields, effectiveDb),
      model: modelContent,
      route: buildRoute(moduleName, fileName),
      service: buildService(moduleName, effectiveDb, parsedFields.length > 0),
      validation: buildValidation(moduleName, validator, parsedFields),
    };

    if (includeConstants || effectiveDb === 'mongoose' || parsedFields.length > 0) {
      files['constant'] = buildConstants(moduleName, parsedFields);
    }
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
    created.push(moduleName);
  }

  if (created.length > 0) {
    updateCemState(projectRoot, 'modules', 'add', created);
  }
  return created;
}
