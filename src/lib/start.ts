/**
 * src/lib/start.ts
 *
 * Implements `cem start` — runs preflight checks then spawns the compiled
 * `dist/server.js` as a production Node.js process.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as ui from './ui';

/**
 * Runs the compiled production server.
 * Validates `dist/server.js` and `NODE_ENV` before spawning the process.
 */
export function runStart(): void {
  const projectRoot = process.cwd();

  // Preflight checks
  const distEntry = path.join(projectRoot, 'dist', 'server.js');

  if (!fs.existsSync(distEntry)) {
    ui.nl();
    ui.err('dist/server.js not found.');
    ui.substep('Run cem build before starting the production server.');
    ui.nl();
    process.exit(1);
  }

  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    ui.warn('NODE_ENV is not set — defaulting to production.');
  } else if (nodeEnv !== 'production') {
    ui.warn(`NODE_ENV is set to '${nodeEnv}' — expected 'production'.`);
  }

  // Banner
  const pkg = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
  ) as { name: string };

  const line = ui.gray('─'.repeat(54));
  console.log();
  console.log(`  ${line}`);
  console.log();
  console.log(`  ${ui.bold(ui.cyan('CEM'))}  ${ui.gray('production server')}`);
  console.log();
  console.log(`  ${ui.gray('◆')}  ${ui.white('Project')}   ${ui.cyan(ui.bold(pkg.name))}`);
  console.log(`  ${ui.gray('◆')}  ${ui.white('Entry')}     ${ui.gray('dist/server.js')}`);
  console.log(`  ${ui.gray('◆')}  ${ui.white('Node')}      ${ui.gray(process.version)}`);
  console.log();
  console.log(`  ${line}`);
  console.log();

  // Spawn
  const child = spawn('node', ['dist/server.js'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
    stdio: 'inherit',
  });

  child.on('close', (code: number | null) => {
    console.log();
    if (code === 0 || code === null) {
      console.log(`  ${ui.green('◆')}  ${ui.green('Server stopped.')}`);
    } else {
      console.log(`  ${ui.magenta('✖')}  ${ui.magenta(`Server exited with code ${code}`)}`);
    }
    console.log();
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    console.log();
    console.log(`  ${ui.yellow('◆')}  ${ui.yellow('Shutting down…')}`);
    child.kill('SIGINT');
  });
}
