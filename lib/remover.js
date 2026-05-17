'use strict';

const fs = require('fs');
const path = require('path');
const ui = require('./ui');

// ─── INQUIRER BOOTSTRAP ───────────────────────────────────────────────────────
let inquirer;
try {
    inquirer = require('inquirer');
} catch {
    ui.abort('Missing dependency: inquirer. Run: npm install inquirer');
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function rmDir(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

function pluralize(word) {
    const lower = word.toLowerCase();
    const irregulars = {
        person: 'people', man: 'men', woman: 'women', child: 'children',
        tooth: 'teeth', foot: 'feet', mouse: 'mice', goose: 'geese',
        leaf: 'leaves', knife: 'knives', wife: 'wives', life: 'lives',
        half: 'halves', potato: 'potatoes', tomato: 'tomatoes',
        cactus: 'cacti', focus: 'foci', fungus: 'fungi', nucleus: 'nuclei',
        analysis: 'analyses', thesis: 'theses', crisis: 'crises',
        phenomenon: 'phenomena', criterion: 'criteria', datum: 'data',
    };
    if (irregulars[lower]) return irregulars[lower];
    if (/(?:s|ss|sh|ch|x|z)$/i.test(word)) return word + 'es';
    if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies';
    return word + 's';
}

// ─── GUARD ───────────────────────────────────────────────────────────────────
function assertCemProject(projectRoot) {
    if (!fs.existsSync(path.join(projectRoot, 'src/app'))) {
        ui.abort(
            'Run this command from the root of a Create Express Modular project.\n' +
            '     Expected to find: src/app/',
        );
    }
}

// ─── CONFIRM PROMPT ──────────────────────────────────────────────────────────
async function confirm(message) {
    ui.nl();
    ui.warn(message);
    ui.nl();
    const { confirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: ui.yellow('Are you sure? This action cannot be undone.'),
        default: false,
    }]);
    return confirmed;
}

// ─── REMOVE MODULE ───────────────────────────────────────────────────────────
async function removeModule(name) {
    const projectRoot = process.cwd();
    assertCemProject(projectRoot);

    if (!name) ui.abort('Usage: cem remove module <ModuleName>');

    const moduleName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
    const fileName   = moduleName.toLowerCase();
    const modulePath = path.join(projectRoot, `src/app/modules/${moduleName}`);

    if (!fs.existsSync(modulePath)) {
        ui.abort(`Module '${moduleName}' does not exist at src/app/modules/${moduleName}/`);
    }

    const ok = await confirm(
        `This will permanently delete src/app/modules/${ui.bold(ui.cyan(moduleName))}/ and remove its route entry.`,
    );

    if (!ok) {
        ui.nl();
        ui.warn('Aborted — nothing was removed.');
        ui.nl();
        return;
    }

    // 1. Delete the module directory
    rmDir(modulePath);
    ui.success(`Deleted src/app/modules/${moduleName}/`);

    // 2. Clean up routes/index.ts
    const indexPath = path.join(projectRoot, 'src/app/routes/index.ts');
    if (fs.existsSync(indexPath)) {
        let content = fs.readFileSync(indexPath, 'utf8');
        const linesBefore = content.split('\n').length;

        // Remove the import line (handles variations in spacing)
        content = content.replace(
            new RegExp(`^import \\{ ${moduleName}Routes \\} from [^;]+;\\n?`, 'm'),
            '',
        );

        // Remove the route registration line (handles leading spaces and trailing comma)
        const routePath = `/${pluralize(fileName)}`;
        content = content.replace(
            new RegExp(`^\\s*\\{\\s*path:\\s*'${routePath}'\\s*,\\s*route:\\s*${moduleName}Routes\\s*\\},?\\n?`, 'm'),
            '',
        );

        const linesAfter = content.split('\n').length;
        fs.writeFileSync(indexPath, content);

        if (linesAfter < linesBefore) {
            ui.success(`Removed route entries from src/app/routes/index.ts`);
        } else {
            ui.warn(`Could not find route entries in routes/index.ts — check manually.`);
        }
    }

    ui.nl();
    ui.success(`Module ${ui.bold(ui.cyan(moduleName))} removed.`);
    ui.nl();
}

// ─── REMOVE MIDDLEWARE ────────────────────────────────────────────────────────
async function removeMiddleware(name) {
    const projectRoot = process.cwd();
    assertCemProject(projectRoot);

    if (!name) ui.abort('Usage: cem remove middleware <name>');

    // Accept with or without .ts extension
    const baseName = name.replace(/\.ts$/, '');
    const filePath  = path.join(projectRoot, `src/app/middlewares/${baseName}.ts`);

    // Guard: don't allow removing core generated middlewares
    const PROTECTED = ['globalErrorHandler', 'notFound', 'auth', 'rateLimiter'];
    if (PROTECTED.includes(baseName)) {
        ui.abort(`'${baseName}.ts' is a core generated file and cannot be removed via cem remove.`);
    }

    if (!fs.existsSync(filePath)) {
        ui.abort(`Middleware '${baseName}.ts' does not exist in src/app/middlewares/`);
    }

    const ok = await confirm(
        `This will permanently delete src/app/middlewares/${ui.bold(ui.cyan(baseName + '.ts'))}.`,
    );

    if (!ok) {
        ui.nl();
        ui.warn('Aborted — nothing was removed.');
        ui.nl();
        return;
    }

    fs.unlinkSync(filePath);
    ui.nl();
    ui.success(`Removed src/app/middlewares/${baseName}.ts`);
    ui.nl();
}

// ─── REMOVE ENV VAR ──────────────────────────────────────────────────────────
async function removeEnvVar(key) {
    const projectRoot = process.cwd();
    assertCemProject(projectRoot);

    if (!key) ui.abort('Usage: cem remove env <KEY>');

    const upperKey  = key
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/\s+/g, '_')
        .toUpperCase();
    const lowerKey  = upperKey.toLowerCase();

    const envPath    = path.join(projectRoot, '.env');
    const configPath = path.join(projectRoot, 'src/app/config/index.ts');

    const ok = await confirm(
        `This will remove ${ui.bold(ui.cyan(upperKey))} from .env and src/app/config/index.ts.`,
    );

    if (!ok) {
        ui.nl();
        ui.warn('Aborted — nothing was removed.');
        ui.nl();
        return;
    }

    let removed = false;

    // 1. Remove from .env
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        const before   = envContent;
        envContent = envContent
            .split('\n')
            .filter((line) => !line.startsWith(`${upperKey}=`))
            .join('\n');
        if (envContent !== before) {
            fs.writeFileSync(envPath, envContent);
            ui.success(`Removed ${upperKey} from .env`);
            removed = true;
        } else {
            ui.warn(`${upperKey} not found in .env`);
        }
    }

    // 2. Remove from config/index.ts
    if (fs.existsSync(configPath)) {
        let cfg    = fs.readFileSync(configPath, 'utf8');
        const before = cfg;
        // Matches: "  lower_key: process.env.UPPER_KEY," with optional trailing newline
        cfg = cfg.replace(
            new RegExp(`^\\s*${lowerKey}:\\s*process\\.env\\.${upperKey},?\\n?`, 'm'),
            '',
        );
        if (cfg !== before) {
            fs.writeFileSync(configPath, cfg);
            ui.success(`Removed ${lowerKey} from src/app/config/index.ts`);
            removed = true;
        } else {
            ui.warn(`${lowerKey} not found in config/index.ts`);
        }
    }

    ui.nl();
    if (removed) {
        ui.success(`Env var ${ui.cyan(upperKey)} removed.`);
    } else {
        ui.warn(`Nothing was removed — key may not exist.`);
    }
    ui.nl();
}

module.exports = { removeModule, removeMiddleware, removeEnvVar };
