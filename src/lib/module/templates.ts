/**
 * src/lib/module/templates.ts
 *
 * Pure string-builder functions for the feature module scaffold.
 * No filesystem I/O — every function returns the target file's content.
 */

import type { ValidatorChoice } from '../types';

/**
 * Builds `<name>.controller.ts` with standard CRUD handlers.
 *
 * @param moduleName - PascalCase module name (e.g. `Product`).
 * @param fileName   - lowercase file prefix (e.g. `product`).
 */
export function buildController(moduleName: string, fileName: string): string {
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

/**
 * Builds `<name>.interface.ts` with a stub TypeScript interface.
 */
export function buildInterface(moduleName: string): string {
  return `export interface I${moduleName} {
  // TODO: Define your ${moduleName} fields here
  // name: string;
  // createdAt?: Date;
  // updatedAt?: Date;
}
`;
}

/**
 * Builds `<name>.route.ts` with standard RESTful routes.
 *
 * @param moduleName - PascalCase module name.
 * @param fileName   - lowercase file prefix.
 */
export function buildRoute(moduleName: string, fileName: string): string {
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

/**
 * Builds `<name>.service.ts` with stub CRUD service functions.
 */
export function buildService(moduleName: string): string {
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

/**
 * Builds `<name>.validation.ts` for the chosen validator.
 *
 * @param moduleName - PascalCase module name.
 * @param validator  - The project's validation library.
 */
export function buildValidation(moduleName: string, validator: ValidatorChoice): string {
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

/**
 * Builds an optional `<name>.constant.ts` with enum and searchable-fields stubs.
 */
export function buildConstants(moduleName: string): string {
  return `export const ${moduleName}SearchableFields: string[] = [];

export const ${moduleName}Status = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
`;
}

/**
 * Builds an optional `<name>.utils.ts` with a stub helper function.
 */
export function buildUtils(moduleName: string): string {
  return `// Utility functions for the ${moduleName} module

export const process${moduleName}Data = <T>(data: T): T => {
  // TODO: Add utility logic
  return data;
};
`;
}
