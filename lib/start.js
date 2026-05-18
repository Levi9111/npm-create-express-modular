'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ui = require('./ui');

function runStart() {
  const projectRoot = process.cwd();

  // ── Preflight checks ──────────────────────────────────────
  const distEntry = path.join(projectRoot, 'dist', 'server.js');

  if (!fs.existsSync(distEntry)) {
    ui.nl();
    ui.err('dist/server.js not found.');
    ui.substep('Run cem build before starting the production server.');
    ui.nl();
    process.exit(1);
  }

  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    ui.warn('NODE_ENV is not set — defaulting to production.');
  } else if (nodeEnv !== 'production') {
    ui.warn(`NODE_ENV is set to '${nodeEnv}' — expected 'production'.`);
  }

  // ── Banner ────────────────────────────────────────────────
  const pkg = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
  );

  const line = ui.gray('─'.repeat(54));
  console.log();
  console.log(`  ${line}`);
  console.log();
  console.log(`  ${ui.bold(ui.cyan('CEM'))}  ${ui.gray('production server')}`);
  console.log();
  console.log(`  ${ui.gray('◆')}  ${ui.white('Project')}   ${ui.cyan(ui.bold(pkg.name))}`);
  console.log(`  ${ui.gray('◆')}  ${ui.white('Entry')}     ${ui.gray('dist/server.js')}`);
  console.log(`  ${ui.gray('◆')}  ${ui.white('Node')}      ${ui.gray(process.version)}`);
  console.log();
  console.log(`  ${line}`);
  console.log();

  // ── Spawn ─────────────────────────────────────────────────
  const child = spawn(
    'node',
    ['dist/server.js'],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
      stdio: 'inherit', // no interception — raw output in production
    },
  );

  child.on('close', (code) => {
    console.log();
    if (code === 0 || code === null) {
      console.log(`  ${ui.green('◆')}  ${ui.green('Server stopped.')}`);
    } else {
      console.log(`  ${ui.magenta('✖')}  ${ui.magenta(`Server exited with code ${code}`)}`);
    }
    console.log();
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    console.log();
    console.log(`  ${ui.yellow('◆')}  ${ui.yellow('Shutting down…')}`);
    child.kill('SIGINT');
  });
}

module.exports = { runStart };