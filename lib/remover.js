'use strict';

const fs = require('fs');
const path = require('path');
const ui = require('./ui');
const {
    detectPM,
    installCmd
} = require('./pm');
const {
    normaliseKey
} = require('./envGenerator');

// ─── INQUIRER BOOTSTRAP ───────────────────────────────────────────────────────
let inquirer;
try {
    inquirer = require('inquirer');
} catch {
    ui.abort(`Missing dependency: inquirer. Run: ${installCmd(detectPM(), ['inquirer'])}`);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function rmDir(dir) {
    fs.rmSync(dir, {
        recursive: true,
        force: true
    });
}

function pluralize(word) {
    const lower = word.toLowerCase();
    const irregulars = {
        person: 'people',
        man: 'men',
        woman: 'women',
        child: 'children',
        tooth: 'teeth',
        foot: 'feet',
        mouse: 'mice',
        goose: 'geese',
        leaf: 'leaves',
        knife: 'knives',
        wife: 'wives',
        life: 'lives',
        half: 'halves',
        potato: 'potatoes',
        tomato: 'tomatoes',
        cactus: 'cacti',
        focus: 'foci',
        fungus: 'fungi',
        nucleus: 'nuclei',
        analysis: 'analyses',
        thesis: 'theses',
        crisis: 'crises',
        phenomenon: 'phenomena',
        criterion: 'criteria',
        datum: 'data',
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
    const {
        confirmed
    } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: ui.yellow('Are you sure? This action cannot be undone.'),
        default: false,
    }]);
    return confirmed;
}

// ─── REMOVE MODULE ───────────────────────────────────────────────────────────
async function removeModule(providedName) {
    const projectRoot = process.cwd();
    assertCemProject(projectRoot);

    const names = Array.isArray(providedName) ? providedName : [providedName].filter(Boolean);
    if (names.length === 0) ui.abort('Usage: cem remove module <ModuleName...>');

    for (const name of names) {
        const moduleName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
        const fileName = moduleName.toLowerCase();
        const modulePath = path.join(projectRoot, `src/app/modules/${moduleName}`);

        if (!fs.existsSync(modulePath)) {
            ui.warn(`Module '${moduleName}' does not exist — skipping.`);
            continue;
        }

        const ok = await confirm(
            `This will permanently delete src/app/modules/${ui.bold(ui.cyan(moduleName))}/ and remove its route entry.`,
        );

        if (!ok) {
            ui.warn(`Skipped ${moduleName}.`);
            continue;
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

        ui.success(`Module ${ui.bold(ui.cyan(moduleName))} removed.`);
    }

    ui.nl();
}

// ─── REMOVE MIDDLEWARE ────────────────────────────────────────────────────────
async function removeMiddleware(providedName) {
    const projectRoot = process.cwd();
    assertCemProject(projectRoot);

    const names = Array.isArray(providedName) ? providedName : [providedName].filter(Boolean);
    if (names.length === 0) ui.abort('Usage: cem remove middleware <name...>');

    // Guard: don't allow removing core generated middlewares
    const PROTECTED = ['globalErrorHandler', 'notFound', 'auth', 'rateLimiter'];

    for (const name of names) {
        // Accept with or without .middleware.ts / .ts suffix the user may type
        const baseName = name
            .replace(/\.middleware\.ts$/, '')
            .replace(/\.middleware$/, '')
            .replace(/\.ts$/, '');
        const fileName = `${baseName}.middleware.ts`;
        const filePath = path.join(projectRoot, `src/app/middlewares/${fileName}`);

        if (PROTECTED.includes(baseName)) {
            ui.warn(`'${fileName}' is a core file and cannot be removed — skipping.`);
            continue;
        }

        if (!fs.existsSync(filePath)) {
            ui.warn(`Middleware '${fileName}' does not exist — skipping.`);
            continue;
        }

        const ok = await confirm(
            `This will permanently delete src/app/middlewares/${ui.bold(ui.cyan(fileName))}.`,
        );

        if (!ok) {
            ui.warn(`Skipped ${baseName}.`);
            continue;
        }

        fs.unlinkSync(filePath);
        ui.success(`Removed src/app/middlewares/${fileName}`);
    }

    ui.nl();
}

// ─── REMOVE ENV VAR ──────────────────────────────────────────────────────────
async function removeEnvVar(providedKey) {
    const projectRoot = process.cwd();
    assertCemProject(projectRoot);

    const keys = Array.isArray(providedKey) ? providedKey : [providedKey].filter(Boolean);
    if (keys.length === 0) ui.abort('Usage: cem remove env <KEY...>');

    const normalised = keys.map((k) => normaliseKey(k));
    const label = normalised.map((n) => ui.cyan(n.upperKey)).join(', ');

    const ok = await confirm(
        `This will remove ${label} from .env, .env.example, and src/app/config/index.ts.`,
    );

    if (!ok) {
        ui.nl();
        ui.warn('Aborted — nothing was removed.');
        ui.nl();
        return;
    }

    const envPath = path.join(projectRoot, '.env');
    const envExamplePath = path.join(projectRoot, '.env.example');
    const configPath = path.join(projectRoot, 'src/app/config/index.ts');

    for (const { upperKey, lowerKey } of normalised) {
        let removed = false;

        // 1. Remove from .env
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            const before = envContent;
            envContent = envContent
                .split('\n')
                .filter((line) => !line.startsWith(`${upperKey}=`))
                .join('\n');
            if (envContent !== before) {
                fs.writeFileSync(envPath, envContent);
                removed = true;
            }
        }

        // 2. Remove from .env.example
        if (fs.existsSync(envExamplePath)) {
            let exampleContent = fs.readFileSync(envExamplePath, 'utf8');
            const before = exampleContent;
            exampleContent = exampleContent
                .split('\n')
                .filter((line) => !line.startsWith(`${upperKey}=`))
                .join('\n');
            if (exampleContent !== before) {
                fs.writeFileSync(envExamplePath, exampleContent);
                removed = true;
            }
        }

        // 3. Remove from config/index.ts
        if (fs.existsSync(configPath)) {
            let cfg = fs.readFileSync(configPath, 'utf8');
            const before = cfg;
            cfg = cfg.replace(
                new RegExp(`^\\s*${lowerKey}:\\s*process\\.env\\.${upperKey},?\\n?`, 'm'),
                '',
            );
            if (cfg !== before) {
                fs.writeFileSync(configPath, cfg);
                removed = true;
            }
        }

        if (removed) {
            ui.success(`Removed ${ui.cyan(upperKey)} from .env, .env.example, and config/index.ts`);
        } else {
            ui.warn(`${upperKey} not found in any config file — skipping.`);
        }
    }

    ui.nl();
}

module.exports = {
    removeModule,
    removeMiddleware,
    removeEnvVar
};