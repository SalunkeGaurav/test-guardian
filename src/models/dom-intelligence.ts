/**
 * DOM Intelligence schemas.
 *
 * These models are the output of the DOM Intelligence Engine v1:
 * comparison results, structural changes, survivability analysis,
 * and similarity metrics. All scores are deterministic (0-1).
 */

import type { ElementNode } from './snapshot.js';

export interface AttributeChange {
  name: string;
  before: string | undefined;
  after: string | undefined;
}

export interface StructuralChange {
  type: 'added' | 'removed' | 'changed';
  path: string;
  tagName: string;
  before?: Partial<Record<string, string | undefined>>;
  after?: Partial<Record<string, string | undefined>>;
  textChanged?: boolean;
  attributeChanges?: AttributeChange[];
}

export interface DomComparisonResult {
  snapshotA: string;
  snapshotB: string;
  timestamp: number;
  structuralSimilarity: number;
  added: StructuralChange[];
  removed: StructuralChange[];
  changed: StructuralChange[];
  unchangedPaths: string[];
}

export interface LocatorSurvivabilityResult {
  locatorId: string;
  strategy: string;
  value: string;
  exists: boolean;
  moved: boolean;
  attributesRenamed: AttributeChange[];
  hierarchyChanged: boolean;
  partialMatch: boolean;
  confidence: number;
  matchedNode?: {
    path: string;
    tagName: string;
    attributes: Record<string, string>;
    textContent?: string;
  };
}

export interface SimilarityMetrics {
  overall: number;
  structural: number;
  attribute: number;
  text: number;
  accessibility: number;
  nodeCountRatio: number;
  maxDepth: { before: number; after: number };
}

export interface NormalizedElement {
  original: ElementNode;
  tagName: string;
  normalizedAttributes: Record<string, string>;
  stableAttributes: Record<string, string>;
  dynamicAttributes: Record<string, string>;
  normalizedText: string;
  depth: number;
  path: string;
  childCount: number;
}

export interface SnapshotPair {
  id: string;
  snapshotA: { id: string; url: string; capturedAt: number };
  snapshotB: { id: string; url: string; capturedAt: number };
  comparison: DomComparisonResult;
  similarityMetrics: SimilarityMetrics;
  createdAt: number;
}
