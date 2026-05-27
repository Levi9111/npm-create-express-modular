'use strict';

const fs = require('fs');
const path = require('path');
const ui = require('./ui');

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function assertCemProject(projectRoot) {
    if (!fs.existsSync(path.join(projectRoot, 'src/app'))) {
        ui.abort(
            'Run this command from the root of a Create Express Modular project.\n' +
            '     Expected to find: src/app/',
        );
    }
}

function readFileSafe(filePath) {
    try { return fs.readFileSync(filePath, 'utf8'); }
    catch { return null; }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function listProject() {
    const projectRoot = process.cwd();
    assertCemProject(projectRoot);

    let projectName = path.basename(projectRoot);
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
        if (pkg.name) projectName = pkg.name;
    } catch { /* fallback to dirname */ }

    const line = ui.gray('─'.repeat(52));
    console.log();
    console.log(`  ${line}`);
    console.log();
    console.log(`  ${ui.badge('CEM')}  ${ui.bold(ui.cyan(projectName))}  ${ui.gray('project overview')}`);
    console.log();
    console.log(`  ${line}`);

    // ── MODULES ──────────────────────────────────────────────────────────────
    const modulesDir = path.join(projectRoot, 'src/app/modules');
    console.log();
    console.log(`  ${ui.bold(ui.cyan('◆  Modules'))}  ${ui.gray('src/app/modules/')}`);
    console.log();

    if (fs.existsSync(modulesDir)) {
        const modules = fs.readdirSync(modulesDir).filter((d) => {
            return fs.statSync(path.join(modulesDir, d)).isDirectory();
        });

        if (modules.length === 0) {
            console.log(`     ${ui.gray('(none — run: cem add module <Name>)')}`);
        } else {
            modules.forEach((mod) => {
                const modDir  = path.join(modulesDir, mod);
                const files   = fs.readdirSync(modDir).filter((f) => f.endsWith('.ts') || f.endsWith('.md'));
                const isWired = _isModuleWired(projectRoot, mod);
                const wired   = isWired
                    ? ui.green('● wired')
                    : ui.yellow('○ not wired');

                console.log(`     ${ui.cyan('◈')}  ${ui.white(mod)}  ${wired}`);
                files.forEach((f) => console.log(`        ${ui.gray('·')}  ${ui.gray(f)}`));
            });
        }
    } else {
        console.log(`     ${ui.gray('(modules directory not found)')}`);
    }

    // ── MIDDLEWARES ───────────────────────────────────────────────────────────
    const mwDir = path.join(projectRoot, 'src/app/middlewares');
    console.log();
    console.log(`  ${ui.bold(ui.cyan('◆  Middlewares'))}  ${ui.gray('src/app/middlewares/')}`);
    console.log();

    if (fs.existsSync(mwDir)) {
        const CORE = new Set(['globalErrorHandler.ts', 'notFound.ts', 'auth.ts', 'rateLimiter.ts']);
        const allMw = fs.readdirSync(mwDir).filter((f) => f.endsWith('.ts'));
        const coreMw   = allMw.filter((f) => CORE.has(f));
        const customMw = allMw.filter((f) => !CORE.has(f));

        if (coreMw.length > 0) {
            coreMw.forEach((f) => console.log(`     ${ui.gray('◇')}  ${ui.gray(f)}  ${ui.gray('[core]')}`));
        }
        if (customMw.length === 0) {
            console.log(`     ${ui.gray('(no custom middlewares — run: cem add middleware <name>)')}`);
        } else {
            customMw.forEach((f) => console.log(`     ${ui.cyan('◈')}  ${ui.white(f)}`));
        }
    } else {
        console.log(`     ${ui.gray('(middlewares directory not found)')}`);
    }

    // ── ENV VARS ─────────────────────────────────────────────────────────────
    console.log();
    console.log(`  ${ui.bold(ui.cyan('◆  Environment Variables'))}  ${ui.gray('.env')}`);
    console.log();

    const envPath = path.join(projectRoot, '.env');
    const envContent = readFileSafe(envPath);
    if (envContent === null) {
        console.log(`     ${ui.gray('(.env not found)')}`);
    } else {
        const vars = envContent
            .split('\n')
            .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='));

        if (vars.length === 0) {
            console.log(`     ${ui.gray('(no variables defined)')}`);
        } else {
            vars.forEach((v) => {
                const [rawKey, ...rest] = v.split('=');
                const val  = rest.join('=').trim();
                const key  = rawKey.trim();
                // Mask values that look like secrets
                const masked = _isSensitive(key)
                    ? ui.gray('<hidden>')
                    : ui.gray(val || '<empty>');
                console.log(`     ${ui.cyan('◈')}  ${ui.white(key)}  ${masked}`);
            });
        }
    }

    // ── UTILS ─────────────────────────────────────────────────────────────────
    const utilsDir = path.join(projectRoot, 'src/app/utils');
    console.log();
    console.log(`  ${ui.bold(ui.cyan('◆  Utils'))}  ${ui.gray('src/app/utils/')}`);
    console.log();
    if (fs.existsSync(utilsDir)) {
        fs.readdirSync(utilsDir)
            .filter((f) => f.endsWith('.ts'))
            .forEach((f) => console.log(`     ${ui.gray('·')}  ${ui.gray(f)}`));
    } else {
        console.log(`     ${ui.gray('(utils directory not found)')}`);
    }

    console.log();
    console.log(`  ${line}`);
    console.log();
    console.log(`  ${ui.gray('Tip:')}  ${ui.gray('cem remove module <Name> | cem remove middleware <name> | cem remove env <KEY>')}`);
    console.log();
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function _isModuleWired(projectRoot, moduleName) {
    const indexPath = path.join(projectRoot, 'src/app/routes/index.ts');
    const content   = readFileSafe(indexPath);
    if (!content) return false;
    return content.includes(`${moduleName}Routes`);
}

function _isSensitive(key) {
    const lower = key.toLowerCase();
    return (
        lower.includes('secret') ||
        lower.includes('password') ||
        lower.includes('token') ||
        lower.includes('key') ||
        lower.includes('private') ||
        lower.includes('api')
    );
}

module.exports = { listProject };
