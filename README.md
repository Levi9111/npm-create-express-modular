<div align="center">

# create-express-modular

[![npm version](https://img.shields.io/npm/v/create-express-modular.svg?style=flat-square)](https://www.npmjs.com/package/create-express-modular)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg?style=flat-square)](https://www.typescriptlang.org)

**A powerful, interactive CLI to scaffold a scalable, domain-driven Express + TypeScript backend.**  
Choose your stack, generate your modules, and focus on your business logic.

```bash
npm install -g create-express-modular
```

</div>

---

## Why this exists

Most Express projects start clean and turn messy within weeks. `create-express-modular` gives you a solid, domain-driven structure from the first line. It handles the boilerplate of setting up your database, validation, and authentication, so you can start building features immediately.

---

## Quick Start

To unlock the full power of the CLI — including the `cem` global alias — install it globally:

```bash
npm install -g create-express-modular
```

Then scaffold your new project:

```bash
cem my-awesome-api
```

The **interactive CLI** will prompt you to choose:
- **Database**: Mongoose, Prisma, PostgreSQL, MySQL, MariaDB, or CockroachDB.
- **Validator**: Zod, Joi, Vine, or Yup.
- **Auth**: Optional ready-to-use JWT Authentication module.

---

## Generating Modules

Instead of writing boilerplate by hand, use the CLI to instantly generate new modules:

```bash
cem add module Product
```

**What happens:**
1. Scaffolds all standard files — Controller, Service, Route, Model, Interface, Validation — inside `src/app/modules/Product/`.
2. **Stack-Aware**: Automatically uses your project's chosen validator for the validation stubs.
3. **Auto-Wiring**: Injects the new module routes into `src/app/routes/index.ts`.

---

## Utility Commands

Manage your project efficiently with built-in utility commands:

| Command | Description |
| --- | --- |
| `cem add env <key>` | Adds `<KEY>=` to `.env` and injects it into `config/index.ts` |
| `cem add middleware <name>` | Scaffolds a new middleware file in `src/app/middlewares/` |
| `cem add module <name>` | Generates a new domain module |

---

## Project Structure

```
src/
├── app/
│   ├── config/
│   │   └── index.ts              # Centralized configuration (env vars)
│   ├── errors/                   # Global error handlers (stack-aware)
│   ├── interfaces/               # Global TypeScript interfaces
│   ├── middlewares/              # Global middlewares (auth, rateLimiter, etc.)
│   ├── modules/                  # Domain modules (Controller, Service, Route, etc.)
│   ├── routes/                   # Central router with auto-injection
│   └── utils/                    # Utility functions (catchAsync, sendResponse, etc.)
├── app.ts                        # Express app setup (Helmet, CORS, Rate Limit)
└── server.ts                     # Server bootstrap & DB connection
```

---

## Authentication & Security

Choose the Auth module during setup to get:
- **JWT Auth**: Fully wired login, profile, and role-based guards (`auth('ADMIN')`).
- **Global Rate Limiting**: Brute-force protection using `express-rate-limit` applied to the entire app.
- **Password Hashing**: Pre-configured `bcrypt` integration.

---

## Dynamic Error Handling

No more generic 500 errors. The generated `globalErrorHandler` is **stack-aware**:
- **Mongoose**: Handles CastErrors, ValidationErrors, and Duplicate Keys.
- **Prisma**: Maps Prisma-specific error codes (P2002, P2025, etc.) to clean API responses.
- **Validators**: Automatically formats Zod, Joi, Vine, or Yup errors into a standardized shape.

---

## What's Included

| Tool | Purpose |
| --- | --- |
| Express.js | HTTP framework |
| TypeScript | Strict type safety |
| Helmet & CORS | Security headers and cross-origin support |
| express-rate-limit | Brute-force protection |
| http-status-codes | Semantic HTTP status constants |
| ts-node-dev | Hot-reloading development server |

---

## License

[MIT](https://opensource.org/licenses/MIT)