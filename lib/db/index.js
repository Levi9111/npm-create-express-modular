'use strict';

const mongoose = require('./mongoose');
const prisma   = require('./prisma');
const drizzle  = require('./drizzle');

const generators = {
    mongoose,
    prisma,
    drizzle,
};

function getDbGenerator(choice) {
    const gen = generators[choice];
    if (!gen) {
        console.error(`❌ Unknown database choice: "${choice}"`);
        process.exit(1);
    }
    return gen;
}

module.exports = {
    getDbGenerator
};