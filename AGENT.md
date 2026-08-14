# AGENT.md — create-express-modular AI Agent Instructions

This document provides specialized, machine-readable developer context for AI coding assistants and autonomous agents working on the `create-express-modular` repository.

---

## 1. System Intent & Constraints
`create-express-modular` (CEM) is a CLI tool designed to scaffold clean, domain-driven, modular Express + TypeScript backends.

### Critical Execution Rules
- **No Side-Effects in Templates**: Scaffolded templates must be pure functions that return strings (e.g., `src/lib/module/templates.ts`). No template should perform disk/network I/O directly.
- **Strict File Names for Middlewares**: Scaffolded middlewares must match `<name>.middleware.ts`. This is validated by the CLI's `builder.ts` convention guard; any deviation will fail the build process.
- **Route Auto-wiring Markers**: CEM relies on two exact marker comments in `src/app/routes/index.ts` to auto-inject modules:
  - `// --- INJECT IMPORTS HERE ---`
  - `// --- INJECT ROUTES HERE ---`
  Never edit or remove these comments during CLI executions.
- **Centralized Environment Configuration**: All environment variables inside scaffolded projects must flow through `src/app/config/index.ts`. No scaffolded file should use `process.env` directly.

---

## 2. Directory Mapping & Architecture
When executing code modification tasks, use this reference to locate components:

| **Config Manager** | `src/lib/configLoader.ts` | Reads/writes `cem-cli.json` manifest for project preferences |
| **CLI Routing Entry** | `src/bin/cli.ts` | Entry point, prompts orchestrator, routes sub-commands |
| **Feature Module Generator** | `src/lib/module/` | Prompts & writes controllers, services, models, routes, validations |
| **Auth Scaffold Generator** | `src/lib/auth/` | Creates JWT login/register, auth middlewares, token cookie config |
| **Database Adapters** | `src/lib/db/` | Concrete strategies for Mongoose, Prisma, and Drizzle |
| **Validator Adapters** | `src/lib/validator/` | Concrete strategies for Zod and Joi schema builders |
| **Core Bootstrapper** | `src/lib/core/` | Scaffolds app.ts, routes/index, error class, loggers, interfaces |
| **Env Var Mutator** | `src/lib/envGenerator.ts` | Manipulates env vars in `.env`, `.env.example`, and `config/index.ts` |
| **Remover Sub-command** | `src/lib/remover.ts` | Uninstalls modules/middlewares/envs safely, unwires routes |
| **Convention Guards** | `src/lib/builder.ts` | Lints and typechecks scaffolds during local project builds |
| **Output / Terminal UI** | `src/lib/ui.ts` | Formats all logs with zero external dependencies |

---

## 3. Step-by-Step Scaffolding Pipeline
When `cem` is run to initialize a project:
1. **Prompts**: Asks for project name, Database/ORM, Validator, Auth activation, Token delivery method, and Docker.
2. **Template Copying**: Copies base directory config files from `template/` to target folder.
3. **Core Scaffolding**: Triggers `scaffoldCoreFiles()` to write directory structures, utils (`logger`, `catchAsync`), global error handler shells, and `app.ts`.
4. **Config Scaffolding**: Writes `cem-cli.json` to store project stack selections and feature flags.
5. **Database Scaffolding**: Applies the selected adapter (Mongoose/Prisma/Drizzle) to write database-specific models, clients, schemas, and custom error parsers.
6. **Validator Setup**: Copies validation schemas and validator middleware.
7. **Optional Auth Setup**: If enabled, scaffolds the `Auth` module and rate-limiter middleware.
8. **Document Generation**: Generates contextual docs (`README.md`, `CLAUDE.md`, and `AGENTS.md`) tailored to the project setup.
9. **Dependency Installation**: Detects the package manager and installs dev/dependencies.

---

## 4. How to Extend create-express-modular

### Adding a new Database/ORM Option
1. Add the choice to the `DbChoice` type in `src/lib/types.ts`.
2. Implement a new class or factory method in `src/lib/db/` returning the required scaffold scripts.
3. Update `src/bin/cli.ts` to include the option in the interactive inquirer prompt.
4. Document the setup patterns in `src/lib/docs/agents.ts` and `src/lib/docs/claude.ts`.

### Adding a new Command
1. Add command parsing logic in `src/bin/cli.ts`.
2. Add help text to `printHelp()` in `src/bin/cli.ts`.
3. Implement the command's execution in a new file under `src/lib/`.
4. Update `src/lib/docs/agents.ts` and `src/lib/docs/claude.ts` CLI commands lists.
