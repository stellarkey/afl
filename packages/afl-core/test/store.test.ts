import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { NodeStore } from '../src/store.js';

const FIXTURES_DIR = join(import.meta.dirname!, 'fixtures');

describe('NodeStore', () => {
  let store: NodeStore;

  beforeEach(() => {
    store = new NodeStore(FIXTURES_DIR);
    store.scan();
  });

  describe('scan()', () => {
    it('discovers all valid AFL-MD files', () => {
      expect(store.size()).toBe(3);
    });

    it('indexes nodes by id', () => {
      expect(store.has('node-skill-a')).toBe(true);
      expect(store.has('node-knowledge-b')).toBe(true);
      expect(store.has('node-skill-c')).toBe(true);
    });

    it('builds back_refs from refs and strong references', () => {
      // node-skill-a refs node-knowledge-b (via frontmatter) and [[node-knowledge-b]] and [[node-skill-c]]
      const b = store.get('node-knowledge-b')!;
      expect(b.frontmatter.back_refs).toContain('node-skill-a');

      const c = store.get('node-skill-c')!;
      expect(c.frontmatter.back_refs).toContain('node-skill-a');
      expect(c.frontmatter.back_refs).toContain('node-knowledge-b');
    });
  });

  describe('get()', () => {
    it('returns a parsed node', () => {
      const node = store.get('node-skill-a')!;
      expect(node.frontmatter.id).toBe('node-skill-a');
      expect(node.frontmatter.type).toBe('skill');
      expect(node.frontmatter.tags).toEqual(['git', 'workflow']);
      expect(node.body).toContain('# Skill A');
    });

    it('returns undefined for non-existent node', () => {
      expect(store.get('non-existent')).toBeUndefined();
    });
  });

  describe('read() depth control', () => {
    it('DEPTH 0: returns metadata only, empty body', () => {
      const result = store.read('node-skill-a', { depth: 0 });
      expect(result.depth).toBe(0);
      expect(result.node.body).toBe('');
      expect(result.node.references).toEqual([]);
      expect(result.node.frontmatter.id).toBe('node-skill-a');
    });

    it('DEPTH 1: returns full node, no expansion', () => {
      const result = store.read('node-skill-a', { depth: 1 });
      expect(result.depth).toBe(1);
      expect(result.node.body).toContain('# Skill A');
      expect(result.expanded).toBeUndefined();
    });

    it('DEPTH 2: expands strong references one level', () => {
      const result = store.read('node-skill-a', { depth: 2 });
      expect(result.depth).toBe(2);
      expect(result.expanded).toBeDefined();
      expect(result.expanded!.has('node-knowledge-b')).toBe(true);
      expect(result.expanded!.has('node-skill-c')).toBe(true);

      // The expanded nodes should be at depth 1 (no further expansion)
      const expandedB = result.expanded!.get('node-knowledge-b')!;
      expect(expandedB.depth).toBe(1);
      expect(expandedB.expanded).toBeUndefined();
    });

    it('DEPTH 3: recursively expands two levels', () => {
      const result = store.read('node-skill-a', { depth: 3 });
      expect(result.expanded).toBeDefined();

      // node-knowledge-b at depth 2 should expand its own [[node-skill-c]]
      const expandedB = result.expanded!.get('node-knowledge-b')!;
      expect(expandedB.depth).toBe(2);
      expect(expandedB.expanded).toBeDefined();
      expect(expandedB.expanded!.has('node-skill-c')).toBe(true);
    });

    it('filterType limits which nodes are expanded', () => {
      const result = store.read('node-skill-a', { depth: 2, filterType: 'knowledge' });
      expect(result.expanded).toBeDefined();
      expect(result.expanded!.has('node-knowledge-b')).toBe(true);
      expect(result.expanded!.has('node-skill-c')).toBe(false);
    });
  });

  describe('read() access tracking', () => {
    it('increments access_frequency on read', () => {
      const before = store.get('node-skill-c')!.frontmatter.access_frequency ?? 0;
      store.read('node-skill-c');
      const after = store.get('node-skill-c')!.frontmatter.access_frequency!;
      expect(after).toBe(before + 1);
    });

    it('updates last_accessed on read', () => {
      store.read('node-skill-c');
      const node = store.get('node-skill-c')!;
      expect(node.frontmatter.last_accessed).toBeDefined();
    });
  });

  describe('expand()', () => {
    it('returns full node content', () => {
      const node = store.expand('node-knowledge-b');
      expect(node.frontmatter.id).toBe('node-knowledge-b');
      expect(node.body).toContain('# Knowledge B');
    });
  });

  describe('list()', () => {
    it('returns all nodes', () => {
      const nodes = store.list();
      expect(nodes).toHaveLength(3);
      const ids = nodes.map((n) => n.frontmatter.id).sort();
      expect(ids).toEqual(['node-knowledge-b', 'node-skill-a', 'node-skill-c']);
    });
  });

  describe('error handling', () => {
    it('throws on read of non-existent node', () => {
      expect(() => store.read('non-existent')).toThrow('not found');
    });
  });
});
