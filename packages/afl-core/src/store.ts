import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { parseNode } from './parser/index.js';
import type {
  AflNode,
  Frontmatter,
  NodeIndex,
  NodeIndexEntry,
  ReadOptions,
  ReadResult,
} from './types.js';

const AFL_DIR = '.afl';
const INDEX_FILE = 'index.json';
const ACCESS_LOG = 'access_log.jsonl';

export class NodeStore {
  readonly rootDir: string;
  private nodes: Map<string, AflNode> = new Map();
  private pathIndex: Map<string, string> = new Map(); // filePath -> nodeId

  constructor(rootDir: string) {
    this.rootDir = resolve(rootDir);
  }

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------

  /**
   * Scan the root directory for .md files, parse each, and build the
   * in-memory index. Also computes back_refs.
   */
  scan(): void {
    this.nodes.clear();
    this.pathIndex.clear();

    const mdFiles = this.findMarkdownFiles(this.rootDir);

    for (const filePath of mdFiles) {
      try {
        const raw = readFileSync(filePath, 'utf-8');
        const node = parseNode(raw, filePath);
        this.nodes.set(node.frontmatter.id, node);
        this.pathIndex.set(filePath, node.frontmatter.id);
      } catch {
        // Skip files that fail to parse (no frontmatter, etc.)
      }
    }

    this.rebuildBackRefs();
  }

  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

  get(id: string): AflNode | undefined {
    return this.nodes.get(id);
  }

  has(id: string): boolean {
    return this.nodes.has(id);
  }

  list(): AflNode[] {
    return [...this.nodes.values()];
  }

  listIds(): string[] {
    return [...this.nodes.keys()];
  }

  size(): number {
    return this.nodes.size;
  }

  // -----------------------------------------------------------------------
  // Read Protocol (depth-controlled)
  // -----------------------------------------------------------------------

  /**
   * Read a node with depth-controlled reference expansion.
   *
   * - depth 0: frontmatter only (body is empty string)
   * - depth 1: full node, references remain as links
   * - depth 2+: recursively expand strong references
   */
  read(id: string, options: ReadOptions = {}): ReadResult {
    const { depth = 1, filterType, maxExpand = 50 } = options;

    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node "${id}" not found`);
    }

    this.recordAccess(id);

    if (depth <= 0) {
      // DEPTH 0: metadata only
      const shallow: AflNode = {
        frontmatter: node.frontmatter,
        body: '',
        references: [],
        filePath: node.filePath,
      };
      return { node: shallow, depth: 0 };
    }

    if (depth === 1) {
      return { node, depth: 1 };
    }

    // DEPTH 2+: expand all references (frontmatter refs + body strong refs)
    const expanded = new Map<string, ReadResult>();
    let expandCount = 0;

    // Collect target IDs from both frontmatter refs and body strong references
    const targetIds: string[] = [];
    if (node.frontmatter.refs) {
      for (const ref of node.frontmatter.refs) {
        if (!targetIds.includes(ref)) targetIds.push(ref);
      }
    }
    for (const ref of node.references) {
      if (ref.kind === 'strong' && !targetIds.includes(ref.targetId)) {
        targetIds.push(ref.targetId);
      }
    }

    for (const targetId of targetIds) {
      if (expandCount >= maxExpand) break;
      if (!this.nodes.has(targetId)) continue;
      if (filterType) {
        const target = this.nodes.get(targetId)!;
        if (target.frontmatter.type !== filterType) continue;
      }

      if (!expanded.has(targetId)) {
        expanded.set(
          targetId,
          this.read(targetId, { depth: depth - 1, filterType, maxExpand }),
        );
        expandCount++;
      }
    }

    return {
      node,
      expanded: expanded.size > 0 ? expanded : undefined,
      depth,
    };
  }

  /**
   * Expand a single node (shorthand for read with depth=1).
   */
  expand(id: string): AflNode {
    return this.read(id, { depth: 1 }).node;
  }

  // -----------------------------------------------------------------------
  // Back-reference maintenance
  // -----------------------------------------------------------------------

  private rebuildBackRefs(): void {
    // Clear all existing back_refs
    for (const node of this.nodes.values()) {
      node.frontmatter.back_refs = [];
    }

    // Rebuild from strong references + frontmatter refs
    for (const node of this.nodes.values()) {
      const allTargets = new Set<string>();

      // From frontmatter.refs
      if (node.frontmatter.refs) {
        for (const ref of node.frontmatter.refs) {
          allTargets.add(ref);
        }
      }

      // From body strong references
      for (const ref of node.references) {
        if (ref.kind === 'strong') {
          allTargets.add(ref.targetId);
        }
      }

      // Add back_ref to each target
      for (const targetId of allTargets) {
        const target = this.nodes.get(targetId);
        if (target) {
          if (!target.frontmatter.back_refs) {
            target.frontmatter.back_refs = [];
          }
          if (!target.frontmatter.back_refs.includes(node.frontmatter.id)) {
            target.frontmatter.back_refs.push(node.frontmatter.id);
          }
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Access tracking
  // -----------------------------------------------------------------------

  private recordAccess(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;

    node.frontmatter.access_frequency = (node.frontmatter.access_frequency ?? 0) + 1;
    node.frontmatter.last_accessed = new Date().toISOString();

    // Append to access log
    const aflDir = join(this.rootDir, AFL_DIR);
    if (!existsSync(aflDir)) mkdirSync(aflDir, { recursive: true });

    const logEntry = JSON.stringify({
      node_id: id,
      timestamp: node.frontmatter.last_accessed,
      access_frequency: node.frontmatter.access_frequency,
    }) + '\n';

    try {
      writeFileSync(join(aflDir, ACCESS_LOG), logEntry, { flag: 'a' });
    } catch {
      // Non-critical: log write failure is acceptable
    }
  }

  // -----------------------------------------------------------------------
  // Index persistence
  // -----------------------------------------------------------------------

  /**
   * Save the current in-memory index to .afl/index.json
   */
  saveIndex(): void {
    const aflDir = join(this.rootDir, AFL_DIR);
    if (!existsSync(aflDir)) mkdirSync(aflDir, { recursive: true });

    const entries: Record<string, NodeIndexEntry> = {};
    for (const node of this.nodes.values()) {
      const fm = node.frontmatter;
      entries[fm.id] = {
        id: fm.id,
        type: fm.type,
        filePath: relative(this.rootDir, node.filePath),
        summary: fm.summary,
        tags: fm.tags,
        refs: fm.refs,
        back_refs: fm.back_refs,
        access_frequency: fm.access_frequency,
        last_accessed: fm.last_accessed,
        decay_level: fm.decay_level,
      };
    }

    const index: NodeIndex = {
      version: '0.1.0',
      updated_at: new Date().toISOString(),
      nodes: entries,
    };

    writeFileSync(
      join(aflDir, INDEX_FILE),
      JSON.stringify(index, null, 2),
      'utf-8',
    );
  }

  // -----------------------------------------------------------------------
  // File discovery
  // -----------------------------------------------------------------------

  private findMarkdownFiles(dir: string): string[] {
    const results: string[] = [];

    // Skip .afl, node_modules, .git directories
    const skipDirs = new Set(['.afl', 'node_modules', '.git', 'dist']);

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          results.push(...this.findMarkdownFiles(fullPath));
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }

    return results;
  }
}
