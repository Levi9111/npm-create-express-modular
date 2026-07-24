// ─── Shared Types ─────────────────────────────────────────────────────────────

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export type DbChoice = 'mongoose' | 'prisma' | 'drizzle';
export type ValidatorChoice = 'zod' | 'joi';
export type TokenDelivery = 'cookie' | 'header';

// ─── CLI Prompt Answers ────────────────────────────────────────────────────────
export interface CLIAnswers {
  projectName: string;
  db: DbChoice;
  validator: ValidatorChoice;
  useAuth: boolean;
  authTokenDelivery?: TokenDelivery;
  useDocker: boolean;
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
