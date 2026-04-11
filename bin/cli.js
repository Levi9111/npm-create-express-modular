#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
    execSync
} = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function runCLI() {
    console.log('\n🚀 Welcome to Create Express Modular!\n');

    // 1. Get Project Name
    let projectName = process.argv[2];
    if (!projectName) {
        projectName = await askQuestion('📦 What is your project named? (e.g., my-api): ');
    }

    if (!projectName) {
        console.error('❌ Project name is required.');
        process.exit(1);
    }

    // 2. Ask for Modules
    const modulesInput = await askQuestion(
        '🛠️  Which modules should we generate? (comma-separated, e.g., User,Product,Order): '
    );

    rl.close();

    const currentPath = process.cwd();
    const projectPath = path.join(currentPath, projectName);
    const templatePath = path.join(__dirname, '../template');

    // 3. Create Project Directory
    try {
        fs.mkdirSync(projectPath);
    } catch (err) {
        if (err.code === 'EEXIST') {
            console.error(`❌ Directory '${projectName}' already exists.`);
        } else {
            console.error(err);
        }
        process.exit(1);
    }

    // Helper to copy the base template
    function copyFolderSync(from, to) {
        fs.mkdirSync(to, {
            recursive: true
        });
        fs.readdirSync(from).forEach((element) => {
            const fromPath = path.join(from, element);
            const toPath = path.join(to, element);
            if (fs.lstatSync(fromPath).isFile()) {
                fs.copyFileSync(fromPath, toPath);
            } else {
                copyFolderSync(fromPath, toPath);
            }
        });
    }

    console.log(`\n📂 Scaffolding base architecture...`);
    copyFolderSync(templatePath, projectPath);

    // 4. Rename gitignore to .gitignore
    const gitignorePath = path.join(projectPath, 'gitignore');
    if (fs.existsSync(gitignorePath)) {
        fs.renameSync(gitignorePath, path.join(projectPath, '.gitignore'));
    }

    // 5. Update the new package.json with the user's project name
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packageJson.name = projectName.toLowerCase().replace(/\s+/g, '-');
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    // 6. Dynamically Generate the Modules based on user input
    const modulesToCreate = modulesInput
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

    if (modulesToCreate.length > 0) {
        console.log(`\n🧩 Generating custom modules...`);

        const modulesBaseDir = path.join(projectPath, 'src/app/modules');
        if (!fs.existsSync(modulesBaseDir)) fs.mkdirSync(modulesBaseDir, {
            recursive: true
        });

        let routeImports = '';
        let routeArray = 'const moduleRoutes = [\n';

        modulesToCreate.forEach((mod) => {
            const moduleName = mod.charAt(0).toUpperCase() + mod.slice(1);
            const fileName = mod.toLowerCase();
            const modulePath = path.join(modulesBaseDir, moduleName);

            fs.mkdirSync(modulePath, {
                recursive: true
            });

            // Create the 7 standard files for each module
            const fileTypes = ['controller', 'interface', 'model', 'route', 'service', 'utils', 'validation'];
            fileTypes.forEach((type) => {
                fs.writeFileSync(
                    path.join(modulePath, `${fileName}.${type}.ts`),
                    `// TODO: Implement ${moduleName} ${type}\n`
                );
            });

            console.log(`  - Created ${moduleName} module`);

            // Prepare data for the routes/index.ts file
            routeImports += `import { ${moduleName}Routes } from '../modules/${moduleName}/${fileName}.route';\n`;
            routeArray += `  { path: '/${fileName}s', route: ${moduleName}Routes },\n`;
        });

        routeArray += '];\n';

        // 7. Generate src/app/routes/index.ts to wire up the router automatically
        const routesDir = path.join(projectPath, 'src/app/routes');
        if (!fs.existsSync(routesDir)) fs.mkdirSync(routesDir, {
            recursive: true
        });

        const routeFileContent = `import { Router } from 'express';\n\n${routeImports}\nconst router = Router();\n\n${routeArray}\nmoduleRoutes.forEach((route) => router.use(route.path, route.route));\n\nexport default router;\n`;
        fs.writeFileSync(path.join(routesDir, 'index.ts'), routeFileContent);
    }

    // 8. Install Dependencies
    console.log('\n📦 Installing dependencies (this takes a minute)...');
    try {
        execSync('npm install', {
            cwd: projectPath,
            stdio: 'inherit'
        });
    } catch (error) {
        console.error('\n❌ Failed to install dependencies.');
    }

    console.log(`\n✅ Success! Your Express architecture is ready.`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm run start:dev\n`);
}

runCLI();