// AFL Core — public API
export type {
  NodeType,
  DecayLevel,
  Frontmatter,
  AflNode,
  Reference,
  StrongReference,
  DynamicReference,
  InlineAttribute,
  ReadOptions,
  ReadResult,
  NodeIndexEntry,
  NodeIndex,
} from './types.js';

export { parseNode, parseFrontmatter, parseReferences, AflParseError } from './parser/index.js';
export { NodeStore } from './store.js';
