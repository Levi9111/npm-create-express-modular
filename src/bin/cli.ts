#!/usr/bin/env node

'use strict';

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import * as ui from '../lib/ui';
import { detectPM, initialInstallCmd } from '../lib/pm';
import { checkForUpdates, isUpdateAvailable } from '../lib/updateNotifier';
import type { DbChoice, ValidatorChoice, TokenDelivery, PackageManager } from '../lib/types';

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
  if (typeof fs.cpSync === 'function') {
    fs.cpSync(from, to, { recursive: true });
  } else {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach((el) => {
      const src = path.join(from, el);
      const dest = path.join(to, el);
      fs.lstatSync(src).isFile()
        ? fs.copyFileSync(src, dest)
        : copyFolderSync(src, dest);
    });
  }
}

// ─── UNKNOWN COMMAND HELP ─────────────────────────────────────────────────────
function printHelp(): void {
  ui.nl();
  ui.warn('Available commands:');
  ui.nl();
  console.log('   cem [project-name]           — scaffold a new project (interactive)');
  console.log('   cem [project-name] -y        — scaffold using recommended defaults (-y / --yes)');
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
  useSwagger: boolean;
}

// ─── CLI ENTRYPOINT ───────────────────────────────────────────────────────────
async function runCLI(): Promise<void> {
  const args = process.argv.slice(2);

  // ── version (instant exit without background network or PM checks)
  if (args[0] === '--version' || args[0] === '-v') {
    console.log(VERSION);
    process.exit(0);
  }

  // ── help (instant exit without background network or PM checks)
  if (args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    ui.printBanner(VERSION);
    printHelp();
    process.exit(0);
  }

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

  // cem dev
  if (args[0] === 'dev') {
    const { runDev } = await import('../lib/dev');
    runDev();
    return;
  }

  // cem build
  if (args[0] === 'build') {
    const { runBuild } = await import('../lib/builder');
    runBuild();
    await notifyIfUpdateAvailable();
    process.exit(0);
  }

  // cem start
  if (args[0] === 'start') {
    const { runStart } = await import('../lib/start');
    runStart();
    return;
  }

  // cem check
  if (args[0] === 'check') {
    const { runCheck } = await import('../lib/checker');
    await runCheck();
    return;
  }

  // cem list / cem ls
  if (args[0] === 'list' || args[0] === 'ls') {
    const { listProject } = await import('../lib/lister');
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
      const { generateModule } = await import('../lib/moduleGenerator');
      await generateModule(moduleNames);
      await notifyIfUpdateAvailable();
      process.exit(0);
    }
    if (subcommand === 'env') {
      const keys = args.slice(2);
      if (keys.length === 0) {
        ui.abort('Please provide a key name. Example: cem add env ACCESS_SECRET');
      }
      const { addEnvVar } = await import('../lib/envGenerator');
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
      const { generateMiddleware } = await import('../lib/middlewareGenerator');
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
    const { removeModule, removeMiddleware, removeEnvVar } = await import('../lib/remover');

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
    const { generateModule } = await import('../lib/moduleGenerator');
    await generateModule(args[1]);
    process.exit(0);
  }

  // ── FLAG PARSING FOR SCAFFOLDING ──────────────────────────────────────────
  let initialProjectName = 'my-api';
  let useDefaults = false;
  let flagDb: DbChoice | undefined = undefined;
  let flagValidator: ValidatorChoice | undefined = undefined;
  let flagUseAuth: boolean | undefined = undefined;
  let flagTokenDelivery: TokenDelivery | undefined = undefined;
  let flagUseDocker: boolean | undefined = undefined;
  let flagUseSwagger: boolean | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-y' || arg === '--yes' || arg === '--defaults') {
      useDefaults = true;
    } else if (arg === '--db') {
      const val = args[i + 1];
      if (['mongoose', 'prisma', 'drizzle'].includes(val)) {
        flagDb = val as DbChoice;
        i++;
      } else {
        ui.abort(`Invalid --db choice "${val}". Allowed: mongoose, prisma, drizzle`);
      }
    } else if (arg === '--validator') {
      const val = args[i + 1];
      if (['zod', 'joi'].includes(val)) {
        flagValidator = val as ValidatorChoice;
        i++;
      } else {
        ui.abort(`Invalid --validator choice "${val}". Allowed: zod, joi`);
      }
    } else if (arg === '--auth') {
      flagUseAuth = true;
    } else if (arg === '--no-auth') {
      flagUseAuth = false;
    } else if (arg === '--cookie') {
      flagTokenDelivery = 'cookie';
    } else if (arg === '--header') {
      flagTokenDelivery = 'header';
    } else if (arg === '--docker') {
      flagUseDocker = true;
    } else if (arg === '--no-docker') {
      flagUseDocker = false;
    } else if (arg === '--swagger') {
      flagUseSwagger = true;
    } else if (arg === '--no-swagger') {
      flagUseSwagger = false;
    } else if (!arg.startsWith('-')) {
      initialProjectName = arg;
    } else {
      ui.err(`Unknown flag: "${arg}"`);
      printHelp();
      process.exit(1);
    }
  }

  // ── PROJECT SCAFFOLDING ───────────────────────────────────────────────────
  ui.printBanner(VERSION);

  let answers: PromptAnswers;

  if (useDefaults) {
    const targetPath = path.join(process.cwd(), initialProjectName);
    if (fs.existsSync(targetPath)) {
      ui.abort(`Directory '${initialProjectName}' already exists in current folder.`);
    }

    answers = {
      projectName: initialProjectName,
      db: flagDb || 'mongoose',
      validator: flagValidator || 'zod',
      useAuth: flagUseAuth ?? true,
      authTokenDelivery: flagTokenDelivery || 'cookie',
      useDocker: flagUseDocker ?? true,
      useSwagger: flagUseSwagger ?? true,
    };
  } else {
    try {
      const inquirer = (await import('inquirer')).default;
      answers = await inquirer.prompt<PromptAnswers>([
        {
          type: 'input',
          name: 'projectName',
          message: 'Project name:',
          default: initialProjectName,
          validate: (v: string) => {
            const name = v.trim();
            if (!name) return 'Project name cannot be empty.';
            const targetPath = path.join(process.cwd(), name);
            if (fs.existsSync(targetPath)) {
              return `Directory '${name}' already exists in current folder. Please choose another name.`;
            }
            return true;
          },
        },
        {
          type: 'list',
          name: 'db',
          message: 'Database / ORM:',
          default: flagDb || 'mongoose',
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
          default: flagValidator || 'zod',
          choices: [
            { name: 'Zod  (recommended)', value: 'zod' },
            { name: 'Joi  (alternative)', value: 'joi' },
          ],
        },
        {
          type: 'confirm',
          name: 'useAuth',
          message: 'Include JWT Auth module?',
          default: flagUseAuth ?? true,
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
          default: flagTokenDelivery || 'cookie',
        },
        {
          type: 'confirm',
          name: 'useDocker',
          message: 'Include Docker setup (Dockerfile + docker-compose)?',
          default: flagUseDocker ?? true,
        },
        {
          type: 'confirm',
          name: 'useSwagger',
          message: 'Include Swagger API documentation (OpenAPI 3.0)?',
          default: flagUseSwagger ?? true,
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
  }

  const { projectName, db, validator, useAuth, useDocker, useSwagger, authTokenDelivery } = answers;
  const tokenDelivery: TokenDelivery = useAuth ? authTokenDelivery || 'cookie' : 'header';
  const projectPath = path.join(process.cwd(), projectName);
  const templatePath = path.join(__dirname, '../../template');

  // Lazy load generator logic
  const [
    { getDbGenerator },
    { getValidatorGenerator },
    { buildGlobalErrorHandler },
    { scaffoldCoreFiles, scaffoldQueryBuilder },
    { createInitialCemConfig, saveCemConfig },
  ] = await Promise.all([
    import('../lib/db'),
    import('../lib/validator'),
    import('../lib/core/globalErrorHandler/shell'),
    import('../lib/core/scaffoldCore'),
    import('../lib/configLoader'),
  ]);

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
  ui.step('Swagger', useSwagger ? 'yes' : 'no');
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
        bun: { node: '>=18', bun: '>=1.0' },
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

    scaffoldCoreFiles(projectPath, useAuth, tokenDelivery, useSwagger);
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
      useSwagger,
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
      const { scaffoldAuth } = await import('../lib/authGenerator');
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
      const { scaffoldDocker } = await import('../lib/dockerScaffold');
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
    const { generateReadme } = await import('../lib/readmeGenerator');
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
    const { generateAgentDocs } = await import('../lib/agentDocsGenerator');
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

  // Collect all production and development dependencies
  const prodDeps: string[] = ['dotenv', 'http-status-codes', 'express', 'cors', 'helmet', 'compression'];
  const devDeps: string[] = [
    '@types/express',
    '@types/cors',
    '@types/compression',
    '@types/node',
    'typescript',
    'tsx',
    'eslint',
    '@eslint/js',
    'typescript-eslint',
    'eslint-config-prettier',
    'prettier',
  ];

  const dbDeps = dbGen.dependencies();
  prodDeps.push(...dbDeps.prod);
  devDeps.push(...dbDeps.dev);

  const valDeps = valGen.dependencies();
  prodDeps.push(...valDeps.prod);
  devDeps.push(...valDeps.dev);

  if (useAuth) {
    prodDeps.push('bcrypt', 'jsonwebtoken', 'express-rate-limit');
    devDeps.push('@types/bcrypt', '@types/jsonwebtoken');

    if (tokenDelivery === 'cookie') {
      prodDeps.push('cookie-parser');
      devDeps.push('@types/cookie-parser');
    }
  }

  if (useSwagger) {
    prodDeps.push('swagger-ui-express', 'swagger-jsdoc');
    devDeps.push('@types/swagger-ui-express', '@types/swagger-jsdoc');
  }

  const uniqueProd = Array.from(new Set(prodDeps));
  const uniqueDev = Array.from(new Set(devDeps));

  // Pre-populate package.json with dependencies & devDependencies
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.dependencies = pkg.dependencies || {};
    pkg.devDependencies = pkg.devDependencies || {};

    const versionMap: Record<string, string> = {
      // Core
      express: '^4.21.2',
      cors: '^2.8.5',
      dotenv: '^16.4.7',
      'http-status-codes': '^2.3.0',
      helmet: '^8.0.0',
      compression: '^1.8.0',
      // DB
      mongoose: '^8.9.5',
      prisma: '^6.2.1',
      '@prisma/client': '^6.2.1',
      'drizzle-orm': '^0.38.4',
      'drizzle-kit': '^0.30.2',
      pg: '^8.13.1',
      // Validator
      zod: '^3.24.1',
      joi: '^17.13.3',
      // Auth
      bcrypt: '^5.1.1',
      jsonwebtoken: '^9.0.2',
      'express-rate-limit': '^7.5.0',
      'cookie-parser': '^1.4.7',
      // Swagger
      'swagger-ui-express': '^5.0.1',
      'swagger-jsdoc': '^6.2.8',
      // Dev types & tools
      '@types/express': '^5.0.0',
      '@types/cors': '^2.8.17',
      '@types/compression': '^1.7.5',
      '@types/node': '^22.10.7',
      '@types/pg': '^8.11.10',
      '@types/joi': '^17.2.3',
      '@types/bcrypt': '^5.0.2',
      '@types/jsonwebtoken': '^9.0.8',
      '@types/cookie-parser': '^1.4.8',
      '@types/swagger-ui-express': '^4.1.7',
      '@types/swagger-jsdoc': '^6.0.4',
      typescript: '^5.7.3',
      tsx: '^4.19.2',
      eslint: '^9.18.0',
      '@eslint/js': '^9.18.0',
      'typescript-eslint': '^8.20.0',
      'eslint-config-prettier': '^10.0.1',
      prettier: '^3.4.2',
    };

    uniqueProd.forEach((p) => {
      if (!pkg.dependencies[p]) {
        pkg.dependencies[p] = versionMap[p] || 'latest';
      }
    });

    uniqueDev.forEach((p) => {
      if (!pkg.devDependencies[p]) {
        pkg.devDependencies[p] = versionMap[p] || 'latest';
      }
    });

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  }

  const installSpin = ui.spinner(`Installing dependencies via ${pm}...`);
  try {
    execSync(initialInstallCmd(pm), { cwd: projectPath, stdio: 'pipe' });
    installSpin.succeed(`Dependencies installed (${uniqueProd.length} runtime, ${uniqueDev.length} dev)`);
  } catch (e: any) {
    installSpin.fail('Dependencies install failed');
    ui.abort(e.message);
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
