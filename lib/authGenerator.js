'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Scaffolds the full JWT Auth module.
 * Adapts the model stub and validation stub based on chosen db and validator.
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
    // Fixed: kept in utils/ — this is where auth.ts middleware imports it from
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
    // Fixed: uses next(new AppError(...)) instead of throw — safe in non-async middleware
    // Fixed: imports verifyToken from utils/jwt.utils (not modules/Auth/auth.utils)
    // Fixed: role is typed as enum-like const map, not raw string
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
`,
    );

    // ── 4. auth.model.ts — DB-aware stub ──────────────────────────────────────
    fs.writeFileSync(
        path.join(authDir, 'auth.model.ts'),
        _buildModelStub(db),
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

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);
  sendResponse(res, {
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

    // ── 7. auth.service.ts ────────────────────────────────────────────────────
    fs.writeFileSync(
        path.join(authDir, 'auth.service.ts'),
        `import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import config from '../../config';
import { createToken } from '../../utils/jwt.utils';
import { TLoginUser } from './auth.interface';

const loginUser = async (payload: TLoginUser) => {
  // ⚠️  STUB: Replace this with your actual DB lookup + bcrypt.compare()
  // Example for Mongoose:
  //   const user = await UserModel.findOne({ email: payload.email }).select('+password');
  //   if (!user) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  //   const isMatch = await bcrypt.compare(payload.password, user.password);
  //   if (!isMatch) throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');

  if (payload.email !== 'admin@test.com' || payload.password !== '123456') {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  const jwtPayload = { userId: 'stub_id_replace_me', role: 'ADMIN' };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  return { accessToken, user: jwtPayload };
};

export const AuthService = { loginUser };
`,
    );

    // ── 8. auth.route.ts ──────────────────────────────────────────────────────
    fs.writeFileSync(
        path.join(authDir, 'auth.route.ts'),
        `import express from 'express';
import { AuthControllers } from './auth.controller';
import auth from '../../middlewares/auth';

const router = express.Router();

router.post('/login', AuthControllers.login);
router.get('/profile', auth('ADMIN', 'USER'), AuthControllers.getProfile);

export const AuthRoutes = router;
`,
    );

    // ── 9. Auto-wire into routes/index.ts ─────────────────────────────────────
    _injectRoute(
        projectPath,
        `import { AuthRoutes } from '../modules/Auth/auth.route';`,
        `  { path: '/auth', route: AuthRoutes },`,
    );

    _scaffoldRateLimiter(projectPath);

    console.log('   ✅ Auth module scaffolded');
    console.log('   ⚠️  Remember to replace the stub in auth.service.ts with your real DB logic');
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
`;
    fs.writeFileSync(path.join(mwDir, 'rateLimiter.ts'), content);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function _buildModelStub(db) {
    switch (db) {
        case 'mongoose':
            return `import { Schema, model } from 'mongoose';
import { TUserRole } from './auth.interface';

// Extend this schema to fit your user requirements
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['ADMIN', 'USER'] satisfies TUserRole[], default: 'USER' },
  },
  { timestamps: true },
);

export const UserModel = model('User', userSchema);
`;
        case 'prisma':
            return `// Add the User model to prisma/schema.prisma:
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
// Then run: npx prisma migrate dev --name add-user
`;
        default:
            return `// TODO: Create the users table in your database
// Required columns: id, email, password, role, created_at, updated_at
//
// Example SQL:
// CREATE TABLE users (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   email VARCHAR(255) UNIQUE NOT NULL,
//   password VARCHAR(255) NOT NULL,
//   role VARCHAR(50) NOT NULL DEFAULT 'USER',
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );
`;
    }
}

function _buildValidationStub(validator) {
    switch (validator) {
        case 'zod':
            return `import { z } from 'zod';

const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email format'),
    password: z.string({ required_error: 'Password is required' }).min(6, 'Min 6 characters'),
  }),
});

export const AuthValidation = { loginSchema };
`;
        case 'joi':
            return `import Joi from 'joi';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export const AuthValidation = { loginSchema };
`;
        case 'vine':
            return `import vine from '@vinejs/vine';

const loginSchema = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(6),
  }),
);

export const AuthValidation = { loginSchema };
`;
        case 'yup':
            return `import * as yup from 'yup';

const loginSchema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(6).required(),
});

export const AuthValidation = { loginSchema };
`;
        default:
            return `// TODO: Add login validation schema for your chosen validator\n`;
    }
}

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