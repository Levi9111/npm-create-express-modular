#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const {
    execSync
} = require('child_process');

const ui = require('../lib/ui');
const {
    detectPM,
    installCmd,
    initialInstallCmd,
    runScript
} = require('../lib/pm');
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
const {
    removeModule,
    removeMiddleware,
    removeEnvVar
} = require('../lib/remover');
const {
    listProject
} = require('../lib/lister');
const {
    scaffoldDocker
} = require('../lib/dockerScaffold');
const {
    generateReadme
} = require('../lib/readmeGenerator');

// ─── VERSION ──────────────────────────────────────────────────────────────────
let VERSION = '';
try {
    VERSION = require('../package.json').version;
} catch {
    /* ignore */
}

// ─── INQUIRER BOOTSTRAP ───────────────────────────────────────────────────────
let inquirer;
try {
    inquirer = require('inquirer');
} catch {
    const _pm = detectPM();
    ui.abort(`Missing dependency: inquirer. Run: ${installCmd(_pm, ['inquirer'])}`);
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

function runInstall(cwd, packages, dev = false, pm = 'npm') {
    execSync(
        installCmd(pm, packages, {
            dev
        }), {
            cwd,
            stdio: 'pipe'
        },
    );
}

// ─── UNKNOWN COMMAND HELP ─────────────────────────────────────────────────────
function printHelp() {
    ui.nl();
    ui.warn('Available commands:');
    ui.nl();
    console.log('   cem [project-name]           — scaffold a new project');
    console.log('   cem dev                      — start dev server with hot reload');
    console.log('   cem build                    — compile TypeScript to dist/');
    console.log('   cem start                    — start the production server');
    console.log('   cem check                    — run type-check, lint, and format check');
    console.log('   cem list                     — list modules, middlewares, and env vars');
    console.log('   cem add module <name>        — generate a new module');
    console.log('   cem add middleware <name>    — generate a middleware');
    console.log('   cem add env <KEY>            — add an env variable');
    console.log('   cem remove module <name>     — delete a module and unwire its route');
    console.log('   cem remove middleware <name> — delete a middleware file');
    console.log('   cem remove env <KEY>         — remove an env var from .env and config');
    console.log('   cem --version                — print the installed version');
    console.log('   cem --help                   — show this help message');
    ui.nl();
    ui.warn('Tip: scripts like lint and prettier should be run with your package manager, not cem.');
    ui.nl();
}

// ─── CLI ENTRYPOINT ───────────────────────────────────────────────────────────
async function runCLI() {
    const args = process.argv.slice(2);

    // Detect the user's package manager
    const pm = detectPM();

    // Fire off the update check in the background immediately
    const {
        checkForUpdates,
        isUpdateAvailable
    } = require('../lib/updateNotifier');
    const updateCheckPromise = checkForUpdates();

    // ── notify helper — call before every clean exit ──────────────────────────
    async function notifyIfUpdateAvailable() {
        try {
            const latest = await updateCheckPromise;
            if (isUpdateAvailable(VERSION, latest)) {
                ui.printUpdateNotice(VERSION, latest, pm);
            }
        } catch {
            /* non-fatal */
        }
    }

    // ── COMMAND ROUTER ────────────────────────────────────────────────────────

    // ── version
    if (args[0] === '--version' || args[0] === '-v') {
        console.log(VERSION);
        process.exit(0);
    }

    // ── help
    if (args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
        ui.printBanner(VERSION);
        printHelp();
        process.exit(0);
    }

    // cem dev
    if (args[0] === 'dev') {
        const {
            runDev
        } = require('../lib/dev');
        runDev();
        // runDev manages its own process lifecycle — no process.exit() here
        return;
    }

    // cem build
    if (args[0] === 'build') {
        const {
            runBuild
        } = require('../lib/builder');
        runBuild();
        await notifyIfUpdateAvailable();
        process.exit(0);
    }

    // cem start
    if (args[0] === 'start') {
        const {
            runStart
        } = require('../lib/start');
        runStart();
        // runStart manages its own process lifecycle — no process.exit() here
        return;
    }

    // cem check
    if (args[0] === 'check') {
        const {
            runCheck
        } = require('../lib/checker');
        runCheck();
        return;
    }

    // cem list / cem ls
    if (args[0] === 'list' || args[0] === 'ls') {
        listProject();
        await notifyIfUpdateAvailable();
        process.exit(0);
    }

    // cem add
    if (args[0] === 'add') {
        const subcommand = args[1];
        const name = args[2];

        if (subcommand === 'module') {
            await generateModule(name);
            await notifyIfUpdateAvailable();
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
            ui.success(`Environment variable ${ui.cyan(name)} added to .env, .env.example, and config/index.ts`);
            await notifyIfUpdateAvailable();
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
            await notifyIfUpdateAvailable();
            process.exit(0);
        }

        ui.err('Unknown add subcommand.');
        ui.nl();
        ui.substep('cem add module <name>');
        ui.substep('cem add middleware <name>');
        ui.substep('cem add env <KEY>');
        ui.nl();
        process.exit(1);
    }

    // cem remove / cem rm
    if (args[0] === 'remove' || args[0] === 'rm') {
        const subcommand = args[1];
        const name = args[2];

        if (subcommand === 'module') {
            await removeModule(name);
            await notifyIfUpdateAvailable();
            process.exit(0);
        }
        if (subcommand === 'middleware') {
            await removeMiddleware(name);
            await notifyIfUpdateAvailable();
            process.exit(0);
        }
        if (subcommand === 'env') {
            await removeEnvVar(name);
            await notifyIfUpdateAvailable();
            process.exit(0);
        }

        ui.err('Unknown remove subcommand.');
        ui.nl();
        ui.substep('cem remove module Product');
        ui.substep('cem remove middleware calculate');
        ui.substep('cem remove env STRIPE_SECRET_KEY');
        ui.nl();
        process.exit(1);
    }

    // cem generate (deprecated)
    if (args[0] === 'generate' || args[0] === 'g') {
        ui.warn('"cem generate" is deprecated. Use "cem add module <name>" instead.');
        ui.nl();
        await generateModule(args[1]);
        process.exit(0);
    }

    // ── UNKNOWN COMMAND GUARD ─────────────────────────────────────────────────
    let initialProjectName = 'my-api';
    if (args[0]) {
        if (args[0].startsWith('-')) {
            ui.err(`Unknown flag: "${args[0]}"`);
            printHelp();
            process.exit(1);
        }
        // If they supplied a positional argument, treat it as the default project name
        initialProjectName = args[0];
    }

    // ── PROJECT SCAFFOLDING ───────────────────────────────────────────────────
    ui.printBanner(VERSION);

    // Prompt
    let answers;
    try {
        answers = await inquirer.prompt([{
                type: 'input',
                name: 'projectName',
                message: 'Project name:',
                default: initialProjectName,
                validate: (v) => v.trim() ? true : 'Project name cannot be empty.',
            },
            {
                type: 'list',
                name: 'db',
                message: 'Database / ORM:',
                choices: [{
                        name: 'Mongoose  (MongoDB)',
                        value: 'mongoose'
                    },
                    {
                        name: 'Prisma    (PostgreSQL / MySQL / SQLite)',
                        value: 'prisma'
                    },
                    {
                        name: 'Drizzle   (PostgreSQL)',
                        value: 'drizzle'
                    },
                ],
            },
            {
                type: 'list',
                name: 'validator',
                message: 'Validator:',
                choices: [{
                        name: 'Zod  (recommended)',
                        value: 'zod'
                    },
                    {
                        name: 'Joi  (alternative)',
                        value: 'joi'
                    },
                ],
            },
            {
                type: 'confirm',
                name: 'useAuth',
                message: 'Include JWT Auth module?',
                default: false,
            },
            {
                type: 'list',
                name: 'authTokenDelivery',
                message: 'Auth token delivery:',
                when: (answers) => answers.useAuth,
                choices: [{
                        name: 'HTTP-only cookies  (recommended — XSS safe, browser clients)',
                        value: 'cookie',
                    },
                    {
                        name: 'Authorization header  (mobile / API clients)',
                        value: 'header',
                    },
                ],
                default: 'cookie',
            },
            {
                type: 'confirm',
                name: 'useDocker',
                message: 'Include Docker setup (Dockerfile + docker-compose)?',
                default: false,
            },
        ]);
    } catch (e) {
        if (e.name === 'ExitPromptError') {
            ui.nl();
            ui.warn('Scaffold cancelled.');
            ui.nl();
            process.exit(0);
        }
        throw e;
    }

    const {
        projectName,
        db,
        validator,
        useAuth,
        useDocker,
        authTokenDelivery
    } = answers;
    const tokenDelivery = useAuth ? (authTokenDelivery || 'cookie') : 'header';
    const projectPath = path.join(process.cwd(), projectName);
    const templatePath = path.join(__dirname, '../template');

    // Initialise generators once — reused in both scaffold and install phases
    const dbGen = getDbGenerator(db);
    const valGen = getValidatorGenerator(validator);

    // ── CREATE DIR ────────────────────────────────────────────────────────────
    try {
        fs.mkdirSync(projectPath);
    } catch (e) {
        ui.abort(
            e.code === 'EEXIST' ?
            `Directory '${projectName}' already exists.` :
            `Failed to create directory: ${e.message}`,
        );
    }

    // ── SCAFFOLDING PHASE ─────────────────────────────────────────────────────
    ui.sectionHeader('Scaffolding');

    ui.step('Project', projectName);
    ui.step('Database', db);
    ui.step('Validator', validator);
    ui.step('Auth', useAuth ? 'yes' : 'no');
    ui.step('Docker', useDocker ? 'yes' : 'no');
    ui.nl();

    // Base template
    const scaffoldSpin = ui.spinner('Writing project files...');
    try {
        copyFolderSync(templatePath, projectPath);

        // npm strips dotfiles from published packages — rename gitignore → .gitignore
        const gi = path.join(projectPath, 'gitignore');
        if (fs.existsSync(gi)) fs.renameSync(gi, path.join(projectPath, '.gitignore'));

        // Stamp project name into package.json
        const pkgPath = path.join(projectPath, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            pkg.name = projectName.toLowerCase().replace(/\s+/g, '-');

            // PM-aware engines field
            const engineMap = {
                npm: {
                    node: '>=18',
                    npm: '>=9'
                },
                yarn: {
                    node: '>=18',
                    yarn: '>=1.22'
                },
                pnpm: {
                    node: '>=18',
                    pnpm: '>=8'
                },
            };
            pkg.engines = engineMap[pm] || engineMap.npm;

            // Stamp the chosen package manager so cem dev/build/check can read it back
            if (pm !== 'npm') {
                pkg.packageManager = `${pm}@latest`;
            }

            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        }

        // Remove legacy ESLint config files (replaced by flat config eslint.config.mjs)
        const oldEslintRc = path.join(projectPath, '.eslintrc.json');
        const oldEslintIgnore = path.join(projectPath, '.eslintignore');
        if (fs.existsSync(oldEslintRc)) fs.unlinkSync(oldEslintRc);
        if (fs.existsSync(oldEslintIgnore)) fs.unlinkSync(oldEslintIgnore);

        fs.mkdirSync(path.join(projectPath, 'src/app/modules'), {
            recursive: true
        });

        // Write all generated files
        scaffoldCoreFiles(projectPath, useAuth, tokenDelivery);
        if (db === 'mongoose') scaffoldQueryBuilder(projectPath);
        dbGen.scaffoldServerAndConfig(projectPath);
        dbGen.scaffoldErrorFiles(projectPath);
        valGen.scaffoldValidateRequest(projectPath);
        valGen.scaffoldErrorFile(projectPath);

        // Assemble and write globalErrorHandler
        const handler = buildGlobalErrorHandler(dbGen.errorBlock(), valGen.errorBlock());
        fs.writeFileSync(
            path.join(projectPath, 'src/app/middlewares/globalErrorHandler.middleware.ts'),
            handler,
        );

        scaffoldSpin.succeed('Base architecture scaffolded');
    } catch (e) {
        scaffoldSpin.fail('Failed to scaffold project files');
        ui.abort(e.message);
    }

    ui.substep('src/app.ts  ·  src/server.ts  ·  .env');
    ui.substep('src/app/config/index.ts');
    ui.substep('src/app/errors/    (AppError + db-specific handlers)');
    ui.substep('src/app/utils/     (catchAsync · sendResponse · logger · welcomePage · QueryBuilder · validateRequest)');
    ui.substep('src/app/middlewares/  (globalErrorHandler.middleware · notFound.middleware)');
    ui.substep('src/app/routes/index.ts');
    ui.nl();

    // Auth module
    if (useAuth) {
        const authSpin = ui.spinner('Scaffolding Auth module...');
        try {
            scaffoldAuth(projectPath, db, validator, tokenDelivery, pm);
            authSpin.succeed('Auth module scaffolded');
            ui.substep('src/app/modules/Auth/  (controller · service · route · model · validation)');
            ui.substep('src/app/utils/jwt.utils.ts  ·  src/app/middlewares/auth.middleware.ts');
            ui.substep(`Token delivery: ${tokenDelivery === 'cookie' ? 'HTTP-only cookies' : 'Authorization header'}`);
            ui.nl();
            ui.warn('Replace stub credentials in auth.service.ts before going to production.');
        } catch (e) {
            authSpin.fail('Auth scaffolding failed');
            ui.err(e.message);
        }
        ui.nl();
    }

    // Docker
    if (useDocker) {
        const dockerSpin = ui.spinner('Generating Docker files...');
        try {
            scaffoldDocker(projectPath, projectName, db, pm);
            dockerSpin.succeed('Docker files generated');
            ui.substep('Dockerfile  ·  .dockerignore  ·  docker-compose.yml');
            ui.nl();
        } catch (e) {
            dockerSpin.fail('Docker scaffold failed');
            ui.err(e.message);
        }
    }

    // README
    const readmeSpin = ui.spinner('Generating README.md...');
    try {
        generateReadme(projectPath, {
            projectName,
            db,
            validator,
            useAuth,
            useDocker,
            tokenDelivery,
            pm,
        });
        readmeSpin.succeed('README.md generated');
    } catch (e) {
        readmeSpin.fail('README generation failed');
        ui.err(e.message);
    }
    ui.nl();

    // ── INSTALL PHASE ─────────────────────────────────────────────────────────
    ui.sectionHeader('Installing dependencies');

    // git init
    try {
        execSync('git init', {
            cwd: projectPath,
            stdio: 'ignore'
        });
    } catch {
        /* non-fatal */
    }

    // Base deps
    const baseSpin = ui.spinner('Installing base dependencies...');
    try {
        execSync(initialInstallCmd(pm), {
            cwd: projectPath,
            stdio: 'pipe'
        });
        runInstall(projectPath, ['dotenv', 'http-status-codes', 'express', 'cors', 'helmet'], false, pm);
        runInstall(projectPath, [
            '@types/express', '@types/cors', 'typescript', 'tsx',
            'eslint', '@eslint/js', 'typescript-eslint', 'eslint-config-prettier', 'prettier',
            'create-express-modular',
        ], true, pm);
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
            if (dbDeps.prod.length) runInstall(projectPath, dbDeps.prod, false, pm);
            if (dbDeps.dev.length) runInstall(projectPath, dbDeps.dev, true, pm);
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
            runInstall(projectPath, valDeps.prod, false, pm);
            if (valDeps.dev.length) runInstall(projectPath, valDeps.dev, true, pm);
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
            runInstall(projectPath, ['bcrypt', 'jsonwebtoken', 'express-rate-limit'], false, pm);
            runInstall(projectPath, ['@types/bcrypt', '@types/jsonwebtoken'], true, pm);
            authDepSpin.succeed('Auth dependencies installed');
        } catch (e) {
            authDepSpin.fail('Auth dependency install failed');
            ui.err(e.message);
        }

        // cookie-parser is only needed when using cookie-based token delivery
        if (tokenDelivery === 'cookie') {
            const cookieSpin = ui.spinner('Installing cookie-parser...');
            try {
                runInstall(projectPath, ['cookie-parser'], false, pm);
                runInstall(projectPath, ['@types/cookie-parser'], true, pm);
                cookieSpin.succeed('cookie-parser installed');
            } catch (e) {
                cookieSpin.fail('cookie-parser install failed');
                ui.err(e.message);
            }
        }
    }

    // ── DONE ──────────────────────────────────────────────────────────────────
    ui.printSummary({
        name: projectName,
        db,
        validator,
        auth: useAuth,
        docker: useDocker,
    });

    ui.printNextSteps(projectName);

    // ── UPDATE CHECK ──────────────────────────────────────────────────────────
    const latestVersion = await updateCheckPromise;
    if (isUpdateAvailable(VERSION, latestVersion)) {
        ui.printUpdateNotice(VERSION, latestVersion, pm);
    }
}

runCLI().catch((e) => {
    ui.abort(`Unexpected error: ${e.message}`);
});