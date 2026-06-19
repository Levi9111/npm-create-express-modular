<div align="center">

# create-express-modular

[![npm version](https://img.shields.io/npm/v/create-express-modular.svg?style=flat-square)](https://www.npmjs.com/package/create-express-modular)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue.svg?style=flat-square)](https://www.typescriptlang.org)

**Scaffold a production-ready Express + TypeScript backend in seconds.**  
Choose your database, your validator, and optionally add JWT auth — all from one interactive CLI.

### [📖 Full Documentation →](https://create-express-modular.lovable.app/docs)

*If you find this tool helpful, consider leaving a ⭐ **star** on GitHub to support the project!*

</div>

---

## Quick Start

```bash
# npm
npx create-express-modular my-api

# yarn
yarn dlx create-express-modular my-api

# pnpm
pnpm dlx create-express-modular my-api
```

Then:

```bash
cd my-api
cem dev
```

Your server is live at `http://localhost:5000`. ✅

---

## What Gets Generated

Answer 5 prompts — get a complete, wired-up backend:

| Prompt | Options |
|---|---|
| Database / ORM | Mongoose · Prisma · Drizzle |
| Validator | Zod · Joi |
| JWT Auth | Yes / No (bcrypt + refresh tokens + rate limiting) |
| Token delivery | HTTP-only cookies · Authorization header |
| Docker | Yes / No (Dockerfile + docker-compose + DB sidecar) |

---

## CLI Commands

### 🛠️ Project Management

| Command | Description |
|---|---|
| **`cem dev`** | Start the dev server with live reload |
| **`cem build`** | Run guards + compile TypeScript to `dist/` |
| **`cem start`** | Start the production server with preflight checks |
| **`cem check`** | Run type-check, lint, and format checks in one command |
| **`cem list`** | Show a snapshot of modules, middlewares, and env vars |

### ➕ Generating Features

| Command | Description |
|---|---|
| **`cem add module <Name>`** | Scaffold a complete feature module |
| **`cem add middleware <name>`** | Create a middleware file under `src/app/middlewares/` |
| **`cem add env <KEY>`** | Add env var to `.env`, `.env.example`, and config |

### ❌ Removing Features

| Command | Description |
|---|---|
| **`cem remove module <Name>`** | Delete module directory and unwire route |
| **`cem remove middleware <name>`** | Delete a custom middleware file |
| **`cem remove env <KEY>`** | Remove env var from all configurations |

> 💡 **Command Shortcuts / Aliases:**
> * **`cem rm`** is an alias for **`cem remove`**
> * **`cem ls`** is an alias for **`cem list`**

---

## Requirements

- Node.js `>= 18`
- One of: npm `>= 9` · yarn `>= 1.22` · pnpm `>= 8`

---

## Resources

| Link | Description |
|---|---|
| [📖 Full Docs](https://create-express-modular.lovable.app/docs) | Complete CLI reference, guides, and examples |
| [DOCS.md](./DOCS.md) | Offline version of the full documentation |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Internal project architecture overview |
| [npm](https://www.npmjs.com/package/create-express-modular) | Package page |

---

## License

[MIT](https://opensource.org/licenses/MIT)