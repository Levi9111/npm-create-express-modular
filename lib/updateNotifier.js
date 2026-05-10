'use strict';

const https = require('https');

/**
 * Non-blocking check for the latest version on npm.
 * Returns a Promise that resolves to the latest version string or null if failed/timed out.
 */
function checkForUpdates() {
    return new Promise((resolve) => {
        const req = https.get('https://registry.npmjs.org/create-express-modular/latest', {
            timeout: 1500 // 1.5 seconds max so it never hangs the CLI
        }, (res) => {
            if (res.statusCode !== 200) {
                return resolve(null);
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.version);
                } catch {
                    resolve(null);
                }
            });
        });

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });
    });
}

/**
 * Simple semver comparison (checks if latest is strictly greater than current)
 */
function isUpdateAvailable(current, latest) {
    if (!current || !latest || current === latest) return false;
    
    // remove any pre-release tags or 'v' prefix if they exist
    const strip = (v) => v.replace(/^v/, '').split('-')[0];
    
    const cParts = strip(current).split('.').map(Number);
    const lParts = strip(latest).split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        if (lParts[i] > (cParts[i] || 0)) return true;
        if (lParts[i] < (cParts[i] || 0)) return false;
    }
    return false;
}

module.exports = { checkForUpdates, isUpdateAvailable };
