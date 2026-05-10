'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Adds a new environment variable to .env and injects it into config/index.ts
 * @param {string} key - The key name (e.g., 'access_secret')
 */
function addEnvVar(key) {
    const projectRoot = process.cwd();
    const envPath = path.join(projectRoot, '.env');
    const configPath = path.join(projectRoot, 'src/app/config/index.ts');

    if (!fs.existsSync(envPath)) {
        console.error('❌ Error: .env file not found.');
        process.exit(1);
    }

    // Normalise input → UPPER_SNAKE for .env, lower_snake for config key
    // Handles: JWT_REFRESH_SECRET, jwtRefreshSecret, JwtRefreshSecret, jwt_refresh_secret
    const upperKey = key
        .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase → snake_case
        .replace(/\s+/g, '_')                 // spaces → underscores
        .toUpperCase();                        // everything uppercase
    const lowerKey = upperKey.toLowerCase();  // JWT_REFRESH_SECRET → jwt_refresh_secret

    // 1. Update .env
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes(upperKey + '=')) {
        console.warn('⚠️  Warning: ' + upperKey + ' already exists in .env.');
    } else {
        envContent += upperKey + '=<your_' + lowerKey + '>\n';
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Added ' + upperKey + ' to .env');
    }

    // 2. Update config/index.ts
    if (fs.existsSync(configPath)) {
        let configContent = fs.readFileSync(configPath, 'utf8');
        if (configContent.includes(lowerKey + ':')) {
            console.warn('⚠️  Warning: ' + lowerKey + ' already exists in config/index.ts.');
        } else {
            // Inject before the closing brace of the export default object
            const injectLine = '  ' + lowerKey + ': process.env.' + upperKey + ',\n};';
            configContent = configContent.replace(/};\s*$/, injectLine);
            fs.writeFileSync(configPath, configContent);
            console.log('✅ Injected ' + lowerKey + ': process.env.' + upperKey + ' into config/index.ts');
        }
    } else {
        console.warn('⚠️  Warning: config/index.ts not found. Skipping config injection.');
    }
}

module.exports = {
    addEnvVar
};