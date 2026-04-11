const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function generateModule() {
  console.log('\n🧩 Express Modular Generator\n');

  // 1. Get Module Name
  let moduleNameRaw = process.argv[3]; // e.g., 'User' from `npm run generate module User`
  if (!moduleNameRaw || process.argv[2] !== 'module') {
    moduleNameRaw = await askQuestion(
      'What is the name of the module? (e.g., User): ',
    );
  }

  if (!moduleNameRaw) {
    console.error('❌ Module name is required.');
    process.exit(1);
  }

  // 2. Ask for extra files
  const extraFilesInput = await askQuestion(
    'Do you need constants and utils files for this module? (y/N): ',
  );
  const wantsExtras = extraFilesInput.toLowerCase() === 'y';
  rl.close();

  const moduleName =
    moduleNameRaw.charAt(0).toUpperCase() + moduleNameRaw.slice(1);
  const fileName = moduleNameRaw.toLowerCase();
  const modulePath = path.join(__dirname, `../src/app/modules/${moduleName}`);

  // 3. Create Folder
  if (fs.existsSync(modulePath)) {
    console.error(`\n❌ Error: Module '${moduleName}' already exists!`);
    process.exit(1);
  }
  fs.mkdirSync(modulePath, {
    recursive: true,
  });

  // 4. Create standard 6 files
  const standardFiles = [
    'controller',
    'interface',
    'model',
    'route',
    'service',
    'validation',
  ];
  standardFiles.forEach((type) => {
    let content = `// TODO: Implement ${moduleName} ${type}\n`;

    if (type === 'route') {
      content = `import express from 'express';\n\nconst router = express.Router();\n\nrouter.get('/', (req, res) => {\n  res.send('Hello from the ${moduleName} module!');\n});\n\nexport const ${moduleName}Routes = router;\n`;
    }

    fs.writeFileSync(path.join(modulePath, `${fileName}.${type}.ts`), content);
  });

  // 5. Create extra 2 files if requested
  if (wantsExtras) {
    fs.writeFileSync(
      path.join(modulePath, `${fileName}.constants.ts`),
      `// Constants for ${moduleName}\n`,
    );
    fs.writeFileSync(
      path.join(modulePath, `${fileName}.utils.ts`),
      `// Utility functions for ${moduleName}\n`,
    );
  }

  console.log(`\n✅ Generated files for module: ${moduleName}`);

  // 6. Inject into routes/index.ts
  const routesIndexPath = path.join(__dirname, '../src/app/routes/index.ts');
  if (fs.existsSync(routesIndexPath)) {
    let routeFileContent = fs.readFileSync(routesIndexPath, 'utf8');

    // Prepare injection strings
    const importString = `import { ${moduleName}Routes } from '../modules/${moduleName}/${fileName}.route';\n// --- INJECT IMPORTS HERE ---`;
    const routeString = `  { path: '/${fileName}s', route: ${moduleName}Routes },\n  // --- INJECT ROUTES HERE ---`;

    // Replace the markers
    routeFileContent = routeFileContent.replace(
      '// --- INJECT IMPORTS HERE ---',
      importString,
    );
    routeFileContent = routeFileContent.replace(
      '// --- INJECT ROUTES HERE ---',
      routeString,
    );

    fs.writeFileSync(routesIndexPath, routeFileContent);
    console.log(`🔗 Auto-wired ${moduleName}Routes into routes/index.ts`);
  }
}

generateModule();
