'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Creates a new middleware file in src/app/middlewares/
 * @param {string} name - The middleware name (e.g., 'calculate')
 */
function generateMiddleware(name) {
    const projectRoot = process.cwd();
    const mwDir = path.join(projectRoot, 'src/app/middlewares');
    const filePath = path.join(mwDir, name + '.ts');

    if (!fs.existsSync(mwDir)) {
        console.error('❌ Error: src/app/middlewares/ directory not found.');
        process.exit(1);
    }

    if (fs.existsSync(filePath)) {
        console.error('❌ Error: Middleware \'' + name + '\' already exists.');
        process.exit(1);
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
    console.log('✅ Middleware \'' + name + '\' created at src/app/middlewares/' + name + '.ts');
}

module.exports = {
    generateMiddleware
};