#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const {
    execSync
} = require('child_process');

const ui = require('../lib/ui');
const {
    scaffoldAuth
} = require('../lib/authGenerator');
const {
    generateModule
} = require('../lib/moduleGenerator');
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
    scaffoldCoreFiles,
    scaffoldQueryBuilder
} = require('../lib/core/scaffoldCore');

// Read own version from package.json
let VERSION = '';
try {
    VERSION = require('../package.json').version;
} catch {
    /* ignore */ }

// ─── INQUIRER BOOTSTRAP ───────────────────────────────────────────────────────
let inquirer;
try {
    inquirer = require('inquirer');
} catch {
    ui.abort('Missing dependency: inquirer. Run: npm install inquirer');
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function copyFolderSync(from, to) {
    fs.mkdirSync(to, {
        recursive: true
    });
    fs.readdirSync(from).forEach((el) => {
        const src = path.join(from, el);
        const dest = path.join(to, el);
        fs.lstatSync(src).isFile() ?
            fs.copyFileSync(src, dest) :
            copyFolderSync(src, dest);
    });
}

function runInstall(cwd, packages, dev = false) {
    const flag = dev ? '-D' : '';
    execSync(
        `npm install ${flag} ${packages.join(' ')} --loglevel=error`, {
            cwd,
            stdio: 'pipe'
        }, // pipe so npm noise doesn't bleed into our UI
    );
}

// ─── CLI ENTRYPOINT ───────────────────────────────────────────────────────────
async function runCLI() {
    const args = process.argv.slice(2);

    // ── COMMAND ROUTER ──────────────────────────────────────────────────────
    if (args[0] === 'add') {
        const subcommand = args[1];
        const name = args[2];

        if (subcommand === 'module') {
            await generateModule(name);
            process.exit(0);
        }

        if (subcommand === 'env') {
            if (!name) {
                ui.abort('Please provide a key name. Example: cem add env ACCESS_SECRET');
            }
            const {
                addEnvVar
            } = require('../lib/envGenerator');
            addEnvVar(name);
            ui.success(`✅ Environment variable ${name} added to .env`);
            process.exit(0);
        }

        if (subcommand === 'middleware') {
            if (!name) {
                ui.abort('Please provide a middleware name. Example: cem add middleware calculate');
            }
            const {
                generateMiddleware
            } = require('../lib/middlewareGenerator');
            generateMiddleware(name);
            ui.success(`✅ Middleware ${name} generated in src/app/middlewares/`);
            process.exit(0);
        }

        // If no valid subcommand, show help
        ui.warn('Unknown add command. Available: module, env, middleware');
        process.exit(0);
    }

    if (args[0] === 'generate' || args[0] === 'g') {
        ui.warn('"cem generate" is deprecated. Use "cem add module <name>" instead.');
        ui.nl();
        await generateModule();
        process.exit(0);
    }

    // ── PROJECT SCAFFOLDING ─────────────────────────────────────────────────
    ui.printBanner(VERSION);

    const answers = await inquirer.prompt([{
            type: 'input',
            name: 'projectName',
            message: 'Project name:',
            default: args[0] || 'my-api',
            validate: (v) => v.trim() ? true : 'Project name cannot be empty.',
        },
        {
            type: 'list',
            name: 'db',
            message: 'Database:',
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
                    name: 'MariaDB',
                    value: 'mariadb'
                },
                {
                    name: 'CockroachDB  (pg-compatible)',
                    value: 'cockroachdb'
                },
                {
                    name: 'Prisma  (ORM)',
                    value: 'prisma'
                },
            ],
        },
        {
            type: 'list',
            name: 'validator',
            message: 'Validator:',
            choices: [{
                    name: 'Zod',
                    value: 'zod'
                },
                {
                    name: 'Joi',
                    value: 'joi'
                },
                {
                    name: 'Vine',
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
            message: 'Include JWT Auth module?',
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

    // ── CREATE DIR ──────────────────────────────────────────────────────────
    try {
        fs.mkdirSync(projectPath);
    } catch (e) {
        ui.abort(
            e.code === 'EEXIST' ?
            `Directory '${projectName}' already exists.` :
            `Failed to create directory: ${e.message}`,
        );
    }

    // ── SCAFFOLDING PHASE ───────────────────────────────────────────────────
    ui.sectionHeader('Scaffolding');

    // Echo the chosen config back to the user
    ui.step('Project', projectName);
    ui.step('Database', db);
    ui.step('Validator', validator);
    ui.step('Auth', useAuth ? 'yes' : 'no');
    ui.nl();

    // Copy base template
    const scaffoldSpin = ui.spinner('Writing project files...');
    try {
        copyFolderSync(templatePath, projectPath);

        // Rename gitignore → .gitignore (npm strips dotfiles from published packages)
        const gi = path.join(projectPath, 'gitignore');
        if (fs.existsSync(gi)) fs.renameSync(gi, path.join(projectPath, '.gitignore'));

        // Stamp project name
        const pkgPath = path.join(projectPath, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            pkg.name = projectName.toLowerCase().replace(/\s+/g, '-');
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        }

        fs.mkdirSync(path.join(projectPath, 'src/app/modules'), {
            recursive: true
        });

        // Load generators
        const dbGen = getDbGenerator(db);
        const valGen = getValidatorGenerator(validator);

        // Write all files
        scaffoldCoreFiles(projectPath);
        if (db === 'mongoose') scaffoldQueryBuilder(projectPath);
        dbGen.scaffoldServerAndConfig(projectPath);
        dbGen.scaffoldErrorFiles(projectPath);
        valGen.scaffoldValidateRequest(projectPath);
        valGen.scaffoldErrorFile(projectPath);

        // Assemble and write globalErrorHandler
        const handler = buildGlobalErrorHandler(dbGen.errorBlock(), valGen.errorBlock());
        fs.writeFileSync(
            path.join(projectPath, 'src/app/middlewares/globalErrorHandler.ts'),
            handler,
        );

        scaffoldSpin.succeed('Base architecture scaffolded');
    } catch (e) {
        scaffoldSpin.fail('Failed to scaffold project files');
        ui.abort(e.message);
    }

    // Substep file manifest
    ui.substep('src/app.ts  ·  src/server.ts  ·  .env');
    ui.substep('src/app/config/index.ts');
    ui.substep('src/app/errors/    (AppError + db-specific handlers)');
    ui.substep('src/app/utils/     (catchAsync · sendResponse · QueryBuilder · validateRequest)');
    ui.substep('src/app/middlewares/  (globalErrorHandler · notFound)');
    ui.substep('src/app/routes/index.ts');
    ui.nl();

    // Auth module
    if (useAuth) {
        const authSpin = ui.spinner('Scaffolding Auth module...');
        try {
            scaffoldAuth(projectPath, db, validator);
            authSpin.succeed('Auth module scaffolded');
            ui.substep('src/app/modules/Auth/  (controller · service · route · model · validation)');
            ui.substep('src/app/utils/jwt.utils.ts  ·  src/app/middlewares/auth.ts');
            ui.nl();
            ui.warn('Replace stub credentials in auth.service.ts before going to production');
        } catch (e) {
            authSpin.fail('Auth scaffolding failed');
            ui.err(e.message);
        }
        ui.nl();
    }

    // ── INSTALL PHASE ───────────────────────────────────────────────────────
    ui.sectionHeader('Installing dependencies');

    // git init (silent)
    try {
        execSync('git init', {
            cwd: projectPath,
            stdio: 'ignore'
        });
    } catch {
        /* non-fatal */ }

    const dbGen = getDbGenerator(db);
    const valGen = getValidatorGenerator(validator);

    // Base deps
    const baseSpin = ui.spinner('Installing base dependencies...');
    try {
        execSync('npm install --loglevel=error', {
            cwd: projectPath,
            stdio: 'pipe'
        });
        runInstall(projectPath, ['dotenv', 'http-status-codes', 'express', 'cors', 'helmet']);
        runInstall(projectPath, ['@types/express', '@types/cors', 'typescript', 'ts-node-dev'], true);
        baseSpin.succeed('Base dependencies installed');
    } catch (e) {
        baseSpin.fail('Base install failed');
        ui.abort(e.message);
    }

    // DB deps
    const dbDeps = dbGen.dependencies();
    if (dbDeps.prod.length || dbDeps.dev.length) {
        const dbSpin = ui.spinner(`Installing ${db} driver...`);
        try {
            if (dbDeps.prod.length) runInstall(projectPath, dbDeps.prod);
            if (dbDeps.dev.length) runInstall(projectPath, dbDeps.dev, true);
            dbSpin.succeed(`${db} driver installed`);
        } catch (e) {
            dbSpin.fail(`${db} install failed`);
            ui.err(e.message);
        }
    }

    // Validator deps
    const valDeps = valGen.dependencies();
    if (valDeps.prod.length) {
        const valSpin = ui.spinner(`Installing ${validator}...`);
        try {
            runInstall(projectPath, valDeps.prod);
            if (valDeps.dev.length) runInstall(projectPath, valDeps.dev, true);
            valSpin.succeed(`${validator} installed`);
        } catch (e) {
            valSpin.fail(`${validator} install failed`);
            ui.err(e.message);
        }
    }

    // Auth deps
    if (useAuth) {
        const authDepSpin = ui.spinner('Installing auth dependencies...');
        try {
            runInstall(projectPath, ['bcrypt', 'jsonwebtoken']);
            runInstall(projectPath, ['@types/bcrypt', '@types/jsonwebtoken'], true);
            authDepSpin.succeed('Auth dependencies installed');
        } catch (e) {
            authDepSpin.fail('Auth dependency install failed');
            ui.err(e.message);
        }
    }

    // ── DONE ────────────────────────────────────────────────────────────────
    ui.printSummary({
        name: projectName,
        db,
        validator,
        auth: useAuth
    });
    ui.printNextSteps(projectName);
}

runCLI().catch((e) => {
    ui.abort(`Unexpected error: ${e.message}`);
});