/**
 * DOM Intelligence Module
 *
 * Responsibilities:
 * - Parse HTML into a structured ElementNode tree
 * - Diff two DOM snapshots to identify structural changes
 * - Extract locators from a DOM fragment (strategy inference)
 * - Snapshot a single element's full state (attributes, position, text)
 * - Verify whether a locator resolves in a given DOM
 * - Normalize DOM for deterministic comparison
 * - Analyze locator survivability
 * - Compute deterministic similarity metrics
 * - Index snapshots for lookup and pairing
 *
 * This module operates on DOM snapshots — it never touches a live browser.
 * Framework adapters produce the raw HTML; this module analyses it.
 *
 * Boundary: pure functions over DomSnapshot/ElementSnapshot data.
 * No I/O, no framework imports, no side effects (except SnapshotIndexer).
 *
 * @module dom
 */

export { normalizeElementNode, normalizeElementTree, flattenToStableMap } from './normalizer.js';
export { diffTrees } from './comparator.js';
export { analyzeLocatorSurvivability } from './survivability.js';
export { computeSimilarity } from './scoring.js';
export { SnapshotIndexer } from './indexer.js';
