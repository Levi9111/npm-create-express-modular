#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
    execSync
} = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function runCLI() {
    console.log('\n🚀 Welcome to Create Express Modular!\n');

    let projectName = process.argv[2];
    if (!projectName) projectName = await askQuestion('📦 What is your project named? (e.g., my-api): ');
    if (!projectName) {
        console.error('❌ Project name is required.');
        process.exit(1);
    }

    // ─── Auth Prompt Only ──────────────────────────────────────────────
    const authAnswer = await askQuestion('🔐 Would you like to scaffold a ready-to-use Authentication module (JWT)? (y/N): ');
    const useAuth = authAnswer.toLowerCase() === 'y';

    rl.close();

    const projectPath = path.join(process.cwd(), projectName);
    const templatePath = path.join(__dirname, '../template');

    try {
        fs.mkdirSync(projectPath);
    } catch (err) {
        if (err.code === 'EEXIST') console.error(`❌ Directory '${projectName}' already exists.`);
        process.exit(1);
    }

    function copyFolderSync(from, to) {
        fs.mkdirSync(to, {
            recursive: true
        });
        fs.readdirSync(from).forEach((element) => {
            const fromPath = path.join(from, element);
            const toPath = path.join(to, element);
            if (fs.lstatSync(fromPath).isFile()) fs.copyFileSync(fromPath, toPath);
            else copyFolderSync(fromPath, toPath);
        });
    }

    console.log(`\n📂 Scaffolding base architecture...`);
    copyFolderSync(templatePath, projectPath);

    const gitignorePath = path.join(projectPath, 'gitignore');
    if (fs.existsSync(gitignorePath)) fs.renameSync(gitignorePath, path.join(projectPath, '.gitignore'));

    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packageJson.name = projectName.toLowerCase().replace(/\s+/g, '-');
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    fs.mkdirSync(path.join(projectPath, 'src/app/modules'), {
        recursive: true
    });

    // ─── Generate Base .env file ───────────────────────────────────────
    let envContent = `PORT=5000\nNODE_ENV=development\nBCRYPT_SALT_ROUNDS=12\nJWT_ACCESS_SECRET=your_super_secret_access_key\nJWT_ACCESS_EXPIRES_IN=1d\n`;
    fs.writeFileSync(path.join(projectPath, '.env'), envContent);

    // ─── Trigger Auth Scaffolding ─────────────────────────────────
    if (useAuth) {
        scaffoldAuth(projectPath);
    }

    console.log('\n📦 Installing dependencies (this takes a minute)...');
    try {
        execSync('git init', {
            cwd: projectPath,
            stdio: 'ignore'
        });
        execSync('npm install --loglevel=error', {
            cwd: projectPath,
            stdio: 'inherit'
        });

        console.log('\n🔐 Installing Auth dependencies (bcrypt, jsonwebtoken)...');
        execSync('npm install bcrypt jsonwebtoken --loglevel=error', {
            cwd: projectPath,
            stdio: 'inherit'
        });
        execSync('npm install -D @types/bcrypt @types/jsonwebtoken --loglevel=error', {
            cwd: projectPath,
            stdio: 'inherit'
        });

    } catch (error) {
        console.error('\n❌ Failed to install dependencies.');
    }

    console.log(`\n✅ Success! Your Express architecture is ready.`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm run generate   <-- ⚡ Try generating your first module!`);
    console.log(`  npm run start:dev\n`);
}

// ─── Auth Scaffolding Helper Function ───────────────────────────
function scaffoldAuth(projectPath) {
    console.log('\n🔐 Scaffolding Authentication Module...');

    const authDir = path.join(projectPath, 'src/app/modules/Auth');
    fs.mkdirSync(authDir, {
        recursive: true
    });

    // 1. jwt.utils.ts
    const jwtUtilsContent = `import jwt, { JwtPayload } from 'jsonwebtoken';\n\nexport const createToken = (\n  jwtPayload: { userId: string; role: string },\n  secret: string,\n  expiresIn: string\n) => {\n  return jwt.sign(jwtPayload, secret, { expiresIn });\n};\n\nexport const verifyToken = (token: string, secret: string) => {\n  return jwt.verify(token, secret) as JwtPayload;\n};\n`;
    fs.writeFileSync(path.join(projectPath, 'src/app/utils/jwt.utils.ts'), jwtUtilsContent);

    // 2. auth.ts (The Guard Middleware)
    const authGuardContent = `import { NextFunction, Request, Response } from 'express';\nimport { StatusCodes } from 'http-status-codes';\nimport jwt, { JwtPayload } from 'jsonwebtoken';\nimport AppError from '../errors/AppError';\nimport { verifyToken } from '../utils/jwt.utils';\n\n// Add user to Express Request interface\ndeclare global {\n  namespace Express {\n    interface Request {\n      user: JwtPayload;\n    }\n  }\n}\n\n/**\n * Auth Guard Middleware\n * Usage in routes: router.post('/protected', auth('ADMIN', 'USER'), controller.myHandler)\n */\nconst auth = (...requiredRoles: string[]) => {\n  return (req: Request, res: Response, next: NextFunction) => {\n    try {\n      // 1. Extract token from header\n      const authHeader = req.headers.authorization;\n      if (!authHeader || !authHeader.startsWith('Bearer '))\n        throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized!');\n\n      const token = authHeader.split(' ')[1];\n\n      // 2. Verify token\n      const decoded = verifyToken(token, process.env.JWT_ACCESS_SECRET as string);\n\n      // 3. Check roles (if any are required)\n      if (requiredRoles.length && !requiredRoles.includes(decoded.role)) {\n        throw new AppError(StatusCodes.FORBIDDEN, 'You do not have the required permissions!');\n      }\n\n      // 4. Attach user to request\n      req.user = decoded;\n      next();\n    } catch (error) {\n      next(new AppError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token!'));\n    }\n  };\n};\n\nexport default auth;\n`;
    fs.writeFileSync(path.join(projectPath, 'src/app/middlewares/auth.ts'), authGuardContent);

    // 3. auth.controller.ts
    const authControllerContent = `import { Request, Response } from 'express';\nimport { StatusCodes } from 'http-status-codes';\nimport { catchAsync } from '../../utils/catchAsync';\nimport sendResponse from '../../utils/sendResponse';\nimport { AuthService } from './auth.service';\n\nconst login = catchAsync(async (req: Request, res: Response) => {\n  const result = await AuthService.loginUser(req.body);\n\n  sendResponse(res, {\n    statusCode: StatusCodes.OK,\n    success: true,\n    message: 'User logged in successfully',\n    data: result,\n  });\n});\n\n// Example of a protected route handler\nconst getProfile = catchAsync(async (req: Request, res: Response) => {\n  // req.user is populated by the auth() middleware!\n  const userId = req.user.userId;\n  \n  sendResponse(res, {\n    statusCode: StatusCodes.OK,\n    success: true,\n    message: 'Profile fetched successfully',\n    data: { id: userId, role: req.user.role },\n  });\n});\n\nexport const AuthControllers = {\n  login,\n  getProfile\n};\n`;
    fs.writeFileSync(path.join(authDir, 'auth.controller.ts'), authControllerContent);

    // 4. auth.service.ts
    const authServiceContent = `import { createToken } from '../../utils/jwt.utils';\nimport AppError from '../../errors/AppError';\nimport { StatusCodes } from 'http-status-codes';\n\nconst loginUser = async (payload: any) => {\n  // TODO: 1. Find user in Database (e.g., User.findOne({ email: payload.email }))\n  // TODO: 2. Check if password matches (e.g., bcrypt.compare(payload.password, user.password))\n  \n  // Dummy logic for boilerplate demonstration\n  if (payload.email !== 'admin@test.com' || payload.password !== '123456') {\n     throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');\n  }\n\n  // 3. Generate Token\n  const jwtPayload = {\n    userId: 'dummy_id_123',\n    role: 'ADMIN',\n  };\n\n  const accessToken = createToken(\n    jwtPayload,\n    process.env.JWT_ACCESS_SECRET as string,\n    process.env.JWT_ACCESS_EXPIRES_IN as string\n  );\n\n  return {\n    accessToken,\n    user: jwtPayload\n  };\n};\n\nexport const AuthService = {\n  loginUser,\n};\n`;
    fs.writeFileSync(path.join(authDir, 'auth.service.ts'), authServiceContent);

    // 5. auth.route.ts
    const authRouteContent = `import express from 'express';\nimport { AuthControllers } from './auth.controller';\nimport auth from '../../middlewares/auth';\n\nconst router = express.Router();\n\n// Public route\nrouter.post('/login', AuthControllers.login);\n\n// Protected route example - Only ADMIN can access\nrouter.get('/profile', auth('ADMIN'), AuthControllers.getProfile);\n\nexport const AuthRoutes = router;\n`;
    fs.writeFileSync(path.join(authDir, 'auth.route.ts'), authRouteContent);

    // 6. Inject into routes/index.ts
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

runCLI();