import type { AflNode } from '../types.js';
import { parseFrontmatter } from './frontmatter.js';
import { parseReferences } from './references.js';

export { parseFrontmatter, AflParseError } from './frontmatter.js';
export { parseReferences } from './references.js';

/**
 * Parse a raw AFL-MD string into a fully structured AflNode.
 */
export function parseNode(raw: string, filePath: string): AflNode {
  const { frontmatter, body } = parseFrontmatter(raw);
  const references = parseReferences(body);

  return {
    frontmatter,
    body,
    references,
    filePath,
  };
}
