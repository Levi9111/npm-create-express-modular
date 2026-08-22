/**
 * src/lib/checker.ts
 *
 * Implements `cem check` — runs TypeScript type-checking, ESLint, and
 * Prettier in sequence and prints a compact pass/fail summary.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { detectPM, runScript } from './pm';
import * as ui from './ui';

const execAsync = promisify(exec);

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

interface CheckTask {
  id: string;
  label: string;
  cmd: string;
}

interface CheckResult {
  id: string;
  label: string;
  passed: boolean;
  durationMs: number;
  output?: string;
}

async function runTask(task: CheckTask, cwd: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    await execAsync(task.cmd, { cwd });
    return {
      id: task.id,
      label: task.label,
      passed: true,
      durationMs: Date.now() - start,
    };
  } catch (e: unknown) {
    const errObj = e as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
    const out = (
      errObj.stdout ||
      errObj.stderr ||
      errObj.message ||
      ''
    )
      .toString()
      .trim();
    return {
      id: task.id,
      label: task.label,
      passed: false,
      durationMs: Date.now() - start,
      output: out,
    };
  }
}

export async function runCheck(): Promise<void> {
  const cwd = process.cwd();

  console.log();
  console.log(
    `  ${bgCyan('CEM')}  ${bold(cyan('cem check'))}  ${gray('type · lint · format (concurrent)')}`,
  );
  console.log(`  ${gray('─'.repeat(50))}`);
  console.log();

  const tasks: CheckTask[] = [
    { id: 'types', label: 'Type check (tsc)…', cmd: 'node_modules/.bin/tsc --noEmit' },
    { id: 'lint', label: 'Lint (eslint)…', cmd: 'node_modules/.bin/eslint src' },
    { id: 'format', label: 'Format check (prettier)…', cmd: 'node_modules/.bin/prettier --check src' },
  ];

  const results = await Promise.all(tasks.map((task) => runTask(task, cwd)));

  const TICK = green('✔');
  const CROSS = red('✖');
  const pad = 24;

  results.forEach((res) => {
    const display = `${cyan('◆')}  ${white(res.label.padEnd(pad))}`;
    const timing = gray(`${res.durationMs}ms`);
    if (res.passed) {
      console.log(`  ${display}${TICK}  ${timing}`);
    } else {
      console.log(`  ${display}${CROSS}  ${timing}`);
      if (res.output) {
        res.output
          .split('\n')
          .slice(0, 20)
          .forEach((line: string) => {
            console.log(`       ${red(line)}`);
          });
      }
    }
  });

  console.log();
  console.log(`  ${gray('─'.repeat(50))}`);
  console.log();

  const passed = results.every((r) => r.passed);
  const total = results.length;
  const failed = results.filter((r) => !r.passed).length;

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
