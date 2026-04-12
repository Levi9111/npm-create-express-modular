const fs = require('fs');
const path = require('path');

function scaffoldAuth(projectPath) {
    console.log('\n🔐 Scaffolding Authentication Module...');

    const authDir = path.join(projectPath, 'src/app/modules/Auth');
    fs.mkdirSync(authDir, {
        recursive: true
    });

    // 1. jwt.utils.ts (Goes in the utils folder)
    const jwtUtilsContent = `import jwt, { JwtPayload } from 'jsonwebtoken';\n\nexport const createToken = (\n  jwtPayload: { userId: string; role: string },\n  secret: string,\n  expiresIn: string\n) => {\n  return jwt.sign(jwtPayload, secret, { expiresIn });\n};\n\nexport const verifyToken = (token: string, secret: string) => {\n  return jwt.verify(token, secret) as JwtPayload;\n};\n`;
    fs.writeFileSync(path.join(projectPath, 'src/app/utils/jwt.utils.ts'), jwtUtilsContent);

    // 2. auth.ts (The Guard Middleware)
    const authGuardContent = `import { NextFunction, Request, Response } from 'express';\nimport { StatusCodes } from 'http-status-codes';\nimport jwt, { JwtPayload } from 'jsonwebtoken';\nimport AppError from '../errors/AppError';\nimport { verifyToken } from '../utils/jwt.utils';\nimport config from '../config';\n\ndeclare global {\n  namespace Express {\n    interface Request {\n      user: JwtPayload;\n    }\n  }\n}\n\nconst auth = (...requiredRoles: string[]) => {\n  return (req: Request, res: Response, next: NextFunction) => {\n    try {\n      const authHeader = req.headers.authorization;\n      if (!authHeader || !authHeader.startsWith('Bearer '))\n        throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized!');\n\n      const token = authHeader.split(' ')[1];\n      const decoded = verifyToken(token, config.jwt_access_secret as string);\n\n      if (requiredRoles.length && !requiredRoles.includes(decoded.role)) {\n        throw new AppError(StatusCodes.FORBIDDEN, 'You do not have the required permissions!');\n      }\n\n      req.user = decoded;\n      next();\n    } catch (error) {\n      next(new AppError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token!'));\n    }\n  };\n};\n\nexport default auth;\n`;
    fs.writeFileSync(path.join(projectPath, 'src/app/middlewares/auth.ts'), authGuardContent);


    // ─── THE 6 AUTH MODULE FILES ─────────────────────────────────────────

    // 1. auth.interface.ts
    const authInterfaceContent = `export type TLoginUser = {\n  email: string;\n  password: string;\n};\n`;
    fs.writeFileSync(path.join(authDir, 'auth.interface.ts'), authInterfaceContent);

    // 2. auth.model.ts
    const authModelContent = `// import { Schema, model } from 'mongoose';\n// import { TLoginUser } from './auth.interface';\n\n// const userSchema = new Schema<any>({\n//   email: { type: String, required: true, unique: true },\n//   password: { type: String, required: true },\n//   role: { type: String, enum: ['ADMIN', 'USER'], default: 'USER' }\n// }, { timestamps: true });\n\n// export const User = model<any>('User', userSchema);\n`;
    fs.writeFileSync(path.join(authDir, 'auth.model.ts'), authModelContent);

    // 3. auth.validation.ts
    const authValidationContent = `// import { z } from 'zod';\n\n// const loginValidationSchema = z.object({\n//   body: z.object({\n//     email: z.string().email(),\n//     password: z.string().min(6),\n//   }),\n// });\n\n// export const AuthValidation = {\n//   loginValidationSchema,\n// };\n`;
    fs.writeFileSync(path.join(authDir, 'auth.validation.ts'), authValidationContent);

    // 4. auth.controller.ts
    const authControllerContent = `import { Request, Response } from 'express';\nimport { StatusCodes } from 'http-status-codes';\nimport { catchAsync } from '../../utils/catchAsync';\nimport sendResponse from '../../utils/sendResponse';\nimport { AuthService } from './auth.service';\n\nconst login = catchAsync(async (req: Request, res: Response) => {\n  const result = await AuthService.loginUser(req.body);\n  sendResponse(res, {\n    statusCode: StatusCodes.OK,\n    success: true,\n    message: 'User logged in successfully',\n    data: result,\n  });\n});\n\nconst getProfile = catchAsync(async (req: Request, res: Response) => {\n  const userId = req.user.userId;\n  sendResponse(res, {\n    statusCode: StatusCodes.OK,\n    success: true,\n    message: 'Profile fetched successfully',\n    data: { id: userId, role: req.user.role },\n  });\n});\n\nexport const AuthControllers = {\n  login,\n  getProfile\n};\n`;
    fs.writeFileSync(path.join(authDir, 'auth.controller.ts'), authControllerContent);

    // 5. auth.service.ts
    const authServiceContent = `import { createToken } from '../../utils/jwt.utils';\nimport AppError from '../../errors/AppError';\nimport { StatusCodes } from 'http-status-codes';\nimport config from '../../config';\nimport { TLoginUser } from './auth.interface';\n\nconst loginUser = async (payload: TLoginUser) => {\n  if (payload.email !== 'admin@test.com' || payload.password !== '123456') {\n     throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');\n  }\n\n  const jwtPayload = { userId: 'dummy_id_123', role: 'ADMIN' };\n  const accessToken = createToken(\n    jwtPayload,\n    config.jwt_access_secret as string,\n    config.jwt_access_expires_in as string\n  );\n\n  return { accessToken, user: jwtPayload };\n};\n\nexport const AuthService = {\n  loginUser,\n};\n`;
    fs.writeFileSync(path.join(authDir, 'auth.service.ts'), authServiceContent);

    // 6. auth.route.ts
    const authRouteContent = `import express from 'express';\nimport { AuthControllers } from './auth.controller';\nimport auth from '../../middlewares/auth';\n\nconst router = express.Router();\n\nrouter.post('/login', AuthControllers.login);\nrouter.get('/profile', auth('ADMIN'), AuthControllers.getProfile);\n\nexport const AuthRoutes = router;\n`;
    fs.writeFileSync(path.join(authDir, 'auth.route.ts'), authRouteContent);

    // ─── INJECT INTO ROUTES ──────────────────────────────────────────────
    const routesIndexPath = path.join(projectPath, 'src/app/routes/index.ts');
    if (fs.existsSync(routesIndexPath)) {
        let routeFileContent = fs.readFileSync(routesIndexPath, 'utf8');
        const importString = `import { AuthRoutes } from '../modules/Auth/auth.route';\n// --- INJECT IMPORTS HERE ---`;
        const routeString = `  { path: '/auth', route: AuthRoutes },\n  // --- INJECT ROUTES HERE ---`;
        routeFileContent = routeFileContent.replace('// --- INJECT IMPORTS HERE ---', importString);
        routeFileContent = routeFileContent.replace('// --- INJECT ROUTES HERE ---', routeString);
        fs.writeFileSync(routesIndexPath, routeFileContent);
    }
}

module.exports = {
    scaffoldAuth
};