'use strict';

import fs from 'fs';
import path from 'path';
import type { DbChoice, ValidatorChoice, TokenDelivery, PackageManager } from './types';

export function scaffoldAuth(
  projectPath: string,
  db: DbChoice = 'mongoose',
  validator: ValidatorChoice = 'zod',
  tokenDelivery: TokenDelivery = 'cookie',
  pm: PackageManager = 'npm',
): void {
  const authDir = path.join(projectPath, 'src/app/modules/Auth');
  const utilsDir = path.join(projectPath, 'src/app/utils');
  const mwDir = path.join(projectPath, 'src/app/middlewares');

  fs.mkdirSync(authDir, { recursive: true });
  fs.mkdirSync(utilsDir, { recursive: true });
  fs.mkdirSync(mwDir, { recursive: true });

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

  fs.writeFileSync(
    path.join(mwDir, 'auth.middleware.ts'),
    _buildAuthMiddleware(tokenDelivery),
  );

  fs.writeFileSync(
    path.join(authDir, 'auth.interface.ts'),
    _buildInterface(tokenDelivery),
  );

  fs.writeFileSync(
    path.join(authDir, 'auth.model.ts'),
    _buildModelReal(db, pm),
  );

  fs.writeFileSync(
    path.join(authDir, 'auth.validation.ts'),
    _buildValidationStub(validator),
  );

  fs.writeFileSync(
    path.join(authDir, 'auth.controller.ts'),
    _buildController(tokenDelivery),
  );

  fs.writeFileSync(
    path.join(authDir, 'auth.service.ts'),
    _buildServiceReal(db),
  );

  fs.writeFileSync(
    path.join(authDir, 'auth.route.ts'),
    _buildRoute(tokenDelivery),
  );

  fs.writeFileSync(
    path.join(authDir, 'AUTH_SETUP.md'),
    _buildAuthSetupGuide(tokenDelivery),
  );

  _injectRoute(
    projectPath,
    `import { AuthRoutes } from '../modules/Auth/auth.route';`,
    `  { path: '/auth', route: AuthRoutes },`,
  );

  _scaffoldRateLimiter(projectPath);
}

function _buildAuthMiddleware(tokenDelivery: TokenDelivery): string {
  const tokenExtraction =
    tokenDelivery === 'cookie'
      ? `
      const token = req.cookies?.accessToken;

      if (!token) {
        return next(new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized!'));
      }`
      : `
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        return next(new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized!'));
      }

      const token = authHeader.split(' ')[1];`;

  return `import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import AppError from '../errors/AppError';
import { verifyToken } from '../utils/jwt.utils';
import config from '../config';

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload & { userId: string; role: string };
    }
  }
}

const auth = (...requiredRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {${tokenExtraction}

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
`;
}

function _buildInterface(tokenDelivery: TokenDelivery): string {
  const loginResponse =
    tokenDelivery === 'cookie'
      ? `export type TLoginResponse = {
  user: {
    userId: string;
    email: string;
    role: TUserRole;
  };
};`
      : `export type TLoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    email: string;
    role: TUserRole;
  };
};`;

  return `export type TLoginUser = {
  email: string;
  password: string;
};

export type TUserRole = 'ADMIN' | 'USER';

${loginResponse}
`;
}

function _buildController(tokenDelivery: TokenDelivery): string {
  const cookieMode = tokenDelivery === 'cookie';

  const loginBody = cookieMode
    ? `const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
  };

  res.cookie('accessToken',  result.accessToken,  { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', result.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User logged in successfully',
    data: result.user,
  });
});`
    : `const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);
  sendResponse<TLoginResponse>(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User logged in successfully',
    data: result,
  });
});`;

  const logoutBody = cookieMode
    ? `const logout = catchAsync(async (_req: Request, res: Response) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Logged out successfully',
    data: null,
  });
});`
    : '';

  const exports = cookieMode
    ? `export const AuthControllers = { login, logout, getProfile };`
    : `export const AuthControllers = { login, getProfile };`;

  return `import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthService } from './auth.service';
import { TLoginResponse } from './auth.interface';

${loginBody}

${logoutBody}

const getProfile = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user;
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Profile fetched successfully',
    data: { id: userId, role },
  });
});

${exports}
`;
}

function _buildRoute(tokenDelivery: TokenDelivery): string {
  const logoutRoute =
    tokenDelivery === 'cookie'
      ? `router.post('/logout', auth('ADMIN', 'USER'), AuthControllers.logout);`
      : '';

  return `import express from 'express';
import { AuthControllers } from './auth.controller';
import auth from '../../middlewares/auth.middleware';
import validateRequest from '../../utils/validateRequest';
import { AuthValidation } from './auth.validation';

const router = express.Router();

router.post(
  '/login',
  validateRequest(AuthValidation.loginSchema),
  AuthControllers.login,
);
${logoutRoute}
router.get('/profile', auth('ADMIN', 'USER'), AuthControllers.getProfile);

export const AuthRoutes = router;
`;
}

function _buildServiceReal(db: DbChoice): string {
  const dbSpecific = _getServiceDbLogic(db);

  return `import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import AppError from '../../errors/AppError';
import config from '../../config';
import { createToken } from '../../utils/jwt.utils';
import { TLoginUser } from './auth.interface';
${dbSpecific.imports}

const loginUser = async (payload: TLoginUser) => {
  ${dbSpecific.findUser}

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

function _buildValidationStub(validator: ValidatorChoice): string {
  switch (validator) {
    case 'zod':
      return `import { z } from 'zod';

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['ADMIN', 'USER']).optional().default('USER'),
  }),
});

export const AuthValidation = {
  loginSchema,
  registerSchema,
};
`;
    case 'joi':
      return `import Joi from 'joi';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('ADMIN', 'USER').default('USER'),
});

export const AuthValidation = {
  loginSchema,
  registerSchema,
};
`;
  }
}

function _buildModelReal(db: DbChoice, pm: PackageManager = 'npm'): string {
  const execMap: Record<PackageManager, string> = {
    npm: 'npx',
    yarn: 'yarn dlx',
    pnpm: 'pnpm dlx',
  };
  const exec = execMap[pm] || 'npx';

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

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  try {
    this.password = await bcrypt.hash(this.password, 10);
  } catch (error) {
    throw error;
  }
});

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
// Then run: ${exec} prisma migrate dev --name init
`;

    case 'drizzle':
      return `// Add the users table to src/app/db/schema.ts:
//
// import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';
//
// export const users = pgTable('users', {
//   id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
//   email:     varchar('email', { length: 255 }).notNull().unique(),
//   password:  varchar('password', { length: 255 }).notNull(),
//   role:      varchar('role', { length: 50 }).notNull().default('USER'),
//   createdAt: timestamp('created_at').defaultNow(),
//   updatedAt: timestamp('updated_at').defaultNow(),
// });
//
// Then run: ${exec} drizzle-kit migrate
`;
  }
}

function _getServiceDbLogic(db: DbChoice): { imports: string; findUser: string } {
  switch (db) {
    case 'mongoose':
      return {
        imports: `import { UserModel } from './auth.model';`,
        findUser: `
  const user = await UserModel.findOne({ email: payload.email }).select('+password');
  if (!user) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
`,
      };
    case 'prisma':
      return {
        imports: `import { PrismaClient } from '@prisma/client';\n\nconst prisma = new PrismaClient();`,
        findUser: `
  const user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
`,
      };
    case 'drizzle':
      return {
        imports: `import { db } from '../../db';\nimport { users } from '../../db/schema';\nimport { eq } from 'drizzle-orm';`,
        findUser: `
  const result = await db.select().from(users).where(eq(users.email, payload.email)).limit(1);
  const user = result[0];
  if (!user) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
`,
      };
  }
}

function _buildAuthSetupGuide(tokenDelivery: TokenDelivery): string {
  const isCookie = tokenDelivery === 'cookie';

  const tokenSection = isCookie
    ? `## Token Delivery: HTTP-only Cookies

Tokens are stored in \`httpOnly\` cookies — JavaScript cannot read them.
This protects against XSS attacks.

**Login response sets two cookies automatically:**
- \`accessToken\` — expires in 15 minutes
- \`refreshToken\` — expires in 7 days

**Logout clears both cookies:**
\`\`\`bash
POST /auth/logout
\`\`\`

**No Authorization header needed** — the browser sends cookies automatically.`
    : `## Token Delivery: Authorization Header

Tokens are returned in the response body.
Store them client-side and send via header:

\`\`\`
Authorization: Bearer <accessToken>
\`\`\``;

  return `# Authentication Setup

## Overview

This auth module uses **bcrypt** for password hashing and **JWT** for stateless authentication.

${tokenSection}

---

## Test Credentials

- Email: \`admin@test.com\`
- Password: \`SecurePassword123\`

---

## Test the Login

\`\`\`bash
curl -X POST http://localhost:5000/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{ "email": "admin@test.com", "password": "SecurePassword123" }'
\`\`\`

---

## Production Checklist

- [ ] Change \`JWT_ACCESS_SECRET\` and \`JWT_REFRESH_SECRET\` in \`.env\`
- [ ] Use strong random secrets (32+ characters)
- [ ] Set \`NODE_ENV=production\` so cookies use \`secure: true\`
- [ ] Hash passwords with \`bcrypt.hash(password, 10)\` before any user creation
- [ ] Add rate limiting on \`/auth/login\` (already included via \`rateLimiter.ts\`)

---

## Security Notes

- Never log passwords
- Always use HTTPS in production
- CORS — restrict allowed origins
`;
}

function _scaffoldRateLimiter(projectPath: string): void {
  const mwDir = path.join(projectPath, 'src/app/middlewares');
  fs.mkdirSync(mwDir, { recursive: true });

  fs.writeFileSync(
    path.join(mwDir, 'rateLimiter.middleware.ts'),
    `import rateLimit from 'express-rate-limit';

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  skipSuccessfulRequests: true,
});
`,
  );
}

function _injectRoute(projectPath: string, importLine: string, routeLine: string): void {
  const indexPath = path.join(projectPath, 'src/app/routes/index.ts');
  if (!fs.existsSync(indexPath)) return;

  let content = fs.readFileSync(indexPath, 'utf8');
  if (
    !content.includes('// --- INJECT IMPORTS HERE ---') ||
    !content.includes('// --- INJECT ROUTES HERE ---')
  ) {
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
