'use strict';

import zod from './zod';
import joi from './joi';
import type { ValidatorChoice, ValidatorGenerator } from '../types';

const generators: Record<ValidatorChoice, ValidatorGenerator> = {
  zod,
  joi,
};

export function getValidatorGenerator(choice: ValidatorChoice): ValidatorGenerator {
  const gen = generators[choice];
  if (!gen) {
    console.error(`❌ Unknown validator choice: "${choice}"`);
    process.exit(1);
  }
  return gen;
}
