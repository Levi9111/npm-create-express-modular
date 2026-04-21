'use strict';

const fs = require('fs');
const path = require('path');

function scaffoldValidateRequest(projectPath) {
    const utilsDir = path.join(projectPath, 'src/app/utils');
    fs.mkdirSync(utilsDir, {
        recursive: true
    });

    fs.writeFileSync(
        path.join(utilsDir, 'validateRequest.ts'),
        `import vine, { errors } from '@vinejs/vine';
import { NextFunction, Request, Response } from 'express';
import { catchAsync } from './catchAsync';

const validateRequest = (schema: ReturnType<typeof vine.compile>) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    req.body = await schema.validate(req.body);
    return next();
  });
};

export default validateRequest;
`,
    );
}

function errorBlock() {
    return {
        imports: `import { errors as VineErrors } from '@vinejs/vine';`,
        handler: `
  if (err instanceof VineErrors.E_VALIDATION_ERROR) {
    statusCode = 400;
    message = 'Validation Error';
    errorSources = err.messages.map((msg: { field: string; message: string }) => ({
      path: msg.field,
      message: msg.message,
    }));
  } else`,
    };
}

function scaffoldErrorFile(_projectPath) {
    // Vine errors handled inline
}

function validationStub(moduleName) {
    return `import vine from '@vinejs/vine';

const create${moduleName}Schema = vine.compile(
  vine.object({
    // TODO: Define your validation shape here
    // name: vine.string().minLength(1),
  }),
);

const update${moduleName}Schema = vine.compile(
  vine.object({
    // TODO: Define update fields
  }),
);

export const ${moduleName}Validation = {
  create${moduleName}Schema,
  update${moduleName}Schema,
};
`;
}

function dependencies() {
    return {
        prod: ['@vinejs/vine'],
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