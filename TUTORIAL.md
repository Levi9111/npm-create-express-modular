# 🌟 Tutorial: Building a Production-Ready API with create-express-modular (CEM)

Welcome to the ultimate guide to **create-express-modular (CEM)**! In this tutorial, we will build a complete, production-ready **Task Manager API** from scratch using:
*   **Database / ORM**: MongoDB + Mongoose
*   **Validator**: Zod (v4 compatible)
*   **Authentication**: JWT Auth with HTTP-only cookies
*   **Dockerization**: Multistage Docker build + Docker Compose with MongoDB database sidecar

By the end of this tutorial, you will master all the features the CEM CLI has to offer, from automatic code generation and environment variable management to strict architecture guards and deployment setups.

---

## 📑 Table of Contents
1. [Prerequisites](#-prerequisites)
2. [Step 1: Scaffolding a New Project (`cem`)](#-step-1-scaffolding-a-new-project-cem)
3. [Step 2: Exploring the Live Dev Server (`cem dev`)](#-step-2-exploring-the-live-dev-server-cem-dev)
4. [Step 3: Managing Environment Variables (`cem add env`)](#-step-3-managing-environment-variables-cem-add-env)
5. [Step 4: Scaffolding a Feature Module (`cem add module`)](#-step-4-scaffolding-a-feature-module-cem-add-module)
6. [Step 5: Writing Custom Middleware (`cem add middleware`)](#-step-5-writing-custom-middleware-cem-add-middleware)
7. [Step 6: Listing Project Architecture Overview (`cem list`)](#-step-6-listing-project-architecture-overview-cem-list)
8. [Step 7: Compiling and Guarding the App (`cem build`)](#-step-7-compiling-and-guarding-the-app-cem-build)
9. [Step 8: Automated Quality Checking (`cem check`)](#-step-8-automated-quality-checking-cem-check)
10. [Step 9: Deleting Components Safely (`cem remove`)](#-step-9-deleting-components-safely-cem-remove)
11. [Step 10: Dockerized Deployment](#-step-10-dockerized-deployment)

---

## 🛠️ Prerequisites
Before starting, ensure you have the following installed on your machine:
*   **Node.js**: `v18.0.0` or higher
*   **npm**: `v9.0.0` or higher
*   **MongoDB**: A local instance or MongoDB Atlas connection string

---

## 🚀 Step 1: Scaffolding a New Project (`cem`)

Let's initialize our backend project using the interactive scaffolding wizard. 

Run the following command:
```bash
npx create-express-modular taskflow-api
```
*(Alternatively, if you have installed the package globally via `npm install -g create-express-modular`, you can simply run `cem taskflow-api`.)*

### Interactive Prompt Selections
The wizard will guide you through 5 setup questions. For this tutorial, select the following options:

```
? Project name: taskflow-api
? Database / ORM: Mongoose  (MongoDB)
? Validator: Zod  (recommended)
? Include JWT Auth module? Yes
? Auth token delivery: HTTP-only cookies  (recommended — XSS safe, browser clients)
? Include Docker setup (Dockerfile + docker-compose)? Yes
```

### 📂 What Gets Generated?
CEM creates a highly optimized, domain-driven modular structure:

```
taskflow-api/
├── src/
│   ├── app/
│   │   ├── config/
│   │   │   └── index.ts                          # Centralized config (fully typed)
│   │   ├── errors/                               # Generic AppError + Mongoose handler
│   │   ├── interfaces/                           # Shared TS types (e.g. error sources)
│   │   ├── middlewares/
│   │   │   ├── globalErrorHandler.middleware.ts   # Stack-aware JSON error mapper
│   │   │   ├── notFound.middleware.ts             # 404 router
│   │   │   ├── auth.middleware.ts                 # JWT role-based guard
│   │   │   └── rateLimiter.middleware.ts          # Global & Login rate limiters
│   │   ├── modules/
│   │   │   └── Auth/                             # Complete bcrypt + JWT Auth module
│   │   ├── routes/
│   │   │   └── index.ts                          # Unified routing registry
│   │   └── utils/
│   │       ├── catchAsync.ts                     # Wraps async handlers to avoid try-catch
│   │       ├── sendResponse.ts                   # Standardized JSON response helper
│   │       ├── validateRequest.ts                # Zod request parser middleware
│   │       ├── welcomePage.ts                    # Brand new styled landing page
│   │       ├── logger.ts                         # Lightweight console logger utility
│   │       └── QueryBuilder.ts                   # Advanced Mongoose search/filter helper
│   ├── app.ts                                    # Express server configurations
│   └── server.ts                                 # DB connection & server initialization
├── .env
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── eslint.config.mjs                             # ESLint v9 Flat Config
├── tsconfig.json
└── package.json
```

---

## 🟢 Step 2: Exploring the Live Dev Server (`cem dev`)

Navigate into the newly created folder:
```bash
cd taskflow-api
```

Let's boot up the development server:
```bash
cem dev
```
*(Alternatively, run `npm run start:dev`)*

### Dev Server Features
Powered by `tsx` (esbuild-based, near-instant restarts), you will see a color-coded console output:

```
  ──────────────────────────────────────────────────────
  [CEM]  taskflow-api  dev server

  ◆  Project   taskflow-api
  ◆  Entry     src/server.ts
  ◆  Started   01 June 2026 21:20:00
  ──────────────────────────────────────────────────────

  ▲  Server running on http://localhost:5000   21:20:01
  ◈  MongoDB connected
```

### 💻 Styled Welcome Page
Open your browser and navigate to `http://localhost:5000/`. Instead of a generic JSON error or raw text, you are greeted with a stunning terminal-aesthetic dashboard:
*   **Branded Dark Mode**: Matches the CLI theme with vibrant cyan accents and custom typography.
*   **Metadata**: Real-time project name, version (read from `package.json`), and live server uptime.
*   **Endpoints Registry**: Lists `/health` and `/api/v1/` routes cleanly with color-coded HTTP methods.

Test the health-check route by clicking **Check /health** or hitting `http://localhost:5000/health`.

---

## 🔑 Step 3: Managing Environment Variables (`cem add env`)

Let's say we need to integrate an external service like **Stripe** or **Resend**. Rather than manually updating three separate files, we can use the environment manager command.

Run:
```bash
cem add env RESEND_API_KEY
```

### ⚡ What Just Happened?
The CLI automatically updated three different locations:
1.  **`.env`**: Appended `RESEND_API_KEY=<your_resend_api_key>`
2.  **`.env.example`**: Appended `RESEND_API_KEY=`
3.  **`src/app/config/index.ts`**: Automatically imported the key, normalized it to **`lower_snake_case`**, and injected it into the configuration export:
    ```typescript
    resend_api_key: process.env.RESEND_API_KEY,
    ```

You can now import `config` anywhere in your application and have type-safe autocomplete access to `config.resend_api_key`!

---

## 📦 Step 4: Scaffolding a Feature Module (`cem add module`)

Let's build the core of our Task Manager application by adding a **Task** module.

Run the module generator command:
```bash
cem add module Task
```

When prompted:
```
📌 Include a constants file (ENUMs, search fields)? Yes
🛠️  Include a utils file for helper functions? No
```

### ⚙️ Auto-Wiring
The CLI generates the module directory inside `src/app/modules/Task/` and **automatically registers the router** inside `src/app/routes/index.ts`. No manual route imports or registration arrays required!

Let's implement the `Task` features step-by-step:

### 1. Define the Interface (`task.interface.ts`)
Update `src/app/modules/Task/task.interface.ts` to define our data model:

```typescript
import { Types } from 'mongoose';

export type TTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface ITask {
  title: string;
  description?: string;
  status: TTaskStatus;
  dueDate?: Date;
  assignedUser: Types.ObjectId;
}
```

### 2. Set Up Constants (`task.constant.ts`)
Open `src/app/modules/Task/task.constant.ts` to export helper constants:

```typescript
export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

export const taskSearchableFields = ['title', 'description'];
```

### 3. Create the Database Model (`task.model.ts`)
Implement the Mongoose schema inside `src/app/modules/Task/task.model.ts`:

```typescript
import { Schema, model } from 'mongoose';
import { ITask } from './task.interface';
import { TASK_STATUS } from './task.constant';

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: 'TODO',
    },
    dueDate: { type: Date },
    assignedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

export const Task = model<ITask>('Task', taskSchema);
```

### 4. Create validation schemas (`task.validation.ts`)
Write strict Zod validation schemas for inputs inside `src/app/modules/Task/task.validation.ts`:

```typescript
import { z } from 'zod';
import { TASK_STATUS } from './task.constant';

const createTaskValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).min(3).max(100),
    description: z.string().optional(),
    status: z.nativeEnum(TASK_STATUS).default('TODO'),
    dueDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  }),
});

const updateTaskValidationSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().optional(),
    status: z.nativeEnum(TASK_STATUS).optional(),
    dueDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  }),
});

export const TaskValidation = {
  createTaskValidationSchema,
  updateTaskValidationSchema,
};
```

### 5. Write the Service (`task.service.ts`)
Utilize CEM's built-in **`QueryBuilder`** utility in `src/app/modules/Task/task.service.ts` to easily handle searches, filters, limits, and pages:

```typescript
import { Types } from 'mongoose';
import { ITask } from './task.interface';
import { Task } from './task.model';
import QueryBuilder from '../../utils/QueryBuilder';
import { taskSearchableFields } from './task.constant';

const createTaskIntoDB = async (payload: ITask) => {
  const result = await Task.create(payload);
  return result;
};

const getAllTasksFromDB = async (query: Record<string, unknown>) => {
  const taskQuery = new QueryBuilder(Task.find().populate('assignedUser', '-password'), query)
    .search(taskSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await taskQuery.modelQuery;
  const meta = await taskQuery.countTotal();

  return { meta, result };
};

const getSingleTaskFromDB = async (id: string) => {
  const result = await Task.findById(id).populate('assignedUser', '-password');
  return result;
};

const updateTaskInDB = async (id: string, payload: Partial<ITask>) => {
  const result = await Task.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteTaskFromDB = async (id: string) => {
  const result = await Task.findByIdAndDelete(id);
  return result;
};

export const TaskServices = {
  createTaskIntoDB,
  getAllTasksFromDB,
  getSingleTaskFromDB,
  updateTaskInDB,
  deleteTaskFromDB,
};
```

### 6. Create the Controllers (`task.controller.ts`)
Write our controller operations inside `src/app/modules/Task/task.controller.ts` using `catchAsync` to handle middleware error trapping and `sendResponse` to output consistent JSON payloads:

```typescript
import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { TaskServices } from './task.service';

const createTask = catchAsync(async (req: Request, res: Response) => {
  // Attach user ID from JWT token auth middleware
  const user = req.user;
  const taskData = { ...req.body, assignedUser: user._id };

  const result = await TaskServices.createTaskIntoDB(taskData);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Task created successfully',
    data: result,
  });
});

const getAllTasks = catchAsync(async (req: Request, res: Response) => {
  const { meta, result } = await TaskServices.getAllTasksFromDB(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Tasks retrieved successfully',
    meta,
    data: result,
  });
});

const getSingleTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TaskServices.getSingleTaskFromDB(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Task retrieved successfully',
    data: result,
  });
});

const updateTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TaskServices.updateTaskInDB(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Task updated successfully',
    data: result,
  });
});

const deleteTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await TaskServices.deleteTaskFromDB(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Task deleted successfully',
    data: null,
  });
});

export const TaskControllers = {
  createTask,
  getAllTasks,
  getSingleTask,
  updateTask,
  deleteTask,
};
```

### 7. Wire the Router (`task.route.ts`)
Create endpoints inside `src/app/modules/Task/task.route.ts`. Secure operations using role-based JWT checks (`auth.middleware.ts`) and format-check requests through our Zod parser middleware (`validateRequest`):

```typescript
import express from 'express';
import { TaskControllers } from './task.controller';
import { TaskValidation } from './task.validation';
import validateRequest from '../../utils/validateRequest';
import auth from '../../middlewares/auth.middleware';

const router = express.Router();

// Get all tasks (Available to both users and admins)
router.get('/', auth('USER', 'ADMIN'), TaskControllers.getAllTasks);

// Get single task details
router.get('/:id', auth('USER', 'ADMIN'), TaskControllers.getSingleTask);

// Create task (Available only to registered Users)
router.post(
  '/',
  auth('USER'),
  validateRequest(TaskValidation.createTaskValidationSchema),
  TaskControllers.createTask
);

// Update task
router.patch(
  '/:id',
  auth('USER', 'ADMIN'),
  validateRequest(TaskValidation.updateTaskValidationSchema),
  TaskControllers.updateTask
);

// Delete task (Strictly accessible by Admins only)
router.delete('/:id', auth('ADMIN'), TaskControllers.deleteTask);

export const TaskRoutes = router;
```

---

## 🛡️ Step 5: Writing Custom Middleware (`cem add middleware`)

Middlewares inside a CEM project follow a clean, enforce-guarded standard named `<name>.middleware.ts`. Let's create a custom request logger middleware.

Run the middleware generator command:
```bash
cem add middleware requestLogger
```

### 📂 What Just Happened?
The CLI automatically created `src/app/middlewares/requestLogger.middleware.ts` with clean boilerplate using the `catchAsync` wrapper.

Let's implement the logger logic:
```typescript
import { NextFunction, Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import logger from '../utils/logger';

const requestLogger = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Incoming Request ➔ [${req.method}] ${req.originalUrl}`);
  next();
});

export default requestLogger;
```

### Register the Middleware Globally
Open `src/app.ts`, import your new middleware, and use it right after initialization:

```typescript
import requestLogger from './app/middlewares/requestLogger.middleware';

// ... upper codes
const app: Application = express();

app.use(requestLogger); // Global logger registered!
```

---

## 📊 Step 6: Listing Project Architecture Overview (`cem list`)

Want a birds-eye overview of what's inside your project? Run:
```bash
cem list
```

CEM will inspect your working directory and output an aesthetic dashboard report directly in your terminal:
```
  ────────────────────────────────────────────────────
  [CEM]  taskflow-api  project overview
  ────────────────────────────────────────────────────

  ◆  Modules  src/app/modules/

     ◈  Auth    ● wired
     ◈  Task    ● wired
        ·  task.constant.ts
        ·  task.controller.ts
        ·  task.interface.ts
        ·  task.model.ts
        ·  task.route.ts
        ·  task.service.ts
        ·  task.validation.ts

  ◆  Middlewares  src/app/middlewares/

     ◇  auth.middleware.ts                 [core]
     ◇  globalErrorHandler.middleware.ts   [core]
     ◇  notFound.middleware.ts             [core]
     ◇  rateLimiter.middleware.ts          [core]
     ◈  requestLogger.middleware.ts

  ◆  Environment Variables  .env

     ◈  NODE_ENV          development
     ◈  PORT              5000
     ◈  MONGO_URI         mongodb://localhost:27017/taskflow
     ◈  RESEND_API_KEY    <hidden>
     ◈  JWT_ACCESS_SECRET <hidden>
```
*   **● wired**: Verified that your router configuration in `src/app/routes/index.ts` is fully wired.
*   **◇ [core] / ◈ [custom]**: Differentiates core CLI components from your custom implementations.
*   **Auto Masking**: Important credentials (like secrets or API keys) are hidden for security.

---

## 🏗️ Step 7: Compiling and Guarding the App (`cem build`)

Let's prepare our app for production compilation. Run:
```bash
cem build
```

This triggers the CEM **triple-guard build safety pipeline** before invoking `tsc`:

```
  ◆  Running Middleware Convention Guard…
  ✔  Middleware naming convention valid.

  ◆  Running Architecture Guard…
  ✔  Architecture validation passed.

  ◆  Compiling TypeScript…
  ✔  Build successful.  924ms
```

### 🛡️ How the Guards Protect Your App

#### 1. Middleware Convention Guard
Ensures that all `.ts` files inside `src/app/middlewares/` strictly end with `.middleware.ts`. If we rename `requestLogger.middleware.ts` to `requestLogger.ts`, the build aborts immediately:

```
  ✖  Middleware naming violation: 'requestLogger.ts'
     ·  Expected: 'requestLogger.middleware.ts'
     ·  Rename the file and update any imports that reference it.

  ✖  Build aborted — all middleware files must follow the <name>.middleware.ts convention.
```

#### 2. Architecture Guard
Scans `src/app/modules/` to ensure modular files match the expected module prefix (e.g. `task.controller.ts` instead of `controller.ts`). It also warns you about:
*   **Orphan Modules**: Folders that have no route hookups in `src/app/routes/index.ts`.
*   **Missing Files**: Modules missing required core components like controllers, routes, or services.

---

## 🔍 Step 8: Automated Quality Checking (`cem check`)

CEM sets up an out-of-the-box pipeline to enforce clean formatting and code safety. Run:
```bash
cem check
```
*(Alternatively, run `npm run check`)*

This runs a rapid multi-tool validator with custom formatting:

```
  [CEM]  cem check  type · lint · format
  ──────────────────────────────────────────────────────

  ◆  Type check (tsc)…          ✔  384ms
  ◆  Lint (eslint)…             ✔  1.12s
  ◆  Format check (prettier)…   ✔  240ms

  ──────────────────────────────────────────────────────

  ◆  All checks passed.  (3/3)
```

If any errors occur, the stack trace and linting output will print inline directly under the failed step so you can fix them immediately.

---

## 🗑️ Step 9: Deleting Components Safely (`cem remove`)

If you want to remove an environment key, custom middleware, or a feature module, CEM includes interactive, destructive guards to prevent accidental file deletion.

### Remove an Environment Variable
```bash
cem remove env RESEND_API_KEY
```
This cleanly scrubs the key out of `.env`, `.env.example`, and your type-safe `src/app/config/index.ts`.

### Remove a Custom Middleware
```bash
cem remove middleware requestLogger
```
Prompts for confirmation before permanently deleting `requestLogger.middleware.ts`.
*Note: Core middlewares (`auth`, `globalErrorHandler`, `notFound`, `rateLimiter`) are protected and cannot be deleted.*

### Remove a Module
```bash
cem remove module Task
```
Prompts for confirmation, then deletes `src/app/modules/Task/` and **automatically unwires the route import & registration** in `src/app/routes/index.ts`!

---

## 🐳 Step 10: Dockerized Deployment

Since we selected **Yes** to Docker during setup, CEM prepared our production environment out of the box.

### `docker-compose.yml`
CEM automatically configures a primary app service and the **correct database sidecar** (using `mongo:7` for Mongoose, or `postgres:16-alpine` for Drizzle/Prisma).

```yaml
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGO_URI=mongodb://db:27017/taskflow
    depends_on:
      - db

  db:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

### Launch the Stack
Start your production application and database sidecar locally:
```bash
docker-compose up --build
```

Your app is built using a secure multi-stage compilation in `Dockerfile` and is exposed at `http://localhost:5000` with the MongoDB database sidecar ready!

---

## 🎉 Conclusion

Congratulations! You have built a fully secure, structured, and guarded Express + Mongoose + Zod backend using **create-express-modular**.

By using CEM, you benefit from:
1.  **Fast Scaffolding**: Spin up new production API structures in under a minute.
2.  **Strict Architectural Consistency**: Zero drift with middleware conventions and module guards.
3.  **Ultimate Safety**: Automatic unwiring on deletion and masking secrets on lists.
4.  **Instant Deployment**: Multi-stage docker setups ready out of the box.

Happy coding! 🚀
