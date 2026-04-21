'use strict';

const mongoose = require('./mongoose');
const prisma = require('./prisma');
const pg = require('./pg');
const mysql = require('./mysql');

// CockroachDB is wire-compatible with PostgreSQL — same driver, same error codes
const cockroachdb = {
    ...pg,
    scaffoldServerAndConfig: pg.scaffoldServerAndConfig
};

const generators = {
    mongoose,
    prisma,
    pg,
    mysql,
    mariadb: mysql, // mariadb driver has the same error surface as mysql2
    cockroachdb,
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