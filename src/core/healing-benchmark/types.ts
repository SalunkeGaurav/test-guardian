export type HealingOutcome =
  | 'successful-safe-recovery'
  | 'successful-but-risky'
  | 'false-positive'
  | 'replay-divergence'
  | 'compile-breaking'
  | 'validation-failed'
  | 'unsupported-pattern';

export interface HealingEffectivenessReport {
  id: string;
  generatedAt: number;
  benchmarkPath: string;
  overallRecoveryRate: number;
  safeMutationRate: number;
  falsePositiveRate: number;
  replayConsistencyRate: number;
  rollbackSuccessRate: number;
  compilePreservationRate: number;
  governanceRejectionRate: number;
  benchmarkResults: BenchmarkResult[];
  healingOutcomes: HealingOutcomeStats;
  riskyHealingPatterns: RiskyPattern[];
  unsupportedPatterns: string[];
  architecturalWeakPoints: ArchitecturalWeakPoint[];
  confidenceScoreReliability: ConfidenceReliability;
}

export interface BenchmarkResult {
  benchmarkId: string;
  category: string;
  originalLocator: string;
  attemptedRecovery: boolean;
  outcome: HealingOutcome;
  recoveryTimeMs: number;
  safetyVerified: boolean;
  details: Record<string, unknown>;
}

export interface HealingOutcomeStats {
  'successful-safe-recovery': number;
  'successful-but-risky': number;
  'false-positive': number;
  'replay-divergence': number;
  'compile-breaking': number;
  'validation-failed': number;
  'unsupported-pattern': number;
}

export interface RiskyPattern {
  pattern: string;
  occurrenceCount: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ArchitecturalWeakPoint {
  location: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ConfidenceReliability {
  highConfidenceAccuracy: number;
  moderateConfidenceAccuracy: number;
  lowConfidenceAccuracy: number;
  averageConfidenceScore: number;
}