#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
    execSync
} = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function runCLI() {
    console.log('\n🚀 Welcome to Create Express Modular!\n');

    let projectName = process.argv[2];
    if (!projectName) projectName = await askQuestion('📦 What is your project named? (e.g., my-api): ');
    if (!projectName) {
        console.error('❌ Project name is required.');
        process.exit(1);
    }

    rl.close();

    const projectPath = path.join(process.cwd(), projectName);
    const templatePath = path.join(__dirname, '../template');

    try {
        fs.mkdirSync(projectPath);
    } catch (err) {
        if (err.code === 'EEXIST') console.error(`❌ Directory '${projectName}' already exists.`);
        process.exit(1);
    }

    function copyFolderSync(from, to) {
        fs.mkdirSync(to, {
            recursive: true
        });
        fs.readdirSync(from).forEach((element) => {
            const fromPath = path.join(from, element);
            const toPath = path.join(to, element);
            if (fs.lstatSync(fromPath).isFile()) fs.copyFileSync(fromPath, toPath);
            else copyFolderSync(fromPath, toPath);
        });
    }

    console.log(`\n📂 Scaffolding base architecture...`);
    copyFolderSync(templatePath, projectPath);

    const gitignorePath = path.join(projectPath, 'gitignore');
    if (fs.existsSync(gitignorePath)) fs.renameSync(gitignorePath, path.join(projectPath, '.gitignore'));

    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packageJson.name = projectName.toLowerCase().replace(/\s+/g, '-');
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    // Ensure the empty modules directory exists
    fs.mkdirSync(path.join(projectPath, 'src/app/modules'), {
        recursive: true
    });

    console.log('\n📦 Installing dependencies (this takes a minute)...');
    try {
        execSync('npm install --loglevel=error', {
            cwd: projectPath,
            stdio: 'inherit'
        });
    } catch (error) {
        console.error('\n❌ Failed to install dependencies.');
    }

    console.log(`\n✅ Success! Your Express architecture is ready.`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm run generate module User   <-- ⚡ Try generating your first module!`);
    console.log(`  npm run start:dev\n`);
}

runCLI();