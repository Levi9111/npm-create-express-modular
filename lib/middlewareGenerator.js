'use strict';

const fs   = require('fs');
const path = require('path');
const ui   = require('./ui');

/**
 * Creates a new middleware file in src/app/middlewares/
 * @param {string} name - The middleware name (e.g., 'calculate')
 */
function generateMiddleware(name) {
    const projectRoot = process.cwd();
    const mwDir = path.join(projectRoot, 'src/app/middlewares');
    const filePath = path.join(mwDir, name + '.ts');

    if (!fs.existsSync(mwDir)) {
        ui.abort('src/app/middlewares/ directory not found. Are you inside a cem project?');
    }

    if (fs.existsSync(filePath)) {
        ui.abort(`Middleware ${ui.cyan(name)} already exists at src/app/middlewares/${name}.ts`);
    }

    const lines = [
        "import { NextFunction, Request, Response } from 'express';",
        "import { catchAsync } from '../utils/catchAsync';",
        '',
        'const ' + name + ' = catchAsync(async (req: Request, res: Response, next: NextFunction) => {',
        '  // TODO: Implement middleware logic',
        '  next();',
        '});',
        '',
        'export default ' + name + ';',
    ];

    fs.writeFileSync(filePath, lines.join('\n') + '\n');
    ui.success(`Middleware ${ui.cyan(name)} created at src/app/middlewares/${name}.ts`);
}

module.exports = {
    generateMiddleware
};