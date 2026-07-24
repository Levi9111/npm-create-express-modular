'use strict';

import fs from 'fs';
import path from 'path';
import type { PackageManager, DbChoice } from './types';

export function scaffoldDocker(
  projectPath: string,
  projectName: string,
  db: DbChoice,
  pm: PackageManager = 'npm',
): void {
  const serviceName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  fs.writeFileSync(path.join(projectPath, 'Dockerfile'), _buildDockerfile(pm));
  fs.writeFileSync(path.join(projectPath, '.dockerignore'), _buildDockerignore(pm));
  fs.writeFileSync(
    path.join(projectPath, 'docker-compose.yml'),
    _buildCompose(serviceName, db),
  );
}

function _buildDockerfile(pm: PackageManager): string {
  const lockfile: Record<PackageManager, string> = {
    npm: 'package-lock.json',
    yarn: 'yarn.lock',
    pnpm: 'pnpm-lock.yaml',
  };

  const copyLock =
    pm === 'npm' ? 'COPY package*.json ./' : `COPY package.json ${lockfile[pm]} ./`;

  const pnpmSetup = pm === 'pnpm' ? '\nRUN corepack enable\n' : '';

  const buildCmd: Record<PackageManager, string> = {
    npm: 'npm run build',
    yarn: 'yarn build',
    pnpm: 'pnpm build',
  };

  const installAll: Record<PackageManager, string> = {
    npm: 'RUN npm ci',
    yarn: 'RUN yarn install --frozen-lockfile',
    pnpm: 'RUN pnpm install --frozen-lockfile',
  };

  const installProd: Record<PackageManager, string> = {
    npm: 'RUN npm ci --omit=dev && npm cache clean --force',
    yarn: 'RUN yarn install --frozen-lockfile --production && yarn cache clean',
    pnpm: 'RUN pnpm install --frozen-lockfile --prod',
  };

  return `# ── Build stage ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
${pnpmSetup}
# Install dependencies first (layer cache)
${copyLock}
${installAll[pm]}

# Copy source and compile
COPY . .
RUN ${buildCmd[pm]}

# ── Production stage ───────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
${pnpmSetup}
# Install only production deps
${copyLock}
${installProd[pm]}

# Copy compiled output
COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Run as a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "dist/server.js"]
`;
}

function _buildDockerignore(pm: PackageManager): string {
  const currentLock: Record<PackageManager, string> = {
    npm: 'package-lock.json',
    yarn: 'yarn.lock',
    pnpm: 'pnpm-lock.yaml',
  };

  const lockfiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
  const unusedLocks = lockfiles
    .filter((f) => f !== currentLock[pm])
    .join('\n');

  return `# Dependencies
node_modules/
npm-debug.log*

# Unused lock files
${unusedLocks}

# TypeScript build info
*.tsbuildinfo

# Environment files — never bake secrets into the image
.env
.env.*
!.env.example

# Git
.git/
.gitignore

# Editor
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Tests
coverage/
*.test.ts
*.spec.ts
`;
}

function _buildCompose(serviceName: string, db: DbChoice): string {
  const dbService = _getDbService(db);
  const envBlock = _getEnvBlock(db);
  const dependsOn = dbService ? `\n    depends_on:\n      - db` : '';

  return `version: '3.9'

services:
  ${serviceName}:
    build:
      context: .
      target: production
    ports:
      - '\${PORT:-5000}:5000'
    env_file:
      - .env
    environment:
      NODE_ENV: production
${envBlock}    restart: unless-stopped${dependsOn}
    networks:
      - app-network
${dbService}
networks:
  app-network:
    driver: bridge
`;
}

function _getDbService(db: DbChoice): string {
  switch (db) {
    case 'mongoose':
      return `
  db:
    image: mongo:7
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: \${MONGO_USER:-root}
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_PASSWORD:-secret}
      MONGO_INITDB_DATABASE: \${MONGO_DB:-appdb}
    ports:
      - '27017:27017'
    volumes:
      - mongo-data:/data/db
    networks:
      - app-network

volumes:
  mongo-data:
`;

    case 'prisma':
    case 'drizzle':
      return `
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${DB_USER:-postgres}
      POSTGRES_PASSWORD: \${DB_PASSWORD:-secret}
      POSTGRES_DB: \${DB_NAME:-appdb}
    ports:
      - '5432:5432'
    volumes:
      - pg-data:/var/lib/postgresql/data
    networks:
      - app-network

volumes:
  pg-data:
`;

    default:
      return '';
  }
}

function _getEnvBlock(db: DbChoice): string {
  switch (db) {
    case 'mongoose':
      return `      DATABASE_URL: mongodb://\${MONGO_USER:-root}:\${MONGO_PASSWORD:-secret}@db:27017/\${MONGO_DB:-appdb}?authSource=admin\n`;
    case 'prisma':
    case 'drizzle':
      return `      DATABASE_URL: postgresql://\${DB_USER:-postgres}:\${DB_PASSWORD:-secret}@db:5432/\${DB_NAME:-appdb}\n`;
    default:
      return '';
  }
}
