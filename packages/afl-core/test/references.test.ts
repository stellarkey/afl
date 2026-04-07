import { describe, it, expect } from 'vitest';
import { parseReferences } from '../src/parser/references.js';

describe('parseReferences', () => {
  describe('strong references [[...]]', () => {
    it('extracts a single strong reference', () => {
      const refs = parseReferences('See [[node-a]] for details.');
      expect(refs).toHaveLength(1);
      expect(refs[0].kind).toBe('strong');
      if (refs[0].kind === 'strong') {
        expect(refs[0].targetId).toBe('node-a');
      }
    });

    it('extracts multiple strong references', () => {
      const refs = parseReferences('Use [[node-a]] and [[node-b]] together.');
      expect(refs).toHaveLength(2);
      expect(refs.map((r) => r.kind === 'strong' && r.targetId)).toEqual([
        'node-a',
        'node-b',
      ]);
    });

    it('trims whitespace in target id', () => {
      const refs = parseReferences('See [[ node-x ]] here.');
      expect(refs).toHaveLength(1);
      if (refs[0].kind === 'strong') {
        expect(refs[0].targetId).toBe('node-x');
      }
    });
  });

  describe('dynamic references ((...))' , () => {
    it('extracts a simple dynamic reference', () => {
      const refs = parseReferences('See ((error handling best practices)).');
      expect(refs).toHaveLength(1);
      expect(refs[0].kind).toBe('dynamic');
      if (refs[0].kind === 'dynamic') {
        expect(refs[0].query).toBe('error handling best practices');
        expect(refs[0].filters).toBeUndefined();
      }
    });

    it('extracts dynamic reference with filters', () => {
      const refs = parseReferences('See ((git tips | top=5 | type=skill)).');
      expect(refs).toHaveLength(1);
      if (refs[0].kind === 'dynamic') {
        expect(refs[0].query).toBe('git tips');
        expect(refs[0].filters).toEqual({ top: '5', type: 'skill' });
      }
    });
  });

  describe('inline attributes @attr(...)', () => {
    it('extracts a simple attribute', () => {
      const refs = parseReferences('This is great. @attr(confidence: 0.9)');
      expect(refs).toHaveLength(1);
      expect(refs[0].kind).toBe('attr');
      if (refs[0].kind === 'attr') {
        expect(refs[0].attributes.confidence).toBe(0.9);
      }
    });

    it('extracts multiple key-value pairs', () => {
      const refs = parseReferences(
        'Result. @attr(source: "experiment-1", verified: true, score: 42)',
      );
      expect(refs).toHaveLength(1);
      if (refs[0].kind === 'attr') {
        expect(refs[0].attributes.source).toBe('experiment-1');
        expect(refs[0].attributes.verified).toBe(true);
        expect(refs[0].attributes.score).toBe(42);
      }
    });

    it('handles boolean coercion', () => {
      const refs = parseReferences('@attr(a: true, b: false)');
      if (refs[0].kind === 'attr') {
        expect(refs[0].attributes.a).toBe(true);
        expect(refs[0].attributes.b).toBe(false);
      }
    });
  });

  describe('mixed references', () => {
    it('extracts all reference types in order', () => {
      const body = `
Start with [[node-a]].
Then search ((related topics | top=2)).
And annotate. @attr(ok: true)
`;
      const refs = parseReferences(body);
      expect(refs).toHaveLength(3);
      expect(refs[0].kind).toBe('strong');
      expect(refs[1].kind).toBe('dynamic');
      expect(refs[2].kind).toBe('attr');
    });
  });

  describe('code block masking', () => {
    it('ignores references inside fenced code blocks', () => {
      const body = `
See [[real-ref]] here.

\`\`\`
This is [[not-a-ref]] inside code.
\`\`\`

End.
`;
      const refs = parseReferences(body);
      expect(refs).toHaveLength(1);
      if (refs[0].kind === 'strong') {
        expect(refs[0].targetId).toBe('real-ref');
      }
    });

    it('ignores references inside inline code', () => {
      const body = 'See `[[not-a-ref]]` and [[real-ref]].';
      const refs = parseReferences(body);
      expect(refs).toHaveLength(1);
      if (refs[0].kind === 'strong') {
        expect(refs[0].targetId).toBe('real-ref');
      }
    });
  });

  describe('edge cases', () => {
    it('returns empty array for no references', () => {
      expect(parseReferences('Just plain text.')).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(parseReferences('')).toEqual([]);
    });
  });
});
