'use strict';

/**
 * lib/ui.js
 *
 * All terminal output for create-express-modular.
 * Zero external dependencies — pure Node.js ANSI escape codes.
 * Every console.log in the CLI goes through this module.
 */

// ─── ANSI PRIMITIVES ─────────────────────────────────────────────────────────
const ESC = '\x1b[';
const R   = '\x1b[0m'; // reset

const CODES = {
  bold:          `${ESC}1m`,
  dim:           `${ESC}2m`,
  cyan:          `${ESC}36m`,
  green:         `${ESC}32m`,
  yellow:        `${ESC}33m`,
  magenta:       `${ESC}35m`,
  gray:          `${ESC}90m`,
  white:         `${ESC}37m`,
  brightCyan:    `${ESC}96m`,
  brightGreen:   `${ESC}92m`,
  brightYellow:  `${ESC}93m`,
  brightMagenta: `${ESC}95m`,
  brightWhite:   `${ESC}97m`,
  bgCyan:        `${ESC}46m`,
};

// Check if the terminal supports color (respects NO_COLOR and non-TTY pipes)
const NO_COLOR = !process.stdout.isTTY || process.env.NO_COLOR;
const paint = (code, str) => NO_COLOR ? str : `${code}${str}${R}`;

const bold    = (s) => paint(CODES.bold,          s);
const dim     = (s) => paint(CODES.dim,           s);
const cyan    = (s) => paint(CODES.brightCyan,    s);
const green   = (s) => paint(CODES.brightGreen,   s);
const yellow  = (s) => paint(CODES.brightYellow,  s);
const gray    = (s) => paint(CODES.gray,          s);
const white   = (s) => paint(CODES.brightWhite,   s);
const magenta = (s) => paint(CODES.brightMagenta, s);

// Strip ANSI codes — used to compute visible string length for box padding
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const visLen    = (s) => stripAnsi(s).length;

// ─── BADGE ───────────────────────────────────────────────────────────────────
const badge = (text) =>
  NO_COLOR
    ? `[${text}]`
    : `${CODES.bgCyan}${CODES.bold}${CODES.white} ${text} ${R}`;

// ─── BANNER ───────────────────────────────────────────────────────────────────
function printBanner(version = '') {
  const line = gray('─'.repeat(52));
  const ver  = version ? gray(`v${version}`) : '';
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
function sectionHeader(label) {
  console.log();
  console.log(`  ${gray('┄'.repeat(46))}`);
  console.log(`  ${bold(gray(label))}`);
  console.log(`  ${gray('┄'.repeat(46))}`);
  console.log();
}

// ─── STEP / LOG PRIMITIVES ───────────────────────────────────────────────────
/** Key–value config line:  ◆  Label    value  */
function step(label, value = '') {
  const val = value ? `  ${gray(value)}` : '';
  console.log(`  ${cyan('◆')}  ${white(label)}${val}`);
}

/** Indented file/detail line  ·  path  */
function substep(label) {
  console.log(`     ${gray('·')}  ${gray(label)}`);
}

/** ✔  Success message */
function success(label) {
  console.log(`  ${green('✔')}  ${label}`);
}

/** ⚠  Warning message */
function warn(label) {
  console.log(`  ${yellow('⚠')}  ${yellow(label)}`);
}

/** ✖  Error message */
function err(label) {
  console.log(`  ${magenta('✖')}  ${magenta(label)}`);
}

/** Blank line shorthand */
const nl = () => console.log();

// ─── SPINNER ─────────────────────────────────────────────────────────────────
/**
 * Wraps a sync operation with a spinner.
 * Usage:
 *   const sp = spinner('Writing files...');
 *   doWork();
 *   sp.succeed('Files written');
 *   // or sp.fail('Failed to write files');
 */
function spinner(label) {
  if (NO_COLOR || !process.stdout.isTTY) {
    // Non-TTY fallback — just print the label, no animation
    process.stdout.write(`  … ${label}\n`);
    return {
      succeed: (msg) => success(msg),
      fail:    (msg) => err(msg),
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

  const stop = () => {
    clearInterval(id);
    process.stdout.write(`\r${pad}\r`);
  };

  return {
    succeed(msg) { stop(); success(msg); },
    fail(msg)    { stop(); err(msg);     },
  };
}

// ─── SUMMARY BOX ─────────────────────────────────────────────────────────────
/**
 * Renders the final project summary card.
 * @param {{ name: string, db: string, validator: string, auth: boolean }} opts
 */
function printSummary({ name, db, validator, auth }) {
  const W = 48; // inner width (between the │ borders)

  const border = (l, m, r) =>
    `  ${gray(l + '─'.repeat(W) + r)}`;

  const blankRow = () =>
    `  ${gray('│')}${' '.repeat(W)}${gray('│')}`;

  const dataRow = (label, value, colorFn = cyan) => {
    const labelStr = gray(label.padEnd(14));
    const valueStr = colorFn(value);
    const pad = ' '.repeat(Math.max(0, W - 16 - visLen(value)));
    return `  ${gray('│')}  ${labelStr}${valueStr}${pad}  ${gray('│')}`;
  };

  console.log();
  console.log(border('╭', '─', '╮'));
  console.log(blankRow());
  // Title row — manually padded
  const title = bold(cyan('Project ready!'));
  const titlePad = ' '.repeat(W - 2 - visLen('Project ready!'));
  console.log(`  ${gray('│')}  ${title}${titlePad}${gray('│')}`);
  console.log(blankRow());
  console.log(border('├', '─', '┤'));
  console.log(blankRow());
  console.log(dataRow('Name',      name,                white));
  console.log(dataRow('Database',  db,                  cyan));
  console.log(dataRow('Validator', validator,            magenta));
  console.log(dataRow('Auth',      auth ? 'yes' : 'no', auth ? green : gray));
  console.log(blankRow());
  console.log(border('╰', '─', '╯'));
  console.log();
}

// ─── NEXT STEPS ──────────────────────────────────────────────────────────────
function printNextSteps(projectName) {
  console.log(`  ${bold('Next steps')}`);
  console.log();
  console.log(`  ${gray('1.')}  ${cyan('cd')} ${white(projectName)}`);
  console.log(`  ${gray('2.')}  ${cyan('npm run')} ${white('start:dev')}`);
  console.log(`  ${gray('3.')}  ${cyan('cem add module')} ${white('Product')}`);
  console.log();
  console.log(
    `  ${gray('Docs →')}  ${gray('https://github.com/Levi9111/npm-create-express-modular')}`,
  );
  console.log();
}

// ─── MODULE GENERATOR OUTPUT ─────────────────────────────────────────────────
function printModuleBanner() {
  console.log();
  console.log(`  ${cyan('◆')}  ${bold(white('CEM'))}  ${gray('module generator')}`);
  console.log();
}

function printModuleSuccess(moduleName, routePath, validator, extras = []) {
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

// ─── ERROR / ABORT ────────────────────────────────────────────────────────────
function abort(message) {
  console.log();
  err(message);
  console.log();
  process.exit(1);
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────
module.exports = {
  // Primitives
  bold, dim, cyan, green, yellow, gray, white, magenta,
  // Components
  printBanner,
  sectionHeader,
  step,
  substep,
  success,
  warn,
  err,
  nl,
  spinner,
  printSummary,
  printNextSteps,
  printModuleBanner,
  printModuleSuccess,
  abort,
};
