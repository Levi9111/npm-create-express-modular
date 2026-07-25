/**
 * src/lib/checker.ts
 *
 * Implements `cem check` — runs TypeScript type-checking, ESLint, and
 * Prettier in sequence and prints a compact pass/fail summary.
 */

import { execSync } from 'child_process';
import { detectPM, runScript } from './pm';
import * as ui from './ui';


const R = '\x1b[0m';
const ESC = '\x1b[';

const NO_COLOR = !process.stdout.isTTY || Boolean(process.env.NO_COLOR);
const paint = (code: string, s: string): string => (NO_COLOR ? s : `${code}${s}${R}`);

const bold = (s: string): string => paint(`${ESC}1m`, s);
const cyan = (s: string): string => paint(`${ESC}96m`, s);
const green = (s: string): string => paint(`${ESC}92m`, s);
const yellow = (s: string): string => paint(`${ESC}93m`, s);
const gray = (s: string): string => paint(`${ESC}90m`, s);
const white = (s: string): string => paint(`${ESC}97m`, s);
const red = (s: string): string => paint(`${ESC}91m`, s);
const bgCyan = (s: string): string =>
  NO_COLOR ? `[${s}]` : `${ESC}46m${ESC}1m${ESC}30m ${s} ${R}`;


function run(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: 'pipe' });
}

function step(label: string, fn: () => void): boolean {
  const TICK = green('✔');
  const CROSS = red('✖');
  const pad = 24;
  const display = `${cyan('◆')}  ${white(label.padEnd(pad))}`;

  process.stdout.write(`  ${display}`);
  const start = Date.now();

  try {
    fn();
    const ms = Date.now() - start;
    const timing = gray(`${ms}ms`);
    process.stdout.write(`${TICK}  ${timing}\n`);
    return true;
  } catch (e: unknown) {
    process.stdout.write(`${CROSS}\n`);
    const errObj = e as { stdout?: Buffer | string; stderr?: Buffer | string };
    const out = (
      errObj.stdout ||
      errObj.stderr ||
      (e instanceof Error ? e.message : '')
    )
      .toString()
      .trim();
    if (out) {
      out
        .split('\n')
        .slice(0, 20)
        .forEach((line: string) => {
          console.log(`       ${red(line)}`);
        });
    }
    return false;
  }
}


export function runCheck(): void {
  const cwd = process.cwd();

  console.log();
  console.log(
    `  ${bgCyan('CEM')}  ${bold(cyan('cem check'))}  ${gray('type · lint · format')}`,
  );
  console.log(`  ${gray('─'.repeat(50))}`);
  console.log();

  const results: Record<string, boolean> = {
    types: step('Type check (tsc)…', () => run('node_modules/.bin/tsc --noEmit', cwd)),
    lint: step('Lint (eslint)…', () => run('node_modules/.bin/eslint src', cwd)),
    format: step('Format check (prettier)…', () =>
      run('node_modules/.bin/prettier --check src', cwd),
    ),
  };

  console.log();
  console.log(`  ${gray('─'.repeat(50))}`);
  console.log();

  const passed = Object.values(results).every(Boolean);
  const total = Object.keys(results).length;
  const failed = Object.values(results).filter((v) => !v).length;

  if (passed) {
    console.log(
      `  ${green('◆')}  ${bold(green('All checks passed.'))}  ${gray(`(${total}/${total})`)}`,
    );
  } else {
    console.log(
      `  ${red('✖')}  ${bold(red(`${failed} check${failed > 1 ? 's' : ''} failed.`))}  ${gray(`(${total - failed}/${total} passed)`)}`,
    );
    console.log();
    const pm = detectPM();
    console.log(
      `  ${yellow('tip')}  ${gray('Run')} ${cyan(runScript(pm, 'lint:fix'))} ${gray('or')} ${cyan(runScript(pm, 'prettier:fix'))} ${gray('to auto-fix issues.')}`,
    );
  }

  console.log();
  process.exit(passed ? 0 : 1);
}
