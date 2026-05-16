/**
 * Deterministic ID Generator
 *
 * Produces stable, reproducible IDs for all entities in the system.
 * Key properties:
 *   - Same input → same output (across processes, restarts, machines)
 *   - No timestamp dependence
 *   - No process-global mutable counters
 *   - Collision-resistant hash basis
 *
 * ID format: {type}-{stable-hash}
 *   - type: entity type prefix (trace, session, candidate, patch, etc.)
 *   - stable-hash: SHA-1 of canonical components, truncated to 12 hex chars
 *
 * The hash input is a deterministic string derived from entity properties:
 *   - trace: testFile + testName + framework + events hash
 *   - session: traceId + testName + testFile + steps hash
 *   - candidate: locatorId + strategy + proposedValue + createdAtSeed
 *   - patch: proposalId + targetFile + targetLine + createdAtSeed
 *
 * No AI. No timestamps. No counters. No side effects.
 */

import { createHash } from 'node:crypto';

export type EntityType =
  | 'trace'
  | 'session'
  | 'step'
  | 'candidate'
  | 'patch'
  | 'validation'
  | 'runtime'
  | 'audit'
  | 'snapshot'
  | 'healing'
  | 'explanation'
  | 'stability'
  | 'proposal';

const TYPE_PREFIX: Record<EntityType, string> = {
  trace: 'trace',
  session: 'session',
  step: 'step',
  candidate: 'candidate',
  patch: 'patch',
  validation: 'validation',
  runtime: 'runtime',
  audit: 'audit',
  snapshot: 'snap',
  healing: 'heal',
  explanation: 'expl',
  stability: 'stab',
  proposal: 'prop',
};

function stableHash(input: string): string {
  const h = createHash('sha1').update(input).digest('hex');
  return h.slice(0, 12);
}

function canonicalize(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/**
 * Generate a deterministic trace ID from trace properties.
 * Same test execution produces same ID across processes.
 */
export function generateTraceId(
  testFile: string,
  testName: string,
  framework: string,
  eventCount: number,
): string {
  const parts = [
    canonicalize(testFile),
    canonicalize(testName),
    canonicalize(framework),
    String(eventCount),
  ];
  return `${TYPE_PREFIX.trace}-${stableHash(parts.join('|'))}`;
}

/**
 * Generate a deterministic session ID from session properties.
 */
export function generateSessionId(
  traceId: string,
  testName: string,
  testFile: string,
  stepCount: number,
): string {
  const parts = [
    canonicalize(traceId),
    canonicalize(testName),
    canonicalize(testFile),
    String(stepCount),
  ];
  return `${TYPE_PREFIX.session}-${stableHash(parts.join('|'))}`;
}

/**
 * Generate a deterministic step ID from step properties.
 */
export function generateStepId(
  sessionId: string,
  actionType: string,
  pageUrl: string,
  index: number,
): string {
  const parts = [
    canonicalize(sessionId),
    canonicalize(actionType),
    canonicalize(pageUrl),
    String(index),
  ];
  return `${TYPE_PREFIX.step}-${stableHash(parts.join('|'))}`;
}

/**
 * Generate a deterministic healing candidate ID.
 * Uses strategy + proposed expression for stability.
 * createdAtSeed is optional and only used as a tiebreaker for
 * same-expression candidates generated in different pipeline runs.
 */
export function generateCandidateId(
  locatorId: string,
  strategy: string,
  proposedValue: string,
  createdAtSeed?: number,
): string {
  const parts = [
    canonicalize(locatorId),
    canonicalize(strategy),
    canonicalize(proposedValue),
    createdAtSeed !== undefined ? String(createdAtSeed) : '0',
  ];
  return `${TYPE_PREFIX.candidate}-${stableHash(parts.join('|'))}`;
}

/**
 * Generate a deterministic validation ID.
 */
export function generateValidationId(
  proposalId: string,
  locatorId: string,
): string {
  const parts = [canonicalize(proposalId), canonicalize(locatorId)];
  return `${TYPE_PREFIX.validation}-${stableHash(parts.join('|'))}`;
}

/**
 * Generate a deterministic runtime ID.
 */
export function generateRuntimeId(
  sessionId: string,
  proposalId: string,
): string {
  const parts = [canonicalize(sessionId), canonicalize(proposalId)];
  return `${TYPE_PREFIX.runtime}-${stableHash(parts.join('|'))}`;
}

/**
 * Generate a deterministic patch ID.
 */
export function generatePatchId(
  proposalId: string,
  targetFile: string,
  targetLine: number,
  createdAtSeed?: number,
): string {
  const parts = [
    canonicalize(proposalId),
    canonicalize(targetFile),
    String(targetLine),
    createdAtSeed !== undefined ? String(createdAtSeed) : '0',
  ];
  return `${TYPE_PREFIX.patch}-${stableHash(parts.join('|'))}`;
}

/**
 * Generate a deterministic audit ID.
 */
export function generateAuditId(
  pipelineRunId: string,
  locatorId: string,
): string {
  const parts = [canonicalize(pipelineRunId), canonicalize(locatorId)];
  return `${TYPE_PREFIX.audit}-${stableHash(parts.join('|'))}`;
}

/**
 * Generate a deterministic snapshot ID.
 */
export function generateSnapshotId(
  traceId: string,
  eventIndex: number,
  capturedAt: number,
): string {
  const parts = [canonicalize(traceId), String(eventIndex), String(capturedAt)];
  return `${TYPE_PREFIX.snapshot}-${stableHash(parts.join('|'))}`;
}

/**
 * Generate a deterministic stability report ID.
 */
export function generateStabilityId(
  candidateId: string,
  locatorId: string,
): string {
  const parts = [canonicalize(candidateId), canonicalize(locatorId)];
  return `${TYPE_PREFIX.stability}-${stableHash(parts.join('|'))}`;
}

/**
 * Generate a deterministic healing explanation ID.
 */
export function generateExplanationId(
  proposalId: string,
  locatorId: string,
  strategy: string,
): string {
  const parts = [
    canonicalize(proposalId),
    canonicalize(locatorId),
    canonicalize(strategy),
  ];
  return `${TYPE_PREFIX.explanation}-${stableHash(parts.join('|'))}`;
}

/**
 * Generate a deterministic healing proposal ID.
 */
export function generateProposalId(
  locatorId: string,
  strategy: string,
  proposedExpression: string,
): string {
  const parts = [
    canonicalize(locatorId),
    canonicalize(strategy),
    canonicalize(proposedExpression),
  ];
  return `${TYPE_PREFIX.proposal}-${stableHash(parts.join('|'))}`;
}

/**
 * Generate a deterministic healing history entry ID.
 */
export function generateHealingHistoryId(
  traceId: string,
  locatorId: string,
): string {
  const parts = [canonicalize(traceId), canonicalize(locatorId)];
  return `healhist-${stableHash(parts.join('|'))}`;
}

/**
 * Verify that two IDs were generated from the same input components.
 */
export function verifyIdConsistency(
  id: string,
  type: EntityType,
  inputs: Record<string, string | number>,
): boolean {
  const generators: Record<EntityType, (inputs: Record<string, string | number>) => string> = {
    trace: (i) => generateTraceId(String(i.testFile), String(i.testName), String(i.framework), Number(i.eventCount)),
    session: (i) => generateSessionId(String(i.traceId), String(i.testName), String(i.testFile), Number(i.stepCount)),
    step: (i) => generateStepId(String(i.sessionId), String(i.actionType), String(i.pageUrl), Number(i.index)),
    candidate: (i) => generateCandidateId(String(i.locatorId), String(i.strategy), String(i.proposedValue)),
    patch: (i) => generatePatchId(String(i.proposalId), String(i.targetFile), Number(i.targetLine)),
    validation: (i) => generateValidationId(String(i.proposalId), String(i.locatorId)),
    runtime: (i) => generateRuntimeId(String(i.sessionId), String(i.proposalId)),
    audit: (i) => generateAuditId(String(i.pipelineRunId), String(i.locatorId)),
    snapshot: (i) => generateSnapshotId(String(i.traceId), Number(i.eventIndex), Number(i.capturedAt)),
    healing: () => id,
    explanation: (i) => generateExplanationId(String(i.proposalId), String(i.locatorId), String(i.strategy)),
    stability: (i) => generateStabilityId(String(i.candidateId), String(i.locatorId)),
    proposal: (i) => generateProposalId(String(i.locatorId), String(i.strategy), String(i.proposedExpression)),
  };

  const expected = generators[type](inputs);
  return expected === id;
}