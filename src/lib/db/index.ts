'use strict';

import mongoose from './mongoose';
import prisma from './prisma';
import drizzle from './drizzle';
import type { DbChoice, DbGenerator } from '../types';

const generators: Record<DbChoice, DbGenerator> = {
  mongoose,
  prisma,
  drizzle,
};

export function getDbGenerator(choice: DbChoice): DbGenerator {
  const gen = generators[choice];
  if (!gen) {
    console.error(`❌ Unknown database choice: "${choice}"`);
    process.exit(1);
  }
  return gen;
}
