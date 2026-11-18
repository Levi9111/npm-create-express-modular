import test, { before, after } from 'node:test';
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
    env: { ...process.env, npm_config_user_agent: 'npm/10.0.0', CEM_TELEMETRY: 'off' },
    ...options,
  });
}

before(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

after(() => {
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

test('Supports --spec, --json, --testing, and live cem-cli.json state', () => {
  const projectName = 'test-spec-api';
  const projectPath = path.join(TEST_DIR, projectName);
  const specPath = path.join(TEST_DIR, 'spec.json');

  fs.writeFileSync(
    specPath,
    JSON.stringify({
      name: projectName,
      db: 'mongoose',
      validator: 'zod',
      auth: false,
      docker: false,
      swagger: false,
      testing: true,
      modules: ['Order'],
      middlewares: ['auditLog'],
      env: ['STRIPE_KEY'],
    }),
  );

  const out = runCli(`--spec ${specPath} --no-install --json`, { cwd: TEST_DIR });
  const parsed = JSON.parse(out.trim());
  assert.equal(parsed.ok, true);
  assert.equal(parsed.project, projectName);
  assert.equal(parsed.testing, true);
  assert.deepEqual(parsed.modules, ['Order']);
  assert.deepEqual(parsed.middlewares, ['auditLog']);
  assert.deepEqual(parsed.env, ['STRIPE_KEY']);

  assert.ok(fs.existsSync(path.join(projectPath, 'vitest.config.ts')), 'vitest.config.ts exists');
  assert.ok(fs.existsSync(path.join(projectPath, 'src/__tests__/health.test.ts')), 'health.test.ts exists');

  const cemConfig = JSON.parse(fs.readFileSync(path.join(projectPath, 'cem-cli.json'), 'utf8'));
  assert.equal(cemConfig.features.testing, 'vitest');
  assert.deepEqual(cemConfig.state.modules, ['Order']);
  assert.deepEqual(cemConfig.state.middlewares, ['auditLog']);
  assert.deepEqual(cemConfig.state.env, ['STRIPE_KEY']);

  const listOut = runCli('list --json', { cwd: projectPath });
  const listParsed = JSON.parse(listOut.trim());
  assert.equal(listParsed.ok, true);
  assert.ok(listParsed.modules.some((m) => m.name === 'Order'));
});

test('CLI rejects path traversal and invalid identifiers across project, module, middleware, and env', () => {
  assert.throws(() => runCli('../escaped-proj -y --no-install', { cwd: TEST_DIR }));

  const safeProj = path.join(TEST_DIR, 'spec-app');
  assert.throws(() => runCli('add module ../../evil', { cwd: safeProj }));
  assert.throws(() => runCli('add middleware ../evil', { cwd: safeProj }));
  assert.throws(() => runCli('add env BAD=VALUE', { cwd: safeProj }));
  assert.throws(() => runCli('remove module ../evil', { cwd: safeProj }));
});

test('Auth scaffold generates random JWT secrets and validates them at startup', () => {
  const projectName = 'auth-sec-app';
  const projectPath = path.join(TEST_DIR, projectName);

  runCli(`${projectName} -y --auth --no-install`, { cwd: TEST_DIR });

  const envContent = fs.readFileSync(path.join(projectPath, '.env'), 'utf8');
  assert.ok(!envContent.includes('your_super_secret_access_key'), 'should not contain hardcoded access secret');
  assert.ok(!envContent.includes('your_jwt_refresh_secret'), 'should not contain hardcoded refresh secret');
  assert.match(envContent, /JWT_ACCESS_SECRET=[0-9a-f]{96}/);
  assert.match(envContent, /JWT_REFRESH_SECRET=[0-9a-f]{96}/);

  const configTs = fs.readFileSync(path.join(projectPath, 'src/app/config/index.ts'), 'utf8');
  assert.ok(configTs.includes('JWT_ACCESS_SECRET'), 'config/index.ts should require JWT_ACCESS_SECRET');
  assert.ok(configTs.includes('JWT_REFRESH_SECRET'), 'config/index.ts should require JWT_REFRESH_SECRET');
});

test('cem add module --fields generates typed interface, model, Zod validation, wired routes, and working CRUD service', () => {
  const projectName = 'fields-crud-app';
  const projectPath = path.join(TEST_DIR, projectName);
  runCli(`${projectName} -y --no-install --json`, { cwd: TEST_DIR });
  const out = runCli(
    'add module Catalog --fields "title:string,price:number,inStock:boolean?,category:enum(book|tech),owner:ref(User),tags:string[]?" -y --json',
    { cwd: projectPath },
  );
  const parsed = JSON.parse(out.trim());
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.items, ['Catalog']);

  const modDir = path.join(projectPath, 'src/app/modules/Catalog');
  const iface = fs.readFileSync(path.join(modDir, 'catalog.interface.ts'), 'utf8');
  assert.ok(iface.includes("import { Types } from 'mongoose'"));
  assert.ok(iface.includes('title: string;'));
  assert.ok(iface.includes('price: number;'));
  assert.ok(iface.includes('inStock?: boolean;'));
  assert.ok(iface.includes("category: 'book' | 'tech';"));
  assert.ok(iface.includes('owner: Types.ObjectId;'));
  assert.ok(iface.includes('tags?: string[];'));

  const model = fs.readFileSync(path.join(modDir, 'catalog.model.ts'), 'utf8');
  assert.ok(model.includes("enum: ['book', 'tech']"));
  assert.ok(model.includes("ref: 'User'"));

  const validation = fs.readFileSync(path.join(modDir, 'catalog.validation.ts'), 'utf8');
  assert.ok(validation.includes("z.enum(['book', 'tech'])"));
  assert.ok(validation.includes('createCatalogSchema.shape.body.partial()'));

  const route = fs.readFileSync(path.join(modDir, 'catalog.route.ts'), 'utf8');
  assert.ok(route.includes('validateRequest(CatalogValidation.createCatalogSchema)'));
  assert.ok(route.includes('validateRequest(CatalogValidation.updateCatalogSchema)'));

  const service = fs.readFileSync(path.join(modDir, 'catalog.service.ts'), 'utf8');
  assert.ok(service.includes('new QueryBuilder(CatalogModel.find(), query)'));
  assert.ok(service.includes('CatalogModel.findByIdAndUpdate'));

  const constant = fs.readFileSync(path.join(modDir, 'catalog.constant.ts'), 'utf8');
  assert.ok(constant.includes("'title'") && constant.includes("'category'"));
});

test('cem --spec supports module objects with fields', () => {
  const projectName = 'spec-fields-app';
  const projectPath = path.join(TEST_DIR, projectName);
  const specPath = path.join(TEST_DIR, 'spec-fields.json');

  fs.writeFileSync(
    specPath,
    JSON.stringify({
      name: projectName,
      db: 'prisma',
      validator: 'joi',
      auth: false,
      docker: false,
      swagger: false,
      modules: [{ name: 'Invoice', fields: 'amount:number,paid:boolean?' }],
    }),
  );

  const out = runCli(`--spec ${specPath} --no-install --json`, { cwd: TEST_DIR });
  const parsed = JSON.parse(out.trim());
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.modules, ['Invoice']);

  const prismaSchema = fs.readFileSync(path.join(projectPath, 'prisma/schema.prisma'), 'utf8');
  assert.ok(prismaSchema.includes('model Invoice {'));
  assert.ok(prismaSchema.includes('amount'));
  assert.ok(prismaSchema.includes('Boolean?'));

  const joiVal = fs.readFileSync(
    path.join(projectPath, 'src/app/modules/Invoice/invoice.validation.ts'),
    'utf8',
  );
  assert.ok(joiVal.includes('amount: Joi.number().required()'));
  assert.ok(joiVal.includes('paid: Joi.boolean().optional()'));

  const errHandler = fs.readFileSync(
    path.join(projectPath, 'src/app/middlewares/globalErrorHandler.middleware.ts'),
    'utf8',
  );
  assert.ok(!errHandler.includes('elseif'), 'globalErrorHandler must not contain elseif syntax error');
  assert.ok(errHandler.includes('} else if'), 'globalErrorHandler must chain else if properly');

  assert.throws(() =>
    runCli('add module BadEnum --fields "role:enum(a\'|evil)" -y', { cwd: projectPath }),
  );
});
