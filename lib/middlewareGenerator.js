'use strict';

const fs   = require('fs');
const path = require('path');
const ui   = require('./ui');

/**
 * Creates a new middleware file in src/app/middlewares/
 * File is always named <name>.middleware.ts to enforce the naming convention.
 * @param {string} name - The middleware name (e.g., 'calculate')
 */
function generateMiddleware(name) {
    const projectRoot = process.cwd();
    const mwDir = path.join(projectRoot, 'src/app/middlewares');
    // Strip any accidental .middleware or .ts suffix the user may have typed
    const baseName = name.replace(/\.middleware(\.ts)?$/, '').replace(/\.ts$/, '');
    const fileName = `${baseName}.middleware.ts`;
    const filePath = path.join(mwDir, fileName);

    if (!fs.existsSync(mwDir)) {
        ui.abort('src/app/middlewares/ directory not found. Are you inside a cem project?');
    }

    if (fs.existsSync(filePath)) {
        ui.abort(`Middleware ${ui.cyan(baseName)} already exists at src/app/middlewares/${fileName}`);
    }

    const lines = [
        "import { NextFunction, Request, Response } from 'express';",
        "import { catchAsync } from '../utils/catchAsync';",
        '',
        'const ' + baseName + ' = catchAsync(async (req: Request, res: Response, next: NextFunction) => {',
        '  // TODO: Implement middleware logic',
        '  next();',
        '});',
        '',
        'export default ' + baseName + ';',
    ];

    fs.writeFileSync(filePath, lines.join('\n') + '\n');
    ui.success(`Middleware ${ui.cyan(baseName)} created at src/app/middlewares/${fileName}`);
}

module.exports = {
    generateMiddleware
};