'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runBuild() {
    const projectRoot = process.cwd();
    console.log('🛡️  Running Architecture Guard...');

    const modulesPath = path.join(projectRoot, 'src/app/modules');

    if (fs.existsSync(modulesPath)) {
        const modules = fs
            .readdirSync(modulesPath)
            .filter((file) => fs.statSync(path.join(modulesPath, file)).isDirectory());

        let hasError = false;

        modules.forEach((moduleName) => {
            const expectedPrefix = moduleName.toLowerCase();
            const moduleDir = path.join(modulesPath, moduleName);
            const files = fs.readdirSync(moduleDir);

            files.forEach((file) => {
                if (!file.startsWith(`${expectedPrefix}.`)) {
                    console.error(`\n❌ ARCHITECTURE VIOLATION IN MODULE: [${moduleName}]`);
                    console.error(`   -> The file '${file}' does not belong here.`);
                    console.error(
                        `   -> All files in this folder must start with '${expectedPrefix}.' (e.g., ${expectedPrefix}.controller.ts)`,
                    );
                    hasError = true;
                }
            });
        });

        if (hasError) {
            console.error(
                '\n🚨 Build failed due to architectural violations. Please fix the file names above.\n',
            );
            process.exit(1);
        }
    }

    console.log('✅ Architecture validation passed.\n');
    console.log('📦 Compiling TypeScript...');

    try {
        execSync('npx tsc', { stdio: 'inherit', cwd: projectRoot });
        console.log('✅ Build successful.');
    } catch (e) {
        console.error('❌ Build failed during compilation.');
        process.exit(1);
    }
}

module.exports = {
    runBuild
};
