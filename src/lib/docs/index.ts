/**
 * src/lib/docs/index.ts
 *
 * Entry point for the agent-documentation generator.
 * Composes the AGENTS.md and CLAUDE.md builders and writes both files.
 */

import fs from 'fs';
import path from 'path';
import { buildAgentsMd } from './agents';
import { buildClaudeMd } from './claude';

export type { AgentDocsOptions } from './agents';

/**
 * Writes `AGENTS.md` and `CLAUDE.md` into the scaffolded project root.
 *
 * @param projectPath - Absolute path to the project root.
 * @param opts        - Project configuration used to personalise the documents.
 */
export function generateAgentDocs(
  projectPath: string,
  opts: import('./agents').AgentDocsOptions,
): void {
  fs.writeFileSync(path.join(projectPath, 'AGENTS.md'), buildAgentsMd(opts));
  fs.writeFileSync(path.join(projectPath, 'CLAUDE.md'), buildClaudeMd(opts));
}
