'use strict';

const fs = require('fs');
const path = require('path');

function scaffoldServerAndConfig(projectPath) {
    const envContent = [
        'PORT=5000',
        'NODE_ENV=development',
        'DATABASE_URL=postgresql://user:password@localhost:5432/mydb',
        'JWT_ACCESS_SECRET=your_super_secret_access_key',
        'JWT_ACCESS_EXPIRES_IN=1d',
    ].join('\n') + '\n';
    fs.writeFileSync(path.join(projectPath, '.env'), envContent);

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
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
};
`,
    );

    // Prisma schema
    const prismaDir = path.join(projectPath, 'prisma');
    fs.mkdirSync(prismaDir, {
        recursive: true
    });
    fs.writeFileSync(
        path.join(prismaDir, 'schema.prisma'),
        `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// TODO: Define your models here
// model User {
//   id        String   @id @default(cuid())
//   email     String   @unique
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
// }
`,
    );

    // Prisma client singleton — prevents connection exhaustion in dev
    const utilsDir = path.join(projectPath, 'src/app/utils');
    fs.mkdirSync(utilsDir, {
        recursive: true
    });
    fs.writeFileSync(
        path.join(utilsDir, 'prisma.ts'),
        `import { PrismaClient } from '@prisma/client';

// Singleton pattern — avoids exhausting DB connections in development
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
`,
    );

    fs.writeFileSync(
        path.join(projectPath, 'src/server.ts'),
        `import { prisma } from './app/utils/prisma';
import app from './app';
import config from './app/config';

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to database');

    app.listen(config.port, () => {
      console.log(\`🚀 Server running on http://localhost:\${config.port}\`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();
`,
    );
}

function errorBlock() {
    return {
        imports: `import { Prisma } from '@prisma/client';`,
        handler: `
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      const fields = (err.meta?.target as string[])?.join(', ') ?? 'field';
      statusCode = 409;
      message = 'Duplicate Entry';
      errorSources = [{ path: fields, message: \`'\${fields}' already exists\` }];
    } else if (err.code === 'P2025') {
      // Record not found
      statusCode = 404;
      message = 'Record Not Found';
      errorSources = [{ path: '', message: err.meta?.cause as string ?? 'Record does not exist' }];
    } else if (err.code === 'P2003') {
      // Foreign key constraint
      statusCode = 400;
      message = 'Invalid Reference';
      errorSources = [{ path: err.meta?.field_name as string ?? '', message: 'Referenced record does not exist' }];
    } else {
      statusCode = 400;
      message = 'Database Error';
      errorSources = [{ path: '', message: err.message }];
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid Data';
    errorSources = [{ path: '', message: 'One or more fields have invalid types or are missing' }];
  } else`,
    };
}

function scaffoldErrorFiles(projectPath) {
    // Prisma errors are handled inline in the globalErrorHandler block
    // No separate handler files needed — but we keep the dir for AppError
    fs.mkdirSync(path.join(projectPath, 'src/app/errors'), {
        recursive: true
    });
}

function dependencies() {
    return {
        prod: ['@prisma/client'],
        dev: ['prisma'],
    };
}

function modelStub(moduleName) {
    return `// TODO: Add your ${moduleName} model to prisma/schema.prisma
// Then run: npx prisma migrate dev --name add-${moduleName.toLowerCase()}
// Import prisma client with: import { prisma } from '../../utils/prisma';
`;
}

module.exports = {
    scaffoldServerAndConfig,
    scaffoldErrorFiles,
    errorBlock,
    dependencies,
    modelStub,
};