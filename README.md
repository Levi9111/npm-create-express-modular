<div align="center">

# create-express-modular

[![npm version](https://img.shields.io/npm/v/create-express-modular.svg?style=flat-square)](https://www.npmjs.com/package/create-express-modular)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg?style=flat-square)](https://www.typescriptlang.org)

**A lightweight CLI to scaffold a scalable, domain-driven Express + TypeScript backend.**  
Inspired by NestJS — built for simplicity.

```bash
npm install -g create-express-modular
```

</div>

---

## Why this exists

Most Express projects start clean and turn messy within weeks. Routes end up in one file, business logic leaks into controllers, and adding a new feature means hunting down where things belong.

`create-express-modular` gives you a solid structure from the first line — controllers, services, routes, models, and validations all separated by domain. It also ships a built-in module generator so you never write boilerplate again.

---

## Quick Start

To unlock the full power of the CLI — including the `cem` global alias — install it globally:

```bash
npm install -g create-express-modular
```

Then scaffold your new project:

```bash
cem my-awesome-api
cd my-awesome-api
npm run start:dev
```

Alternatively, run it as a one-off without installing:

```bash
npx create-express-modular my-awesome-api
```

The CLI will:
- Build the base project architecture
- Initialize a Git repository
- Install all dependencies

Your server is running with hot-reloading at `http://localhost:5000`.

---

## Generating Modules

Instead of writing boilerplate by hand, use the global CLI to instantly generate new modules from anywhere inside your project:

```bash
cem add module Product
```

If you don't provide a name upfront, just run `cem generate` and it will prompt you for one.

**What happens:**

1. It scaffolds all the standard files — Controller, Service, Route, Model, Interface, Validation — inside `src/app/modules/Product/`
2. It asks if you optionally need `constants` and `utils` files for your new module
3. It auto-wires your new module into `src/app/routes/index.ts` — no manual imports needed

---

## Project Structure

```
src/
├── app/
│   ├── config/
│   │   └── index.ts              # All env vars imported and exported from here
│   ├── errors/                   # Global error handlers
│   ├── middlewares/
│   │   └── auth.ts               # JWT role guard — auth('ADMIN') (optional)
│   ├── modules/                  # Run `cem add module <name>` to add modules here
│   │   ├── Auth/                 # Generated if auth is selected during setup
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.interface.ts
│   │   │   ├── auth.model.ts
│   │   │   ├── auth.route.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.validation.ts
│   │   └── User/                 # Example of a generated module
│   │       ├── user.controller.ts
│   │       ├── user.interface.ts
│   │       ├── user.model.ts
│   │       ├── user.route.ts
│   │       ├── user.service.ts
│   │       └── user.validation.ts
│   ├── routes/
│   │   └── index.ts              # All module routes are auto-imported here
│   └── utils/
│       └── jwt.utils.ts          # Token signing & verification (optional)
├── app.ts                        # Express app configuration
└── server.ts                     # Server bootstrap & database connection
```

Every module is fully self-contained. Adding or removing a feature means adding or removing a single folder.

---

## Available Commands

### Global CLI

| Command | Description |
| --- | --- |
| `cem <project-name>` | Scaffold a brand new Express project |
| `cem add module <name>` | Generate a new domain module inside an existing project |
| `cem generate` | Interactive module generator — prompts for a name if not provided |

### Project Scripts

| Command | Description |
| --- | --- |
| `npm run start:dev` | Start the development server with hot-reloading |
| `npm run build` | Compile TypeScript into `/dist` for production |
| `npm start` | Run the compiled production build |
| `npm run lint` | Check all files for ESLint errors |
| `npm run prettier` | Format all files with Prettier |
| `npm run guard` | Scan modules for naming convention violations |

---

## Authentication — Optional, Zero Config

Tired of wiring up JWTs from scratch on every project? During installation, the CLI asks if you want a ready-to-use Auth module. Choose yes and it handles everything automatically.

**What gets generated:**

- Installs `jsonwebtoken`, `bcrypt`, and their TypeScript type definitions
- Generates a fully wired `Auth` module with a `login` controller and service
- Creates a `jwt.utils.ts` helper for signing and verifying tokens
- Creates an `auth.ts` middleware guard for protecting routes by role

Protecting a route is one line:

```ts
router.get('/profile', auth('ADMIN'), profileController.getProfile);
```

Pass any role string to `auth()` — it validates the JWT and checks the role before the request reaches your controller.

---

## Centralized Configuration

No more scattering `process.env.SOMETHING` across dozens of files. The CLI generates a base `.env` file and a single `src/app/config/index.ts` that imports, parses, and exports every environment variable from one place.

```ts
// src/app/config/index.ts
import dotenv from 'dotenv';
dotenv.config();

export default {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV,
};
```

Every part of your app imports from `config` — never from `process.env` directly. Adding a new variable, renaming one, or adding validation later is a one-file change.

---

## Architecture Guard

Domain-driven structure only works if it stays consistent. The boilerplate ships with a built-in guard script that enforces your naming conventions automatically.

When you run `npm run build` or `npm run lint`, the `npm run guard` script scans `src/app/modules/` and checks every file against its parent module name. If something is out of place — for example, `product.validation.ts` sitting inside the `Auth/` folder — the build is intercepted immediately with a clear error telling you exactly what went wrong and where.

```
[guard] ERROR: File naming violation detected.
  File:     src/app/modules/Auth/product.validation.ts
  Expected: auth.validation.ts
  Fix:      Rename the file or move it to the correct module folder.
```

No silent rule-breaking. The guard catches structural drift before it reaches production.

---

## What's Included

| Tool | Purpose |
| --- | --- |
| Express.js | HTTP framework |
| TypeScript (strict) | Type safety across the entire codebase |
| ESLint | Code quality enforcement |
| Prettier | Consistent code formatting |
| ts-node-dev | Hot-reloading in development |
| jsonwebtoken + bcrypt | Auth module (optional, installed on demand) |

---

## Database

This tool is **database agnostic**. The project structure works with any data layer — bring your own:

- **Mongoose** — for MongoDB
- **Prisma** — for PostgreSQL, MySQL, SQLite, and more
- **TypeORM** — for SQL databases
- **Raw drivers** — `pg`, `mysql2`, etc.

No database client is installed by default. Add whichever one fits your project.

---

## Contributing

Contributions, issues, and feature requests are welcome.  
Check the [issues page](https://github.com/Levi9111/npm-create-express-modular/issues) to get started.

---

## License

[MIT](https://opensource.org/licenses/MIT)