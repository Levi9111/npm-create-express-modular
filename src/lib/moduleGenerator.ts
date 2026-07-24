'use strict';

import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import * as ui from './ui';
import type { ValidatorChoice } from './types';

function pluralize(word: string): string {
  const lower = word.toLowerCase();
  const irregulars: Record<string, string> = {
    person: 'people',
    man: 'men',
    woman: 'women',
    child: 'children',
    tooth: 'teeth',
    foot: 'feet',
    mouse: 'mice',
    goose: 'geese',
    ox: 'oxen',
    leaf: 'leaves',
    knife: 'knives',
    wife: 'wives',
    life: 'lives',
    half: 'halves',
    self: 'selves',
    elf: 'elves',
    loaf: 'loaves',
    potato: 'potatoes',
    tomato: 'tomatoes',
    cactus: 'cacti',
    focus: 'foci',
    fungus: 'fungi',
    nucleus: 'nuclei',
    syllabus: 'syllabi',
    analysis: 'analyses',
    diagnosis: 'diagnoses',
    oasis: 'oases',
    thesis: 'theses',
    crisis: 'crises',
    phenomenon: 'phenomena',
    criterion: 'criteria',
    datum: 'data',
  };

  if (irregulars[lower]) return irregulars[lower];
  if (/(?:s|ss|sh|ch|x|z)$/i.test(word)) return word + 'es';
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies';
  if (/(?:us)$/i.test(word)) return word.slice(0, -2) + 'i';
  if (/(?:is)$/i.test(word)) return word.slice(0, -2) + 'es';
  if (/(?:on)$/i.test(word)) return word.slice(0, -2) + 'a';
  return word + 's';
}

function detectValidator(projectRoot: string): ValidatorChoice {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
    );
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    if (deps['joi']) return 'joi';
  } catch {
    // fallback
  }
  return 'zod';
}

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
        filter: (v: string) => v.trim().charAt(0).toUpperCase() + v.trim().slice(1),
      },
    ]);
    names = [answer.moduleName];
  }

  const validator = detectValidator(projectRoot);

  for (const name of names) {
    const moduleName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
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

    const files: Record<string, string> = {
      controller: _buildController(moduleName, fileName),
      interface: _buildInterface(moduleName),
      model: `// TODO: Define your ${moduleName} model/schema here\n`,
      route: _buildRoute(moduleName, fileName),
      service: _buildService(moduleName),
      validation: _buildValidation(moduleName, validator),
    };

    if (includeConstants) {
      files['constant'] = `export const ${moduleName}SearchableFields: string[] = [];\n\nexport const ${moduleName}Status = {\n  ACTIVE: 'active',\n  INACTIVE: 'inactive',\n} as const;\n`;
    }
    if (includeUtils) {
      files['utils'] = `// Utility functions for the ${moduleName} module\n\nexport const process${moduleName}Data = <T>(data: T): T => {\n  // TODO: Add utility logic\n  return data;\n};\n`;
    }

    Object.entries(files).forEach(([type, content]) => {
      fs.writeFileSync(path.join(modulePath, `${fileName}.${type}.ts`), content);
    });

    const indexPath = path.join(projectRoot, 'src/app/routes/index.ts');

    if (fs.existsSync(indexPath)) {
      let indexContent = fs.readFileSync(indexPath, 'utf8');

      const hasImportMarker = indexContent.includes('// --- INJECT IMPORTS HERE ---');
      const hasRouteMarker = indexContent.includes('// --- INJECT ROUTES HERE ---');

      if (!hasImportMarker || !hasRouteMarker) {
        ui.warn(`Could not auto-wire routes for ${moduleName} — inject markers missing in routes/index.ts.`);
        ui.substep(`Add manually:`);
        ui.substep(`import { ${moduleName}Routes } from '../modules/${moduleName}/${fileName}.route';`);
        ui.substep(`{ path: '${routePath}', route: ${moduleName}Routes },`);
      } else {
        indexContent = indexContent.replace(
          '// --- INJECT IMPORTS HERE ---',
          `import { ${moduleName}Routes } from '../modules/${moduleName}/${fileName}.route';\n// --- INJECT IMPORTS HERE ---`,
        );
        indexContent = indexContent.replace(
          '// --- INJECT ROUTES HERE ---',
          `  { path: '${routePath}', route: ${moduleName}Routes },\n  // --- INJECT ROUTES HERE ---`,
        );
        fs.writeFileSync(indexPath, indexContent);
      }
    }

    const extras: string[] = [];
    if (includeConstants) extras.push(`${fileName}.constant.ts`);
    if (includeUtils) extras.push(`${fileName}.utils.ts`);

    ui.printModuleSuccess(moduleName, routePath, validator, extras);
  }
}

function _buildController(moduleName: string, fileName: string): string {
  return `import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ${moduleName}Service } from './${fileName}.service';

const create${moduleName} = catchAsync(async (req: Request, res: Response) => {
  const result = await ${moduleName}Service.create${moduleName}(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: '${moduleName} created successfully',
    data: result,
  });
});

const getAll${moduleName}s = catchAsync(async (req: Request, res: Response) => {
  const result = await ${moduleName}Service.getAll${moduleName}s(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: '${moduleName}s retrieved successfully',
    data: result,
  });
});

const getSingle${moduleName} = catchAsync(async (req: Request, res: Response) => {
  const result = await ${moduleName}Service.getSingle${moduleName}(req.params.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: '${moduleName} retrieved successfully',
    data: result,
  });
});

const update${moduleName} = catchAsync(async (req: Request, res: Response) => {
  const result = await ${moduleName}Service.update${moduleName}(req.params.id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: '${moduleName} updated successfully',
    data: result,
  });
});

const delete${moduleName} = catchAsync(async (req: Request, res: Response) => {
  await ${moduleName}Service.delete${moduleName}(req.params.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: '${moduleName} deleted successfully',
    data: null,
  });
});

export const ${moduleName}Controllers = {
  create${moduleName},
  getAll${moduleName}s,
  getSingle${moduleName},
  update${moduleName},
  delete${moduleName},
};
`;
}

function _buildInterface(moduleName: string): string {
  return `export interface I${moduleName} {
  // TODO: Define your ${moduleName} fields here
  // name: string;
  // createdAt?: Date;
  // updatedAt?: Date;
}
`;
}

function _buildRoute(moduleName: string, fileName: string): string {
  return `import express from 'express';
import { ${moduleName}Controllers } from './${fileName}.controller';

const router = express.Router();

router.post('/', ${moduleName}Controllers.create${moduleName});
router.get('/', ${moduleName}Controllers.getAll${moduleName}s);
router.get('/:id', ${moduleName}Controllers.getSingle${moduleName});
router.patch('/:id', ${moduleName}Controllers.update${moduleName});
router.delete('/:id', ${moduleName}Controllers.delete${moduleName});

export const ${moduleName}Routes = router;
`;
}

function _buildService(moduleName: string): string {
  return `import { I${moduleName} } from './${moduleName.toLowerCase()}.interface';

const create${moduleName} = async (payload: I${moduleName}) => {
  // TODO: Implement create logic
  return payload;
};

const getAll${moduleName}s = async (query: Record<string, unknown>) => {
  // TODO: Implement list logic (with filtering, sorting, pagination)
  return [];
};

const getSingle${moduleName} = async (id: string) => {
  // TODO: Implement find-by-id logic
  return null;
};

const update${moduleName} = async (id: string, payload: Partial<I${moduleName}>) => {
  // TODO: Implement update logic
  return null;
};

const delete${moduleName} = async (id: string) => {
  // TODO: Implement delete logic
  return null;
};

export const ${moduleName}Service = {
  create${moduleName},
  getAll${moduleName}s,
  getSingle${moduleName},
  update${moduleName},
  delete${moduleName},
};
`;
}

function _buildValidation(moduleName: string, validator: ValidatorChoice): string {
  switch (validator) {
    case 'zod':
      return `import { z } from 'zod';

const create${moduleName}Schema = z.object({
  body: z.object({
    // TODO: Define fields
    // name: z.string().min(1, 'Name is required'),
  }),
});

const update${moduleName}Schema = z.object({
  body: z.object({
    // TODO: Define update fields (all optional)
  }),
});

export const ${moduleName}Validation = {
  create${moduleName}Schema,
  update${moduleName}Schema,
};
`;
    case 'joi':
      return `import Joi from 'joi';

const create${moduleName}Schema = Joi.object({
  // TODO: Define fields
  // name: Joi.string().required().min(1),
});

const update${moduleName}Schema = Joi.object({
  // TODO: Define update fields
});

export const ${moduleName}Validation = {
  create${moduleName}Schema,
  update${moduleName}Schema,
};
`;
  }
}
