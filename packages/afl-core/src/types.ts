/**
 * AFL-MD Core Type System
 *
 * Defines the data structures for the Agent Filesystem Language.
 * Every entity in AFL is a "Memory Node" — a Markdown file with
 * structured frontmatter and semantic references.
 */

// ---------------------------------------------------------------------------
// Node Types
// ---------------------------------------------------------------------------

export type NodeType = 'memory' | 'skill' | 'config' | 'knowledge' | 'entity';

export type DecayLevel = 'hot' | 'warm' | 'cold';

export interface Frontmatter {
  id: string;
  type: NodeType;
  created_at?: string;
  last_accessed?: string;
  access_frequency?: number;
  refs?: string[];
  back_refs?: string[];
  tags?: string[];
  embedding_hash?: string;
  summary?: string;
  decay_level?: DecayLevel;
  synthesized_from?: string[];
  synthesized_into?: string;
  /** Extensible: any additional user-defined fields */
  [key: string]: unknown;
}

export interface AflNode {
  /** Parsed frontmatter metadata */
  frontmatter: Frontmatter;
  /** Raw Markdown body (after frontmatter) */
  body: string;
  /** All references extracted from body */
  references: Reference[];
  /** Absolute file path on disk */
  filePath: string;
}

// ---------------------------------------------------------------------------
// Reference Types
// ---------------------------------------------------------------------------

export type Reference = StrongReference | DynamicReference | InlineAttribute;

/** [[node-id]] — explicit bidirectional link */
export interface StrongReference {
  kind: 'strong';
  /** The target node id */
  targetId: string;
  /** Character offset in body where the reference starts */
  offset: number;
  /** Length of the raw syntax in the body (e.g. "[[foo]]".length) */
  length: number;
}

/** ((query)) — runtime semantic search */
export interface DynamicReference {
  kind: 'dynamic';
  /** The natural language query */
  query: string;
  /** Optional filters parsed from ((query | top=3 | type=knowledge)) */
  filters?: Record<string, string>;
  offset: number;
  length: number;
}

/** @attr(key: value, ...) — inline metadata annotation */
export interface InlineAttribute {
  kind: 'attr';
  /** Parsed key-value pairs */
  attributes: Record<string, string | number | boolean>;
  offset: number;
  length: number;
}

// ---------------------------------------------------------------------------
// Read Protocol
// ---------------------------------------------------------------------------

export interface ReadOptions {
  /** Recursion depth for reference expansion (default: 1) */
  depth?: number;
  /** Filter expanded nodes by type */
  filterType?: NodeType;
  /** Maximum number of nodes to expand at each level */
  maxExpand?: number;
}

/** Result of a depth-controlled read */
export interface ReadResult {
  /** The primary node */
  node: AflNode;
  /** Expanded child nodes (keyed by node id), only present when depth > 1 */
  expanded?: Map<string, ReadResult>;
  /** Effective depth used */
  depth: number;
}

// ---------------------------------------------------------------------------
// Node Index (in-memory registry)
// ---------------------------------------------------------------------------

export interface NodeIndexEntry {
  id: string;
  type: NodeType;
  filePath: string;
  summary?: string;
  tags?: string[];
  refs?: string[];
  back_refs?: string[];
  access_frequency?: number;
  last_accessed?: string;
  decay_level?: DecayLevel;
}

export interface NodeIndex {
  version: string;
  updated_at: string;
  nodes: Record<string, NodeIndexEntry>;
}
