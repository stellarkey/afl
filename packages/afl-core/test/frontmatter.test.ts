import { describe, it, expect } from 'vitest';
import { parseFrontmatter, AflParseError } from '../src/parser/frontmatter.js';

describe('parseFrontmatter', () => {
  it('parses a valid frontmatter block', () => {
    const raw = `---
id: "node-test"
type: skill
tags: ["a", "b"]
summary: "A test node"
---

# Hello World
`;
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter.id).toBe('node-test');
    expect(frontmatter.type).toBe('skill');
    expect(frontmatter.tags).toEqual(['a', 'b']);
    expect(frontmatter.summary).toBe('A test node');
    expect(body.trim()).toBe('# Hello World');
  });

  it('parses refs and access_frequency', () => {
    const raw = `---
id: "node-x"
type: memory
refs:
  - "node-y"
  - "node-z"
access_frequency: 42
---

Body content
`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.refs).toEqual(['node-y', 'node-z']);
    expect(frontmatter.access_frequency).toBe(42);
  });

  it('parses decay_level', () => {
    const raw = `---
id: "node-d"
type: knowledge
decay_level: warm
---

Body
`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.decay_level).toBe('warm');
  });

  it('preserves extra fields', () => {
    const raw = `---
id: "node-ext"
type: config
custom_field: "hello"
version: "2.0"
---

Body
`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.custom_field).toBe('hello');
    expect(frontmatter.version).toBe('2.0');
  });

  it('throws on missing frontmatter', () => {
    expect(() => parseFrontmatter('# No frontmatter')).toThrow(AflParseError);
  });

  it('throws on missing id', () => {
    const raw = `---
type: skill
---

Body
`;
    expect(() => parseFrontmatter(raw)).toThrow('Missing required field "id"');
  });

  it('throws on missing type', () => {
    const raw = `---
id: "test"
---

Body
`;
    expect(() => parseFrontmatter(raw)).toThrow('Missing required field "type"');
  });

  it('throws on invalid type', () => {
    const raw = `---
id: "test"
type: invalid_type
---

Body
`;
    expect(() => parseFrontmatter(raw)).toThrow('Invalid node type');
  });

  it('throws on invalid decay_level', () => {
    const raw = `---
id: "test"
type: memory
decay_level: lukewarm
---

Body
`;
    expect(() => parseFrontmatter(raw)).toThrow('Invalid decay_level');
  });

  it('throws when refs is not an array', () => {
    const raw = `---
id: "test"
type: skill
refs: "not-an-array"
---

Body
`;
    expect(() => parseFrontmatter(raw)).toThrow('must be an array');
  });
});
