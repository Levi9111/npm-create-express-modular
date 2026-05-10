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
npm install -g create-express-modular
```

Or use without installing via `npx`:

```bash
npx create-express-modular my-api
```

---

## Creating a New Project

```bash
cem my-api
```

The CLI will ask you three questions:

1. **Database** — Mongoose, Prisma, PostgreSQL, MySQL, MariaDB, or CockroachDB
2. **Validator** — Zod, Joi, Vine, or Yup
3. **Auth** — Do you want a ready-to-use JWT Auth module?

After answering, it will:
- Scaffold a clean, domain-driven folder structure
- Generate database config, error handling, and all boilerplate
- Install all required dependencies automatically
- Initialise a git repository

Then just:

```bash
cd my-api
cem dev
```

Your server is live at `http://localhost:5000`. ✅

---

## CLI Commands

### Project Management

| Command | Description |
|---|---|
| `cem dev` | Start the dev server with live reload and a pretty terminal UI |
| `cem build` | Run architecture guard + compile TypeScript to `dist/` |
| `cem check` | Run type check, lint, and format check in one go |

### Utility Commands

| Command | Description |
|---|---|
| `cem add module <Name>` | Scaffold a complete feature module |
| `cem add env <KEY>` | Add an env var to `.env` and inject it into `config/index.ts` |
| `cem add middleware <name>` | Create a new middleware in `src/app/middlewares/` |

---

## `cem dev` — Dev Server

Replaces `ts-node-dev` with a Vite-style terminal experience:

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

Runs two steps in sequence before compiling:

1. **Architecture guard** — validates that every file inside `src/app/modules/<Name>/` is correctly named `<name>.<type>.ts`. Aborts with a clear error if not.
2. **TypeScript compilation** — runs `tsc` and emits to `dist/`

```bash
cem build

  🛡️  Running Architecture Guard...
  ✅ Architecture validation passed.

  📦 Compiling TypeScript...
  ✅ Build successful.
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
- `config/index.ts` → `stripe_secret_key: process.env.STRIPE_SECRET_KEY,`

Accepts any format: `UPPER_SNAKE_CASE`, `camelCase`, or `PascalCase` — always normalised correctly.

---

## Project Structure

```
my-api/
├── src/
│   ├── app/
│   │   ├── config/
│   │   │   └── index.ts              # Central config — all env vars live here
│   │   ├── errors/                   # Error handler helpers (per stack)
│   │   ├── interfaces/               # Shared TypeScript types
│   │   ├── middlewares/
│   │   │   ├── globalErrorHandler.ts
│   │   │   ├── notFound.ts
│   │   │   ├── auth.ts               # JWT guard (Auth only)
│   │   │   └── rateLimiter.ts        # Rate limiting (Auth only)
│   │   ├── modules/
│   │   │   └── Auth/                 # JWT Auth module (Auth only)
│   │   ├── routes/
│   │   │   └── index.ts              # Auto-registers all module routes
│   │   └── utils/
│   │       ├── catchAsync.ts
│   │       ├── sendResponse.ts
│   │       ├── validateRequest.ts
│   │       └── QueryBuilder.ts       # Mongoose only
│   ├── app.ts                        # Express app setup
│   └── server.ts                     # Server start & DB connection
├── .env
├── eslint.config.mjs                 # ESLint v9 flat config
├── tsconfig.json
└── package.json
```

---

## Authentication (Optional)

When you select **Yes** to Auth during setup, you get:

- **`Auth` module** — Complete login flow with controller, service, model, and validation
- **`auth.ts` middleware** — Role-based JWT guard for protecting routes
- **`rateLimiter.ts`** — Global rate limiting (100 req / 15 min per IP)
- **JWT refresh token support** — Both `jwt_access_secret` and `jwt_refresh_secret` pre-configured in `.env` and `config/index.ts`
- **Installed packages** — `jsonwebtoken`, `bcrypt`, `express-rate-limit`

Protecting a route:

```ts
router.get('/dashboard', auth('ADMIN'), dashboardController.get);
```

---

## Error Handling

The generated `globalErrorHandler.ts` is **stack-aware**. It maps errors specific to your chosen database and validator into a consistent API response:

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
| pg / mysql | Constraint violation codes |
| Zod | ZodError issues (v3 & v4 compatible) |
| Joi / Vine / Yup | Validation errors |

---

## Generated Project Scripts

| Script | Equivalent to |
|---|---|
| `npm run start:dev` | `cem dev` |
| `npm run build` | `cem build` |
| `npm run check` | `cem check` |
| `npm start` | `node dist/server.js` |
| `npm run lint` | `eslint src` |
| `npm run lint:fix` | `eslint src --fix` |
| `npm run prettier:fix` | `prettier --write src` |

---

## Requirements

- Node.js `>= 18`
- npm `>= 9`
- TypeScript `>= 5.5` (installed automatically)

---

## License

[MIT](https://opensource.org/licenses/MIT)