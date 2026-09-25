import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const CLI_PATH = path.resolve('dist/bin/cli.js');
const PKG_JSON = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const TEST_DIR = path.resolve('.test-tmp');

function runCli(args, options = {}) {
  const nodeBin = process.execPath;
  const cmd = `"${nodeBin}" "${CLI_PATH}" ${args}`;
  return execSync(cmd, {
    encoding: 'utf8',
    env: { ...process.env, npm_config_user_agent: 'npm/10.0.0' },
    ...options,
  });
}

test.before(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

test.after(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

test('CLI --version matches package.json', () => {
  const output = runCli('--version').trim();
  assert.equal(output, PKG_JSON.version);
});

test('CLI --help displays usage and available commands', () => {
  const output = runCli('--help');
  assert.ok(output.includes('Available commands:'));
  assert.ok(output.includes('cem dev'));
  assert.ok(output.includes('cem build'));
  assert.ok(output.includes('cem check'));
  assert.ok(output.includes('cem add module'));
});

test('Scaffolds Mongoose + Zod + Auth + Docker + Swagger project', () => {
  const projectName = 'test-mongoose-api';
  const projectPath = path.join(TEST_DIR, projectName);

  // Run scaffolding with non-interactive flags and --no-install
  runCli(`${projectName} -y --no-install --db mongoose --validator zod --auth --docker --swagger`, {
    cwd: TEST_DIR,
  });

  assert.ok(fs.existsSync(path.join(projectPath, 'package.json')), 'package.json exists');
  assert.ok(fs.existsSync(path.join(projectPath, 'cem-cli.json')), 'cem-cli.json exists');
  assert.ok(fs.existsSync(path.join(projectPath, 'src/server.ts')), 'src/server.ts exists');
  assert.ok(fs.existsSync(path.join(projectPath, 'src/app.ts')), 'src/app.ts exists');
  assert.ok(fs.existsSync(path.join(projectPath, 'src/app/config/swagger.ts')), 'swagger.ts exists');
  assert.ok(fs.existsSync(path.join(projectPath, 'src/app/utils/QueryBuilder.ts')), 'QueryBuilder.ts exists');
  assert.ok(fs.existsSync(path.join(projectPath, 'Dockerfile')), 'Dockerfile exists');

  // Verify package.json contents
  const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));

  // 1. @types/mongoose must NOT be present
  assert.equal(pkg.devDependencies?.['@types/mongoose'], undefined, '@types/mongoose should not be in devDependencies');
  assert.equal(pkg.dependencies?.['@types/mongoose'], undefined, '@types/mongoose should not be in dependencies');

  // 2. ESLint must be v10
  assert.match(pkg.devDependencies?.['eslint'], /^\^10\./, 'eslint should be v10');
  assert.match(pkg.devDependencies?.['@eslint/js'], /^\^10\./, '@eslint/js should be v10');

  // 3. Glob overrides must be present
  assert.equal(pkg.overrides?.glob, '^13.0.6', 'overrides.glob should be ^13.0.6');
  assert.equal(pkg.resolutions?.glob, '^13.0.6', 'resolutions.glob should be ^13.0.6');

  // 4. Routes file must have typed moduleRoutes
  const routesContent = fs.readFileSync(path.join(projectPath, 'src/app/routes/index.ts'), 'utf8');
  assert.ok(
    routesContent.includes('const moduleRoutes: { path: string; route: Router }[] = ['),
    'moduleRoutes must be explicitly typed',
  );

  // 5. Test cem add module inside scaffolded project
  runCli('add module Product -y', { cwd: projectPath });
  assert.ok(fs.existsSync(path.join(projectPath, 'src/app/modules/Product/product.controller.ts')), 'product controller created');
  assert.ok(fs.existsSync(path.join(projectPath, 'src/app/modules/Product/product.route.ts')), 'product route created');
  assert.ok(fs.existsSync(path.join(projectPath, 'src/app/modules/Product/product.service.ts')), 'product service created');

  const updatedRoutes = fs.readFileSync(path.join(projectPath, 'src/app/routes/index.ts'), 'utf8');
  assert.ok(updatedRoutes.includes('ProductRoutes'), 'ProductRoutes should be injected');

  // 6. Test cem add middleware
  runCli('add middleware requestLogger', { cwd: projectPath });
  assert.ok(fs.existsSync(path.join(projectPath, 'src/app/middlewares/requestLogger.middleware.ts')), 'middleware created');

  // 7. Test cem remove module
  runCli('remove module Product -y', { cwd: projectPath });
  assert.ok(!fs.existsSync(path.join(projectPath, 'src/app/modules/Product')), 'Product module directory removed');
});

test('Scaffolds Prisma + Zod project structure', () => {
  const projectName = 'test-prisma-api';
  const projectPath = path.join(TEST_DIR, projectName);

  runCli(`${projectName} -y --no-install --db prisma --validator zod --no-auth --no-docker --no-swagger`, {
    cwd: TEST_DIR,
  });

  assert.ok(fs.existsSync(path.join(projectPath, 'prisma/schema.prisma')), 'schema.prisma exists');
  assert.ok(fs.existsSync(path.join(projectPath, 'src/app/utils/prisma.ts')), 'prisma.ts exists');

  const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
  assert.ok(pkg.dependencies?.['@prisma/client'], '@prisma/client should be a dependency');
  assert.ok(pkg.devDependencies?.['prisma'], 'prisma should be a devDependency');
});

test('Scaffolds Drizzle + Joi project structure', () => {
  const projectName = 'test-drizzle-api';
  const projectPath = path.join(TEST_DIR, projectName);

  runCli(`${projectName} -y --no-install --db drizzle --validator joi --no-auth --no-docker --no-swagger`, {
    cwd: TEST_DIR,
  });

  assert.ok(fs.existsSync(path.join(projectPath, 'drizzle.config.ts')), 'drizzle.config.ts exists');
  assert.ok(fs.existsSync(path.join(projectPath, 'src/app/db/index.ts')), 'drizzle db file exists');

  const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
  assert.ok(pkg.dependencies?.['drizzle-orm'], 'drizzle-orm should be a dependency');
  assert.ok(pkg.dependencies?.['joi'], 'joi should be a dependency');
});
