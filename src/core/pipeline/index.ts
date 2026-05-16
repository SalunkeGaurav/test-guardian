/**
 * Healing Pipeline Module
 *
 * End-to-end orchestration of the healing workflow:
 *   HealingEngine → ValidationEngine → ReplayRuntime
 *
 * Sub-modules:
 *   - ExplainabilityEngine: deterministic explanation generation
 *   - ConfidenceGovernance: approval gates
 *   - StabilityAnalyzer: repeated validation analysis
 *   - AuditPersister: audit trail persistence
 *
 * @module pipeline
 */

export { HealingPipeline } from './healing-pipeline.js';
export { ExplainabilityEngine } from './explainability-engine.js';
export { ConfidenceGovernance } from './confidence-governance.js';
export { StabilityAnalyzer } from './stability-analyzer.js';
export { AuditPersister } from './audit-persister.js';
export type { GovernanceConfig, GovernanceResult, GateResult } from './confidence-governance.js';
