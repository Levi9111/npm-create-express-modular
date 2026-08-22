/**
 * src/lib/updateNotifier.ts
 *
 * Non-blocking npm update check. Queries the npm registry in the background
 * and compares the result against the currently-installed version.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CACHE_FILE = path.join(os.tmpdir(), 'create-express-modular-update.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface UpdateCache {
  timestamp: number;
  latestVersion: string | null;
}

function readCache(): string | null | undefined {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as UpdateCache;
      if (typeof data.timestamp === 'number' && Date.now() - data.timestamp < CACHE_TTL_MS) {
        return data.latestVersion;
      }
    }
  } catch {
    /* ignore corrupted cache */
  }
  return undefined;
}

function writeCache(latestVersion: string | null): void {
  try {
    const data: UpdateCache = {
      timestamp: Date.now(),
      latestVersion,
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data), 'utf8');
  } catch {
    /* non-fatal */
  }
}

/**
 * Non-blocking check for the latest version on npm with 24-hour local caching.
 * Returns a Promise that resolves to the latest version string or null.
 */
export function checkForUpdates(): Promise<string | null> {
  const cached = readCache();
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve) => {
    const req = https.get(
      'https://registry.npmjs.org/create-express-modular/latest',
      { timeout: 1500 },
      (res) => {
        if (res.statusCode !== 200) {
          writeCache(null);
          return resolve(null);
        }
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as { version?: string };
            const ver = parsed.version ?? null;
            writeCache(ver);
            resolve(ver);
          } catch {
            writeCache(null);
            resolve(null);
          }
        });
      },
    );

    req.on('error', () => {
      resolve(null);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Simple semver comparison — returns true if latest is strictly greater than current.
 */
export function isUpdateAvailable(
  current: string | null,
  latest: string | null,
): boolean {
  if (!current || !latest || current === latest) return false;

  const strip = (v: string): string => v.replace(/^v/, '').split('-')[0];

  const cParts = strip(current).split('.').map(Number);
  const lParts = strip(latest).split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (lParts[i] > (cParts[i] || 0)) return true;
    if (lParts[i] < (cParts[i] || 0)) return false;
  }
  return false;
}
