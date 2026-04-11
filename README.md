```markdown
# 🚀 Create Express Modular

> A powerful interactive CLI to scaffold a scalable, database‑agnostic Express + TypeScript server — inspired by NestJS structure, but lightweight and flexible.

[![npm version](https://img.shields.io/npm/v/create-express-modular.svg)](https://www.npmjs.com/package/create-express-modular)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Stop copying boilerplate manually. Define your modules once, and let `create-express-modular` generate a production‑ready, strictly typed Express application in seconds.

## ✨ Why use this?

- **Interactive Scaffolding** – The CLI asks for your module names (e.g. `User, Product, Order`) and builds the entire folder structure and initial files automatically.
- **Database Agnostic** – No ORM is forced. Works equally well with MongoDB (Mongoose), PostgreSQL (Prisma/TypeORM), MySQL, or plain SQL.
- **NestJS‑inspired Modular Design** – Each module contains its own controller, service, routes, model, interface, and validation — separation of concerns out of the box.
- **Auto‑wired Routing** – Your custom modules are automatically imported and registered in `src/app/routes/index.ts`. No manual wiring required.
- **Production‑ready DX** – TypeScript strict mode, ESLint (v8), Prettier, and `ts-node-dev` for instant hot‑reload during development.

## 📦 Quick Start

You don't need to install anything globally. Use `npx` to run the latest version:

```bash
npx create-express-modular
```

The CLI will guide you through two simple steps:
1. **Project name** – Choose a name for your new backend.
2. **Module names** – List the feature modules you need (e.g. `Auth, Receipt, Property`).

Once finished, your project is ready with all dependencies installed and Git initialised.

## 📂 Generated Project Structure

After generating a project with a `User` module, your `src` directory will look like this:

```
src/
├── app/
│   ├── builder/
│   ├── config/
│   ├── constants/
│   ├── errors/
│   ├── interface/
│   ├── middlewares/
│   ├── modules/
│   │   └── User/                    # ✨ Generated module
│   │       ├── user.controller.ts
│   │       ├── user.interface.ts
│   │       ├── user.model.ts
│   │       ├── user.route.ts
│   │       ├── user.service.ts
│   │       ├── user.utils.ts
│   │       └── user.validation.ts
│   ├── routes/
│   │   └── index.ts                 # ✨ Auto‑wired with your modules
│   └── utils/
├── app.ts
└── server.ts
```

> **Tip:** The architecture is domain‑driven and easily extensible — perfect for growing APIs.

## 📜 Built‑in Scripts

Inside your generated project, you can run:

| Command               | Description                                               |
|-----------------------|-----------------------------------------------------------|
| `npm run start:dev`   | Starts the dev server with hot‑reload (`ts-node-dev`)     |
| `npm run build`       | Compiles TypeScript to JavaScript (`dist/`)               |
| `npm start`           | Runs the compiled app in production                       |
| `npm run lint`        | Lints the codebase with ESLint                            |
| `npm run lint:fix`    | Automatically fixes linting issues                        |
| `npm run prettier`    | Formats all files using Prettier                          |

## 🧩 Customisation & Extensibility

Because the tool generates standard Express + TypeScript code, you can easily add any middleware, ORM, or utility library. The structure is designed to stay out of your way while keeping everything organised.

## 🤝 Contributing

We welcome contributions! Feel free to open an issue or submit a pull request on [GitHub](https://github.com/Levi9111/npm-create-express-modular).

## 📄 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

