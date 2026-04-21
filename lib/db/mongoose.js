'use strict';

const fs = require('fs');
const path = require('path');

// ─── SERVER + CONFIG ──────────────────────────────────────────────────────────
function scaffoldServerAndConfig(projectPath) {
    // .env
    const envContent = [
        'PORT=5000',
        'NODE_ENV=development',
        'DATABASE_URL=mongodb://localhost:27017/my-db',
        'BCRYPT_SALT_ROUNDS=12',
        'JWT_ACCESS_SECRET=your_super_secret_access_key',
        'JWT_ACCESS_EXPIRES_IN=1d',
    ].join('\n') + '\n';
    fs.writeFileSync(path.join(projectPath, '.env'), envContent);

    // config/index.ts
    const configDir = path.join(projectPath, 'src/app/config');
    fs.mkdirSync(configDir, {
        recursive: true
    });
    fs.writeFileSync(
        path.join(configDir, 'index.ts'),
        `import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ?? 5000,
  databaseUrl: process.env.DATABASE_URL as string,
  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS) ?? 12,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
};
`,
    );

    // server.ts
    fs.writeFileSync(
        path.join(projectPath, 'src/server.ts'),
        `import mongoose from 'mongoose';
import app from './app';
import config from './app/config';

async function bootstrap() {
  try {
    await mongoose.connect(config.databaseUrl);
    console.log('✅ MongoDB connected');

    app.listen(config.port, () => {
      console.log(\`🚀 Server running on http://localhost:\${config.port}\`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

bootstrap();
`,
    );
}

// ─── ERROR BLOCK ──────────────────────────────────────────────────────────────
// Returns { imports, handler } strings injected into globalErrorHandler shell
function errorBlock() {
    return {
        imports: `import { Error as MongooseError } from 'mongoose';
import handleCastError from '../errors/handleCastError';
import handleValidationError from '../errors/handleValidationError';
import handleDuplicateError from '../errors/handleDuplicateError';`,

        handler: `
  if (err instanceof MongooseError.CastError) {
    const simplified = handleCastError(err);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorSources = simplified.errorSources;
  } else if (err instanceof MongooseError.ValidationError) {
    const simplified = handleValidationError(err);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorSources = simplified.errorSources;
  } else if (err?.code === 11000) {
    const simplified = handleDuplicateError(err);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorSources = simplified.errorSources;
  } else`,
    };
}

// ─── ERROR HANDLER FILES ──────────────────────────────────────────────────────
// These get written to src/app/errors/ by scaffoldCoreFiles + db generator
function scaffoldErrorFiles(projectPath) {
    const errDir = path.join(projectPath, 'src/app/errors');
    fs.mkdirSync(errDir, {
        recursive: true
    });

    // handleCastError.ts
    fs.writeFileSync(
        path.join(errDir, 'handleCastError.ts'),
        `import { Error } from 'mongoose';
import { TErrorSources, TGenericErrorResponse } from '../interfaces/error';

const handleCastError = (err: Error.CastError): TGenericErrorResponse => {
  const errorSources: TErrorSources = [
    { path: err.path, message: \`Invalid value for field '\${err.path}': \${err.value}\` },
  ];
  return { statusCode: 400, message: 'Invalid ID', errorSources };
};

export default handleCastError;
`,
    );

    // handleValidationError.ts
    fs.writeFileSync(
        path.join(errDir, 'handleValidationError.ts'),
        `import { Error } from 'mongoose';
import { TErrorSources, TGenericErrorResponse } from '../interfaces/error';

const handleValidationError = (err: Error.ValidationError): TGenericErrorResponse => {
  const errorSources: TErrorSources = Object.values(err.errors).map(
    (val: Error.ValidatorError | Error.CastError) => ({
      path: val?.path,
      message: val?.message,
    }),
  );
  return { statusCode: 400, message: 'Validation Error', errorSources };
};

export default handleValidationError;
`,
    );

    // handleDuplicateError.ts — fixed message from 'Invalid ID' → 'Duplicate Entry'
    fs.writeFileSync(
        path.join(errDir, 'handleDuplicateError.ts'),
        `import { TErrorSources, TGenericErrorResponse } from '../interfaces/error';

const handleDuplicateError = (err: { message: string }): TGenericErrorResponse => {
  const match = err.message.match(/"([^"]*)"/);
  const extractedMessage = match ? match[1] : 'Field';
  const errorSources: TErrorSources = [
    { path: '', message: \`'\${extractedMessage}' already exists\` },
  ];
  return { statusCode: 409, message: 'Duplicate Entry', errorSources };
};

export default handleDuplicateError;
`,
    );
}

// ─── DEPENDENCIES ─────────────────────────────────────────────────────────────
function dependencies() {
    return {
        prod: ['mongoose'],
        dev: ['@types/mongoose'],
    };
}

// ─── MODEL STUB ───────────────────────────────────────────────────────────────
function modelStub(moduleName) {
    const lower = moduleName.toLowerCase();
    return `import { Schema, model } from 'mongoose';
import { I${moduleName} } from './${lower}.interface';

const ${lower}Schema = new Schema<I${moduleName}>(
  {
    // TODO: Define your fields here
    // name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const ${moduleName}Model = model<I${moduleName}>('${moduleName}', ${lower}Schema);
`;
}

module.exports = {
    scaffoldServerAndConfig,
    scaffoldErrorFiles,
    errorBlock,
    dependencies,
    modelStub,
};