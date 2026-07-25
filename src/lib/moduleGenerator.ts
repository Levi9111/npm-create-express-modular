/**
 * src/lib/moduleGenerator.ts
 *
 * Public entry point for the module scaffold — re-exports from the
 * split implementation so the tsup bundle path (`lib/moduleGenerator`)
 * remains stable for downstream consumers.
 */

export { generateModule } from './module/index';
