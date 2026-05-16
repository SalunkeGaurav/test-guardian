/**
 * Snapshot Indexer
 *
 * Supports:
 * - snapshot lookup by ID, URL, trace
 * - pairing two snapshots for comparison
 * - historical comparison (recent snapshots)
 *
 * Storage: .testguardian/snapshots/
 * Schema versioning for forward compatibility.
 *
 * Pure data management — no comparison logic.
 */

import { writeFileSync, renameSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { Result } from '../../models/result.js';
import type { DomSnapshot, ElementNode } from '../../models/snapshot.js';
import type { SnapshotPair, DomComparisonResult, SimilarityMetrics } from '../../models/dom-intelligence.js';
import { diffTrees } from './comparator.js';
import { computeSimilarity } from './scoring.js';

const SNAPSHOT_INDEX_VERSION = 1;
const STORAGE_SUBDIR = 'snapshots';

function writeJsonSafe(filePath: string, data: unknown): void {
  const tmpPath = filePath + '.tmp';
  const json = JSON.stringify(data, null, 2);
  writeFileSync(tmpPath, json, 'utf-8');
  renameSync(tmpPath, filePath);
}

interface SnapshotIndexEntry {
  id: string;
  traceId: string;
  url: string;
  capturedAt: number;
  nodeCount: number;
}

export class SnapshotIndexer {
  private readonly snapDir: string;
  private readonly indexPath: string;

  constructor(private readonly root: string) {
    this.snapDir = join(root, '.testguardian', STORAGE_SUBDIR);
    this.indexPath = join(this.snapDir, 'index.json');
  }

  private ensureDir(): void {
    if (!existsSync(this.snapDir)) {
      mkdirSync(this.snapDir, { recursive: true });
    }
  }

  private sessionDir(): string {
    return this.snapDir;
  }

  private pairFilePath(id: string): string {
    return join(this.snapDir, 'pairs', `${id}.json`);
  }

  private async readIndex(): Promise<SnapshotIndexEntry[]> {
    try {
      if (!existsSync(this.indexPath)) return [];
      const raw = JSON.parse(readFileSync(this.indexPath, 'utf-8'));
      return Array.isArray(raw) ? raw as SnapshotIndexEntry[] : [];
    } catch {
      return [];
    }
  }

  private async writeIndex(entries: SnapshotIndexEntry[]): Promise<void> {
    this.ensureDir();
    writeJsonSafe(this.indexPath, entries.sort((a, b) => b.capturedAt - a.capturedAt));
  }

  async indexSnapshot(snapshot: DomSnapshot): Promise<Result<void>> {
    try {
      this.ensureDir();
      const entry: SnapshotIndexEntry = {
        id: snapshot.id,
        traceId: snapshot.traceId,
        url: snapshot.url,
        capturedAt: snapshot.capturedAt,
        nodeCount: snapshot.elementTree?.length ?? 0,
      };
      const index = await this.readIndex();
      const filtered = index.filter(e => e.id !== snapshot.id);
      filtered.push(entry);
      await this.writeIndex(filtered);
      return { ok: true, value: undefined };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async getSnapshotElementTree(id: string): Promise<Result<ElementNode[]>> {
    try {
      const metaPath = join(this.snapDir, `${id}.meta.json`);
      if (!existsSync(metaPath)) {
        return { ok: false, error: `Snapshot ${id} metadata not found` };
      }
      const snapshot = JSON.parse(readFileSync(metaPath, 'utf-8')) as DomSnapshot;
      return { ok: true, value: snapshot.elementTree ?? [] };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async findSnapshotsByTrace(traceId: string): Promise<Result<DomSnapshot[]>> {
    try {
      const index = await this.readIndex();
      const matches = index.filter(e => e.traceId === traceId);
      const snapshots: DomSnapshot[] = [];
      for (const entry of matches) {
        const metaPath = join(this.snapDir, `${entry.id}.meta.json`);
        if (existsSync(metaPath)) {
          try {
            snapshots.push(JSON.parse(readFileSync(metaPath, 'utf-8')));
          } catch { /* skip corrupt */ }
        }
      }
      return { ok: true, value: snapshots.sort((a, b) => a.capturedAt - b.capturedAt) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async listSnapshots(limit?: number): Promise<Result<Array<{ id: string; url: string; capturedAt: number }>>> {
    try {
      const index = await this.readIndex();
      const selected = limit ? index.slice(0, limit) : index;
      return {
        ok: true,
        value: selected.map(e => ({ id: e.id, url: e.url, capturedAt: e.capturedAt })),
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async pairAndCompare(
    snapshotAId: string,
    snapshotBId: string,
    label?: string,
  ): Promise<Result<SnapshotPair>> {
    try {
      const aResult = await this.getSnapshotElementTree(snapshotAId);
      if (!aResult.ok) return aResult;
      const bResult = await this.getSnapshotElementTree(snapshotBId);
      if (!bResult.ok) return bResult;

      const comparison = diffTrees(aResult.value, bResult.value);
      comparison.snapshotA = snapshotAId;
      comparison.snapshotB = snapshotBId;

      const similarityMetrics = computeSimilarity(aResult.value, bResult.value);

      const metaA = await this.getSnapshotMeta(snapshotAId);
      const metaB = await this.getSnapshotMeta(snapshotBId);

      const pair: SnapshotPair = {
        id: label ?? `pair-${snapshotAId}-${snapshotBId}`,
        snapshotA: { id: snapshotAId, url: metaA?.url ?? '', capturedAt: metaA?.capturedAt ?? 0 },
        snapshotB: { id: snapshotBId, url: metaB?.url ?? '', capturedAt: metaB?.capturedAt ?? 0 },
        comparison,
        similarityMetrics,
        createdAt: Date.now(),
      };

      // Persist pair
      const pairsDir = join(this.snapDir, 'pairs');
      if (!existsSync(pairsDir)) mkdirSync(pairsDir, { recursive: true });
      writeJsonSafe(this.pairFilePath(pair.id), pair);

      return { ok: true, value: pair };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async getPair(id: string): Promise<Result<SnapshotPair>> {
    try {
      const path = this.pairFilePath(id);
      if (!existsSync(path)) return { ok: false, error: `Pair ${id} not found` };
      const data = JSON.parse(readFileSync(path, 'utf-8')) as SnapshotPair;
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  private async getSnapshotMeta(id: string): Promise<{ url: string; capturedAt: number } | undefined> {
    try {
      const metaPath = join(this.snapDir, `${id}.meta.json`);
      if (!existsSync(metaPath)) return undefined;
      const snapshot = JSON.parse(readFileSync(metaPath, 'utf-8')) as DomSnapshot;
      return { url: snapshot.url, capturedAt: snapshot.capturedAt };
    } catch {
      return undefined;
    }
  }
}
