'use strict';

const fs = require('fs');
const path = require('path');

function scaffoldValidateRequest(projectPath) {
    const utilsDir = path.join(projectPath, 'src/app/utils');
    fs.mkdirSync(utilsDir, {
        recursive: true
    });

    // Fixed: uses ZodTypeAny instead of ZodObject to support .refine() / .superRefine()
    fs.writeFileSync(
        path.join(utilsDir, 'validateRequest.ts'),
        `import { AnyZodObject, ZodEffects, ZodTypeAny } from 'zod';
import { NextFunction, Request, Response } from 'express';
import { catchAsync } from './catchAsync';

type ZodSchema = AnyZodObject | ZodEffects<AnyZodObject>;

const validateRequest = (schema: ZodSchema) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
      cookies: req.cookies,
    });
    return next();
  });
};

export default validateRequest;
`,
    );
}

// The error block injected into globalErrorHandler
function errorBlock() {
    return {
        imports: `import { ZodError } from 'zod';
import handleZodError from '../errors/handleZodError';`,
        handler: `
  if (err instanceof ZodError) {
    const simplified = handleZodError(err);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorSources = simplified.errorSources;
  } else`,
    };
}

// The error handler file written to src/app/errors/
function scaffoldErrorFile(projectPath) {
    const errDir = path.join(projectPath, 'src/app/errors');
    fs.mkdirSync(errDir, {
        recursive: true
    });
    fs.writeFileSync(
        path.join(errDir, 'handleZodError.ts'),
        `import { ZodError } from 'zod';
import { TErrorSources, TGenericErrorResponse } from '../interfaces/error';

const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorSources: TErrorSources = err.issues.map((issue) => ({
    path: issue.path[issue.path.length - 1] as string,
    message: issue.message,
  }));
  return { statusCode: 400, message: 'Validation Error', errorSources };
};

export default handleZodError;
`,
    );
}

// The validation stub written into new modules
function validationStub(moduleName) {
    return `import { z } from 'zod';

const create${moduleName}Schema = z.object({
  body: z.object({
    // TODO: Define your validation shape here
    // name: z.string({ required_error: 'Name is required' }).min(1),
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

function dependencies() {
    return {
        prod: ['zod'],
        dev: []
    };
}

module.exports = {
    scaffoldValidateRequest,
    scaffoldErrorFile,
    errorBlock,
    validationStub,
    dependencies,
};