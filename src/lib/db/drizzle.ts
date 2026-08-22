'use strict';

import fs from 'fs';
import path from 'path';
import type { DbGenerator, ErrorBlock, GeneratorDependencies } from '../types';

const drizzleGenerator: DbGenerator = {
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
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
};
`,
    );

    fs.writeFileSync(
      path.join(projectPath, 'drizzle.config.ts'),
      `import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  schema: './src/app/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
`,
    );

    const dbDir = path.join(projectPath, 'src/app/db');
    fs.mkdirSync(dbDir, { recursive: true });

    fs.writeFileSync(
      path.join(dbDir, 'index.ts'),
      `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import config from '../config';

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);
export { pool };
`,
    );

    fs.writeFileSync(
      path.join(dbDir, 'schema.ts'),
      `// Define your Drizzle ORM tables here.
// Example:
//
// import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
//
// export const users = pgTable('users', {
//   id:        serial('id').primaryKey(),
//   email:     text('email').notNull().unique(),
//   createdAt: timestamp('created_at').defaultNow(),
// });
`,
    );

    fs.writeFileSync(
      path.join(projectPath, 'src/server.ts'),
      `import { Server } from 'http';
import { pool } from './app/db';
import app from './app';
import config from './app/config';

let server: Server;

async function bootstrap() {
  try {
    await pool.connect();
    console.log('✅ Drizzle connected to PostgreSQL');

    server = app.listen(config.port, () => {
      console.log(\`🚀 Server running on http://localhost:\${config.port}\`);
    });

    // Ensure Keep-Alive timeouts for reverse proxies (ALB/Nginx/Cloudflare)
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

bootstrap();

process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled Rejection detected, shutting down server...', reason);
  await pool.end();
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception detected, shutting down server...', error);
  await pool.end();
  process.exit(1);
});
`,
    );
  },

  errorBlock(): ErrorBlock {
    return {
      imports: ``,
      handler: `
  if ((err as any)?.code === '23505') {
    statusCode = 409;
    message = 'Duplicate Entry';
    errorSources = [{ path: '', message: 'A record with this value already exists' }];
  } else if ((err as any)?.code === '23503') {
    statusCode = 400;
    message = 'Invalid Reference';
    errorSources = [{ path: '', message: 'Referenced record does not exist' }];
  } else`,
    };
  },

  scaffoldErrorFiles(projectPath: string): void {
    fs.mkdirSync(path.join(projectPath, 'src/app/errors'), { recursive: true });
  },

  dependencies(): GeneratorDependencies {
    return {
      prod: ['drizzle-orm', 'pg'],
      dev: ['drizzle-kit', '@types/pg'],
    };
  },

  modelStub(moduleName: string): string {
    const lower = moduleName.toLowerCase();
    return `// Define your ${moduleName} table in src/app/db/schema.ts
// Example:
//
// import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
//
// export const ${lower}s = pgTable('${lower}s', {
//   id:        serial('id').primaryKey(),
//   // TODO: Add your ${moduleName} fields here
//   createdAt: timestamp('created_at').defaultNow(),
//   updatedAt: timestamp('updated_at').defaultNow(),
// });
//
// Then import { db } from '../../db'; and use it in your service.
`;
  },
};

export default drizzleGenerator;
