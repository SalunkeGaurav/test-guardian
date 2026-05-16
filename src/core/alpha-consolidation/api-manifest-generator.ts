/**
 * API Manifest Generator
 *
 * Generates api-manifest.json from the current public API surface.
 * Deterministic output based on current system metadata.
 *
 * @module api-manifest-generator
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface ApiManifestEntry {
  name: string;
  type: 'interface' | 'class' | 'function' | 'constant' | 'namespace';
  stability: 'stable' | 'internal' | 'experimental';
  module: string;
  description: string;
}

export interface ApiManifest {
  version: string;
  generatedAt: number;
  totalExports: number;
  stableExports: number;
  internalExports: number;
  experimentalExports: number;
  exports: ApiManifestEntry[];
}

export function generateApiManifest(): ApiManifest {
  const exports: ApiManifestEntry[] = [
    // Core interfaces
    { name: 'FrameworkAdapter', type: 'interface', stability: 'stable', module: 'interfaces', description: 'Framework adapter interface' },
    { name: 'AdapterHooks', type: 'interface', stability: 'stable', module: 'interfaces', description: 'Adapter hooks interface' },
    { name: 'LocatorIndexProvider', type: 'interface', stability: 'stable', module: 'interfaces', description: 'Locator index provider interface' },
    { name: 'TraceProvider', type: 'interface', stability: 'stable', module: 'interfaces', description: 'Trace provider interface' },
    { name: 'HealingStrategyProvider', type: 'interface', stability: 'stable', module: 'interfaces', description: 'Healing strategy provider interface' },
    { name: 'StorageProvider', type: 'interface', stability: 'stable', module: 'interfaces', description: 'Storage provider interface' },
    { name: 'PatchProvider', type: 'interface', stability: 'stable', module: 'interfaces', description: 'Patch provider interface' },
    { name: 'DomAnalyzer', type: 'interface', stability: 'stable', module: 'interfaces', description: 'DOM analyzer interface' },
    { name: 'ReplayEngine', type: 'interface', stability: 'stable', module: 'interfaces', description: 'Replay engine interface' },

    // Domain models - Framework
    { name: 'TestFile', type: 'interface', stability: 'stable', module: 'models', description: 'Test file model' },
    { name: 'TestSuite', type: 'interface', stability: 'stable', module: 'models', description: 'Test suite model' },
    { name: 'FrameworkInfo', type: 'interface', stability: 'stable', module: 'models', description: 'Framework information model' },
    { name: 'AdapterCapabilities', type: 'interface', stability: 'stable', module: 'models', description: 'Adapter capabilities model' },

    // Domain models - Locator
    { name: 'Locator', type: 'interface', stability: 'stable', module: 'models', description: 'Locator model' },
    { name: 'LocatorStrategy', type: 'interface', stability: 'stable', module: 'models', description: 'Locator strategy model' },
    { name: 'LocatorIndexEntry', type: 'interface', stability: 'stable', module: 'models', description: 'Locator index entry model' },
    { name: 'LocatorIndex', type: 'interface', stability: 'stable', module: 'models', description: 'Locator index model' },

    // Domain models - Trace
    { name: 'ExecutionTrace', type: 'interface', stability: 'stable', module: 'models', description: 'Execution trace model' },
    { name: 'TraceEvent', type: 'interface', stability: 'stable', module: 'models', description: 'Trace event model' },
    { name: 'TraceSummary', type: 'interface', stability: 'stable', module: 'models', description: 'Trace summary model' },
    { name: 'TraceEventType', type: 'interface', stability: 'stable', module: 'models', description: 'Trace event type model' },

    // Domain models - DOM
    { name: 'DomSnapshot', type: 'interface', stability: 'stable', module: 'models', description: 'DOM snapshot model' },
    { name: 'ElementSnapshot', type: 'interface', stability: 'stable', module: 'models', description: 'Element snapshot model' },
    { name: 'ElementNode', type: 'interface', stability: 'stable', module: 'models', description: 'Element node model' },
    { name: 'DomDiff', type: 'interface', stability: 'stable', module: 'models', description: 'DOM diff model' },

    // Domain models - Navigation
    { name: 'NavigationStep', type: 'interface', stability: 'stable', module: 'models', description: 'Navigation step model' },
    { name: 'NavigationSession', type: 'interface', stability: 'stable', module: 'models', description: 'Navigation session model' },
    { name: 'StepCommand', type: 'interface', stability: 'stable', module: 'models', description: 'Step command model' },

    // Domain models - Healing
    { name: 'HealingProposal', type: 'interface', stability: 'stable', module: 'models', description: 'Healing proposal model' },
    { name: 'HealingStrategy', type: 'interface', stability: 'stable', module: 'models', description: 'Healing strategy model' },
    { name: 'HealingHistoryEntry', type: 'interface', stability: 'stable', module: 'models', description: 'Healing history entry model' },
    { name: 'StrategyVerdict', type: 'interface', stability: 'stable', module: 'models', description: 'Strategy verdict model' },

    // Domain models - Patch
    { name: 'Patch', type: 'interface', stability: 'stable', module: 'models', description: 'Patch model' },
    { name: 'PatchFile', type: 'interface', stability: 'stable', module: 'models', description: 'Patch file model' },
    { name: 'PatchStatus', type: 'interface', stability: 'stable', module: 'models', description: 'Patch status model' },
    { name: 'PatchProposal', type: 'interface', stability: 'stable', module: 'models', description: 'Patch proposal model' },
    { name: 'PatchReviewStatus', type: 'interface', stability: 'stable', module: 'models', description: 'Patch review status model' },
    { name: 'PatchDiff', type: 'interface', stability: 'stable', module: 'models', description: 'Patch diff model' },
    { name: 'PatchSummary', type: 'interface', stability: 'stable', module: 'models', description: 'Patch summary model' },
    { name: 'ASTNodeMetadata', type: 'interface', stability: 'stable', module: 'models', description: 'AST node metadata model' },
    { name: 'ConfidenceMetadata', type: 'interface', stability: 'stable', module: 'models', description: 'Confidence metadata model' },
    { name: 'ValidationReference', type: 'interface', stability: 'stable', module: 'models', description: 'Validation reference model' },
    { name: 'AuditReference', type: 'interface', stability: 'stable', module: 'models', description: 'Audit reference model' },
    { name: 'RollbackMetadata', type: 'interface', stability: 'stable', module: 'models', description: 'Rollback metadata model' },
    { name: 'PATCH_SCHEMA_VERSION', type: 'constant', stability: 'stable', module: 'models', description: 'Patch schema version constant' },
    { name: 'PATCH_STORAGE_DIR', type: 'constant', stability: 'stable', module: 'models', description: 'Patch storage directory constant' },

    // Domain models - Replay
    { name: 'ReplayStep', type: 'interface', stability: 'stable', module: 'models', description: 'Replay step model' },
    { name: 'ReplaySession', type: 'interface', stability: 'stable', module: 'models', description: 'Replay session model' },
    { name: 'ReplaySessionIndexEntry', type: 'interface', stability: 'stable', module: 'models', description: 'Replay session index entry model' },
    { name: 'CanonicalActionType', type: 'interface', stability: 'stable', module: 'models', description: 'Canonical action type model' },
    { name: 'LocatorReference', type: 'interface', stability: 'stable', module: 'models', description: 'Locator reference model' },
    { name: 'NavigationContext', type: 'interface', stability: 'stable', module: 'models', description: 'Navigation context model' },
    { name: 'StepResult', type: 'interface', stability: 'stable', module: 'models', description: 'Step result model' },
    { name: 'SnapshotReference', type: 'interface', stability: 'stable', module: 'models', description: 'Snapshot reference model' },
    { name: 'InputPayload', type: 'interface', stability: 'stable', module: 'models', description: 'Input payload model' },

    // Domain models - DOM Intelligence
    { name: 'DomComparisonResult', type: 'interface', stability: 'stable', module: 'models', description: 'DOM comparison result model' },
    { name: 'StructuralChange', type: 'interface', stability: 'stable', module: 'models', description: 'Structural change model' },
    { name: 'AttributeChange', type: 'interface', stability: 'stable', module: 'models', description: 'Attribute change model' },
    { name: 'LocatorSurvivabilityResult', type: 'interface', stability: 'stable', module: 'models', description: 'Locator survivability result model' },
    { name: 'SimilarityMetrics', type: 'interface', stability: 'stable', module: 'models', description: 'Similarity metrics model' },
    { name: 'NormalizedElement', type: 'interface', stability: 'stable', module: 'models', description: 'Normalized element model' },
    { name: 'SnapshotPair', type: 'interface', stability: 'stable', module: 'models', description: 'Snapshot pair model' },

    // Domain models - Healing Candidate
    { name: 'HealingCandidate', type: 'interface', stability: 'stable', module: 'models', description: 'Healing candidate model' },
    { name: 'CandidateRanking', type: 'interface', stability: 'stable', module: 'models', description: 'Candidate ranking model' },
    { name: 'CandidateExplanation', type: 'interface', stability: 'stable', module: 'models', description: 'Candidate explanation model' },
    { name: 'ChangeExplanation', type: 'interface', stability: 'stable', module: 'models', description: 'Change explanation model' },
    { name: 'DomEvidence', type: 'interface', stability: 'stable', module: 'models', description: 'DOM evidence model' },
    { name: 'CandidateStrategy', type: 'interface', stability: 'stable', module: 'models', description: 'Candidate strategy model' },
    { name: 'HealingStrategyDefinition', type: 'interface', stability: 'stable', module: 'models', description: 'Healing strategy definition model' },

    // Domain models - Validation
    { name: 'ValidationResult', type: 'interface', stability: 'stable', module: 'models', description: 'Validation result model' },
    { name: 'ValidationStatus', type: 'interface', stability: 'stable', module: 'models', description: 'Validation status model' },
    { name: 'FalsePositiveIndicator', type: 'interface', stability: 'stable', module: 'models', description: 'False positive indicator model' },
    { name: 'ExecutionMetadata', type: 'interface', stability: 'stable', module: 'models', description: 'Execution metadata model' },

    // Domain models - Runtime
    { name: 'RuntimeValidationResult', type: 'interface', stability: 'stable', module: 'models', description: 'Runtime validation result model' },
    { name: 'RuntimeStatus', type: 'interface', stability: 'stable', module: 'models', description: 'Runtime status model' },
    { name: 'RuntimeEvidence', type: 'interface', stability: 'stable', module: 'models', description: 'Runtime evidence model' },
    { name: 'MatchedElement', type: 'interface', stability: 'stable', module: 'models', description: 'Matched element model' },
    { name: 'TimingMetadata', type: 'interface', stability: 'stable', module: 'models', description: 'Timing metadata model' },
    { name: 'BrowserMetadata', type: 'interface', stability: 'stable', module: 'models', description: 'Browser metadata model' },
    { name: 'ReplayDivergence', type: 'interface', stability: 'stable', module: 'models', description: 'Replay divergence model' },
    { name: 'RuntimeFalsePositiveIndicator', type: 'interface', stability: 'stable', module: 'models', description: 'Runtime false positive indicator model' },
    { name: 'BrowserContextState', type: 'interface', stability: 'stable', module: 'models', description: 'Browser context state model' },
    { name: 'NavigationResult', type: 'interface', stability: 'stable', module: 'models', description: 'Navigation result model' },
    { name: 'InteractionResult', type: 'interface', stability: 'stable', module: 'models', description: 'Interaction result model' },

    // Domain models - Pipeline
    { name: 'PipelineInput', type: 'interface', stability: 'stable', module: 'models', description: 'Pipeline input model' },
    { name: 'PipelineResult', type: 'interface', stability: 'stable', module: 'models', description: 'Pipeline result model' },
    { name: 'PipelineSummary', type: 'interface', stability: 'stable', module: 'models', description: 'Pipeline summary model' },
    { name: 'PipelineStatus', type: 'interface', stability: 'stable', module: 'models', description: 'Pipeline status model' },
    { name: 'PipelineStage', type: 'interface', stability: 'stable', module: 'models', description: 'Pipeline stage model' },

    // Domain models - Explanation
    { name: 'HealingExplanation', type: 'interface', stability: 'stable', module: 'models', description: 'Healing explanation model' },
    { name: 'ConfidenceBreakdown', type: 'interface', stability: 'stable', module: 'models', description: 'Confidence breakdown model' },
    { name: 'ExplanationEvidence', type: 'interface', stability: 'stable', module: 'models', description: 'Explanation evidence model' },

    // Domain models - Audit
    { name: 'AuditTrailEntry', type: 'interface', stability: 'stable', module: 'models', description: 'Audit trail entry model' },
    { name: 'AuditTrailSummary', type: 'interface', stability: 'stable', module: 'models', description: 'Audit trail summary model' },
    { name: 'RejectionDecision', type: 'interface', stability: 'stable', module: 'models', description: 'Rejection decision model' },
    { name: 'StageTiming', type: 'interface', stability: 'stable', module: 'models', description: 'Stage timing model' },
    { name: 'StageOutput', type: 'interface', stability: 'stable', module: 'models', description: 'Stage output model' },

    // Domain models - Stability
    { name: 'StabilityReport', type: 'interface', stability: 'stable', module: 'models', description: 'Stability report model' },
    { name: 'StabilityRunResult', type: 'interface', stability: 'stable', module: 'models', description: 'Stability run result model' },

    // Domain models - Result
    { name: 'Result', type: 'interface', stability: 'stable', module: 'models', description: 'Result model' },
    { name: 'success', type: 'function', stability: 'stable', module: 'models', description: 'Create a success result' },
    { name: 'failure', type: 'function', stability: 'stable', module: 'models', description: 'Create a failure result' },

    // Core classes
    { name: 'HealingPipeline', type: 'class', stability: 'stable', module: 'pipeline', description: 'Healing pipeline orchestrator' },
    { name: 'ExplainabilityEngine', type: 'class', stability: 'stable', module: 'pipeline', description: 'Explainability engine' },
    { name: 'ConfidenceGovernance', type: 'class', stability: 'stable', module: 'pipeline', description: 'Confidence governance engine' },
    { name: 'StabilityAnalyzer', type: 'class', stability: 'stable', module: 'pipeline', description: 'Stability analyzer' },
    { name: 'AuditPersister', type: 'class', stability: 'stable', module: 'pipeline', description: 'Audit persister' },
    { name: 'GovernanceConfig', type: 'interface', stability: 'stable', module: 'pipeline', description: 'Governance configuration' },
    { name: 'GovernanceResult', type: 'interface', stability: 'stable', module: 'pipeline', description: 'Governance result' },
    { name: 'GateResult', type: 'interface', stability: 'stable', module: 'pipeline', description: 'Gate result' },
    { name: 'PatchGenerator', type: 'class', stability: 'stable', module: 'patcher', description: 'Patch generator' },
    { name: 'PatchDiffEngine', type: 'class', stability: 'stable', module: 'patcher', description: 'Patch diff engine' },
    { name: 'PatchSafetyValidator', type: 'class', stability: 'stable', module: 'patcher', description: 'Patch safety validator' },
    { name: 'PatchStorage', type: 'class', stability: 'stable', module: 'patcher', description: 'Patch storage' },
    { name: 'PatchGeneratorInput', type: 'interface', stability: 'stable', module: 'patcher', description: 'Patch generator input' },
    { name: 'LocatorAstMatch', type: 'interface', stability: 'stable', module: 'patcher', description: 'Locator AST match' },
    { name: 'SafetyGateResult', type: 'interface', stability: 'stable', module: 'patcher', description: 'Safety gate result' },
    { name: 'SafetyValidationInput', type: 'interface', stability: 'stable', module: 'patcher', description: 'Safety validation input' },
    { name: 'SafetyValidationOutput', type: 'interface', stability: 'stable', module: 'patcher', description: 'Safety validation output' },

    // Internal exports
    { name: 'internal.UnifiedRuntime', type: 'namespace', stability: 'internal', module: 'unified-runtime', description: 'Unified runtime (internal)' },
    { name: 'internal.RepositoryValidator', type: 'namespace', stability: 'internal', module: 'repository-validator', description: 'Repository validator (internal)' },
    { name: 'internal.RuntimeHardening', type: 'namespace', stability: 'internal', module: 'runtime-hardening', description: 'Runtime hardening (internal)' },
    { name: 'internal.RuntimeHealingLoop', type: 'namespace', stability: 'internal', module: 'runtime-healing-loop', description: 'Runtime healing loop (internal)' },
    { name: 'internal.ExecutionLab', type: 'namespace', stability: 'internal', module: 'execution-lab', description: 'Execution lab (internal)' },
    { name: 'internal.OperationalReliability', type: 'namespace', stability: 'internal', module: 'operational-reliability', description: 'Operational reliability (internal)' },
    { name: 'internal.LargeScaleCorpus', type: 'namespace', stability: 'internal', module: 'large-scale-corpus', description: 'Large scale corpus (internal)' },
    { name: 'internal.Stabilization', type: 'namespace', stability: 'internal', module: 'stabilization', description: 'Stabilization (internal)' },
    { name: 'internal.ProductionReadiness', type: 'namespace', stability: 'internal', module: 'production-readiness', description: 'Production readiness (internal)' },
    { name: 'internal.DeveloperReview', type: 'namespace', stability: 'internal', module: 'developer-review', description: 'Developer review (internal)' },

    // Experimental exports
    { name: 'experimental.ConfidenceCalibration', type: 'namespace', stability: 'experimental', module: 'confidence-calibration', description: 'Confidence calibration (experimental)' },
    { name: 'experimental.HealingBenchmark', type: 'namespace', stability: 'experimental', module: 'healing-benchmark', description: 'Healing benchmark (experimental)' },
    { name: 'experimental.HealingIntelligence', type: 'namespace', stability: 'experimental', module: 'healing-intelligence', description: 'Healing intelligence (experimental)' },
    { name: 'experimental.PatternIntelligence', type: 'namespace', stability: 'experimental', module: 'pattern-intelligence', description: 'Pattern intelligence (experimental)' },
    { name: 'experimental.AdversarialTester', type: 'namespace', stability: 'experimental', module: 'adversarial-tester', description: 'Adversarial tester (experimental)' },
    { name: 'experimental.CorpusExecution', type: 'namespace', stability: 'experimental', module: 'corpus-execution', description: 'Corpus execution (experimental)' },
    { name: 'experimental.DeveloperWorkflow', type: 'namespace', stability: 'experimental', module: 'developer-workflow', description: 'Developer workflow (experimental)' },
    { name: 'experimental.CIFailureValidation', type: 'namespace', stability: 'experimental', module: 'ci-failure-validation', description: 'CI failure validation (experimental)' },
    { name: 'experimental.ArchitectureCohesionAudit', type: 'namespace', stability: 'experimental', module: 'architecture-cohesion-audit', description: 'Architecture cohesion audit (experimental)' },
    { name: 'experimental.RiskDiscrimination', type: 'namespace', stability: 'experimental', module: 'risk-discrimination', description: 'Risk discrimination (experimental)' },
  ];

  const stableExports = exports.filter((e) => e.stability === 'stable');
  const internalExports = exports.filter((e) => e.stability === 'internal');
  const experimentalExports = exports.filter((e) => e.stability === 'experimental');

  return {
    version: '1.0.0-alpha',
    generatedAt: 0,
    totalExports: exports.length,
    stableExports: stableExports.length,
    internalExports: internalExports.length,
    experimentalExports: experimentalExports.length,
    exports,
  };
}

export function persistApiManifest(outputDir: string): string {
  const manifest = generateApiManifest();
  const dir = join(outputDir, 'alpha-release');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = join(dir, 'api-manifest.json');
  writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
  return filePath;
}
