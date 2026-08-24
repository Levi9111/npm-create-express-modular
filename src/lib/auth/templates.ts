/**
 * src/lib/auth/templates.ts
 *
 * Pure string-builder functions for the Auth module scaffold.
 * Each function returns a fully-formed TypeScript file as a string;
 * no filesystem I/O happens here.
 */

import type { DbChoice, ValidatorChoice, TokenDelivery, PackageManager } from '../types';

/**
 * Builds the `auth.middleware.ts` content.
 * The token extraction strategy changes based on `tokenDelivery`.
 */
export function buildAuthMiddleware(tokenDelivery: TokenDelivery): string {
  const tokenExtraction =
    tokenDelivery === 'cookie'
      ? `
      const token = req.cookies?.accessToken;

      if (!token) {
        return next(
          new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized!'),
        );
      }`
      : `
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        return next(
          new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized!'),
        );
      }

      const token = authHeader.split(' ')[1];`;

  return `import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import AppError from '../errors/AppError';
import { verifyToken } from '../utils/jwt.utils';
import config from '../config';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
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
          new AppError(
            StatusCodes.FORBIDDEN,
            'You do not have the required permissions!',
          ),
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

/**
 * Builds the `auth.interface.ts` content.
 * The `TLoginResponse` type includes tokens in the body for header delivery
 * and omits them for cookie delivery.
 */
export function buildInterface(tokenDelivery: TokenDelivery): string {
  const loginResponse =
    tokenDelivery === 'cookie'
      ? `export type TLoginResponse = {
  userId: string;
  email: string;
  role: TUserRole;
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

/**
 * Builds the `auth.controller.ts` content.
 * Cookie delivery adds a `logout` handler that clears both cookies.
 */
export function buildController(tokenDelivery: TokenDelivery): string {
  const cookieMode = tokenDelivery === 'cookie';

  const loginBody = cookieMode
    ? `const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);

  const isProduction = config.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
  };

  res.cookie('accessToken', result.accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendResponse<TLoginResponse>(res, {
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

  const configImport = cookieMode ? "\nimport config from '../../config';" : '';

  return `import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthService } from './auth.service';
import { TLoginResponse } from './auth.interface';${configImport}

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

/**
 * Builds the `auth.route.ts` content.
 * Cookie delivery adds a `POST /logout` route.
 */
export function buildRoute(tokenDelivery: TokenDelivery): string {
  const logoutRoute =
    tokenDelivery === 'cookie'
      ? `
/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out current user (clears auth cookies)
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', auth('ADMIN', 'USER'), AuthControllers.logout);`
      : '';

  return `import express from 'express';
import { AuthControllers } from './auth.controller';
import auth from '../../middlewares/auth.middleware';
import validateRequest from '../../utils/validateRequest';
import { AuthValidation } from './auth.validation';

const router = express.Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate user & receive JWT token(s)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@test.com
 *               password:
 *                 type: string
 *                 example: SecurePassword123
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  validateRequest(AuthValidation.loginSchema),
  AuthControllers.login,
);
${logoutRoute}

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get authenticated user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', auth('ADMIN', 'USER'), AuthControllers.getProfile);

export const AuthRoutes = router;
`;
}

/**
 * Builds the `auth.service.ts` content.
 * DB-specific import and user-lookup logic is injected based on `db`.
 */
export function buildService(db: DbChoice): string {
  const dbSpecific = getServiceDbLogic(db);

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

/**
 * Builds the `auth.validation.ts` content for the chosen validator.
 */
export function buildValidation(validator: ValidatorChoice): string {
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

/**
 * Builds the `auth.model.ts` content.
 * Mongoose generates a real schema; Prisma and Drizzle return a comment
 * stub with migration instructions.
 *
 * @param pm - Package manager, used to determine the migration exec command.
 */
export function buildModel(db: DbChoice, pm: PackageManager = 'npm'): string {
  const execMap: Record<PackageManager, string> = {
    npm: 'npx',
    yarn: 'yarn dlx',
    pnpm: 'pnpm dlx',
    bun: 'bunx',
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
  this.password = await bcrypt.hash(this.password, 10);
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

/**
 * Builds the `AUTH_SETUP.md` quickstart guide.
 */
export function buildSetupGuide(tokenDelivery: TokenDelivery): string {
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

/**
 * Returns DB-specific import statement and user-lookup code for auth.service.ts.
 */
function getServiceDbLogic(db: DbChoice): { imports: string; findUser: string } {
  switch (db) {
    case 'mongoose':
      return {
        imports: `import { UserModel } from './auth.model';`,
        findUser: `const user = await UserModel.findOne({ email: payload.email }).select(
    '+password',
  );
  if (!user) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');`,
      };

    case 'prisma':
      return {
        imports: `import { PrismaClient } from '@prisma/client';\n\nconst prisma = new PrismaClient();`,
        findUser: `const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (!user) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');`,
      };

    case 'drizzle':
      return {
        imports: `import { db } from '../../db';\nimport { users } from '../../db/schema';\nimport { eq } from 'drizzle-orm';`,
        findUser: `const result = await db
    .select()
    .from(users)
    .where(eq(users.email, payload.email))
    .limit(1);
  const user = result[0];
  if (!user) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');`,
      };
  }
}
