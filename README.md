<div align="center">

# create-express-modular

[![npm version](https://img.shields.io/npm/v/create-express-modular.svg?style=flat-square)](https://www.npmjs.com/package/create-express-modular)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue.svg?style=flat-square)](https://www.typescriptlang.org)

**Scaffold a production-ready Express + TypeScript backend in seconds.**  
Choose your database, your validator, and optionally add JWT auth — all from one interactive CLI.

</div>

---

## Installation

```bash
# npm
npm install -g create-express-modular

# yarn
yarn global add create-express-modular

# pnpm
pnpm add -g create-express-modular
```

Or run without installing globally:

```bash
# npm
npx create-express-modular my-api

# yarn
yarn dlx create-express-modular my-api

# pnpm
pnpm dlx create-express-modular my-api
```

The CLI **auto-detects** which package manager you used and adapts all install commands, generated files, and terminal output accordingly.

> **Yarn v1 users:** If `cem` is not found after `yarn global add`, your global bin directory likely isn't on your `PATH`. Fix it by running:
> ```bash
> export PATH="$(yarn global bin):$PATH"
> ```
> Add this line to your `~/.bashrc` or `~/.zshrc` to make it permanent.

---

## Creating a New Project

```bash
cem my-api
```

The CLI will ask you five questions:

1. **Database / ORM** — Mongoose, Prisma, or Drizzle
2. **Validator** — Zod (recommended) or Joi
3. **Auth** — Do you want a ready-to-use JWT Auth module?
4. **Auth token delivery** _(only if Auth is yes)_ — HTTP-only cookies (recommended, XSS safe) or Authorization header (mobile / API clients)
5. **Docker** — Do you want a Dockerfile, `.dockerignore`, and `docker-compose.yml`?

After answering, it will:
- Scaffold a clean, domain-driven folder structure
- Generate database config, error handling, `.env`, `.env.example`, and all boilerplate
- Install all required dependencies automatically
- Initialise a git repository

Then just:

```bash
cd my-api
cem dev
```

Your server is live at `http://localhost:5000`. ✅

Visit `http://localhost:5000` in a browser to see the **CEM Welcome Page** — a styled landing page that shows project name, version, server status, and available routes.

---

## CLI Commands

### Project Management

| Command | Description |
|---|---|
| `cem dev` | Start the dev server with live reload and a pretty terminal UI |
| `cem build` | Run middleware convention guard + architecture guard + compile TypeScript to `dist/` |
| `cem start` | Start the production server with preflight checks and safety guards |
| `cem check` | Run type check, lint, and format check in one go |
| `cem list` | List all modules, middlewares, and env vars in the current project |

### Add Commands

| Command | Description |
|---|---|
| `cem add module <Name>` | Scaffold a complete feature module |
| `cem add env <KEY>` | Add an env var to `.env` & `.env.example`, and inject into `config/index.ts` |
| `cem add middleware <name>` | Create a new middleware as `<name>.middleware.ts` in `src/app/middlewares/` |

### Remove Commands

| Command | Description |
|---|---|
| `cem remove module <Name>` | Delete the module folder **and** unwire it from `routes/index.ts` |
| `cem remove middleware <name>` | Delete a custom middleware file (`<name>.middleware.ts`) |
| `cem remove env <KEY>` | Remove an env var from `.env`, `.env.example`, and `config/index.ts` |

---

## `cem dev` — Dev Server

Powered by [`tsx`](https://github.com/privatenumber/tsx) (esbuild-based, no type-checking overhead — restarts are near-instant):

- Startup banner with your project name and timestamp
- Color-coded log output (server start 🟢, DB connection 🟣, errors 🔴, restarts 🟡)
- Clean `Ctrl+C` shutdown

```
  ──────────────────────────────────────────────────────
  [CEM]  create-express-modular  dev server

  ◆  Project   my-api
  ◆  Entry     src/server.ts
  ◆  Started   10 May 2026 23:59:01
  ──────────────────────────────────────────────────────

  ▲  Server running on http://localhost:5000   23:59:02
  ◈  MongoDB connected
```

---

## `cem build` — Build

Runs three steps in sequence before compiling:

1. **Middleware convention guard** — validates that every file inside `src/app/middlewares/` follows the `<name>.middleware.ts` naming convention. Aborts with a clear error if not.
2. **Architecture guard** — validates that every file inside `src/app/modules/<Name>/` is correctly named `<name>.<type>.ts`. Aborts with a clear error if not.
3. **TypeScript compilation** — runs `tsc` and emits to `dist/`

```bash
cem build

  ◆  Running Middleware Convention Guard…
  ✔  Middleware naming convention valid.

  ◆  Running Architecture Guard…
  ✔  Architecture validation passed.

  ◆  Compiling TypeScript…
  ✔  Build successful.  312ms
```

If a middleware file doesn't follow the convention:

```
  ✖  Middleware naming violation: 'calculate.ts'
     ·  Expected: 'calculate.middleware.ts'
     ·  Rename the file and update any imports that reference it.

  ✖  Build aborted — all middleware files must follow the <name>.middleware.ts convention.
```

---

## `cem check` — Quality Check

Runs all three checks in sequence with live status and timing:

```bash
cem check

  [CEM]  cem check  type · lint · format
  ──────────────────────────────────────────────────────

  ◆  Type check (tsc)…          ✔  312ms
  ◆  Lint (eslint)…             ✔  890ms
  ◆  Format check (prettier)…   ✔  203ms

  ──────────────────────────────────────────────────────

  ◆  All checks passed.  (3/3)
```

If a check fails, the relevant error output is shown inline under the failed step.

---

## `cem list` — Project Overview

Get a live snapshot of your project from the terminal:

```
cem list

  ────────────────────────────────────────────────────

  [CEM]  my-api  project overview

  ────────────────────────────────────────────────────

  ◆  Modules  src/app/modules/

     ◈  Auth    ● wired
     ◈  Product ● wired
        ·  product.controller.ts
        ·  product.service.ts
        ·  ...

  ◆  Middlewares  src/app/middlewares/

     ◇  globalErrorHandler.middleware.ts  [core]
     ◇  notFound.middleware.ts            [core]
     ◇  auth.middleware.ts                [core]
     ◈  calculate.middleware.ts

  ◆  Environment Variables  .env

     ◈  NODE_ENV          development
     ◈  PORT              5000
     ◈  JWT_ACCESS_SECRET <hidden>
```

- **● wired** — module is registered in `routes/index.ts`
- **○ not wired** — module folder exists but has no route entry (needs manual fix)
- Secret keys (`SECRET`, `PASSWORD`, `TOKEN`, `KEY`, `API`) are automatically masked.

---

## Middleware Naming Convention

All middleware files **must** follow the `<name>.middleware.ts` naming convention. This applies to both core (generated) and custom (user-created) middleware files.

### Core generated middleware

| File | Description |
|---|---|
| `globalErrorHandler.middleware.ts` | Stack-aware error handler |
| `notFound.middleware.ts` | 404 handler for unknown routes |
| `auth.middleware.ts` | JWT guard _(Auth only)_ |
| `rateLimiter.middleware.ts` | Rate limiting _(Auth only)_ |

### Adding a custom middleware

```bash
cem add middleware calculate
```

Creates `src/app/middlewares/calculate.middleware.ts`:

```ts
import { NextFunction, Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';

const calculate = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Implement middleware logic
  next();
});

export default calculate;
```

### Build enforcement

`cem build` runs a **Middleware Convention Guard** before compilation. Any `.ts` file in `src/app/middlewares/` that doesn't end with `.middleware.ts` will cause the build to fail with a clear error telling you exactly which file to rename.

---

## `cem remove` — Remove Things Cleanly

### Remove a module

```bash
cem remove module Product
# or alias:
cem rm module Product
```

- Deletes `src/app/modules/Product/` entirely
- Removes the `import` line and route entry from `src/app/routes/index.ts` automatically

### Remove a middleware

```bash
cem remove middleware calculate
```

- Deletes `src/app/middlewares/calculate.middleware.ts`
- Core files (`globalErrorHandler`, `notFound`, `auth`, `rateLimiter`) are protected and cannot be removed this way.

### Remove an env variable

```bash
cem remove env STRIPE_SECRET_KEY
```

- Removes the line from `.env`
- Removes the corresponding line from `src/app/config/index.ts`

---

## Docker

When you select **Yes** to Docker during setup, three files are generated:

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build (build stage + minimal Alpine production image) |
| `.dockerignore` | Excludes `node_modules`, `.env`, unused lock files, and test files |
| `docker-compose.yml` | App service + the correct database sidecar for your chosen stack |

The Dockerfile is **package-manager-aware** — it uses the correct lock file, install command, and (for pnpm) enables `corepack`:

| PM | Lock file copied | Install command |
|---|---|---|
| npm | `package-lock.json` | `npm ci` |
| yarn | `yarn.lock` | `yarn install --frozen-lockfile` |
| pnpm | `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` |

**Database sidecar mapping:**

| Stack | Docker image |
|---|---|
| Mongoose | `mongo:7` |
| Prisma | `postgres:16-alpine` |
| Drizzle | `postgres:16-alpine` |

```bash
# Start everything locally
docker-compose up --build

# Production (single service, external DB)
docker build -t my-api .
docker run -p 5000:5000 --env-file .env my-api
```

---

## Adding a Feature Module

```bash
cem add module Product
```

Creates a complete `Product` module in `src/app/modules/Product/`:

| File | Purpose |
|---|---|
| `product.controller.ts` | Request/response handlers |
| `product.service.ts` | Business logic |
| `product.route.ts` | Express router |
| `product.model.ts` | DB model / schema stub |
| `product.interface.ts` | TypeScript interface |
| `product.validation.ts` | Validation schema (matches your chosen validator) |

The module is automatically registered in `src/app/routes/index.ts` — no manual import needed.

Optionally include a `product.constant.ts` (ENUMs, search fields) and `product.utils.ts` when prompted.

---

## Adding an Env Variable

```bash
cem add env STRIPE_SECRET_KEY
```

Result:
- `.env` → `STRIPE_SECRET_KEY=<your_stripe_secret_key>`
- `.env.example` → `STRIPE_SECRET_KEY=`
- `config/index.ts` → `stripe_secret_key: process.env.STRIPE_SECRET_KEY,`

Accepts any format: `UPPER_SNAKE_CASE`, `camelCase`, or `PascalCase` — always normalised correctly.

---

## Project Structure

```
my-api/
├── src/
│   ├── app/
│   │   ├── config/
│   │   │   └── index.ts                          # Central config — all env vars live here
│   │   ├── errors/                               # Error handler helpers (per stack)
│   │   ├── interfaces/                           # Shared TypeScript types
│   │   ├── middlewares/
│   │   │   ├── globalErrorHandler.middleware.ts   # Stack-aware error handler
│   │   │   ├── notFound.middleware.ts             # 404 handler
│   │   │   ├── auth.middleware.ts                 # JWT guard (Auth only)
│   │   │   └── rateLimiter.middleware.ts          # Rate limiting (Auth only)
│   │   ├── modules/
│   │   │   └── Auth/                             # JWT Auth module (Auth only)
│   │   ├── routes/
│   │   │   └── index.ts                          # Auto-registers all module routes
│   │   └── utils/
│   │       ├── catchAsync.ts
│   │       ├── sendResponse.ts
│   │       ├── validateRequest.ts
│   │       ├── welcomePage.ts                    # Styled HTML landing page for /
│   │       ├── logger.ts
│   │       └── QueryBuilder.ts                   # Mongoose only
│   ├── app.ts                                    # Express app setup
│   └── server.ts                                 # Server start & DB connection
├── Dockerfile                                    # Docker only
├── .dockerignore                                 # Docker only
├── docker-compose.yml                            # Docker only
├── .env
├── .env.example
├── eslint.config.mjs                             # ESLint v9 flat config
├── tsconfig.json
└── package.json
```

---

## Welcome Page

Every scaffolded project includes a styled **CEM Welcome Page** served at the root URL (`/`).

It features:
- Dark background with cyan accents and monospace font — matching the CLI aesthetic
- CEM badge, project name (with blinking cursor), and version
- Live server status indicator
- Available routes list with color-coded HTTP methods
- Clickable `/health` check link
- Footer with CEM branding

The page is generated from `src/app/utils/welcomePage.ts` and reads the project name and version from `package.json` at runtime. You can customise or replace it at any time.

---

## Authentication (Optional)

When you select **Yes** to Auth during setup, you get an additional prompt:

- **HTTP-only cookies** _(recommended)_ — Tokens are stored in `httpOnly` cookies. The browser sends them automatically. XSS-safe. Includes a `/auth/logout` endpoint that clears both cookies.
- **Authorization header** — Tokens are returned in the response body. The client stores them and sends via `Authorization: Bearer <token>`. Best for mobile / API clients.

### What's generated

- **`Auth` module** — Complete login flow with controller, service, model, and validation
- **Real bcrypt authentication** — Passwords are salted and hashed at rest; `bcrypt.compare()` is used on login. No stub credentials — production-ready from day one.
- **`auth.middleware.ts`** — Role-based JWT guard for protecting routes. Extracts the token from cookies or the Authorization header depending on your chosen delivery method.
- **`rateLimiter.middleware.ts`** — Two limiters out of the box:
  - Global: 100 requests / 15 min per IP
  - Login endpoint: 5 attempts / 15 min per IP (skips successful logins)
- **JWT refresh token support** — Both `jwt_access_secret` and `jwt_refresh_secret` pre-configured in `.env` and `config/index.ts`
- **`AUTH_SETUP.md`** — A seed guide placed inside `src/app/modules/Auth/` explaining how to create the users table, seed a test user, test the login endpoint, and go to production.
- **Installed packages** — `jsonwebtoken`, `bcrypt`, `express-rate-limit` (+ `cookie-parser` for cookie mode)

Protecting a route:

```ts
import auth from '../../middlewares/auth.middleware';

router.get('/dashboard', auth('ADMIN'), dashboardController.get);
```

---

## Error Handling

The generated `globalErrorHandler.middleware.ts` is **stack-aware**. It maps errors specific to your chosen database and validator into a consistent API response:

```json
{
  "success": false,
  "message": "Validation Error",
  "errorSources": [
    { "path": "email", "message": "Invalid email address" }
  ]
}
```

| Stack | Handled automatically |
|---|---|
| Mongoose | CastError, ValidationError, Duplicate Key (11000) |
| Prisma | P2002 (Duplicate), P2025 (Not Found), P2003 (Invalid Ref) |
| Drizzle / pg | Constraint violation codes (23505, 23503) |
| Zod | ZodError issues (v3 & v4 compatible) |
| Joi | Validation errors |

---

## Generated Project Scripts

All scripts work with **npm**, **yarn**, or **pnpm** — the generated README and CLI output automatically use the correct syntax for your detected package manager.

| Script (npm) | Script (yarn / pnpm) | Equivalent to |
|---|---|---|
| `npm run start:dev` | `yarn start:dev` / `pnpm start:dev` | `cem dev` |
| `npm run build` | `yarn build` / `pnpm build` | `cem build` |
| `npm run check` | `yarn check` / `pnpm check` | `cem check` |
| `npm start` | `yarn start` / `pnpm start` | `cem start` |
| `npm run lint` | `yarn lint` / `pnpm lint` | `eslint src` |
| `npm run lint:fix` | `yarn lint:fix` / `pnpm lint:fix` | `eslint src --fix` |
| `npm run prettier:fix` | `yarn prettier:fix` / `pnpm prettier:fix` | `prettier --write src` |

---

## Unknown Commands

If you accidentally run a project script through `cem` (e.g. `cem lint:fix`), the CLI will print a helpful error instead of launching the scaffold wizard:

```
✖  Unknown command: "lint:fix"

⚠  Available commands:
   cem [project-name]           — scaffold a new project
   cem dev                      — start dev server with hot reload
   cem build                    — compile TypeScript to dist/
   cem start                    — start the production server
   cem check                    — run type-check, lint, and format check
   cem list                     — list modules, middlewares, and env vars
   cem add module <name>        — generate a new module
   cem add middleware <name>    — generate a middleware
   cem add env <KEY>            — add an env variable
   cem remove module <name>     — delete a module and unwire its route
   cem remove middleware <name> — delete a middleware file
   cem remove env <KEY>         — remove an env var from .env and config
   cem --version                — print the installed version
   cem --help                   — show this help message

⚠  Tip: scripts like lint and prettier should be run with your package manager, not cem.
```

---

## Package Manager Support

The CLI auto-detects your package manager and adapts its behaviour:

| Signal | Priority | Example |
|---|---|---|
| Lock file in project root | Highest | `pnpm-lock.yaml` → uses pnpm |
| `npm_config_user_agent` env var | Medium | Set by npm/yarn/pnpm when they invoke scripts |
| Default | Lowest | Falls back to npm |

The detected PM affects:
- **Scaffolding** — correct install commands during project creation
- **Docker** — Dockerfile uses the right lock file, install commands, and corepack setup
- **Generated README** — install and run-script commands match your PM
- **CLI output** — update notices, error messages, and tips use the correct PM syntax

---

## Requirements

- Node.js `>= 18`
- **One of:** npm `>= 9`, yarn `>= 1.22`, or pnpm `>= 8`
- TypeScript `>= 5.5` (installed automatically)

---

## License

[MIT](https://opensource.org/licenses/MIT)