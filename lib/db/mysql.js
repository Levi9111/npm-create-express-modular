'use strict';

const fs = require('fs');
const path = require('path');

function scaffoldServerAndConfig(projectPath) {
    const envContent = [
        'PORT=5000',
        'NODE_ENV=development',
        'DB_HOST=localhost',
        'DB_PORT=3306',
        'DB_NAME=mydb',
        'DB_USER=root',
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
    port: Number(process.env.DB_PORT) ?? 3306,
    name: process.env.DB_NAME as string,
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
  },
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
};
`,
    );

    const utilsDir = path.join(projectPath, 'src/app/utils');
    fs.mkdirSync(utilsDir, {
        recursive: true
    });
    fs.writeFileSync(
        path.join(utilsDir, 'db.ts'),
        `import mysql from 'mysql2/promise';
import config from '../config';

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
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
    const conn = await pool.getConnection();
    conn.release();
    console.log('✅ MySQL connected');

    app.listen(config.port, () => {
      console.log(\`🚀 Server running on http://localhost:\${config.port}\`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to MySQL:', error);
    process.exit(1);
  }
}

bootstrap();
`,
    );
}

function errorBlock() {
    return {
        imports: `// mysql2 error codes reference: https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html`,
        handler: `
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate Entry';
    const match = err.message.match(/Duplicate entry '(.+?)' for key '(.+?)'/);
    const field = match ? match[2].replace(/[']/g, '') : 'field';
    errorSources = [{ path: field, message: \`'\${match?.[1]}' already exists for '\${field}'\` }];
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Invalid Reference';
    errorSources = [{ path: '', message: 'Referenced record does not exist' }];
  } else if (err.code === 'ER_BAD_NULL_ERROR') {
    statusCode = 400;
    message = 'Missing Required Field';
    errorSources = [{ path: '', message: err.message }];
  } else if (err.code === 'ER_TRUNCATED_WRONG_VALUE') {
    statusCode = 400;
    message = 'Invalid Value';
    errorSources = [{ path: '', message: 'One or more values are invalid for their column type' }];
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
        prod: ['mysql2'],
        dev: [],
    };
}

function modelStub(moduleName) {
    const lower = moduleName.toLowerCase();
    return `// TODO: Write your SQL queries for ${moduleName}
// Import the pool with: import { pool } from '../../utils/db';
//
// Example:
// export async function create${moduleName}(data: I${moduleName}) {
//   const [rows] = await pool.execute(
//     'INSERT INTO ${lower}s (name) VALUES (?)',
//     [data.name],
//   );
//   return rows;
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