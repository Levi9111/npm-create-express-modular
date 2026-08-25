/**
 * src/lib/db/mongoose.ts
 *
 * Mongoose (MongoDB) database generator strategy.
 */

import fs from 'fs';
import path from 'path';
import type { DbGenerator, ErrorBlock, GeneratorDependencies } from '../types';

const mongooseGenerator: DbGenerator = {
  // Server and database config generator
  scaffoldServerAndConfig(projectPath: string): void {
    const envLines = [
      'PORT=5000',
      'NODE_ENV=development',
      'DATABASE_URL=mongodb://localhost:27017/my-db',
      'CORS_ORIGIN=http://localhost:3000',
      'BCRYPT_SALT_ROUNDS=12',
      'JWT_ACCESS_SECRET=your_super_secret_access_key',
      'JWT_ACCESS_EXPIRES_IN=1d',
      'JWT_REFRESH_SECRET=your_jwt_refresh_secret',
      'JWT_REFRESH_EXPIRES_IN=365d',
    ];
    const envContent = envLines.join('\n') + '\n';
    fs.writeFileSync(path.join(projectPath, '.env'), envContent);

    const envExampleContent = envLines.map((line) => line.split('=')[0] + '=').join('\n') + '\n';
    fs.writeFileSync(path.join(projectPath, '.env.example'), envExampleContent);

    const configDir = path.join(projectPath, 'src/app/config');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'index.ts'),
      `import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// ── Startup Validation ───────────────────────────────────────────────────────
const requiredEnvVars = ['DATABASE_URL'] as const;
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(
      \`Missing required environment variable: \${key}. \` +
        'Check your .env file or .env.example for reference.',
    );
  }
}

export default {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ?? 5000,
  databaseUrl: process.env.DATABASE_URL as string,
  cors_origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
};
`,
    );

    fs.writeFileSync(
      path.join(projectPath, 'src/server.ts'),
      `import { Server } from 'http';
import app from './app';
import config from './app/config';
import logger from './app/utils/logger';
import { connectDB } from './app/utils/connectDB';

let server: Server;

async function bootstrap() {
  try {
    await connectDB();

    server = app.listen(config.port, () => {
      logger.info(\`Server running on http://localhost:\${config.port}\`);
    });

    // Ensure Keep-Alive timeouts for reverse proxies (ALB/Nginx/Cloudflare)
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection detected, shutting down server...', reason);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception detected, shutting down server...', error);
  process.exit(1);
});
`,
    );

    const utilsDir = path.join(projectPath, 'src/app/utils');
    fs.mkdirSync(utilsDir, { recursive: true });
    fs.writeFileSync(
      path.join(utilsDir, 'connectDB.ts'),
      `import mongoose from 'mongoose';
import config from '../config';
import logger from './logger';
import { MongoMemoryServer } from 'mongodb-memory-server';

export async function connectDB(): Promise<void> {
  let dbUrl = config.databaseUrl;

  try {
    await mongoose.connect(dbUrl, {
      serverSelectionTimeoutMS: 3000,
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB connected successfully');
  } catch (err) {
    if (config.NODE_ENV === 'development') {
      logger.warn(
        'Local/Atlas MongoDB connection failed. Starting In-Memory MongoDB...',
      );

      const mongoServer = await MongoMemoryServer.create();
      dbUrl = mongoServer.getUri();
      await mongoose.connect(dbUrl);
      logger.info(\`In-Memory MongoDB connected at \${dbUrl}\`);
    } else {
      throw err;
    }
  }
}
`,
    );
  },

  // Error block definition
  errorBlock(): ErrorBlock {
    return {
      imports: `import { Error as MongooseError } from 'mongoose';
import handleCastError from '../errors/handleCastError';
import handleValidationError from '../errors/handleValidationError';
import handleDuplicateError from '../errors/handleDuplicateError';`,
      handler: `if (err instanceof MongooseError.CastError) {
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
  } else `,
    };
  },

  // Error handler file generator
  scaffoldErrorFiles(projectPath: string): void {
    const errDir = path.join(projectPath, 'src/app/errors');
    fs.mkdirSync(errDir, { recursive: true });

    fs.writeFileSync(
      path.join(errDir, 'handleCastError.ts'),
      `import { Error } from 'mongoose';
import { TErrorSources, TGenericErrorResponse } from '../interfaces/error';

const handleCastError = (err: Error.CastError): TGenericErrorResponse => {
  const errorSources: TErrorSources = [
    {
      path: err.path,
      message: \`Invalid value for field '\${err.path}': \${err.value}\`,
    },
  ];
  return { statusCode: 400, message: 'Invalid ID', errorSources };
};

export default handleCastError;
`,
    );

    fs.writeFileSync(
      path.join(errDir, 'handleValidationError.ts'),
      `import { Error } from 'mongoose';
import { TErrorSources, TGenericErrorResponse } from '../interfaces/error';

const handleValidationError = (
  err: Error.ValidationError,
): TGenericErrorResponse => {
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

    fs.writeFileSync(
      path.join(errDir, 'handleDuplicateError.ts'),
      `import { TErrorSources, TGenericErrorResponse } from '../interfaces/error';

const handleDuplicateError = (err: {
  message: string;
}): TGenericErrorResponse => {
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
  },

  // Generator dependencies
  dependencies(): GeneratorDependencies {
    return {
      prod: ['mongoose'],
      dev: ['@types/mongoose', 'mongodb-memory-server'],
    };
  },

  // Model file template stub
  modelStub(moduleName: string): string {
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
  },
};

export default mongooseGenerator;
