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
        `import Joi from 'joi';
import { NextFunction, Request, Response } from 'express';
import { catchAsync } from './catchAsync';

const validateRequest = (schema: Joi.ObjectSchema) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) throw error;
    return next();
  });
};

export default validateRequest;
`,
    );
}

function errorBlock() {
    return {
        imports: `import Joi from 'joi';`,
        handler: `
  if (err?.isJoi === true || err instanceof Joi.ValidationError) {
    statusCode = 400;
    message = 'Validation Error';
    errorSources = err.details.map((detail: Joi.ValidationErrorItem) => ({
      path: String(detail.path[detail.path.length - 1] ?? ''),
      message: detail.message.replace(/['"]/g, ''),
    }));
  } else`,
    };
}

function scaffoldErrorFile(_projectPath) {
    // Joi errors are handled inline in the globalErrorHandler block — no separate file needed
}

function validationStub(moduleName) {
    return `import Joi from 'joi';

const create${moduleName}Schema = Joi.object({
  // TODO: Define your validation shape here
  // name: Joi.string().required().min(1),
});

const update${moduleName}Schema = Joi.object({
  // TODO: Define update fields (all optional)
});

export const ${moduleName}Validation = {
  create${moduleName}Schema,
  update${moduleName}Schema,
};
`;
}

function dependencies() {
    return {
        prod: ['joi'],
        dev: ['@types/joi']
    };
}

module.exports = {
    scaffoldValidateRequest,
    scaffoldErrorFile,
    errorBlock,
    validationStub,
    dependencies,
};