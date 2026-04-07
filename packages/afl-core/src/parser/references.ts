import type {
  Reference,
  StrongReference,
  DynamicReference,
  InlineAttribute,
} from '../types.js';

// ---------------------------------------------------------------------------
// Regex patterns for AFL-MD reference syntax
// ---------------------------------------------------------------------------

// [[node-id]] — strong reference (no nested brackets allowed)
const STRONG_REF_RE = /\[\[([^\[\]]+)\]\]/g;

// ((query)) or ((query | top=3 | type=knowledge)) — dynamic reference
const DYNAMIC_REF_RE = /\(\(([^)]+)\)\)/g;

// @attr(key: value, key2: value2) — inline attribute
const INLINE_ATTR_RE = /@attr\(([^)]+)\)/g;

// Inside a code fence — references here should be ignored
const CODE_FENCE_RE = /^```[\s\S]*?^```/gm;
const INLINE_CODE_RE = /`[^`]+`/g;

/**
 * Extract all AFL references from a Markdown body.
 * References inside code blocks/fences are ignored.
 */
export function parseReferences(body: string): Reference[] {
  // Mask code regions so we don't extract references from them
  const masked = maskCodeRegions(body);

  const results: Reference[] = [];

  // 1. Strong references: [[node-id]]
  for (const match of masked.matchAll(STRONG_REF_RE)) {
    if (isMasked(match.index!)) continue;
    const ref: StrongReference = {
      kind: 'strong',
      targetId: match[1].trim(),
      offset: match.index!,
      length: match[0].length,
    };
    results.push(ref);
  }

  // 2. Dynamic references: ((query | filters...))
  for (const match of masked.matchAll(DYNAMIC_REF_RE)) {
    if (isMasked(match.index!)) continue;
    const inner = match[1].trim();
    const ref = parseDynamicRef(inner, match.index!, match[0].length);
    results.push(ref);
  }

  // 3. Inline attributes: @attr(key: value)
  for (const match of masked.matchAll(INLINE_ATTR_RE)) {
    if (isMasked(match.index!)) continue;
    const inner = match[1].trim();
    const ref = parseInlineAttr(inner, match.index!, match[0].length);
    results.push(ref);
  }

  // Sort by offset
  results.sort((a, b) => a.offset - b.offset);
  return results;
}

// ---------------------------------------------------------------------------
// Dynamic reference parser
// ---------------------------------------------------------------------------

function parseDynamicRef(inner: string, offset: number, length: number): DynamicReference {
  // Split on | to separate query from optional filters
  const parts = inner.split('|').map((s) => s.trim());
  const query = parts[0];
  const filters: Record<string, string> = {};

  for (let i = 1; i < parts.length; i++) {
    const eqIdx = parts[i].indexOf('=');
    if (eqIdx > 0) {
      const key = parts[i].slice(0, eqIdx).trim();
      const val = parts[i].slice(eqIdx + 1).trim();
      filters[key] = val;
    }
  }

  return {
    kind: 'dynamic',
    query,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    offset,
    length,
  };
}

// ---------------------------------------------------------------------------
// Inline attribute parser
// ---------------------------------------------------------------------------

function parseInlineAttr(
  inner: string,
  offset: number,
  length: number,
): InlineAttribute {
  const attributes: Record<string, string | number | boolean> = {};

  // Split on commas, but be careful about quoted values
  const pairs = splitAttributes(inner);
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':');
    if (colonIdx <= 0) continue;

    const key = pair.slice(0, colonIdx).trim();
    let val = pair.slice(colonIdx + 1).trim();

    // Remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    attributes[key] = coerceValue(val);
  }

  return { kind: 'attr', attributes, offset, length };
}

function splitAttributes(s: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (const ch of s) {
    if (inQuote) {
      current += ch;
      if (ch === quoteChar) inQuote = false;
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      current += ch;
    } else if (ch === ',') {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

function coerceValue(val: string): string | number | boolean {
  if (val === 'true') return true;
  if (val === 'false') return false;
  const num = Number(val);
  if (!isNaN(num) && val !== '') return num;
  return val;
}

// ---------------------------------------------------------------------------
// Code masking — prevent extraction from code blocks
// ---------------------------------------------------------------------------

let maskedRanges: Array<[number, number]> = [];

function maskCodeRegions(body: string): string {
  maskedRanges = [];

  // Fenced code blocks
  for (const match of body.matchAll(CODE_FENCE_RE)) {
    maskedRanges.push([match.index!, match.index! + match[0].length]);
  }

  // Inline code
  for (const match of body.matchAll(INLINE_CODE_RE)) {
    maskedRanges.push([match.index!, match.index! + match[0].length]);
  }

  return body;
}

function isMasked(offset: number): boolean {
  return maskedRanges.some(([start, end]) => offset >= start && offset < end);
}
