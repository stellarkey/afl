import { parse as parseYaml } from 'yaml';
import type { Frontmatter, NodeType } from '../types.js';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const VALID_TYPES: Set<NodeType> = new Set([
  'memory', 'skill', 'config', 'knowledge', 'entity',
]);

export interface ParsedDocument {
  frontmatter: Frontmatter;
  body: string;
}

/**
 * Split a raw AFL-MD file into frontmatter + body.
 * If no frontmatter block is found, throws.
 */
export function parseFrontmatter(raw: string): ParsedDocument {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) {
    throw new AflParseError('No YAML frontmatter block found');
  }

  const yamlStr = match[1];
  const body = raw.slice(match[0].length);

  let parsed: Record<string, unknown>;
  try {
    parsed = parseYaml(yamlStr) as Record<string, unknown>;
  } catch (e) {
    throw new AflParseError(`Invalid YAML in frontmatter: ${(e as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new AflParseError('Frontmatter must be a YAML mapping');
  }

  const fm = normalizeFrontmatter(parsed);
  return { frontmatter: fm, body };
}

function normalizeFrontmatter(raw: Record<string, unknown>): Frontmatter {
  const id = expectString(raw, 'id');
  const typeRaw = expectString(raw, 'type');

  if (!VALID_TYPES.has(typeRaw as NodeType)) {
    throw new AflParseError(
      `Invalid node type "${typeRaw}". Must be one of: ${[...VALID_TYPES].join(', ')}`,
    );
  }

  const fm: Frontmatter = {
    id,
    type: typeRaw as NodeType,
  };

  if (raw.created_at !== undefined) fm.created_at = String(raw.created_at);
  if (raw.last_accessed !== undefined) fm.last_accessed = String(raw.last_accessed);
  if (raw.access_frequency !== undefined) fm.access_frequency = toInt(raw.access_frequency);
  if (raw.refs !== undefined) fm.refs = toStringArray(raw.refs, 'refs');
  if (raw.back_refs !== undefined) fm.back_refs = toStringArray(raw.back_refs, 'back_refs');
  if (raw.tags !== undefined) fm.tags = toStringArray(raw.tags, 'tags');
  if (raw.embedding_hash !== undefined) fm.embedding_hash = String(raw.embedding_hash);
  if (raw.summary !== undefined) fm.summary = String(raw.summary);
  if (raw.decay_level !== undefined) {
    const dl = String(raw.decay_level);
    if (dl !== 'hot' && dl !== 'warm' && dl !== 'cold') {
      throw new AflParseError(`Invalid decay_level "${dl}"`);
    }
    fm.decay_level = dl;
  }
  if (raw.synthesized_from !== undefined) {
    fm.synthesized_from = toStringArray(raw.synthesized_from, 'synthesized_from');
  }
  if (raw.synthesized_into !== undefined) fm.synthesized_into = String(raw.synthesized_into);

  // Preserve any extra fields
  for (const [k, v] of Object.entries(raw)) {
    if (!(k in fm)) {
      fm[k] = v;
    }
  }

  return fm;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expectString(obj: Record<string, unknown>, key: string): string {
  const val = obj[key];
  if (val === undefined || val === null) {
    throw new AflParseError(`Missing required field "${key}" in frontmatter`);
  }
  return String(val);
}

function toInt(val: unknown): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n);
}

function toStringArray(val: unknown, fieldName: string): string[] {
  if (Array.isArray(val)) {
    return val.map((v) => String(v));
  }
  throw new AflParseError(`Field "${fieldName}" must be an array`);
}

export class AflParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AflParseError';
  }
}
