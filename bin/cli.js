#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const {
    execSync
} = require('child_process');
const {
    scaffoldAuth
} = require('../lib/authGenerator');
const {
    generateModule
} = require('../lib/moduleGenerator');
const {
    addEnvVar
} = require('../lib/envGenerator');
const {
    generateMiddleware
} = require('../lib/middlewareGenerator');
const {
    getDbGenerator
} = require('../lib/db');
const {
    getValidatorGenerator
} = require('../lib/validator');
const {
    buildGlobalErrorHandler
} = require('../lib/core/globalErrorHandler/shell');
const {
    scaffoldCoreFiles
} = require('../lib/core/scaffoldCore');

// ─── INQUIRER BOOTSTRAP ────────────────────────────────────────────────────────
// Dynamically require inquirer so we support both v8 (CJS) and v9+ (ESM)
let inquirer;
try {
    inquirer = require('inquirer');
} catch {
    console.error('❌ Missing dependency: inquirer. Run: npm install inquirer');
    process.exit(1);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function copyFolderSync(from, to) {
    fs.mkdirSync(to, {
        recursive: true
    });
    fs.readdirSync(from).forEach((element) => {
        const fromPath = path.join(from, element);
        const toPath = path.join(to, element);
        if (fs.lstatSync(fromPath).isFile()) {
            fs.copyFileSync(fromPath, toPath);
        } else {
            copyFolderSync(fromPath, toPath);
        }
    });
}

function runInstall(cwd, packages, dev = false) {
    const flag = dev ? '-D' : '';
    execSync(`npm install ${flag} ${packages.join(' ')} --loglevel=error`, {
        cwd,
        stdio: 'inherit',
    });
}

// ─── CLI ENTRYPOINT ───────────────────────────────────────────────────────────
async function runCLI() {
    const args = process.argv.slice(2);

    // ── COMMAND ROUTER ────────────────────────────────────────────────────────
    if (args[0] === 'add') {
        const type = args[1];
        const name = args[2];

        if (type === 'module') {
            await generateModule(name);
            process.exit(0);
        }

        if (type === 'env') {
            if (!name) {
                console.error('❌ Error: Please provide a key name. Example: cem add env access_secret');
                process.exit(1);
            }
            addEnvVar(name);
            process.exit(0);
        }

        if (type === 'middleware') {
            if (!name) {
                console.error('❌ Error: Please provide a middleware name. Example: cem add middleware calculate');
                process.exit(1);
            }
            generateMiddleware(name);
            process.exit(0);
        }
    }

    // Kept for backwards compat but deprecated — recommend `cem add module`
    if (args[0] === 'generate' || args[0] === 'g') {
        console.log('⚠️  "cem generate" is deprecated. Use "cem add module <name>" instead.\n');
        await generateModule();
        process.exit(0);
    }

    // ── PROJECT SCAFFOLDING ───────────────────────────────────────────────────
    console.log('\n🚀 Welcome to Create Express Modular!\n');

    // ── GATHER ALL ANSWERS UPFRONT ────────────────────────────────────────────
    const answers = await inquirer.prompt([{
            type: 'input',
            name: 'projectName',
            message: '📦 Project name:',
            default: args[0] || 'my-api',
            validate: (v) => (v.trim() ? true : 'Project name cannot be empty.'),
        },
        {
            type: 'list',
            name: 'db',
            message: '🗄️  Which database are you using?',
            choices: [{
                    name: 'MongoDB  (Mongoose)',
                    value: 'mongoose'
                },
                {
                    name: 'PostgreSQL  (pg)',
                    value: 'pg'
                },
                {
                    name: 'MySQL  (mysql2)',
                    value: 'mysql'
                },
                {
                    name: 'MariaDB  (mariadb)',
                    value: 'mariadb'
                },
                {
                    name: 'CockroachDB  (pg-compatible)',
                    value: 'cockroachdb'
                },
                {
                    name: 'Prisma  (ORM — configure your DB in prisma.schema)',
                    value: 'prisma'
                },
            ],
        },
        {
            type: 'list',
            name: 'validator',
            message: '✅ Which validator do you want?',
            choices: [{
                    name: 'Zod',
                    value: 'zod'
                },
                {
                    name: 'Joi',
                    value: 'joi'
                },
                {
                    name: 'Vine  (@vinejs/vine)',
                    value: 'vine'
                },
                {
                    name: 'Yup',
                    value: 'yup'
                },
            ],
        },
        {
            type: 'confirm',
            name: 'useAuth',
            message: '🔐 Include a ready-to-use JWT Auth module?',
            default: false,
        },
    ]);

    const {
        projectName,
        db,
        validator,
        useAuth
    } = answers;
    const projectPath = path.join(process.cwd(), projectName);
    const templatePath = path.join(__dirname, '../template');

    // ── CREATE PROJECT DIR ────────────────────────────────────────────────────
    try {
        fs.mkdirSync(projectPath);
    } catch (err) {
        if (err.code === 'EEXIST') {
            console.error(`\n❌ Directory '${projectName}' already exists.`);
        } else {
            console.error(`\n❌ Failed to create directory: ${err.message}`);
        }
        process.exit(1);
    }

    // ── COPY BASE TEMPLATE ────────────────────────────────────────────────────
    console.log(`\n📂 Scaffolding base architecture...`);
    copyFolderSync(templatePath, projectPath);

    // Rename gitignore → .gitignore (npm strips dot-files from published packages)
    const gitignorePath = path.join(projectPath, 'gitignore');
    if (fs.existsSync(gitignorePath)) {
        fs.renameSync(gitignorePath, path.join(projectPath, '.gitignore'));
    }

    // Stamp project name into package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        pkg.name = projectName.toLowerCase().replace(/\s+/g, '-');
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
    }

    // Ensure modules dir exists
    fs.mkdirSync(path.join(projectPath, 'src/app/modules'), {
        recursive: true
    });

    // ── LOAD GENERATORS ───────────────────────────────────────────────────────
    const dbGen = getDbGenerator(db);
    const validatorGen = getValidatorGenerator(validator);

    // ── SCAFFOLD CORE UNIVERSAL FILES ─────────────────────────────────────────
    scaffoldCoreFiles(projectPath, useAuth);

    // ── SCAFFOLD DB-SPECIFIC FILES ────────────────────────────────────────────
    dbGen.scaffoldServerAndConfig(projectPath);

    // ── SCAFFOLD VALIDATOR-SPECIFIC FILES ─────────────────────────────────────
    validatorGen.scaffoldValidateRequest(projectPath);

    // ── ASSEMBLE globalErrorHandler ───────────────────────────────────────────
    const handlerContent = buildGlobalErrorHandler(
        dbGen.errorBlock(),
        validatorGen.errorBlock(),
    );
    const errHandlerDir = path.join(projectPath, 'src/app/middlewares');
    fs.mkdirSync(errHandlerDir, {
        recursive: true
    });
    fs.writeFileSync(path.join(errHandlerDir, 'globalErrorHandler.ts'), handlerContent);

    // ── SCAFFOLD AUTH MODULE ───────────────────────────────────────────────────
    if (useAuth) {
        scaffoldAuth(projectPath, db, validator);
    }

    // ── INSTALL DEPENDENCIES ──────────────────────────────────────────────────
    console.log('\n📦 Installing base dependencies...');
    try {
        execSync('git init', {
            cwd: projectPath,
            stdio: 'ignore'
        });
        execSync('npm install --loglevel=error', {
            cwd: projectPath,
            stdio: 'inherit'
        });

        // Universal deps
        runInstall(projectPath, ['dotenv', 'http-status-codes', 'express', 'cors', 'helmet']);
        runInstall(projectPath, ['@types/express', '@types/cors', 'typescript', 'ts-node-dev'], true);

        // DB-specific deps
        const dbDeps = dbGen.dependencies();
        if (dbDeps.prod.length) runInstall(projectPath, dbDeps.prod);
        if (dbDeps.dev.length) runInstall(projectPath, dbDeps.dev, true);

        // Validator-specific deps
        const valDeps = validatorGen.dependencies();
        if (valDeps.prod.length) runInstall(projectPath, valDeps.prod);
        if (valDeps.dev.length) runInstall(projectPath, valDeps.dev, true);

        // Auth deps — only if requested
        if (useAuth) {
            runInstall(projectPath, ['bcrypt', 'jsonwebtoken', 'express-rate-limit']);
            runInstall(projectPath, ['@types/bcrypt', '@types/jsonwebtoken'], true);
        }
    } catch (error) {
        console.error('\n❌ Failed during dependency installation:', error.message);
        process.exit(1);
    }

    console.log(`\n✅ Success! Your Express + TypeScript project is ready.`);
    console.log(`\nDB:        ${db}`);
    console.log(`Validator: ${validator}`);
    console.log(`Auth:      ${useAuth ? 'included' : 'not included'}`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm run start:dev`);
    console.log(`  cem add module Product\n`);
}

runCLI().catch((err) => {
    console.error('\n❌ Unexpected error:', err.message);
    process.exit(1);
});