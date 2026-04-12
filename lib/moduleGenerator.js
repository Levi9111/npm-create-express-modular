const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Helper to make readline work seamlessly with async/await
const askQuestion = (rl, query) => new Promise((resolve) => rl.question(query, resolve));

async function generateModule(providedName) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    let moduleName = providedName;

    // 1. Ask for the module name if they didn't type it in the command
    if (!moduleName) {
        moduleName = await askQuestion(rl, '📦 Enter module name (e.g., User, Product): ');
    }

    if (!moduleName) {
        console.error('❌ Error: Module name is required.');
        rl.close();
        process.exit(1);
    }

    // Ensure Capitalized (e.g., 'user' -> 'User')
    moduleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
    const fileName = moduleName.toLowerCase();

    // ─── NEW: Interactive Prompts for Optional Files ───────────────────
    console.log(`\n⚙️  Configuring the ${moduleName} module...`);

    const constantsAnswer = await askQuestion(rl, `📌 Does this module require a Constants file (e.g., for ENUMs, search fields)? (y/N): `);
    const includeConstants = constantsAnswer.toLowerCase() === 'y';

    const utilsAnswer = await askQuestion(rl, `🛠️  Does this module need a Utils file for helper functions? (y/N): `);
    const includeUtils = utilsAnswer.toLowerCase() === 'y';

    rl.close(); // Close the input stream

    // ─── DIRECTORY SETUP ───────────────────────────────────────────────
    const modulePath = path.join(process.cwd(), `src/app/modules/${moduleName}`);

    if (!fs.existsSync(path.join(process.cwd(), 'src/app/modules'))) {
        console.error('\n❌ Error: You must run this command inside the root of a Create Express Modular project!');
        process.exit(1);
    }

    if (fs.existsSync(modulePath)) {
        console.error(`\n❌ Error: Module '${moduleName}' already exists!`);
        process.exit(1);
    }

    fs.mkdirSync(modulePath, {
        recursive: true
    });

    // ─── FILE GENERATION ───────────────────────────────────────────────
    // Base 6 files every module gets
    const files = ['controller', 'interface', 'model', 'route', 'service', 'validation'];

    // Dynamically push the optional files if the user said "yes"
    if (includeConstants) files.push('constant');
    if (includeUtils) files.push('utils');

    files.forEach((type) => {
        let content = `// TODO: Implement ${moduleName} ${type}\n`;

        if (type === 'route') {
            content = `import express from 'express';\nimport { ${moduleName}Controllers } from './${fileName}.controller';\n\nconst router = express.Router();\n\nrouter.post('/', ${moduleName}Controllers.create${moduleName});\n\nexport const ${moduleName}Routes = router;\n`;
        } else if (type === 'controller') {
            content = `import { Request, Response } from 'express';\nimport { StatusCodes } from 'http-status-codes';\nimport { catchAsync } from '../../utils/catchAsync';\nimport sendResponse from '../../utils/sendResponse';\n\nconst create${moduleName} = catchAsync(async (req: Request, res: Response) => {\n  sendResponse(res, {\n    statusCode: StatusCodes.CREATED,\n    success: true,\n    message: '${moduleName} created successfully',\n    data: {},\n  });\n});\n\nexport const ${moduleName}Controllers = {\n  create${moduleName},\n};\n`;
        } else if (type === 'constant') {
            // Boilerplate for Constants
            content = `export const ${moduleName}SearchableFields = [];\n`;
        } else if (type === 'utils') {
            // Boilerplate for Utils
            content = `export const process${moduleName}Data = () => {\n  // Add utility logic here\n};\n`;
        }

        fs.writeFileSync(path.join(modulePath, `${fileName}.${type}.ts`), content);
    });

    // ─── AUTO-WIRE ROUTES ──────────────────────────────────────────────
    const indexPath = path.join(process.cwd(), 'src/app/routes/index.ts');
    if (fs.existsSync(indexPath)) {
        let indexContent = fs.readFileSync(indexPath, 'utf8');
        const importStatement = `import { ${moduleName}Routes } from '../modules/${moduleName}/${fileName}.route';\n// --- INJECT IMPORTS HERE ---`;
        const routeStatement = `  { path: '/${fileName}s', route: ${moduleName}Routes },\n  // --- INJECT ROUTES HERE ---`;

        indexContent = indexContent.replace('// --- INJECT IMPORTS HERE ---', importStatement);
        indexContent = indexContent.replace('// --- INJECT ROUTES HERE ---', routeStatement);
        fs.writeFileSync(indexPath, indexContent);
    }

    // ─── SUCCESS LOGS ──────────────────────────────────────────────────
    console.log(`\n✅ Successfully generated the ${moduleName} module!`);
    if (includeConstants) console.log(`   📄 Included: ${fileName}.constant.ts`);
    if (includeUtils) console.log(`   📄 Included: ${fileName}.utils.ts`);
}

module.exports = {
    generateModule
};