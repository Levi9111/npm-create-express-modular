/**
 * src/lib/auth/index.ts
 *
 * Orchestrator for the Auth module scaffold.
 * Writes all auth-related files into the target project and wires
 * the route into `src/app/routes/index.ts`.
 */

import fs from 'fs';
import path from 'path';
import type { DbChoice, ValidatorChoice, TokenDelivery, PackageManager } from '../types';
import { injectRoute } from '../utils/inject';
import {
  buildAuthMiddleware,
  buildInterface,
  buildController,
  buildRoute,
  buildService,
  buildValidation,
  buildModel,
  buildSetupGuide,
} from './templates';

/**
 * Scaffolds the complete Auth module into an existing CEM project.
 *
 * Files written:
 * - `src/app/utils/jwt.utils.ts`
 * - `src/app/middlewares/auth.middleware.ts`
 * - `src/app/middlewares/rateLimiter.middleware.ts`
 * - `src/app/modules/Auth/` (controller, service, route, model, interface, validation, AUTH_SETUP.md)
 *
 * Also injects the Auth route into `src/app/routes/index.ts`.
 *
 * @param projectPath   - Absolute path to the project root.
 * @param db            - The chosen database/ORM.
 * @param validator     - The chosen validation library.
 * @param tokenDelivery - Whether tokens are delivered via cookies or Authorization header.
 * @param pm            - The package manager (used to generate correct migration commands).
 */
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

  fs.writeFileSync(path.join(mwDir, 'auth.middleware.ts'), buildAuthMiddleware(tokenDelivery));
  fs.writeFileSync(path.join(authDir, 'auth.interface.ts'), buildInterface(tokenDelivery));
  fs.writeFileSync(path.join(authDir, 'auth.model.ts'), buildModel(db, pm));
  fs.writeFileSync(path.join(authDir, 'auth.validation.ts'), buildValidation(validator));
  fs.writeFileSync(path.join(authDir, 'auth.controller.ts'), buildController(tokenDelivery));
  fs.writeFileSync(path.join(authDir, 'auth.service.ts'), buildService(db));
  fs.writeFileSync(path.join(authDir, 'auth.route.ts'), buildRoute(tokenDelivery));
  fs.writeFileSync(path.join(authDir, 'AUTH_SETUP.md'), buildSetupGuide(tokenDelivery));

  injectRoute(
    projectPath,
    `import { AuthRoutes } from '../modules/Auth/auth.route';`,
    `  { path: '/auth', route: AuthRoutes },`,
  );

  scaffoldRateLimiter(mwDir);
}

/**
 * Writes `rateLimiter.middleware.ts` with a global and a login-specific
 * rate limiter into the project's middlewares directory.
 */
function scaffoldRateLimiter(mwDir: string): void {
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
