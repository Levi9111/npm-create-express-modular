/**
 * src/lib/testScaffold.ts
 *
 * Scaffolds Vitest + Supertest testing configuration and an initial
 * `/health` integration test when `--testing` is enabled.
 */

import fs from 'fs';
import path from 'path';

export function scaffoldTesting(projectPath: string): void {
  const vitestConfig = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
`;

  const healthTest = `import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Health Check', () => {
  it('GET /health returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
`;

  fs.writeFileSync(path.join(projectPath, 'vitest.config.ts'), vitestConfig);
  const testDir = path.join(projectPath, 'src/__tests__');
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'health.test.ts'), healthTest);
}

