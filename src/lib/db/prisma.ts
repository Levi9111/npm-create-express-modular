/**
 * src/lib/db/prisma.ts
 *
 * Prisma ORM database generator strategy.
 */

import fs from 'fs';
import path from 'path';
import type { DbGenerator, ErrorBlock, GeneratorDependencies } from '../types';

const prismaGenerator: DbGenerator = {
  scaffoldServerAndConfig(projectPath: string): void {
    const envLines = [
      'PORT=5000',
      'NODE_ENV=development',
      'DATABASE_URL=postgresql://user:password@localhost:5432/mydb',
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

export default {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ?? 5000,
  databaseUrl: process.env.DATABASE_URL as string,
  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
};
`,
    );

    const prismaDir = path.join(projectPath, 'prisma');
    fs.mkdirSync(prismaDir, { recursive: true });
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

    const utilsDir = path.join(projectPath, 'src/app/utils');
    fs.mkdirSync(utilsDir, { recursive: true });
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
      `import { Server } from 'http';
import { prisma } from './app/utils/prisma';
import app from './app';
import config from './app/config';

let server: Server;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to database');

    server = app.listen(config.port, () => {
      console.log(\`🚀 Server running on http://localhost:\${config.port}\`);
    });

    // Ensure Keep-Alive timeouts for reverse proxies (ALB/Nginx/Cloudflare)
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();

process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled Rejection detected, shutting down server...', reason);
  await prisma.$disconnect();
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception detected, shutting down server...', error);
  await prisma.$disconnect();
  process.exit(1);
});
`,
    );
  },

  errorBlock(): ErrorBlock {
    return {
      imports: `import { Prisma } from '@prisma/client';`,
      handler: `
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[])?.join(', ') ?? 'field';
      statusCode = 409;
      message = 'Duplicate Entry';
      errorSources = [{ path: fields, message: \`'\${fields}' already exists\` }];
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record Not Found';
      errorSources = [{ path: '', message: err.meta?.cause as string ?? 'Record does not exist' }];
    } else if (err.code === 'P2003') {
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
  },

  scaffoldErrorFiles(projectPath: string): void {
    fs.mkdirSync(path.join(projectPath, 'src/app/errors'), { recursive: true });
  },

  dependencies(): GeneratorDependencies {
    return {
      prod: ['@prisma/client'],
      dev: ['prisma'],
    };
  },

  modelStub(moduleName: string): string {
    return `// TODO: Add your ${moduleName} model to prisma/schema.prisma
// Then run: npx prisma migrate dev --name add-${moduleName.toLowerCase()}
// Import prisma client with: import { prisma } from '../../utils/prisma';
`;
  },
};

export default prismaGenerator;
