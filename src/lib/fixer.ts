/**
 * src/lib/fixer.ts
 *
 * Implements `cem fix` — runs ESLint auto-fix and Prettier formatting
 * in sequence to resolve lint and format issues automatically.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as ui from './ui';

const execAsync = promisify(exec);

interface FixTask {
  label: string;
  cmd: string;
}

interface FixResult {
  label: string;
  passed: boolean;
  durationMs: number;
  output?: string;
}

async function runFixTask(task: FixTask, cwd: string): Promise<FixResult> {
  const start = Date.now();
  try {
    await execAsync(task.cmd, { cwd });
    return {
      label: task.label,
      passed: true,
      durationMs: Date.now() - start,
    };
  } catch (e: unknown) {
    const errObj = e as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
    const out = (errObj.stdout || errObj.stderr || errObj.message || '').toString().trim();
    return {
      label: task.label,
      passed: false,
      durationMs: Date.now() - start,
      output: out,
    };
  }
}

/**
 * Runs `cem fix` pipeline — ESLint auto-fix followed by Prettier format.
 */
export async function runFix(): Promise<void> {
  const cwd = process.cwd();

  ui.nl();
  console.log(
    `  ${ui.bgCyan('CEM')}  ${ui.bold(ui.cyan('cem fix'))}  ${ui.gray('lint:fix · format:fix')}`,
  );
  console.log(`  ${ui.gray('─'.repeat(50))}`);
  ui.nl();

  const tasks: FixTask[] = [
    { label: 'Fixing lint issues (eslint --fix)…', cmd: 'node_modules/.bin/eslint src --fix' },
    { label: 'Fixing format issues (prettier)…', cmd: 'node_modules/.bin/prettier --write src' },
  ];

  const TICK = ui.green('✔');
  const CROSS = ui.red('✖');
  const pad = 40;

  const results: FixResult[] = [];

  for (const task of tasks) {
    const result = await runFixTask(task, cwd);
    results.push(result);

    const display = `${ui.cyan('◆')}  ${ui.white(result.label.padEnd(pad))}`;
    const timing = ui.gray(`${result.durationMs}ms`);

    if (result.passed) {
      console.log(`  ${display}${TICK}  ${timing}`);
    } else {
      console.log(`  ${display}${CROSS}  ${timing}`);
      if (result.output) {
        result.output
          .split('\n')
          .slice(0, 15)
          .forEach((line: string) => {
            console.log(`       ${ui.red(line)}`);
          });
      }
    }
  }

  ui.nl();
  console.log(`  ${ui.gray('─'.repeat(50))}`);
  ui.nl();

  const allPassed = results.every((r) => r.passed);

  if (allPassed) {
    console.log(
      `  ${ui.green('◆')}  ${ui.bold(ui.green('All fixes applied.'))}  ${ui.gray(`(${results.length}/${results.length})`)}`,
    );
  } else {
    const failed = results.filter((r) => !r.passed).length;
    console.log(
      `  ${ui.red('✖')}  ${ui.bold(ui.red(`${failed} fix step${failed > 1 ? 's' : ''} had issues.`))}  ${ui.gray('Some errors may require manual intervention.')}`,
    );
  }

  ui.nl();
  process.exit(allPassed ? 0 : 1);
}
