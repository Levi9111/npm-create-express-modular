'use strict';

const zod = require('./zod');
const joi = require('./joi');
const vine = require('./vine');
const yup = require('./yup');

const generators = {
    zod,
    joi,
    vine,
    yup,
};

function getValidatorGenerator(choice) {
    const gen = generators[choice];
    if (!gen) {
        console.error(`❌ Unknown validator choice: "\${choice}"`);
        process.exit(1);
    }
    return gen;
}

module.exports = {
    getValidatorGenerator
};