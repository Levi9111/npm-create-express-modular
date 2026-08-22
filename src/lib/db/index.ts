/**
 * src/lib/db/index.ts
 *
 * DB generator router factory. Resolves the appropriate database generator
 * instance (Mongoose, Prisma, or Drizzle) based on user configuration.
 */

import mongoose from './mongoose';
import prisma from './prisma';
import drizzle from './drizzle';
import type { DbChoice, DbGenerator } from '../types';

const generators: Record<DbChoice, DbGenerator> = {
  mongoose,
  prisma,
  drizzle,
};

/**
 * Returns the database generator strategy implementation for a given DB choice.
 *
 * @param choice - Selected database choice ('mongoose' | 'prisma' | 'drizzle').
 * @returns Selected DB generator implementation.
 */
export function getDbGenerator(choice: DbChoice): DbGenerator {
  const gen = generators[choice];
  if (!gen) {
    console.error(`❌ Unknown database choice: "${choice}"`);
    process.exit(1);
  }
  return gen;
}
