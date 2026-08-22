/**
 * src/lib/validator/zod.ts
 *
 * Zod schema validator generator strategy.
 */

import fs from 'fs';
import path from 'path';
import type { ValidatorGenerator, ErrorBlock, GeneratorDependencies } from '../types';

const zodGenerator: ValidatorGenerator = {
  scaffoldValidateRequest(projectPath: string): void {
    const utilsDir = path.join(projectPath, 'src/app/utils');
    fs.mkdirSync(utilsDir, { recursive: true });

    fs.writeFileSync(
      path.join(utilsDir, 'validateRequest.ts'),
      `import { z } from 'zod';
import { NextFunction, Request, Response } from 'express';
import { catchAsync } from './catchAsync';

const validateRequest = (schema: z.ZodType) => {
  return catchAsync(
    async (req: Request, _res: Response, next: NextFunction) => {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });
      return next();
    },
  );
};

export default validateRequest;
`,
    );
  },

  errorBlock(): ErrorBlock {
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
  },

  scaffoldErrorFile(projectPath: string): void {
    const errDir = path.join(projectPath, 'src/app/errors');
    fs.mkdirSync(errDir, { recursive: true });
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
  },

  validationStub(moduleName: string): string {
    return `import { z } from 'zod';

const create${moduleName}Schema = z.object({
  body: z.object({
    // TODO: Define your validation shape here
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
  },

  dependencies(): GeneratorDependencies {
    return {
      prod: ['zod'],
      dev: [],
    };
  },
};

export default zodGenerator;
