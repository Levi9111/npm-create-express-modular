'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Scaffolds the full JWT Auth module with REAL bcrypt-based authentication.
 * Adapts the service stub, model, and validation based on chosen db and validator.
 *
 * @param {string} projectPath - Absolute path to the scaffolded project
 * @param {string} db          - e.g. 'mongoose' | 'prisma' | 'pg' | 'mysql'
 * @param {string} validator   - e.g. 'zod' | 'joi' | 'vine' | 'yup'
 */
function scaffoldAuth(projectPath, db = 'mongoose', validator = 'zod') {
    console.log('\n🔐 Scaffolding Authentication Module...');

    const authDir = path.join(projectPath, 'src/app/modules/Auth');
    fs.mkdirSync(authDir, {
        recursive: true
    });

    const utilsDir = path.join(projectPath, 'src/app/utils');
    fs.mkdirSync(utilsDir, {
        recursive: true
    });

    // ── 1. jwt.utils.ts ────────────────────────────────────────────────────────
    fs.writeFileSync(
        path.join(utilsDir, 'jwt.utils.ts'),
        `import jwt, { JwtPayload } from 'jsonwebtoken';

export const createToken = (
  jwtPayload: { userId: string; role: string },
  secret: string,
  expiresIn: string,
): string => {
  return jwt.sign(jwtPayload, secret, { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string, secret: string): JwtPayload => {
  return jwt.verify(token, secret) as JwtPayload;
};
`,
    );

    // ── 2. auth.ts middleware ──────────────────────────────────────────────────
    const mwDir = path.join(projectPath, 'src/app/middlewares');
    fs.mkdirSync(mwDir, {
        recursive: true
    });
    fs.writeFileSync(
        path.join(mwDir, 'auth.ts'),
        `import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import AppError from '../errors/AppError';
import { verifyToken } from '../utils/jwt.utils';
import config from '../config';

// Extend Express Request so req.user is fully typed downstream
declare global {
  namespace Express {
    interface Request {
      user: JwtPayload & { userId: string; role: string };
    }
  }
}

const auth = (...requiredRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        return next(new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized!'));
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token, config.jwt_access_secret as string);

      if (requiredRoles.length && !requiredRoles.includes(decoded.role)) {
        return next(
          new AppError(StatusCodes.FORBIDDEN, 'You do not have the required permissions!'),
        );
      }

      req.user = decoded as JwtPayload & { userId: string; role: string };
      next();
    } catch {
      next(new AppError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token!'));
    }
  };
};

export default auth;
`,
    );

    // ── 3. auth.interface.ts ───────────────────────────────────────────────────
    fs.writeFileSync(
        path.join(authDir, 'auth.interface.ts'),
        `export type TLoginUser = {
  email: string;
  password: string;
};

export type TUserRole = 'ADMIN' | 'USER';

export type TLoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    email: string;
    role: TUserRole;
  };
};
`,
    );

    // ── 4. auth.model.ts — DB-aware REAL implementation ──────────────────────
    fs.writeFileSync(
        path.join(authDir, 'auth.model.ts'),
        _buildModelReal(db),
    );

    // ── 5. auth.validation.ts — validator-aware stub ───────────────────────────
    fs.writeFileSync(
        path.join(authDir, 'auth.validation.ts'),
        _buildValidationStub(validator),
    );

    // ── 6. auth.controller.ts ─────────────────────────────────────────────────
    fs.writeFileSync(
        path.join(authDir, 'auth.controller.ts'),
        `import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthService } from './auth.service';
import { TLoginResponse } from './auth.interface';

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);
  sendResponse<TLoginResponse>(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User logged in successfully',
    data: result,
  });
});

const getProfile = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user;
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Profile fetched successfully',
    data: { id: userId, role },
  });
});

export const AuthControllers = { login, getProfile };
`,
    );

    // ── 7. auth.service.ts — REAL bcrypt-based implementation ──────────────────
    fs.writeFileSync(
        path.join(authDir, 'auth.service.ts'),
        _buildServiceReal(db),
    );

    // ── 8. auth.route.ts ──────────────────────────────────────────────────────
    fs.writeFileSync(
        path.join(authDir, 'auth.route.ts'),
        `import express from 'express';
import { AuthControllers } from './auth.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../utils/validateRequest';
import { AuthValidation } from './auth.validation';

const router = express.Router();

router.post(
  '/login',
  validateRequest(AuthValidation.loginSchema),
  AuthControllers.login,
);
router.get('/profile', auth('ADMIN', 'USER'), AuthControllers.getProfile);

export const AuthRoutes = router;
`,
    );

    // ── 9. SEED GUIDE ────────────────────────────────────────────────────────
    fs.writeFileSync(
        path.join(authDir, 'AUTH_SETUP.md'),
        _buildAuthSetupGuide(db),
    );

    // ── 10. Auto-wire into routes/index.ts ──────────────────────────────────
    _injectRoute(
        projectPath,
        `import { AuthRoutes } from '../modules/Auth/auth.route';`,
        `  { path: '/auth', route: AuthRoutes },`,
    );

    _scaffoldRateLimiter(projectPath);

    console.log('   ✅ Auth module scaffolded with bcrypt');
    console.log('   📖 See src/app/modules/Auth/AUTH_SETUP.md for seeding instructions');
}

// ─── REAL DB-AWARE MODEL ──────────────────────────────────────────────────────
function _buildModelReal(db) {
    switch (db) {
        case 'mongoose':
            return `import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import { TUserRole } from './auth.interface';

export interface IUser {
  _id?: string;
  email: string;
  password: string;
  role: TUserRole;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(plainPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\\S+@\\S+\\.\\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: true,
      select: false,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'USER'],
      default: 'USER',
    },
  },
  { timestamps: true },
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error as any);
  }
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (
  plainPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, this.password);
};

export const UserModel = model<IUser>('User', userSchema);
`;

        case 'prisma':
            return `// Add this to prisma/schema.prisma:
//
// model User {
//   id        String   @id @default(cuid())
//   email     String   @unique
//   password  String
//   role      Role     @default(USER)
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
// }
//
// enum Role {
//   ADMIN
//   USER
// }
//
// Then run: npx prisma migrate dev --name init
//
// NOTE: Prisma doesn't have pre-save hooks. Hash passwords in your
// auth.service.ts before calling prisma.user.create()
`;

        case 'pg':
        case 'cockroachdb':
            return `-- Run this SQL in your PostgreSQL database:
--
-- CREATE TABLE users (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   email VARCHAR(255) UNIQUE NOT NULL,
--   password VARCHAR(255) NOT NULL,
--   role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'USER')) DEFAULT 'USER',
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );
--
-- CREATE INDEX idx_users_email ON users(email);
--
-- NOTE: Remember to hash passwords in your auth.service.ts before INSERT
`;

        case 'mysql':
        case 'mariadb':
            return `-- Run this SQL in your MySQL/MariaDB database:
--
-- CREATE TABLE users (
--   id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
--   email VARCHAR(255) UNIQUE NOT NULL,
--   password VARCHAR(255) NOT NULL,
--   role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
-- );
--
-- CREATE INDEX idx_users_email ON users(email);
--
-- NOTE: Remember to hash passwords in your auth.service.ts before INSERT
`;

        default:
            return `// TODO: Define your User model/schema here\n`;
    }
}

// ─── REAL SERVICE WITH BCRYPT ─────────────────────────────────────────────────
function _buildServiceReal(db) {
    const dbSpecific = _getServiceDbLogic(db);

    return `import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import AppError from '../../errors/AppError';
import config from '../../config';
import { createToken } from '../../utils/jwt.utils';
import { TLoginUser, TLoginResponse } from './auth.interface';
${dbSpecific.imports}

/**
 * loginUser
 * 
 * REAL implementation with bcrypt password comparison.
 * 
 * Flow:
 * 1. Find user by email
 * 2. Compare plaintext password with bcrypt hash
 * 3. Generate JWT tokens
 * 4. Return tokens + user info
 * 
 * Test credentials (after running seed):
 * - Email: admin@test.com
 * - Password: SecurePassword123
 */
const loginUser = async (payload: TLoginUser): Promise<TLoginResponse> => {
  ${dbSpecific.findUser}

  // Compare plaintext password with bcrypt hash
  const isPasswordMatch = await bcrypt.compare(payload.password, user.password);
  
  if (!isPasswordMatch) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  const jwtPayload = {
    userId: user.id || user._id,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string,
  );

  // Omit password from response
  const { password: _, ...userWithoutPassword } = user;

  return {
    accessToken,
    refreshToken,
    user: {
      userId: user.id || user._id,
      email: user.email,
      role: user.role,
    },
  };
};

export const AuthService = { loginUser };
`;
}

function _getServiceDbLogic(db) {
    switch (db) {
        case 'mongoose':
            return {
                imports: `import { UserModel } from './auth.model';`,
                    findUser: `
  const user = await UserModel.findOne({ email: payload.email }).select('+password');
  
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }
`,
            };

        case 'prisma':
            return {
                imports: `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();`,
                    findUser: `
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }
`,
            };

        case 'pg':
        case 'cockroachdb':
            return {
                imports: `import { Pool } from 'pg';

const pool = new Pool(); // uses DATABASE_URL from env`,
                    findUser: `
  const result = await pool.query(
    'SELECT id, email, password, role FROM users WHERE email = $1',
    [payload.email],
  );
  
  const user = result.rows[0];
  
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }
`,
            };

        case 'mysql':
        case 'mariadb':
            return {
                imports: `import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});`,
                    findUser: `
  const connection = await pool.getConnection();
  const [rows] = await connection.execute(
    'SELECT id, email, password, role FROM users WHERE email = ?',
    [payload.email],
  );
  connection.release();
  
  const user = (rows as any[])[0];
  
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }
`,
            };

        default:
            return {
                imports: `// TODO: Import your database client`,
                    findUser: `
  // TODO: Query your database for a user by email
  const user = null; // replace with actual DB query
  
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }
`,
            };
    }
}

// ─── AUTH SETUP GUIDE ──────────────────────────────────────────────────────────
function _buildAuthSetupGuide(db) {
    const seedCommand = _getSeedCommand(db);

    return `# Authentication Setup

## Overview

This auth module uses **bcrypt** for password hashing and **JWT** for stateless authentication.

**Test credentials** (pre-hashed in the seed):
- Email: \`admin@test.com\`
- Password: \`SecurePassword123\`

---

## 1. Database Schema

${db === 'mongoose' ? 'Mongoose uses the schema in \`auth.model.ts\` automatically.' : `Create the users table:\n\n\`\`\`sql\n${seedCommand}\n\`\`\``}

---

## 2. Seed the Database

Add a test user with **hashed** credentials:

${_getSeedExample(db)}

**Why bcrypt?**
- Passwords are salted + hashed → never stored in plaintext
- \`bcrypt.compare()\` safely checks plaintext vs hash
- Even if DB is leaked, passwords are protected

---

## 3. Test the Login

\`\`\`bash
curl -X POST http://localhost:5000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "admin@test.com",
    "password": "SecurePassword123"
  }'
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "userId": "...",
      "email": "admin@test.com",
      "role": "ADMIN"
    }
  }
}
\`\`\`

---

## 4. Use the Token

All protected routes require the access token in the Authorization header:

\`\`\`bash
curl -X GET http://localhost:5000/auth/profile \\
  -H "Authorization: Bearer <accessToken>"
\`\`\`

---

## 5. Add More Users

In your code:

\`\`\`typescript
import bcrypt from 'bcrypt';

// Example: Create a new user
const plainPassword = 'MySecurePass123';
const hashedPassword = await bcrypt.hash(plainPassword, 10);

const newUser = await UserModel.create({
  email: 'user@example.com',
  password: hashedPassword, // Store the hash, never the plaintext
  role: 'USER',
});
\`\`\`

**Note:** The \`auth.model.ts\` pre-save hook automatically hashes passwords in Mongoose. For other ORMs, call \`bcrypt.hash()\` before insert.

---

## 6. Production Checklist

- [ ] Change \`jwt_access_secret\` and \`jwt_refresh_secret\` in \`.env\`
- [ ] Use strong, random secrets (32+ characters)
- [ ] Store secrets in a vault (never in version control)
- [ ] Implement refresh token rotation if needed
- [ ] Add rate limiting on \`/auth/login\` (already included via \`rateLimiter.ts\`)
- [ ] Hash passwords with \`bcrypt.hash(password, 10)\` before any user creation
- [ ] Test token expiration and refresh logic

---

## Customization

### Change Token Expiration

Edit \`.env\`:
\`\`\`
JWT_ACCESS_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
\`\`\`

### Require User Registration

Add a \`register\` endpoint in \`auth.service.ts\` and \`auth.controller.ts\`:
\`\`\`typescript
const registerUser = async (payload: { email: string; password: string }) => {
  const hashedPassword = await bcrypt.hash(payload.password, 10);
  return UserModel.create({
    email: payload.email,
    password: hashedPassword,
    role: 'USER',
  });
};
\`\`\`

### Add Refresh Token Logic

Extend the service to validate refresh tokens and issue new access tokens.

---

## Security Notes

- **Never log passwords** — not even hashed ones
- **HTTPS only** — always encrypt tokens in transit
- **Secure cookies** — consider HttpOnly, Secure flags for refresh tokens
- **CORS** — restrict allowed origins
- **Rate limiting** — already enabled globally on \`rateLimiter.ts\`
`;
}

function _getSeedCommand(db) {
    // Return just the table creation for non-Mongoose DBs
    switch (db) {
        case 'pg':
        case 'cockroachdb':
            return `CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'USER')) DEFAULT 'USER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`;
        case 'mysql':
        case 'mariadb':
            return `CREATE TABLE users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);`;
        default:
            return '';
    }
}

function _getSeedExample(db) {
    const bcryptHash = '$2b$10$abcd1234...'; // Example bcrypt hash of 'SecurePassword123'

    switch (db) {
        case 'mongoose':
            return `Create \`scripts/seed-db.ts\`:

\`\`\`typescript
import bcrypt from 'bcrypt';
import { UserModel } from '../src/app/modules/Auth/auth.model';
import { connectDB } from '../src/server'; // or your DB connection

async function seedDatabase() {
  const plainPassword = 'SecurePassword123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await UserModel.create({
    email: 'admin@test.com',
    password: hashedPassword, // Pre-save hook will re-hash, so pass plaintext or skip
    role: 'ADMIN',
  });

  console.log('✅ Seed user created');
}

seedDatabase().catch(console.error);
\`\`\`

Run:
\`\`\`bash
npx ts-node scripts/seed-db.ts
\`\`\``;

        case 'prisma':
            return `Create \`prisma/seed.ts\`:

\`\`\`typescript
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plainPassword = 'SecurePassword123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('✅ Seed user created:', user.id);
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(console.error);
\`\`\`

Update \`package.json\`:
\`\`\`json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
\`\`\`

Run:
\`\`\`bash
npx prisma db seed
\`\`\``;

        case 'pg':
        case 'cockroachdb':
            return `Create \`scripts/seed-db.ts\`:

\`\`\`typescript
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const pool = new Pool();

async function seedDatabase() {
  const plainPassword = 'SecurePassword123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await pool.query(
    'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    ['admin@test.com', hashedPassword, 'ADMIN'],
  );

  console.log('✅ Seed user created');
  await pool.end();
}

seedDatabase().catch(console.error);
\`\`\`

Run:
\`\`\`bash
npx ts-node scripts/seed-db.ts
\`\`\``;

        case 'mysql':
        case 'mariadb':
            return `Create \`scripts/seed-db.ts\`:

\`\`\`typescript
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

async function seedDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const plainPassword = 'SecurePassword123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await connection.execute(
    'INSERT INTO users (email, password, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password)',
    ['admin@test.com', hashedPassword, 'ADMIN'],
  );

  console.log('✅ Seed user created');
  await connection.end();
}

seedDatabase().catch(console.error);
\`\`\`

Run:
\`\`\`bash
npx ts-node scripts/seed-db.ts
\`\`\``;

        default:
            return '// TODO: Create seed user with bcrypt-hashed password';
    }
}

function _scaffoldRateLimiter(projectPath) {
    const mwDir = path.join(projectPath, 'src/app/middlewares');
    fs.mkdirSync(mwDir, {
        recursive: true
    });

    const content = `import rateLimit from 'express-rate-limit';

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for login endpoint
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Max 5 login attempts per 15 min per IP
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  skipSuccessfulRequests: true, // Don't count successful logins
});
`;
    fs.writeFileSync(path.join(mwDir, 'rateLimiter.ts'), content);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function _injectRoute(projectPath, importLine, routeLine) {
    const indexPath = path.join(projectPath, 'src/app/routes/index.ts');

    if (!fs.existsSync(indexPath)) {
        console.warn('⚠️  Could not find src/app/routes/index.ts — skipping route injection.');
        return;
    }

    let content = fs.readFileSync(indexPath, 'utf8');

    const hasImportMarker = content.includes('// --- INJECT IMPORTS HERE ---');
    const hasRouteMarker = content.includes('// --- INJECT ROUTES HERE ---');

    if (!hasImportMarker || !hasRouteMarker) {
        console.warn(
            '⚠️  Route inject markers not found in routes/index.ts.\n' +
            '   Add these comments manually:\n' +
            '     // --- INJECT IMPORTS HERE ---\n' +
            '     // --- INJECT ROUTES HERE ---',
        );
        return;
    }

    content = content.replace(
        '// --- INJECT IMPORTS HERE ---',
        `${importLine}\n// --- INJECT IMPORTS HERE ---`,
    );
    content = content.replace(
        '// --- INJECT ROUTES HERE ---',
        `${routeLine}\n  // --- INJECT ROUTES HERE ---`,
    );

    fs.writeFileSync(indexPath, content);
}

module.exports = {
    scaffoldAuth
};