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

## Installation (Recommended)

Install the CLI globally to access the `cem` executable across your workspace:

```bash
# Using npm (recommended)
npm install -g create-express-modular
```

## Quick Start

Scaffold a new project using the `cem` CLI (recommended):

```bash
# Using globally installed CLI (recommended)
cem my-api

# Or using npx / bunx without global installation
npx create-express-modular my-api
# or
bunx create-express-modular my-api
```

Then start developing:

```bash
cd my-api
cem dev
```

Your server is live at `http://localhost:5000`. ✅

---

## What Gets Generated

Answer 5 prompts — get a complete, wired-up backend:

| Prompt | Options |
| :--- | :--- |
| **Database / ORM** | Mongoose · Prisma · Drizzle |
| **Validator** | Zod · Joi |
| **JWT Auth** | Yes / No (bcrypt + refresh tokens + rate limiting) |
| **Token delivery** | HTTP-only cookies · Authorization header |
| **Docker** | Yes / No (Dockerfile + docker-compose + DB sidecar) |

---

## 🤖 AI Coding Assistants (Cursor & Claude Ready)

To support seamless development with AI assistants (Cursor, Claude Code, GitHub Copilot, etc.), the CLI automatically scaffolds custom configuration context files during project initialization:

- **`AGENTS.md`** — Universal rules detailing code style, technology choices, strictly-enforced directory structure guidelines, and available CLI tools.
- **`CLAUDE.md`** — Full project context for Claude with real boilerplates (Controllers, Services, Routes, schemas, and Models) specifically tailored to the scaffolded stack.

---

## CLI Commands

### 🛠️ Project Management

| Command | Description |
| :--- | :--- |
| **`cem dev`** | Start the dev server with live reload |
| **`cem build`** | Run guards + compile TypeScript to `dist/` |
| **`cem start`** | Start the production server with preflight checks |
| **`cem check`** | Run type-check, lint, and format checks in one command |
| **`cem list`** | Show a snapshot of modules, middlewares, and env vars |

### ➕ Generating Features

| Command | Description |
| :--- | :--- |
| **`cem add module <Name...>`** | Scaffold one or more complete feature modules |
| **`cem add middleware <name...>`** | Create one or more middleware files under `src/app/middlewares/` |
| **`cem add env <KEY...>`** | Add one or more env vars to `.env`, `.env.example`, and config |

### ❌ Removing Features

| Command | Description |
| :--- | :--- |
| **`cem remove module <Name...>`** | Delete module directory(ies) and unwire routes |
| **`cem remove middleware <name...>`** | Delete one or more custom middleware files |
| **`cem remove env <KEY...>`** | Remove env var(s) from all configurations |

> 💡 **Command Shortcuts / Aliases:**
> - **`cem rm`** is an alias for **`cem remove`**
> - **`cem ls`** is an alias for **`cem list`**

---

## Requirements

- **Node.js**: `>= 18`
- **Package Manager**: npm `>= 9` · yarn `>= 1.22` · pnpm `>= 8`

---

## Resources

| Link | Description |
| :--- | :--- |
| **[📖 Full Docs](https://create-express-modular.lovable.app/docs)** | Complete CLI reference, guides, and examples |
| **[DOCS.md](./DOCS.md)** | Offline version of the full documentation |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Internal project architecture overview |
| **[npm](https://www.npmjs.com/package/create-express-modular)** | Package page |

---

## License

[MIT](https://opensource.org/licenses/MIT)