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
        `import * as yup from 'yup';
import { NextFunction, Request, Response } from 'express';
import { catchAsync } from './catchAsync';

const validateRequest = (schema: yup.ObjectSchema<yup.AnyObject>) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    req.body = await schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    return next();
  });
};

export default validateRequest;
`,
    );
}

function errorBlock() {
    return {
        imports: `import * as yup from 'yup';`,
        handler: `
  if (err instanceof yup.ValidationError) {
    statusCode = 400;
    message = 'Validation Error';
    errorSources = err.inner.length
      ? err.inner.map((e) => ({ path: e.path ?? '', message: e.message }))
      : [{ path: err.path ?? '', message: err.message }];
  } else`,
    };
}

function scaffoldErrorFile(_projectPath) {
    // Yup errors handled inline
}

function validationStub(moduleName) {
    return `import * as yup from 'yup';

const create${moduleName}Schema = yup.object({
  // TODO: Define your validation shape here
  // name: yup.string().required().min(1),
});

const update${moduleName}Schema = yup.object({
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
        prod: ['yup'],
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