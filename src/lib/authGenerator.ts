/**
 * src/lib/authGenerator.ts
 *
 * Public entry point for the auth scaffold — re-exports from the
 * split implementation so the tsup bundle path (`lib/authGenerator`)
 * remains stable for downstream consumers.
 */

export { scaffoldAuth } from './auth/index';
