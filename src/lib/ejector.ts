/**
 * src/lib/ejector.ts
 *
 * Implements `cem eject` — replaces CEM-dependent package.json scripts
 * with their raw equivalents and removes `create-express-modular` from
 * devDependencies so the project becomes fully standalone.
 */

import fs from 'fs';
import path from 'path';
import * as ui from './ui';

/** Maps CEM script names to their raw tool equivalents. */
const SCRIPT_MAP: Record<string, string> = {
  'start:dev': 'tsx watch src/server.ts',
  build: 'tsc',
  start: 'node dist/server.js',
  check: 'tsc --noEmit && eslint src && prettier --check src',
};

/**
 * Ejects the project from CEM CLI dependency.
 * Replaces CEM-based scripts with raw tool commands and removes
 * `create-express-modular` from devDependencies.
 */
export async function runEject(): Promise<void> {
  const projectRoot = process.cwd();
  const pkgPath = path.join(projectRoot, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    ui.abort('package.json not found. Run this command from a CEM project root.');
  }

  ui.nl();
  console.log(
    `  ${ui.bgCyan('CEM')}  ${ui.bold(ui.cyan('cem eject'))}  ${ui.gray('removing CEM CLI dependency')}`,
  );
  console.log(`  ${ui.gray('─'.repeat(50))}`);
  ui.nl();

  // Confirmation prompt
  try {
    const inquirer = (await import('inquirer')).default;
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: 'confirm',
        name: 'confirm',
        message: ui.yellow(
          'This will replace CEM scripts with raw commands and remove create-express-modular from devDependencies. Continue?',
        ),
        default: false,
      },
    ]);

    if (!confirm) {
      ui.nl();
      ui.warn('Eject cancelled.');
      ui.nl();
      process.exit(0);
    }
  } catch (e: unknown) {
    const err = e as { name?: string };
    if (err.name === 'ExitPromptError') {
      ui.nl();
      ui.warn('Eject cancelled.');
      ui.nl();
      process.exit(0);
    }
    throw e;
  }

  ui.nl();

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const scripts: Record<string, string> = pkg.scripts || {};
  let replacedCount = 0;

  // Replace CEM-dependent scripts
  for (const [scriptName, rawCmd] of Object.entries(SCRIPT_MAP)) {
    if (scripts[scriptName]) {
      const current = scripts[scriptName];
      if (current.includes('cem ')) {
        scripts[scriptName] = rawCmd;
        console.log(
          `  ${ui.cyan('◆')}  Replacing ${ui.bold(`"${scriptName}"`)} → ${ui.gray(rawCmd)}`,
        );
        replacedCount++;
      }
    }
  }

  pkg.scripts = scripts;

  // Remove create-express-modular from devDependencies
  let removedDep = false;
  if (pkg.devDependencies?.['create-express-modular']) {
    delete pkg.devDependencies['create-express-modular'];
    removedDep = true;
    console.log(
      `  ${ui.cyan('◆')}  Removing ${ui.bold('create-express-modular')} from devDependencies`,
    );
  }

  // Write updated package.json
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  ui.nl();
  console.log(`  ${ui.gray('─'.repeat(50))}`);
  ui.nl();

  if (replacedCount === 0 && !removedDep) {
    console.log(
      `  ${ui.yellow('◆')}  ${ui.yellow('Nothing to eject — no CEM scripts or dependencies found.')}`,
    );
  } else {
    console.log(
      `  ${ui.green('◆')}  ${ui.bold(ui.green('Ejected successfully.'))}`,
    );
    ui.nl();
    console.log(
      `  ${ui.gray('·')}  ${ui.gray(`${replacedCount} script${replacedCount !== 1 ? 's' : ''} replaced`)}`,
    );
    if (removedDep) {
      console.log(
        `  ${ui.gray('·')}  ${ui.gray('create-express-modular removed from devDependencies')}`,
      );
    }
    ui.nl();
    ui.warn('CEM CLI commands (cem dev, cem build, etc.) will no longer work in this project.');
    ui.substep('Use the raw scripts directly: npm run build, npm run start:dev, etc.');
  }

  ui.nl();
}
