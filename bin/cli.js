#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
    execSync
} = require('child_process');
const readline = require('readline');
const {
    scaffoldAuth
} = require('../lib/authGenerator');

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

    // Generate Config & Env
    const envContent = `PORT=5000\nNODE_ENV=development\nBCRYPT_SALT_ROUNDS=12\nJWT_ACCESS_SECRET=your_super_secret_access_key\nJWT_ACCESS_EXPIRES_IN=1d\n`;
    fs.writeFileSync(path.join(projectPath, '.env'), envContent);

    const configDir = path.join(projectPath, 'src/app/config');
    fs.mkdirSync(configDir, {
        recursive: true
    });
    const configContent = `import dotenv from 'dotenv';\nimport path from 'path';\n\ndotenv.config({\n  path: path.join(process.cwd(), '.env'),\n});\n\nexport default {\n  NODE_ENV: process.env.NODE_ENV ?? 'development',\n  port: process.env.PORT ?? 5000,\n  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS ?? 12,\n  jwt_access_secret: process.env.JWT_ACCESS_SECRET,\n  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,\n};\n`;
    fs.writeFileSync(path.join(configDir, 'index.ts'), configContent);

    const serverPath = path.join(projectPath, 'src/server.ts');
    if (fs.existsSync(serverPath)) {
        let serverCode = fs.readFileSync(serverPath, 'utf8');
        serverCode = `import config from './app/config';\n` + serverCode;
        serverCode = serverCode.replace(/process\.env\.PORT/g, 'config.port');
        fs.writeFileSync(serverPath, serverCode);
    }

    // Trigger Auth
    if (useAuth) {
        scaffoldAuth(projectPath); // <-- Called perfectly here!
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

        console.log('\n🔐 Installing Auth dependencies (bcrypt, jsonwebtoken, dotenv)...');
        execSync('npm install bcrypt jsonwebtoken dotenv --loglevel=error', {
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
    console.log(`\nNext steps:\n  cd ${projectName}\n  npm run generate\n  npm run start:dev\n`);
}

runCLI();