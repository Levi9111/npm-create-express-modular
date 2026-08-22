/**
 * src/lib/ui.ts
 *
 * All terminal output for create-express-modular.
 * Zero external dependencies — pure Node.js ANSI escape codes.
 * Every console.log in the CLI goes through this module.
 */

import type { SummaryOptions, Spinner, PackageManager } from './types';

const ESC = '\x1b[';
const R = '\x1b[0m'; // reset

const CODES: Record<string, string> = {
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  cyan: `${ESC}36m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  magenta: `${ESC}35m`,
  gray: `${ESC}90m`,
  white: `${ESC}37m`,
  brightCyan: `${ESC}96m`,
  brightGreen: `${ESC}92m`,
  brightYellow: `${ESC}93m`,
  brightMagenta: `${ESC}95m`,
  brightWhite: `${ESC}97m`,
  bgCyan: `${ESC}46m`,
};

// Check if the terminal supports color (respects NO_COLOR and non-TTY pipes)
const NO_COLOR = !process.stdout.isTTY || Boolean(process.env.NO_COLOR);
const paint = (code: string, str: string): string =>
  NO_COLOR ? str : `${code}${str}${R}`;

export const bold = (s: string): string => paint(CODES.bold, s);
export const dim = (s: string): string => paint(CODES.dim, s);
export const cyan = (s: string): string => paint(CODES.brightCyan, s);
export const green = (s: string): string => paint(CODES.brightGreen, s);
export const yellow = (s: string): string => paint(CODES.brightYellow, s);
export const gray = (s: string): string => paint(CODES.gray, s);
export const white = (s: string): string => paint(CODES.brightWhite, s);
export const magenta = (s: string): string => paint(CODES.brightMagenta, s);

// Strip ANSI codes — used to compute visible string length for box padding
const stripAnsi = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, '');
const visLen = (s: string): number => stripAnsi(s).length;

// ─── BADGE ───────────────────────────────────────────────────────────────────
export const badge = (text: string): string =>
  NO_COLOR
    ? `[${text}]`
    : `${CODES.bgCyan}${CODES.bold}${CODES.white} ${text} ${R}`;

// ─── BANNER ───────────────────────────────────────────────────────────────────
export function printBanner(version = ''): void {
  const line = gray('─'.repeat(52));
  const ver = version ? gray(`v${version}`) : '';
  console.log();
  console.log(line);
  console.log();
  console.log(`  ${badge('CEM')}  ${bold(cyan('create-express-modular'))}  ${ver}`);
  console.log();
  console.log(`  ${gray('Modular Express + TypeScript — production-ready')}`);
  console.log();
  console.log(line);
  console.log();
}

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
export function sectionHeader(label: string): void {
  console.log();
  console.log(`  ${gray('┄'.repeat(46))}`);
  console.log(`  ${bold(gray(label))}`);
  console.log(`  ${gray('┄'.repeat(46))}`);
  console.log();
}

// ─── STEP / LOG PRIMITIVES ───────────────────────────────────────────────────
/** Key–value config line:  ◆  Label    value  */
export function step(label: string, value = ''): void {
  const val = value ? `  ${gray(value)}` : '';
  console.log(`  ${cyan('◆')}  ${white(label)}${val}`);
}

/** Indented file/detail line  ·  path  */
export function substep(label: string): void {
  console.log(`     ${gray('·')}  ${gray(label)}`);
}

/** ✔  Success message */
export function success(label: string): void {
  console.log(`  ${green('✔')}  ${label}`);
}

/** ⚠  Warning message */
export function warn(label: string): void {
  console.log(`  ${yellow('⚠')}  ${yellow(label)}`);
}

/** ✖  Error message */
export function err(label: string): void {
  console.log(`  ${magenta('✖')}  ${magenta(label)}`);
}

/** Blank line shorthand */
export const nl = (): void => { console.log(); };

// ─── SPINNER ─────────────────────────────────────────────────────────────────
export function spinner(label: string): Spinner {
  if (NO_COLOR || !process.stdout.isTTY) {
    process.stdout.write(`  … ${label}\n`);
    return {
      succeed: (msg: string) => success(msg),
      fail: (msg: string) => err(msg),
    };
  }

  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const pad = ' '.repeat(label.length + 12);

  const id = setInterval(() => {
    process.stdout.write(
      `\r  ${CODES.brightCyan}${frames[i++ % frames.length]}${R}  ${gray(label)}   `,
    );
  }, 80);

  const stop = (): void => {
    clearInterval(id);
    process.stdout.write(`\r${pad}\r`);
  };

  return {
    succeed(msg: string) {
      stop();
      success(msg);
    },
    fail(msg: string) {
      stop();
      err(msg);
    },
  };
}

// ─── SUMMARY BOX ─────────────────────────────────────────────────────────────
export function printSummary({ name, db, validator, auth, docker }: SummaryOptions): void {
  const W = 48;

  const border = (l: string, _m: string, r: string): string =>
    `  ${gray(l + '─'.repeat(W) + r)}`;

  const blankRow = (): string =>
    `  ${gray('│')}${' '.repeat(W)}${gray('│')}`;

  const dataRow = (
    label: string,
    value: string,
    colorFn: (s: string) => string = cyan,
  ): string => {
    const labelStr = gray(label.padEnd(14));
    const valueStr = colorFn(value);
    const pad = ' '.repeat(Math.max(0, W - 16 - visLen(value)));
    return `  ${gray('│')}  ${labelStr}${valueStr}${pad}  ${gray('│')}`;
  };

  console.log();
  console.log(border('╭', '─', '╮'));
  console.log(blankRow());
  const title = bold(cyan('Project ready!'));
  const titlePad = ' '.repeat(W - 2 - visLen('Project ready!'));
  console.log(`  ${gray('│')}  ${title}${titlePad}${gray('│')}`);
  console.log(blankRow());
  console.log(border('├', '─', '┤'));
  console.log(blankRow());
  console.log(dataRow('Name', name, white));
  console.log(dataRow('Database', db, cyan));
  console.log(dataRow('Validator', validator, magenta));
  console.log(dataRow('Auth', auth ? 'yes' : 'no', auth ? green : gray));
  console.log(dataRow('Docker', docker ? 'yes' : 'no', docker ? green : gray));
  console.log(blankRow());
  console.log(border('╰', '─', '╯'));
  console.log();
}

// ─── NEXT STEPS ──────────────────────────────────────────────────────────────
export function printNextSteps(projectName: string): void {
  console.log(`  ${bold('Next steps')}`);
  console.log();
  console.log(`  ${gray('1.')}  ${cyan('cd')} ${white(projectName)}`);
  console.log(`  ${gray('2.')}  ${cyan('cem')} ${white('dev')}`);
  console.log(`  ${gray('3.')}  ${cyan('cem add module')} ${white('Product')}`);
  console.log(`  ${gray('4.')}  ${cyan('cem build')}`);
  console.log(`  ${gray('5.')}  ${cyan('cem start')}`);
  console.log();
  console.log(
    `  ${gray('Docs →')}  ${gray('https://github.com/Levi9111/npm-create-express-modular')}`,
  );
  console.log();
}

export function printUpdateNotice(current: string, latest: string, pm: PackageManager = 'npm'): void {
  const W = 52;
  const border = (l: string, _m: string, r: string): string =>
    `  ${yellow(l + '─'.repeat(W) + r)}`;
  const blankRow = (): string => `  ${yellow('│')}${' '.repeat(W)}${yellow('│')}`;

  console.log();
  console.log(border('╭', '─', '╮'));
  console.log(blankRow());

  const title = `Update available! ${dim(current)} → ${green(latest)}`;
  const pad1 = ' '.repeat(Math.max(0, W - visLen(title) - 4));
  console.log(`  ${yellow('│')}    ${title}${pad1}${yellow('│')}`);

  console.log(blankRow());

  const globalCmd = ({ npm: 'npm i -g', yarn: 'yarn global add', pnpm: 'pnpm add -g', bun: 'bun add -g' } as Record<PackageManager, string>)[pm] || 'npm i -g';
  const cmd = `Run ${cyan(`${globalCmd} create-express-modular`)} to update`;
  const pad2 = ' '.repeat(Math.max(0, W - visLen(cmd) - 4));
  console.log(`  ${yellow('│')}    ${cmd}${pad2}${yellow('│')}`);

  console.log(blankRow());
  console.log(border('╰', '─', '╯'));
  console.log();
}

export function printModuleBanner(): void {
  console.log();
  console.log(`  ${cyan('◆')}  ${bold(white('CEM'))}  ${gray('module generator')}`);
  console.log();
}

export function printModuleSuccess(
  moduleName: string,
  routePath: string,
  validator: string,
  extras: string[] = [],
): void {
  console.log();
  success(`Module ${bold(cyan(moduleName))} created`);
  console.log();
  substep(`src/app/modules/${moduleName}/`);
  substep(`  ${gray('→')} controller, service, route, model, interface, validation`);
  extras.forEach((f) => substep(`  ${gray('→')} ${f}`));
  console.log();
  console.log(`  ${gray('Route:')}      ${cyan(routePath)}`);
  console.log(`  ${gray('Validator:')}  ${magenta(validator)}`);
  console.log();
}

export function abort(message: string): never {
  console.log();
  err(message);
  console.log();
  process.exit(1);
}