const fs = require('fs');
const path = require('path');

console.log('🛡️  Running Architecture Guard...');

const modulesPath = path.join(__dirname, '../src/app/modules');

// If no modules exist yet, just pass validation
if (!fs.existsSync(modulesPath)) {
  process.exit(0);
}

// Get all the folders inside src/app/modules (e.g., ['Auth', 'Product', 'User'])
const modules = fs
  .readdirSync(modulesPath)
  .filter((file) => fs.statSync(path.join(modulesPath, file)).isDirectory());

let hasError = false;

modules.forEach((moduleName) => {
  const expectedPrefix = moduleName.toLowerCase(); // e.g., 'Auth' becomes 'auth'
  const moduleDir = path.join(modulesPath, moduleName);
  const files = fs.readdirSync(moduleDir);

  files.forEach((file) => {
    // We expect files to look like `auth.controller.ts`, `auth.service.ts`, etc.
    // So the file MUST start with the lowercase module name + a dot.
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
  process.exit(1); // This tells Node to crash the process!
} else {
  console.log('✅ Architecture validation passed.\n');
}
