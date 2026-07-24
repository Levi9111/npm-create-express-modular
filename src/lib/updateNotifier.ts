'use strict';

import https from 'https';

/**
 * Non-blocking check for the latest version on npm.
 * Returns a Promise that resolves to the latest version string or null.
 */
export function checkForUpdates(): Promise<string | null> {
  return new Promise((resolve) => {
    const req = https.get(
      'https://registry.npmjs.org/create-express-modular/latest',
      { timeout: 1500 },
      (res) => {
        if (res.statusCode !== 200) {
          return resolve(null);
        }
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as { version?: string };
            resolve(parsed.version ?? null);
          } catch {
            resolve(null);
          }
        });
      },
    );

    req.on('error', () => resolve(null));
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
