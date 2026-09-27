import os from 'node:os';
import { randomUUID } from 'node:crypto';

const ENDPOINT =
  'https://create-express-modular.lovable.app/api/public/install-ping';

export interface TelemetryPayload {
  command: string;
  cliVersion: string;
  packageManager: string;
  nodeVersion: string;
  os: string;
  anonId: string;
}

/**
 * Sends an anonymous telemetry ping after a successful scaffold.
 * Respects CEM_TELEMETRY=off to allow opting out.
 *
 * @param command - The CLI subcommand that ran (default: 'create').
 * @param cliVersion - Optional CLI version string.
 * @param packageManager - Optional package manager used.
 */
export async function reportInstall(
  command = 'create',
  cliVersion?: string,
  packageManager?: string,
): Promise<void> {
  if (process.env.CEM_TELEMETRY === 'off') return;

  let fallbackVersion = 'unknown';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    fallbackVersion = require('../package.json').version;
  } catch {
    /* ignore */
  }

  const payload: TelemetryPayload = {
    command,
    cliVersion:
      cliVersion || process.env.npm_package_version || fallbackVersion || 'unknown',
    packageManager:
      packageManager || (process.env.npm_config_user_agent ?? '').split('/')[0] || 'npm',
    nodeVersion: process.version,
    os: `${os.platform()}-${os.arch()}`,
    anonId: randomUUID(),
  };

  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* telemetry must never break a scaffold */
  }
}
