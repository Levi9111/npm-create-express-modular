'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ─── ANSI PRIMITIVES (zero deps) ─────────────────────────────────────────────
const R   = '\x1b[0m';
const ESC = '\x1b[';

const NO_COLOR = !process.stdout.isTTY || process.env.NO_COLOR;
const paint = (code, s) => NO_COLOR ? s : `${code}${s}${R}`;

const bold    = (s) => paint(`${ESC}1m`,  s);
const dim     = (s) => paint(`${ESC}2m`,  s);
const cyan    = (s) => paint(`${ESC}96m`, s);
const green   = (s) => paint(`${ESC}92m`, s);
const yellow  = (s) => paint(`${ESC}93m`, s);
const gray    = (s) => paint(`${ESC}90m`, s);
const white   = (s) => paint(`${ESC}97m`, s);
const magenta = (s) => paint(`${ESC}95m`, s);
const red     = (s) => paint(`${ESC}91m`, s);
const bgCyan  = (s) => NO_COLOR ? `[${s}]` : `${ESC}46m${ESC}1m${ESC}30m ${s} ${R}`;

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function timestamp() {
    const now = new Date();
    const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return gray(`${date} ${time}`);
}

function getProjectName(projectRoot) {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
        return pkg.name || path.basename(projectRoot);
    } catch {
        return path.basename(projectRoot);
    }
}

// ─── STARTUP BANNER ──────────────────────────────────────────────────────────
function printDevBanner(projectName) {
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

// ─── LOG LINE CLASSIFIER ─────────────────────────────────────────────────────
// ts-node-dev outputs things like:
//   [INFO] Restarting: ... changed.
//   [ERROR] ...
//   [COMPILATION ERROR] ...
//   🚀 Server running on http://localhost:5000
function formatLine(raw) {
    const line = raw.trimEnd();
    if (!line) return null;

    const plain = stripAnsi(line);
    const ts = timestamp();

    // ts-node-dev restart notice
    if (plain.match(/\[INFO\].*Restarting/i)) {
        return `  ${yellow('↻')}  ${yellow('Restarting…')}  ${ts}`;
    }
    if (plain.match(/\[INFO\].*\d+ restarts/i)) return null; // suppress restart count noise
    if (plain.match(/\[INFO\]/i)) {
        const msg = plain.replace(/\[INFO\]\s*/i, '').trim();
        return `  ${gray('·')}  ${dim(msg)}`;
    }

    // Compilation error
    if (plain.match(/\[(COMPILATION\s+)?ERROR\]/i) || plain.match(/error TS\d+/i)) {
        return `  ${red('✖')}  ${red(plain)}`;
    }

    // TypeScript diagnostic lines (file.ts:line:col)
    if (plain.match(/\.(ts|tsx)\(\d+,\d+\)/)) {
        return `  ${red('  ')}  ${red(plain)}`;
    }

    // Server started messages (e.g. from user's console.log in server.ts)
    if (plain.match(/(server|listening|running|started|connected|ready)/i)) {
        return `  ${green('▲')}  ${green(bold(plain))}  ${ts}`;
    }

    // MongoDB / DB connected messages
    if (plain.match(/(mongodb|postgres|mysql|mariadb|connected|database)/i)) {
        return `  ${magenta('◈')}  ${magenta(plain)}`;
    }

    // Warnings
    if (plain.match(/warn(ing)?/i)) {
        return `  ${yellow('⚠')}  ${yellow(plain)}`;
    }

    // Default — just prefix with a dim dot + timestamp
    return `  ${gray('·')}  ${white(plain)}`;
}

// ─── MAIN DEV RUNNER ─────────────────────────────────────────────────────────
function runDev() {
    const projectRoot = process.cwd();
    const projectName = getProjectName(projectRoot);

    printDevBanner(projectName);

    // Spawn ts-node-dev as a child process
    const child = spawn(
        'npx',
        ['ts-node-dev', '--respawn', '--transpile-only', '--clear', 'src/server.ts'],
        {
            cwd: projectRoot,
            env: { ...process.env, FORCE_COLOR: '1' },
            stdio: ['inherit', 'pipe', 'pipe'],
        },
    );

    // Pipe stdout through formatter
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
        chunk.split('\n').forEach((line) => {
            const formatted = formatLine(line);
            if (formatted !== null) console.log(formatted);
        });
    });

    // Pipe stderr through formatter (ts-node-dev uses stderr heavily)
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
        chunk.split('\n').forEach((line) => {
            const formatted = formatLine(line);
            if (formatted !== null) console.log(formatted);
        });
    });

    child.on('close', (code) => {
        console.log();
        if (code === 0 || code === null) {
            console.log(`  ${green('◆')}  ${green('Dev server stopped.')}`);
        } else {
            console.log(`  ${red('✖')}  ${red(`Dev server exited with code ${code}`)}`);
        }
        console.log();
        process.exit(code ?? 0);
    });

    // Forward Ctrl+C cleanly
    process.on('SIGINT', () => {
        console.log();
        console.log(`  ${yellow('◆')}  ${yellow('Shutting down dev server…')}`);
        child.kill('SIGINT');
    });
}

module.exports = { runDev };
