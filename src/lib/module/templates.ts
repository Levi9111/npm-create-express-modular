/**
 * src/lib/module/templates.ts
 *
 * Pure string-builder functions for the feature module scaffold.
 * No filesystem I/O — every function returns the target file's content.
 */

import type { DbChoice, ValidatorChoice } from '../types';
import {
  type ParsedField,
  joiFieldDef,
  mongooseFieldDef,
  searchableFieldNames,
  tsFieldType,
  zodFieldDef,
} from './fields';

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
  const id = req.params.id as string;
  const result = await ${moduleName}Service.getSingle${moduleName}(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: '${moduleName} retrieved successfully',
    data: result,
  });
});

const update${moduleName} = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ${moduleName}Service.update${moduleName}(id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: '${moduleName} updated successfully',
    data: result,
  });
});

const delete${moduleName} = catchAsync(async (req: Request, res: Response) => {
  await ${moduleName}Service.delete${moduleName}(req.params.id as string);
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
 * Builds `<name>.interface.ts` with a TypeScript interface.
 */
export function buildInterface(
  moduleName: string,
  fields: ParsedField[] = [],
  db: DbChoice = 'mongoose',
): string {
  if (fields.length === 0) {
    return `export interface I${moduleName} {
  id?: string;
  // TODO: Define your ${moduleName} fields here
  // name: string;
  // createdAt?: Date;
  // updatedAt?: Date;
}
`;
  }

  const isMongoose = db === 'mongoose';
  const needsTypesImport = isMongoose && fields.some((f) => f.baseType === 'ref');
  const importLine = needsTypesImport ? `import { Types } from 'mongoose';\n\n` : '';
  const fieldLines = fields
    .map((f) => `  ${f.name}${f.optional ? '?' : ''}: ${tsFieldType(f, isMongoose)};`)
    .join('\n');

  return `${importLine}export interface I${moduleName} {
  id?: string;
${fieldLines}
  createdAt?: Date;
  updatedAt?: Date;
}
`;
}

/**
 * Builds `<name>.model.ts` for Mongoose when `fields` are provided.
 */
export function buildMongooseModel(moduleName: string, fileName: string, fields: ParsedField[] = []): string {
  const schemaBody =
    fields.length > 0
      ? fields.map((f) => `    ${f.name}: ${mongooseFieldDef(f)},`).join('\n')
      : `    // TODO: Define your fields here\n    // name: { type: String, required: true, trim: true },`;

  return `import { Schema, model } from 'mongoose';
import { I${moduleName} } from './${fileName}.interface';

const ${fileName}Schema = new Schema<I${moduleName}>(
  {
${schemaBody}
  },
  { timestamps: true },
);

export const ${moduleName}Model = model<I${moduleName}>('${moduleName}', ${fileName}Schema);
`;
}

/**
 * Builds `<name>.route.ts` with standard RESTful routes and wired `validateRequest`.
 *
 * @param moduleName - PascalCase module name.
 * @param fileName   - lowercase file prefix.
 */
export function buildRoute(moduleName: string, fileName: string): string {
  const plural = fileName.endsWith('s') ? fileName : `${fileName}s`;
  return `import express from 'express';
import { ${moduleName}Controllers } from './${fileName}.controller';
import validateRequest from '../../utils/validateRequest';
import { ${moduleName}Validation } from './${fileName}.validation';

const router = express.Router();

/**
 * @openapi
 * /${plural}:
 *   post:
 *     tags: [${moduleName}]
 *     summary: Create a new ${moduleName}
 *     responses:
 *       201:
 *         description: ${moduleName} created successfully
 *   get:
 *     tags: [${moduleName}]
 *     summary: Retrieve all ${plural}
 *     responses:
 *       200:
 *         description: List of ${plural}
 */
router.post(
  '/',
  validateRequest(${moduleName}Validation.create${moduleName}Schema),
  ${moduleName}Controllers.create${moduleName},
);
router.get('/', ${moduleName}Controllers.getAll${moduleName}s);

/**
 * @openapi
 * /${plural}/{id}:
 *   get:
 *     tags: [${moduleName}]
 *     summary: Retrieve a single ${moduleName} by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ${moduleName} details
 *   patch:
 *     tags: [${moduleName}]
 *     summary: Update a ${moduleName} by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ${moduleName} updated successfully
 *   delete:
 *     tags: [${moduleName}]
 *     summary: Delete a ${moduleName} by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ${moduleName} deleted successfully
 */
router.get('/:id', ${moduleName}Controllers.getSingle${moduleName});
router.patch(
  '/:id',
  validateRequest(${moduleName}Validation.update${moduleName}Schema),
  ${moduleName}Controllers.update${moduleName},
);
router.delete('/:id', ${moduleName}Controllers.delete${moduleName});

export const ${moduleName}Routes = router;
`;
}

/**
 * Builds `<name>.service.ts` with DB-specific CRUD service functions.
 */
export function buildService(
  moduleName: string,
  db: DbChoice = 'mongoose',
  hasFields = false,
): string {
  const fileName = moduleName.toLowerCase();
  const camelName = moduleName.charAt(0).toLowerCase() + moduleName.slice(1);
  const plural = fileName.endsWith('s') ? fileName : `${fileName}s`;

  if (db === 'mongoose') {
    return `import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../utils/QueryBuilder';
import { I${moduleName} } from './${fileName}.interface';
import { ${moduleName}Model } from './${fileName}.model';
import { ${moduleName}SearchableFields } from './${fileName}.constant';

const create${moduleName} = async (payload: I${moduleName}) => {
  return ${moduleName}Model.create(payload);
};

const getAll${moduleName}s = async (query: Record<string, unknown>) => {
  const qb = new QueryBuilder(${moduleName}Model.find(), query)
    .search(${moduleName}SearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();
  const [meta, data] = await Promise.all([qb.countTotal(), qb.modelQuery]);
  return { meta, data };
};

const getSingle${moduleName} = async (id: string) => {
  const result = await ${moduleName}Model.findById(id);
  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, '${moduleName} not found');
  }
  return result;
};

const update${moduleName} = async (id: string, payload: Partial<I${moduleName}>) => {
  const result = await ${moduleName}Model.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, '${moduleName} not found');
  }
  return result;
};

const delete${moduleName} = async (id: string) => {
  const result = await ${moduleName}Model.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, '${moduleName} not found');
  }
  return result;
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

  if (db === 'prisma') {
    return `import { StatusCodes } from 'http-status-codes';
import { PrismaClient } from '@prisma/client';
import AppError from '../../errors/AppError';
import { I${moduleName} } from './${fileName}.interface';

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modelDelegate = (prisma as unknown as Record<string, any>).${camelName};

const create${moduleName} = async (payload: I${moduleName}) => {
  return modelDelegate.create({ data: payload });
};

const getAll${moduleName}s = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    modelDelegate.findMany({ skip, take: limit }),
    modelDelegate.count(),
  ]);
  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

const getSingle${moduleName} = async (id: string) => {
  const result = await modelDelegate.findUnique({ where: { id } });
  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, '${moduleName} not found');
  }
  return result;
};

const update${moduleName} = async (id: string, payload: Partial<I${moduleName}>) => {
  await getSingle${moduleName}(id);
  return modelDelegate.update({ where: { id }, data: payload });
};

const delete${moduleName} = async (id: string) => {
  await getSingle${moduleName}(id);
  return modelDelegate.delete({ where: { id } });
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

  // Drizzle
  if (hasFields) {
    return `import { StatusCodes } from 'http-status-codes';
import { eq } from 'drizzle-orm';
import AppError from '../../errors/AppError';
import { db } from '../../db';
import { ${plural} } from '../../db/schema';
import { I${moduleName} } from './${fileName}.interface';

const create${moduleName} = async (payload: I${moduleName}) => {
  const [created] = await db.insert(${plural}).values(payload).returning();
  return created;
};

const getAll${moduleName}s = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const offset = (page - 1) * limit;
  const data = await db.select().from(${plural}).limit(limit).offset(offset);
  return { meta: { page, limit }, data };
};

const getSingle${moduleName} = async (id: string) => {
  const [result] = await db
    .select()
    .from(${plural})
    .where(eq(${plural}.id, id))
    .limit(1);
  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, '${moduleName} not found');
  }
  return result;
};

const update${moduleName} = async (id: string, payload: Partial<I${moduleName}>) => {
  const [updated] = await db
    .update(${plural})
    .set({ ...payload, updatedAt: new Date() })
    .where(eq(${plural}.id, id))
    .returning();
  if (!updated) {
    throw new AppError(StatusCodes.NOT_FOUND, '${moduleName} not found');
  }
  return updated;
};

const delete${moduleName} = async (id: string) => {
  const [deleted] = await db
    .delete(${plural})
    .where(eq(${plural}.id, id))
    .returning();
  if (!deleted) {
    throw new AppError(StatusCodes.NOT_FOUND, '${moduleName} not found');
  }
  return deleted;
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

  return `import { I${moduleName} } from './${fileName}.interface';

const create${moduleName} = async (payload: I${moduleName}) => {
  // TODO: Define ${plural} table in src/app/db/schema.ts (or pass --fields when generating)
  return payload;
};

const getAll${moduleName}s = async (_query: Record<string, unknown>) => {
  return [];
};

const getSingle${moduleName} = async (_id: string) => {
  return null;
};

const update${moduleName} = async (_id: string, _payload: Partial<I${moduleName}>) => {
  return null;
};

const delete${moduleName} = async (_id: string) => {
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
 */
export function buildValidation(
  moduleName: string,
  validator: ValidatorChoice,
  fields: ParsedField[] = [],
): string {
  switch (validator) {
    case 'zod': {
      if (fields.length === 0) {
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
      }
      const createLines = fields.map((f) => `    ${f.name}: ${zodFieldDef(f, false)},`).join('\n');
      return `import { z } from 'zod';

const create${moduleName}Schema = z.object({
  body: z.object({
${createLines}
  }),
});

const update${moduleName}Schema = z.object({
  body: create${moduleName}Schema.shape.body.partial(),
});

export const ${moduleName}Validation = {
  create${moduleName}Schema,
  update${moduleName}Schema,
};
`;
    }

    case 'joi': {
      if (fields.length === 0) {
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
      const createLines = fields.map((f) => `  ${f.name}: ${joiFieldDef(f, false)},`).join('\n');
      const updateLines = fields.map((f) => `  ${f.name}: ${joiFieldDef(f, true)},`).join('\n');
      return `import Joi from 'joi';

const create${moduleName}Schema = Joi.object({
${createLines}
});

const update${moduleName}Schema = Joi.object({
${updateLines}
});

export const ${moduleName}Validation = {
  create${moduleName}Schema,
  update${moduleName}Schema,
};
`;
    }
  }
}

/**
 * Builds `<name>.constant.ts` with searchable-fields array.
 */
export function buildConstants(moduleName: string, fields: ParsedField[] = []): string {
  const searchable = searchableFieldNames(fields);
  const arrLiteral = searchable.length > 0 ? `[${searchable.map((s) => `'${s}'`).join(', ')}]` : '[]';
  return `export const ${moduleName}SearchableFields: string[] = ${arrLiteral};

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
