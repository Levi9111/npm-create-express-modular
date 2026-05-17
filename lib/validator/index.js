'use strict';

const zod = require('./zod');
const joi = require('./joi');

const generators = {
    zod,
    joi,
};

function getValidatorGenerator(choice) {
    const gen = generators[choice];
    if (!gen) {
        console.error(`❌ Unknown validator choice: "${choice}"`);
        process.exit(1);
    }
    return gen;
}

module.exports = {
    getValidatorGenerator
};