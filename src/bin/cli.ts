#!/usr/bin/env node

'use strict';

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import * as ui from '../lib/ui';
import { detectPM, installCmd, initialInstallCmd } from '../lib/pm';
import { scaffoldAuth } from '../lib/authGenerator';
import { generateModule } from '../lib/moduleGenerator';
import { getDbGenerator } from '../lib/db';
import { getValidatorGenerator } from '../lib/validator';
import { buildGlobalErrorHandler } from '../lib/core/globalErrorHandler/shell';
import { scaffoldCoreFiles, scaffoldQueryBuilder } from '../lib/core/scaffoldCore';
import { removeModule, removeMiddleware, removeEnvVar } from '../lib/remover';
import { listProject } from '../lib/lister';
import { scaffoldDocker } from '../lib/dockerScaffold';
import { generateReadme } from '../lib/readmeGenerator';
import { generateAgentDocs } from '../lib/agentDocsGenerator';
import { checkForUpdates, isUpdateAvailable } from '../lib/updateNotifier';
import { runDev } from '../lib/dev';
import { runBuild } from '../lib/builder';
import { runStart } from '../lib/start';
import { runCheck } from '../lib/checker';
import { addEnvVar } from '../lib/envGenerator';
import { generateMiddleware } from '../lib/middlewareGenerator';
import { createInitialCemConfig, saveCemConfig } from '../lib/configLoader';
import type { DbChoice, ValidatorChoice, TokenDelivery, PackageManager } from '../lib/types';
import inquirer from 'inquirer';

// ─── VERSION ──────────────────────────────────────────────────────────────────
let VERSION = '';
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  VERSION = require('../../package.json').version;
} catch {
  /* ignore */
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function copyFolderSync(from: string, to: string): void {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((el) => {
    const src = path.join(from, el);
    const dest = path.join(to, el);
    fs.lstatSync(src).isFile()
      ? fs.copyFileSync(src, dest)
      : copyFolderSync(src, dest);
  });
}

function runInstall(cwd: string, packages: string[], dev = false, pm: PackageManager = 'npm'): void {
  execSync(installCmd(pm, packages, { dev }), {
    cwd,
    stdio: 'pipe',
  });
}

// ─── UNKNOWN COMMAND HELP ─────────────────────────────────────────────────────
function printHelp(): void {
  ui.nl();
  ui.warn('Available commands:');
  ui.nl();
  console.log('   cem [project-name]           — scaffold a new project');
  console.log('   cem dev                      — start dev server with hot reload');
  console.log('   cem build                    — compile TypeScript to dist/');
  console.log('   cem start                    — start the production server');
  console.log('   cem check                    — run type-check, lint, and format check');
  console.log('   cem list                     — list modules, middlewares, and env vars');
  console.log('   cem add module <name...>     — generate one or more feature modules');
  console.log('   cem add middleware <name...> — generate one or more custom middlewares');
  console.log('   cem add env <KEY...>         — add one or more env variables');
  console.log('   cem remove module <name...>  — delete module(s) and unwire routes');
  console.log('   cem remove middleware <name...> — delete middleware file(s)');
  console.log('   cem remove env <KEY...>       — remove env var(s) from all config files');
  console.log('   cem --version                — print the installed version');
  console.log('   cem --help                   — show this help message');
  ui.nl();
  ui.warn('Tip: scripts like lint and prettier should be run with your package manager, not cem.');
  ui.nl();
}

interface PromptAnswers {
  projectName: string;
  db: DbChoice;
  validator: ValidatorChoice;
  useAuth: boolean;
  authTokenDelivery?: TokenDelivery;
  useDocker: boolean;
}

// ─── CLI ENTRYPOINT ───────────────────────────────────────────────────────────
async function runCLI(): Promise<void> {
  const args = process.argv.slice(2);

  // Detect the user's package manager
  const pm = detectPM();

  // Fire off the update check in the background immediately
  const updateCheckPromise = checkForUpdates();

  // ── notify helper — call before every clean exit ──────────────────────────
  async function notifyIfUpdateAvailable(): Promise<void> {
    try {
      const latest = await updateCheckPromise;
      if (latest && isUpdateAvailable(VERSION, latest)) {
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
    runDev();
    return;
  }

  // cem build
  if (args[0] === 'build') {
    runBuild();
    await notifyIfUpdateAvailable();
    process.exit(0);
  }

  // cem start
  if (args[0] === 'start') {
    runStart();
    return;
  }

  // cem check
  if (args[0] === 'check') {
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

    if (subcommand === 'module') {
      const moduleNames = args.slice(2);
      if (moduleNames.length === 0) {
        ui.abort('Please provide a module name. Example: cem add module Product');
      }
      await generateModule(moduleNames);
      await notifyIfUpdateAvailable();
      process.exit(0);
    }
    if (subcommand === 'env') {
      const keys = args.slice(2);
      if (keys.length === 0) {
        ui.abort('Please provide a key name. Example: cem add env ACCESS_SECRET');
      }
      addEnvVar(keys);
      const formattedKeys = keys.map((k) => ui.cyan(k)).join(', ');
      ui.success(`Environment variable(s) ${formattedKeys} added to .env, .env.example, and config/index.ts`);
      await notifyIfUpdateAvailable();
      process.exit(0);
    }

    if (subcommand === 'middleware') {
      const middlewareNames = args.slice(2);
      if (middlewareNames.length === 0) {
        ui.abort('Please provide a middleware name. Example: cem add middleware calculate');
      }
      generateMiddleware(middlewareNames);
      await notifyIfUpdateAvailable();
      process.exit(0);
    }

    ui.err('Unknown add subcommand.');
    ui.nl();
    ui.substep('cem add module <name...>');
    ui.substep('cem add middleware <name...>');
    ui.substep('cem add env <KEY...>');
    ui.nl();
    process.exit(1);
  }

  // cem remove / cem rm
  if (args[0] === 'remove' || args[0] === 'rm') {
    const subcommand = args[1];
    const targets = args.slice(2);

    if (subcommand === 'module') {
      if (targets.length === 0) ui.abort('Usage: cem remove module <Name...>');
      await removeModule(targets);
      await notifyIfUpdateAvailable();
      process.exit(0);
    }
    if (subcommand === 'middleware') {
      if (targets.length === 0) ui.abort('Usage: cem remove middleware <name...>');
      await removeMiddleware(targets);
      await notifyIfUpdateAvailable();
      process.exit(0);
    }
    if (subcommand === 'env') {
      if (targets.length === 0) ui.abort('Usage: cem remove env <KEY...>');
      await removeEnvVar(targets);
      await notifyIfUpdateAvailable();
      process.exit(0);
    }

    ui.err('Unknown remove subcommand.');
    ui.nl();
    ui.substep('cem remove module <Name...>');
    ui.substep('cem remove middleware <name...>');
    ui.substep('cem remove env <KEY...>');
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
    initialProjectName = args[0];
  }

  // ── PROJECT SCAFFOLDING ───────────────────────────────────────────────────
  ui.printBanner(VERSION);

  let answers: PromptAnswers;
  try {
    answers = await inquirer.prompt<PromptAnswers>([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: initialProjectName,
        validate: (v: string) => (v.trim() ? true : 'Project name cannot be empty.'),
      },
      {
        type: 'list',
        name: 'db',
        message: 'Database / ORM:',
        choices: [
          { name: 'Mongoose  (MongoDB)', value: 'mongoose' },
          { name: 'Prisma    (PostgreSQL / MySQL / SQLite)', value: 'prisma' },
          { name: 'Drizzle   (PostgreSQL)', value: 'drizzle' },
        ],
      },
      {
        type: 'list',
        name: 'validator',
        message: 'Validator:',
        choices: [
          { name: 'Zod  (recommended)', value: 'zod' },
          { name: 'Joi  (alternative)', value: 'joi' },
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
        when: (ans: PromptAnswers) => ans.useAuth,
        choices: [
          {
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
  } catch (e: any) {
    if (e.name === 'ExitPromptError') {
      ui.nl();
      ui.warn('Scaffold cancelled.');
      ui.nl();
      process.exit(0);
    }
    throw e;
  }

  const { projectName, db, validator, useAuth, useDocker, authTokenDelivery } = answers;
  const tokenDelivery: TokenDelivery = useAuth ? authTokenDelivery || 'cookie' : 'header';
  const projectPath = path.join(process.cwd(), projectName);
  const templatePath = path.join(__dirname, '../../template');

  const dbGen = getDbGenerator(db);
  const valGen = getValidatorGenerator(validator);

  // ── CREATE DIR ────────────────────────────────────────────────────────────
  try {
    fs.mkdirSync(projectPath);
  } catch (e: any) {
    ui.abort(
      e.code === 'EEXIST'
        ? `Directory '${projectName}' already exists.`
        : `Failed to create directory: ${e.message}`,
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

  const scaffoldSpin = ui.spinner('Writing project files...');
  try {
    copyFolderSync(templatePath, projectPath);

    const gi = path.join(projectPath, 'gitignore');
    if (fs.existsSync(gi)) fs.renameSync(gi, path.join(projectPath, '.gitignore'));

    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.name = projectName.toLowerCase().replace(/\s+/g, '-');

      const engineMap: Record<string, { node: string; [key: string]: string }> = {
        npm: { node: '>=18', npm: '>=9' },
        yarn: { node: '>=18', yarn: '>=1.22' },
        pnpm: { node: '>=18', pnpm: '>=8' },
      };
      pkg.engines = engineMap[pm] || engineMap.npm;

      if (pm !== 'npm') {
        pkg.packageManager = `${pm}@latest`;
      }

      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }

    const oldEslintRc = path.join(projectPath, '.eslintrc.json');
    const oldEslintIgnore = path.join(projectPath, '.eslintignore');
    if (fs.existsSync(oldEslintRc)) fs.unlinkSync(oldEslintRc);
    if (fs.existsSync(oldEslintIgnore)) fs.unlinkSync(oldEslintIgnore);

    fs.mkdirSync(path.join(projectPath, 'src/app/modules'), { recursive: true });

    scaffoldCoreFiles(projectPath, useAuth, tokenDelivery);
    if (db === 'mongoose') scaffoldQueryBuilder(projectPath);
    dbGen.scaffoldServerAndConfig(projectPath);
    dbGen.scaffoldErrorFiles(projectPath);
    valGen.scaffoldValidateRequest(projectPath);
    valGen.scaffoldErrorFile(projectPath);

    const handler = buildGlobalErrorHandler(dbGen.errorBlock(), valGen.errorBlock());
    fs.writeFileSync(
      path.join(projectPath, 'src/app/middlewares/globalErrorHandler.middleware.ts'),
      handler,
    );

    const cemConfig = createInitialCemConfig({
      projectName,
      db,
      validator,
      useAuth,
      authTokenDelivery,
      useDocker,
      packageManager: pm,
      version: VERSION,
    });
    saveCemConfig(cemConfig, projectPath);

    scaffoldSpin.succeed('Base architecture scaffolded');
  } catch (e: any) {
    scaffoldSpin.fail('Failed to scaffold project files');
    ui.abort(e.message);
  }

  ui.substep('cem-cli.json   ·  src/app.ts  ·  src/server.ts  ·  .env');
  ui.substep('src/app/config/index.ts');
  ui.substep('src/app/errors/    (AppError + db-specific handlers)');
  ui.substep('src/app/utils/     (catchAsync · sendResponse · logger · welcomePage · QueryBuilder · validateRequest)');
  ui.substep('src/app/middlewares/  (globalErrorHandler.middleware · notFound.middleware)');
  ui.substep('src/app/routes/index.ts');
  ui.nl();

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
    } catch (e: any) {
      authSpin.fail('Auth scaffolding failed');
      ui.err(e.message);
    }
    ui.nl();
  }

  if (useDocker) {
    const dockerSpin = ui.spinner('Generating Docker files...');
    try {
      scaffoldDocker(projectPath, projectName, db, pm);
      dockerSpin.succeed('Docker files generated');
      ui.substep('Dockerfile  ·  .dockerignore  ·  docker-compose.yml');
      ui.nl();
    } catch (e: any) {
      dockerSpin.fail('Docker scaffold failed');
      ui.err(e.message);
    }
  }

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
  } catch (e: any) {
    readmeSpin.fail('README generation failed');
    ui.err(e.message);
  }

  const agentSpin = ui.spinner('Generating AGENTS.md & CLAUDE.md...');
  try {
    generateAgentDocs(projectPath, {
      projectName,
      db,
      validator,
      useAuth,
      useDocker,
      tokenDelivery,
      pm,
    });
    agentSpin.succeed('AGENTS.md & CLAUDE.md generated');
  } catch (e: any) {
    agentSpin.fail('Agent docs generation failed');
    ui.err(e.message);
  }
  ui.nl();

  // ── INSTALL PHASE ─────────────────────────────────────────────────────────
  ui.sectionHeader('Installing dependencies');

  try {
    execSync('git init', { cwd: projectPath, stdio: 'ignore' });
  } catch {
    /* non-fatal */
  }

  const baseSpin = ui.spinner('Installing base dependencies...');
  try {
    execSync(initialInstallCmd(pm), { cwd: projectPath, stdio: 'pipe' });
    runInstall(projectPath, ['dotenv', 'http-status-codes', 'express', 'cors', 'helmet'], false, pm);
    runInstall(
      projectPath,
      [
        '@types/express',
        '@types/cors',
        'typescript',
        'tsx',
        'eslint',
        '@eslint/js',
        'typescript-eslint',
        'eslint-config-prettier',
        'prettier',
        'create-express-modular',
      ],
      true,
      pm,
    );
    baseSpin.succeed('Base dependencies installed');
  } catch (e: any) {
    baseSpin.fail('Base install failed');
    ui.abort(e.message);
  }

  const dbDeps = dbGen.dependencies();
  if (dbDeps.prod.length || dbDeps.dev.length) {
    const dbSpin = ui.spinner(`Installing ${db} driver...`);
    try {
      if (dbDeps.prod.length) runInstall(projectPath, dbDeps.prod, false, pm);
      if (dbDeps.dev.length) runInstall(projectPath, dbDeps.dev, true, pm);
      dbSpin.succeed(`${db} driver installed`);
    } catch (e: any) {
      dbSpin.fail(`${db} install failed`);
      ui.err(e.message);
    }
  }

  const valDeps = valGen.dependencies();
  if (valDeps.prod.length) {
    const valSpin = ui.spinner(`Installing ${validator}...`);
    try {
      runInstall(projectPath, valDeps.prod, false, pm);
      if (valDeps.dev.length) runInstall(projectPath, valDeps.dev, true, pm);
      valSpin.succeed(`${validator} installed`);
    } catch (e: any) {
      valSpin.fail(`${validator} install failed`);
      ui.err(e.message);
    }
  }

  if (useAuth) {
    const authDepSpin = ui.spinner('Installing auth dependencies...');
    try {
      runInstall(projectPath, ['bcrypt', 'jsonwebtoken', 'express-rate-limit'], false, pm);
      runInstall(projectPath, ['@types/bcrypt', '@types/jsonwebtoken'], true, pm);
      authDepSpin.succeed('Auth dependencies installed');
    } catch (e: any) {
      authDepSpin.fail('Auth dependency install failed');
      ui.err(e.message);
    }

    if (tokenDelivery === 'cookie') {
      const cookieSpin = ui.spinner('Installing cookie-parser...');
      try {
        runInstall(projectPath, ['cookie-parser'], false, pm);
        runInstall(projectPath, ['@types/cookie-parser'], true, pm);
        cookieSpin.succeed('cookie-parser installed');
      } catch (e: any) {
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

  const latestVersion = await updateCheckPromise;
  if (latestVersion && isUpdateAvailable(VERSION, latestVersion)) {
    ui.printUpdateNotice(VERSION, latestVersion, pm);
  }
}

runCLI().catch((e: any) => {
  ui.abort(`Unexpected error: ${e.message}`);
});
