'use strict';

const fs = require('fs');
const path = require('path');

function scaffoldServerAndConfig(projectPath) {
    const envContent = [
        'PORT=5000',
        'NODE_ENV=development',
        'DB_HOST=localhost',
        'DB_PORT=5432',
        'DB_NAME=mydb',
        'DB_USER=postgres',
        'DB_PASSWORD=your_password',
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
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT) ?? 5432,
    name: process.env.DB_NAME as string,
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
  },
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
};
`,
    );

    // Pool singleton
    const utilsDir = path.join(projectPath, 'src/app/utils');
    fs.mkdirSync(utilsDir, {
        recursive: true
    });
    fs.writeFileSync(
        path.join(utilsDir, 'db.ts'),
        `import { Pool } from 'pg';
import config from '../config';

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  // Adjust pool size to match your expected concurrency
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected pg pool error:', err);
  process.exit(1);
});
`,
    );

    fs.writeFileSync(
        path.join(projectPath, 'src/server.ts'),
        `import { pool } from './app/utils/db';
import app from './app';
import config from './app/config';

async function bootstrap() {
  try {
    const client = await pool.connect();
    client.release();
    console.log('✅ PostgreSQL connected');

    app.listen(config.port, () => {
      console.log(\`🚀 Server running on http://localhost:\${config.port}\`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    process.exit(1);
  }
}

bootstrap();
`,
    );
}

function errorBlock() {
    return {
        imports: `// pg driver error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html`,
        handler: `
  if (err.code === '23505') {
    // unique_violation
    statusCode = 409;
    message = 'Duplicate Entry';
    errorSources = [{ path: err.detail ?? '', message: err.detail ?? 'A record with this value already exists' }];
  } else if (err.code === '23503') {
    // foreign_key_violation
    statusCode = 400;
    message = 'Invalid Reference';
    errorSources = [{ path: '', message: 'Referenced record does not exist' }];
  } else if (err.code === '23502') {
    // not_null_violation
    statusCode = 400;
    message = 'Missing Required Field';
    errorSources = [{ path: err.column ?? '', message: \`Field '\${err.column}' cannot be null\` }];
  } else if (err.code === '22P02') {
    // invalid_text_representation (bad UUID etc.)
    statusCode = 400;
    message = 'Invalid ID';
    errorSources = [{ path: '', message: 'Invalid format for ID or enum field' }];
  } else`,
    };
}

function scaffoldErrorFiles(projectPath) {
    fs.mkdirSync(path.join(projectPath, 'src/app/errors'), {
        recursive: true
    });
}

function dependencies() {
    return {
        prod: ['pg'],
        dev: ['@types/pg'],
    };
}

function modelStub(moduleName) {
    const lower = moduleName.toLowerCase();
    return `// TODO: Write your SQL queries for ${moduleName}
// Import the pool with: import { pool } from '../../utils/db';
//
// Example:
// export async function create${moduleName}(data: I${moduleName}) {
//   const { rows } = await pool.query(
//     'INSERT INTO ${lower}s (name) VALUES ($1) RETURNING *',
//     [data.name],
//   );
//   return rows[0];
// }
`;
}

module.exports = {
    scaffoldServerAndConfig,
    scaffoldErrorFiles,
    errorBlock,
    dependencies,
    modelStub,
};