/**
 * src/lib/validator/index.ts
 *
 * Validator strategy router factory. Resolves the appropriate schema validator
 * implementation (Zod or Joi) based on user CLI configuration.
 */

import zod from './zod';
import joi from './joi';
import type { ValidatorChoice, ValidatorGenerator } from '../types';

const generators: Record<ValidatorChoice, ValidatorGenerator> = {
  zod,
  joi,
};

/**
 * Returns the validator generator strategy implementation for a given choice.
 *
 * @param choice - Selected validator choice ('zod' | 'joi').
 * @returns Selected validator generator strategy.
 */
export function getValidatorGenerator(choice: ValidatorChoice): ValidatorGenerator {
  const gen = generators[choice];
  if (!gen) {
    console.error(`❌ Unknown validator choice: "${choice}"`);
    process.exit(1);
  }
  return gen;
}
