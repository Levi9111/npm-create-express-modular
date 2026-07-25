/**
 * src/lib/dev.ts
 *
 * Implements `cem dev` — spawns `tsx watch src/server.ts` and re-formats
 * every output line with a timestamp and semantic colour coding.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';


const R = '\x1b[0m';
const ESC = '\x1b[';

const NO_COLOR = !process.stdout.isTTY || Boolean(process.env.NO_COLOR);
const paint = (code: string, s: string): string => (NO_COLOR ? s : `${code}${s}${R}`);

const bold = (s: string): string => paint(`${ESC}1m`, s);
const dim = (s: string): string => paint(`${ESC}2m`, s);
const cyan = (s: string): string => paint(`${ESC}96m`, s);
const green = (s: string): string => paint(`${ESC}92m`, s);
const yellow = (s: string): string => paint(`${ESC}93m`, s);
const gray = (s: string): string => paint(`${ESC}90m`, s);
const white = (s: string): string => paint(`${ESC}97m`, s);
const magenta = (s: string): string => paint(`${ESC}95m`, s);
const red = (s: string): string => paint(`${ESC}91m`, s);
const bgCyan = (s: string): string =>
  NO_COLOR ? `[${s}]` : `${ESC}46m${ESC}1m${ESC}30m ${s} ${R}`;

const stripAnsi = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, '');


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
  return gray(`${date} ${time}`);
}

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


function printDevBanner(projectName: string): void {
  const line = gray('─'.repeat(54));
  console.log();
  console.log(`  ${line}`);
  console.log();
  console.log(`  ${bgCyan('CEM')}  ${bold(cyan('create-express-modular'))}  ${gray('dev server')}`);
  console.log();
  console.log(`  ${gray('◆')}  ${white('Project')}   ${cyan(bold(projectName))}`);
  console.log(`  ${gray('◆')}  ${white('Entry')}     ${dim('src/server.ts')}`);
  console.log(`  ${gray('◆')}  ${white('Started')}   ${timestamp()}`);
  console.log();
  console.log(`  ${line}`);
  console.log();
}

function formatLine(raw: string): string | null {
  const line = raw.trimEnd();
  if (!line) return null;

  const plain = stripAnsi(line);
  const ts = timestamp();

  if (plain.match(/(restarting|reloading|↺)/i)) {
    return `  ${yellow('↻')}  ${yellow('Restarting…')}  ${ts}`;
  }
  if (plain.match(/(ready in|✓)/i)) {
    return `  ${green('◆')}  ${green(plain)}  ${ts}`;
  }
  if (plain.match(/\[(COMPILATION\s+)?ERROR\]/i) || plain.match(/error TS\d+/i)) {
    return `  ${red('✖')}  ${red(plain)}`;
  }
  if (plain.match(/\.(ts|tsx)\(\d+,\d+\)/)) {
    return `  ${red('  ')}  ${red(plain)}`;
  }
  if (plain.match(/(server|listening|running|started|connected|ready)/i)) {
    return `  ${green('▲')}  ${green(bold(plain))}  ${ts}`;
  }
  if (plain.match(/(mongodb|postgres|mysql|mariadb|connected|database)/i)) {
    return `  ${magenta('◈')}  ${magenta(plain)}`;
  }
  if (plain.match(/warn(ing)?/i)) {
    return `  ${yellow('⚠')}  ${yellow(plain)}`;
  }
  return `  ${gray('·')}  ${white(plain)}`;
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
    console.log();
    if (code === 0 || code === null) {
      console.log(`  ${green('◆')}  ${green('Dev server stopped.')}`);
    } else {
      console.log(`  ${red('✖')}  ${red(`Dev server exited with code ${code}`)}`);
    }
    console.log();
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    console.log();
    console.log(`  ${yellow('◆')}  ${yellow('Shutting down dev server…')}`);
    child.kill('SIGINT');
  });
}
