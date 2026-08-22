/**
 * src/lib/dev.ts
 *
 * Implements `cem dev` — spawns `tsx watch src/server.ts` and re-formats
 * every output line with a timestamp and semantic colour coding.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as ui from './ui';

/**
 * Returns a formatted timestamp string (DD MMM YYYY HH:mm:ss).
 *
 * @returns Styled timestamp string.
 */
function timestamp(): string {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return ui.gray(`${date} ${time}`);
}

/**
 * Reads project name from target project's package.json.
 *
 * @param projectRoot - Absolute path to project root.
 * @returns Resolved project name or directory name fallback.
 */
function getProjectName(projectRoot: string): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
    ) as { name?: string };
    return pkg.name || path.basename(projectRoot);
  } catch {
    return path.basename(projectRoot);
  }
}

/**
 * Prints developer console header banner for `cem dev`.
 *
 * @param projectName - Name of current project.
 */
function printDevBanner(projectName: string): void {
  const line = ui.gray('─'.repeat(54));
  ui.nl();
  console.log(`  ${line}`);
  ui.nl();
  console.log(`  ${ui.bgCyan('CEM')}  ${ui.bold(ui.cyan('create-express-modular'))}  ${ui.gray('dev server')}`);
  ui.nl();
  console.log(`  ${ui.gray('◆')}  ${ui.white('Project')}   ${ui.cyan(ui.bold(projectName))}`);
  console.log(`  ${ui.gray('◆')}  ${ui.white('Entry')}     ${ui.dim('src/server.ts')}`);
  console.log(`  ${ui.gray('◆')}  ${ui.white('Started')}   ${timestamp()}`);
  ui.nl();
  console.log(`  ${line}`);
  ui.nl();
}

/**
 * Formats a raw stdout/stderr output line with color coding and timestamp.
 *
 * @param raw - Raw string output line from child process.
 * @returns Styled line string or null if empty.
 */
function formatLine(raw: string): string | null {
  const line = raw.trimEnd();
  if (!line) return null;

  const plain = ui.stripAnsi(line);
  const ts = timestamp();

  if (plain.match(/(restarting|reloading|↺)/i)) {
    return `  ${ui.yellow('↻')}  ${ui.yellow('Restarting…')}  ${ts}`;
  }
  if (plain.match(/(ready in|✓)/i)) {
    return `  ${ui.green('◆')}  ${ui.green(plain)}  ${ts}`;
  }
  if (plain.match(/\[(COMPILATION\s+)?ERROR\]/i) || plain.match(/error TS\d+/i)) {
    return `  ${ui.red('✖')}  ${ui.red(plain)}`;
  }
  if (plain.match(/\.(ts|tsx)\(\d+,\d+\)/)) {
    return `  ${ui.red('  ')}  ${ui.red(plain)}`;
  }
  if (plain.match(/(server|listening|running|started|connected|ready)/i)) {
    return `  ${ui.green('▲')}  ${ui.green(ui.bold(plain))}  ${ts}`;
  }
  if (plain.match(/(mongodb|postgres|mysql|mariadb|connected|database)/i)) {
    return `  ${ui.magenta('◈')}  ${ui.magenta(plain)}`;
  }
  if (plain.match(/warn(ing)?/i)) {
    return `  ${ui.yellow('⚠')}  ${ui.yellow(plain)}`;
  }
  return `  ${ui.gray('·')}  ${ui.white(plain)}`;
}

/**
 * Spawns `tsx watch src/server.ts` and formats all stdout/stderr lines.
 */
export function runDev(): void {
  const projectRoot = process.cwd();
  const projectName = getProjectName(projectRoot);

  printDevBanner(projectName);

  const child = spawn('node_modules/.bin/tsx', ['watch', 'src/server.ts'], {
    cwd: projectRoot,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  child.stdout!.setEncoding('utf8');
  child.stdout!.on('data', (chunk: string) => {
    chunk.split('\n').forEach((line) => {
      const formatted = formatLine(line);
      if (formatted !== null) console.log(formatted);
    });
  });

  child.stderr!.setEncoding('utf8');
  child.stderr!.on('data', (chunk: string) => {
    chunk.split('\n').forEach((line) => {
      const formatted = formatLine(line);
      if (formatted !== null) console.log(formatted);
    });
  });

  child.on('close', (code: number | null) => {
    ui.nl();
    if (code === 0 || code === null) {
      console.log(`  ${ui.green('◆')}  ${ui.green('Dev server stopped.')}`);
    } else {
      console.log(`  ${ui.red('✖')}  ${ui.red(`Dev server exited with code ${code}`)}`);
    }
    ui.nl();
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    ui.nl();
    console.log(`  ${ui.yellow('◆')}  ${ui.yellow('Shutting down dev server…')}`);
    child.kill('SIGINT');
  });
}
