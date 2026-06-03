'use strict';

const { execSync } = require('child_process');

// ─── ANSI PRIMITIVES (zero deps) ─────────────────────────────────────────────
const R   = '\x1b[0m';
const ESC = '\x1b[';

const NO_COLOR = !process.stdout.isTTY || process.env.NO_COLOR;
const paint = (code, s) => NO_COLOR ? s : `${code}${s}${R}`;

const bold    = (s) => paint(`${ESC}1m`,  s);
const cyan    = (s) => paint(`${ESC}96m`, s);
const green   = (s) => paint(`${ESC}92m`, s);
const yellow  = (s) => paint(`${ESC}93m`, s);
const gray    = (s) => paint(`${ESC}90m`, s);
const white   = (s) => paint(`${ESC}97m`, s);
const red     = (s) => paint(`${ESC}91m`, s);
const bgCyan  = (s) => NO_COLOR ? `[${s}]` : `${ESC}46m${ESC}1m${ESC}30m ${s} ${R}`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function run(cmd, cwd) {
    execSync(cmd, { cwd, stdio: 'pipe' });
}

function step(label, fn) {
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
    } catch (e) {
        process.stdout.write(`${CROSS}\n`);
        // Print trimmed error output under the failed step
        const out = (e.stdout || e.stderr || e.message || '').toString().trim();
        if (out) {
            out.split('\n').slice(0, 20).forEach((line) => {
                console.log(`       ${red(line)}`);
            });
        }
        return false;
    }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function runCheck() {
    const cwd = process.cwd();

    console.log();
    console.log(`  ${bgCyan('CEM')}  ${bold(cyan('cem check'))}  ${gray('type · lint · format')}`);
    console.log(`  ${gray('─'.repeat(50))}`);
    console.log();

    const results = {
        types:  step('Type check (tsc)…',      () => run('node_modules/.bin/tsc --noEmit', cwd)),
        lint:   step('Lint (eslint)…',          () => run('node_modules/.bin/eslint src', cwd)),
        format: step('Format check (prettier)…', () => run('node_modules/.bin/prettier --check src', cwd)),
    };

    console.log();
    console.log(`  ${gray('─'.repeat(50))}`);
    console.log();

    const passed = Object.values(results).every(Boolean);
    const total  = Object.keys(results).length;
    const failed = Object.values(results).filter((v) => !v).length;

    if (passed) {
        console.log(`  ${green('◆')}  ${bold(green('All checks passed.'))}  ${gray(`(${total}/${total})`)}`);
    } else {
        console.log(`  ${red('✖')}  ${bold(red(`${failed} check${failed > 1 ? 's' : ''} failed.`))}  ${gray(`(${total - failed}/${total} passed)`)}`);
        console.log();
        console.log(`  ${yellow('tip')}  ${gray('Run')} ${cyan('npm run lint:fix')} ${gray('or')} ${cyan('npm run prettier:fix')} ${gray('to auto-fix issues.')}`);
    }

    console.log();
    process.exit(passed ? 0 : 1);
}

module.exports = { runCheck };
