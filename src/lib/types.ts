// ─── Shared Types ─────────────────────────────────────────────────────────────

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export type DbChoice = 'mongoose' | 'prisma' | 'drizzle';
export type ValidatorChoice = 'zod' | 'joi';
export type TokenDelivery = 'cookie' | 'header';

// ─── CEM Project Configuration (cem-cli.json) ──────────────────────────────────
export interface CemConfig {
  $schema?: string;
  version: string;
  project: {
    name: string;
    db: DbChoice;
    validator: ValidatorChoice;
    auth: boolean;
    authTokenDelivery?: TokenDelivery;
    docker: boolean;
    packageManager: PackageManager;
  };
  structure: {
    srcDir: string;
    appDir: string;
    modulesDir: string;
    middlewaresDir: string;
    utilsDir: string;
    configDir: string;
  };
  features: {
    testing?: 'vitest' | 'jest' | false;
    websocket?: boolean;
    swagger?: boolean;
  };
}

// ─── CLI Prompt Answers ────────────────────────────────────────────────────────
export interface CLIAnswers {
  projectName: string;
  db: DbChoice;
  validator: ValidatorChoice;
  useAuth: boolean;
  authTokenDelivery?: TokenDelivery;
  useDocker: boolean;
  useSwagger: boolean;
}

// ─── Generator Interface ──────────────────────────────────────────────────────
export interface ErrorBlock {
  imports: string;
  handler: string;
}

export interface GeneratorDependencies {
  prod: string[];
  dev: string[];
}

export interface DbGenerator {
  scaffoldServerAndConfig(projectPath: string): void;
  scaffoldErrorFiles(projectPath: string): void;
  errorBlock(): ErrorBlock;
  dependencies(): GeneratorDependencies;
  modelStub(moduleName: string): string;
}

export interface ValidatorGenerator {
  scaffoldValidateRequest(projectPath: string): void;
  scaffoldErrorFile(projectPath: string): void;
  errorBlock(): ErrorBlock;
  validationStub(moduleName: string): string;
  dependencies(): GeneratorDependencies;
}

// ─── Summary Options ─────────────────────────────────────────────────────────
export interface SummaryOptions {
  name: string;
  db: string;
  validator: string;
  auth: boolean;
  docker: boolean;
}

// ─── Spinner Interface ────────────────────────────────────────────────────────
export interface Spinner {
  succeed(msg: string): void;
  fail(msg: string): void;
}
