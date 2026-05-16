/**
 * Healing Engine Module
 *
 * Purpose: Analyze failing locators and generate ranked healing
 * candidates using deterministic DOM intelligence strategies.
 *
 * This is a deterministic pipeline — strategies are evaluated in
 * priority order, candidates are scored by a weighted composite,
 * and low-confidence proposals are discarded. No AI. No patches.
 *
 * Inputs:
 *   - Locator (failing)
 *   - Original DOM (snapshot where locator worked)
 *   - Current DOM (snapshot where locator failed)
 *   - Optional: ReplaySession, DomComparisonResult, SimilarityMetrics
 *
 * Outputs:
 *   - HealingCandidate[] (ranked, explained, deduplicated)
 *
 * Boundary:
 *   - Does NOT apply patches — only generates proposals
 *   - Does NOT execute tests — works against stored snapshots
 *   - Does NOT use AI or LLMs
 *   - Does NOT use embeddings
 *
 * @module healing
 */

export { HealingEngine } from './engine.js';
export { collectCandidates, STRATEGIES, STRATEGY_DEFINITIONS } from './strategies.js';
export { rankCandidates, rankCandidate, removeLowConfidence, deduplicateCandidates } from './ranker.js';
