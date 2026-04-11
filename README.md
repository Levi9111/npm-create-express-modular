<div align="center">

# create-express-modular

[![npm version](https://img.shields.io/npm/v/create-express-modular.svg?style=flat-square)](https://www.npmjs.com/package/create-express-modular)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg?style=flat-square)](https://www.typescriptlang.org)

**A lightweight CLI to scaffold a scalable, domain-driven Express + TypeScript backend.**  
Inspired by NestJS — built for simplicity.

```bash
npx create-express-modular my-awesome-api
```

</div>

---

## Why this exists

Most Express projects start clean and turn messy within weeks. Routes end up in one file, business logic leaks into controllers, and adding a new feature means hunting down where things belong.

`create-express-modular` gives you a solid structure from the first line — controllers, services, routes, models, and validations all separated by domain. It also ships a built-in module generator so you never write boilerplate again.

---

## Quick Start

No global install required. Run this and you're done:

```bash
npx create-express-modular my-awesome-api
cd my-awesome-api
npm run start:dev
```

The CLI will:
- Build the base project architecture
- Initialize a Git repository
- Install all dependencies

Your server is running with hot-reloading at `http://localhost:5000`.

---

## Generating Modules

Instead of writing boilerplate by hand, use the built-in interactive generator:

```bash
npm run generate
```

**What happens:**

1. It asks for a module name — e.g. `User`, `Product`, `Order`
2. It scaffolds all the standard files inside `src/app/modules/YourModule/`
3. It optionally creates `constants` and `utils` files for your module
4. It **auto-wires** your new module into `src/app/routes/index.ts` — no manual imports needed

---

## Project Structure

```
src/
├── app/
│   ├── config/
│   ├── errors/                   # Global error handlers
│   ├── middlewares/
│   ├── modules/                  # Run `npm run generate` to add modules here
│   │   └── User/                 # Example generated module
│   │       ├── user.controller.ts
│   │       ├── user.interface.ts
│   │       ├── user.model.ts
│   │       ├── user.route.ts
│   │       ├── user.service.ts
│   │       └── user.validation.ts
│   ├── routes/
│   │   └── index.ts              # All module routes are auto-imported here
│   └── utils/
├── app.ts                        # Express app configuration
└── server.ts                     # Server bootstrap & database connection
```

Every module is fully self-contained. Adding or removing a feature means adding or removing a single folder.

---

## Available Commands

| Command | Description |
| --- | --- |
| `npm run start:dev` | Start the development server with hot-reloading |
| `npm run generate` | Open the interactive module generator |
| `npm run build` | Compile TypeScript into `/dist` for production |
| `npm start` | Run the compiled production build |
| `npm run lint` | Check all files for ESLint errors |
| `npm run prettier` | Format all files with Prettier |

---

## What's Included

| Tool | Purpose |
| --- | --- |
| Express.js | HTTP framework |
| TypeScript (strict) | Type safety across the entire codebase |
| ESLint | Code quality enforcement |
| Prettier | Consistent code formatting |
| ts-node-dev | Hot-reloading in development |

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