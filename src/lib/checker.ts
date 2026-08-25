/**
 * src/lib/checker.ts
 *
 * Implements `cem check` — runs TypeScript type-checking, ESLint, and
 * Prettier in sequence and prints a compact pass/fail summary.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as ui from './ui';

const execAsync = promisify(exec);

/** Represents an individual system check task. */
interface CheckTask {
  id: string;
  label: string;
  cmd: string;
}

/** Result object returned from a single check task execution. */
interface CheckResult {
  id: string;
  label: string;
  passed: boolean;
  durationMs: number;
  output?: string;
}

/**
 * Runs a single verification command asynchronously and measures execution duration.
 *
 * @param task - Task object containing command and display label.
 * @param cwd - Working directory for process execution.
 * @returns Promise resolving to the task execution result.
 */
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

/**
 * Executes `cem check` pipeline — running TypeScript type checks, ESLint, and Prettier checks.
 * When `fix` is true, ESLint and Prettier run in auto-fix mode instead of check-only.
 *
 * @param fix - If true, runs lint and format in fix mode.
 */
export async function runCheck(fix = false): Promise<void> {
  const cwd = process.cwd();

  const modeLabel = fix ? 'type · lint:fix · format:fix' : 'type · lint · format (concurrent)';

  ui.nl();
  console.log(
    `  ${ui.bgCyan('CEM')}  ${ui.bold(ui.cyan(fix ? 'cem check --fix' : 'cem check'))}  ${ui.gray(modeLabel)}`,
  );
  console.log(`  ${ui.gray('─'.repeat(50))}`);
  ui.nl();

  const tasks: CheckTask[] = [
    { id: 'types', label: 'Type check (tsc)…', cmd: 'node_modules/.bin/tsc --noEmit' },
    {
      id: 'lint',
      label: fix ? 'Lint fix (eslint --fix)…' : 'Lint (eslint)…',
      cmd: fix ? 'node_modules/.bin/eslint src --fix' : 'node_modules/.bin/eslint src',
    },
    {
      id: 'format',
      label: fix ? 'Format fix (prettier --write)…' : 'Format check (prettier)…',
      cmd: fix ? 'node_modules/.bin/prettier --write src' : 'node_modules/.bin/prettier --check src',
    },
  ];

  const results = await Promise.all(tasks.map((task) => runTask(task, cwd)));

  const TICK = ui.green('✔');
  const CROSS = ui.red('✖');
  const pad = 24;

  results.forEach((res) => {
    const display = `${ui.cyan('◆')}  ${ui.white(res.label.padEnd(pad))}`;
    const timing = ui.gray(`${res.durationMs}ms`);
    if (res.passed) {
      console.log(`  ${display}${TICK}  ${timing}`);
    } else {
      console.log(`  ${display}${CROSS}  ${timing}`);
      if (res.output) {
        res.output
          .split('\n')
          .slice(0, 20)
          .forEach((line: string) => {
            console.log(`       ${ui.red(line)}`);
          });
      }
    }
  });

  ui.nl();
  console.log(`  ${ui.gray('─'.repeat(50))}`);
  ui.nl();

  const passed = results.every((r) => r.passed);
  const total = results.length;
  const failed = results.filter((r) => !r.passed).length;

  if (passed) {
    console.log(
      `  ${ui.green('◆')}  ${ui.bold(ui.green(fix ? 'All fixes applied & checks passed.' : 'All checks passed.'))}  ${ui.gray(`(${total}/${total})`)}`,
    );
  } else {
    console.log(
      `  ${ui.red('✖')}  ${ui.bold(ui.red(`${failed} check${failed > 1 ? 's' : ''} failed.`))}  ${ui.gray(`(${total - failed}/${total} passed)`)}`,
    );
    ui.nl();
    if (!fix) {
      console.log(
        `  ${ui.yellow('tip')}  ${ui.gray('Run')} ${ui.cyan('cem check --fix')} ${ui.gray('or')} ${ui.cyan('cem fix')} ${ui.gray('to auto-fix lint and format issues.')}`,
      );
    }
  }

  ui.nl();
  process.exit(passed ? 0 : 1);
}
