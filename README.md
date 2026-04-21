<div align="center">

# create-express-modular

[![npm version](https://img.shields.io/npm/v/create-express-modular.svg?style=flat-square)](https://www.npmjs.com/package/create-express-modular)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg?style=flat-square)](https://www.typescriptlang.org)

**Scaffold a production-ready Express + TypeScript backend in seconds.**  
Choose your database, your validator, and optionally add JWT auth — all from one interactive CLI.

</div>

---

## Installation

```bash
npm install -g create-express-modular
```

---

## Creating a New Project

Run `cem` from anywhere:

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

Then just:

```bash
cd my-api
npm run start:dev
```

Your server is running at `http://localhost:5000`. ✅

---

## Adding a Feature Module

Inside your project, run:

```bash
cem add module Product
```

This creates a complete `Product` module in `src/app/modules/Product/` with:

| File | Purpose |
|---|---|
| `product.controller.ts` | Request/response handlers |
| `product.service.ts` | Business logic |
| `product.route.ts` | Express router |
| `product.model.ts` | DB model / schema |
| `product.interface.ts` | TypeScript types |
| `product.validation.ts` | Validation schema (matches your chosen validator) |

The module is also **automatically registered** in `src/app/routes/index.ts` — no manual import needed.

---

## Utility Commands

| Command | What it does |
|---|---|
| `cem add module <name>` | Generate a complete feature module |
| `cem add env <KEY>` | Add `KEY=<your_key>` to `.env` and inject it into `config/index.ts` |
| `cem add middleware <name>` | Create a new middleware file in `src/app/middlewares/` |

### Example: Adding an env variable

```bash
cem add env JWT_REFRESH_SECRET
```

Result:
- `.env` → `JWT_REFRESH_SECRET=<your_jwt_refresh_secret>`
- `config/index.ts` → `jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,`

---

## Project Structure

Every generated project follows this structure:

```
my-api/
├── src/
│   ├── app/
│   │   ├── config/
│   │   │   └── index.ts          # Central config — all env vars live here
│   │   ├── errors/               # Error handler helpers (per stack)
│   │   ├── interfaces/           # Shared TypeScript types
│   │   ├── middlewares/
│   │   │   ├── auth.ts           # JWT role guard middleware
│   │   │   ├── globalErrorHandler.ts
│   │   │   ├── notFound.ts
│   │   │   └── rateLimiter.ts    # (only if Auth is enabled)
│   │   ├── modules/
│   │   │   └── Auth/             # (only if Auth is enabled)
│   │   ├── routes/
│   │   │   └── index.ts          # All module routes auto-registered here
│   │   └── utils/
│   │       ├── catchAsync.ts
│   │       └── sendResponse.ts
│   ├── app.ts                    # Express app setup
│   └── server.ts                 # Server start & DB connection
├── .env
├── tsconfig.json
└── package.json
```

---

## Authentication (Optional)

When you select **Yes** to Auth during setup, you get:

- **`Auth` module** — Complete login flow with `auth.controller.ts`, `auth.service.ts`, `auth.model.ts`, and `auth.validation.ts`
- **`auth.ts` middleware** — Role-based JWT guard for protecting routes
- **`rateLimiter.ts`** — Global rate limiting (100 req / 15 min per IP) via `express-rate-limit`
- **Installed packages** — `jsonwebtoken`, `bcrypt`, `express-rate-limit`

Protecting a route:

```ts
router.get('/dashboard', auth('ADMIN'), dashboardController.get);
```

---

## Error Handling

The generated `globalErrorHandler.ts` is **stack-aware**. It maps errors specific to your chosen database and validator into a clean, consistent API response shape:

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
| Zod | ZodError issues |
| Joi / Vine / Yup | Validation errors |

---

## Available Scripts

Inside your generated project:

| Script | Description |
|---|---|
| `npm run start:dev` | Start with hot-reloading |
| `npm run build` | Compile TypeScript to `/dist` |
| `npm start` | Run the compiled build |
| `npm run lint` | Run ESLint |
| `npm run prettier` | Format with Prettier |

---

## License

[MIT](https://opensource.org/licenses/MIT)