/**
 * src/lib/agentDocsGenerator.ts
 *
 * Public entry point for the agent documentation generator — re-exports
 * from the split implementation so the tsup bundle path
 * (`lib/agentDocsGenerator`) remains stable for downstream consumers.
 */

export { generateAgentDocs } from './docs/index';
export type { AgentDocsOptions } from './docs/index';
