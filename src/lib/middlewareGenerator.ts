'use strict';

import fs from 'fs';
import path from 'path';
import * as ui from './ui';

export function generateMiddleware(providedName: string | string[]): void {
  const projectRoot = process.cwd();
  const mwDir = path.join(projectRoot, 'src/app/middlewares');

  if (!fs.existsSync(mwDir)) {
    ui.abort('src/app/middlewares/ directory not found. Are you inside a cem project?');
  }

  const names = Array.isArray(providedName) ? providedName : [providedName];
  if (names.length === 0) return;

  for (const name of names) {
    const baseName = name.replace(/\.middleware(\.ts)?$/, '').replace(/\.ts$/, '');
    const fileName = `${baseName}.middleware.ts`;
    const filePath = path.join(mwDir, fileName);

    if (fs.existsSync(filePath)) {
      ui.warn(`Middleware ${ui.cyan(baseName)} already exists — skipping.`);
      continue;
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
}
