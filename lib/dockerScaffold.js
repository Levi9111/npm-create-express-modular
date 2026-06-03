'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Writes Dockerfile, .dockerignore, and docker-compose.yml
 * into the scaffolded project root.
 *
 * @param {string} projectPath  - Absolute path to the generated project
 * @param {string} projectName  - The project name (used in compose service name)
 * @param {string} db           - e.g. 'mongoose' | 'prisma' | 'drizzle'
 */
function scaffoldDocker(projectPath, projectName, db) {
    const serviceName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // ── Dockerfile ────────────────────────────────────────────────────────────
    fs.writeFileSync(
        path.join(projectPath, 'Dockerfile'),
        _buildDockerfile(),
    );

    // ── .dockerignore ─────────────────────────────────────────────────────────
    fs.writeFileSync(
        path.join(projectPath, '.dockerignore'),
        _buildDockerignore(),
    );

    // ── docker-compose.yml ────────────────────────────────────────────────────
    fs.writeFileSync(
        path.join(projectPath, 'docker-compose.yml'),
        _buildCompose(serviceName, db),
    );
}

// ─── TEMPLATES ───────────────────────────────────────────────────────────────
function _buildDockerfile() {
    return `# ── Build stage ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci

# Copy source and compile
COPY . .
RUN npm run build

# ── Production stage ───────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output
COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Run as a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "dist/server.js"]
`;
}

function _buildDockerignore() {
    return `# Dependencies
node_modules/
npm-debug.log*

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

function _buildCompose(serviceName, db) {
    const dbService = _getDbService(db);
    const envBlock  = _getEnvBlock(db);
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

function _getDbService(db) {
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

function _getEnvBlock(db) {
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

module.exports = { scaffoldDocker };
