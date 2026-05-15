export type FrameworkType = 'playwright' | 'cypress' | 'selenium' | 'unknown';
export type LanguageType = 'javascript' | 'typescript' | 'mixed';
export type BDDType = 'cucumber' | 'bdd' | 'none';
export type WrapperArchitecture = 'lightweight' | 'moderate' | 'heavy';

export interface RepositoryCorpusEntry {
  id: string;
  name: string;
  path: string;
  framework: FrameworkType;
  language: LanguageType;
  bdd: BDDType;
  wrapperArchitecture: WrapperArchitecture;
  discoveredAt: number;
  testFileCount: number;
  pageObjectCount: number;
}

export interface RepositoryCorpusIndex {
  generatedAt: number;
  corpusPath: string;
  repositoryCount: number;
  repositories: RepositoryCorpusEntry[];
}

export interface CorpusExecutionResult {
  repositoryId: string;
  repositoryPath: string;
  executionOrder: number;
  validationReport?: unknown;
  patternReport?: unknown;
  benchmarkReport?: unknown;
  intelligenceReport?: unknown;
  executionTimeMs: number;
  success: boolean;
  error?: string;
}

export interface CorpusAggregateReport {
  id: string;
  generatedAt: number;
  corpusPath: string;
  totalRepositories: number;
  executionResults: CorpusExecutionResult[];
  aggregateMetrics: AggregateMetrics;
}

export interface AggregateMetrics {
  parserSurvivability: {
    average: number;
    min: number;
    max: number;
    distribution: Record<string, number>;
  };
  compileStability: {
    average: number;
    min: number;
    max: number;
    distribution: Record<string, number>;
  };
  replayStability: {
    average: number;
    min: number;
    max: number;
    distribution: Record<string, number>;
  };
  healingRecoveryRate: {
    average: number;
    min: number;
    max: number;
    distribution: Record<string, number>;
  };
  riskyRecoveryRate: {
    average: number;
    min: number;
    max: number;
    distribution: Record<string, number>;
  };
  governanceRejectionRate: {
    average: number;
    min: number;
    max: number;
    distribution: Record<string, number>;
  };
  confidenceAccuracy: {
    highConfidence: number;
    moderateConfidence: number;
    lowConfidence: number;
    average: number;
  };
  mutationRiskDistribution: Record<string, number>;
}

export interface RepositoryCorrelationReport {
  id: string;
  generatedAt: number;
  correlatedFailures: FailureCorrelation[];
  structuralPatterns: StructuralPattern[];
  recommendations: string[];
}

export interface FailureCorrelation {
  failureType: string;
  correlatedStructures: CorrelatedStructure[];
  severity: 'low' | 'medium' | 'high';
}

export interface CorrelatedStructure {
  structureType: string;
  correlationStrength: number;
  occurrenceCount: number;
  exampleRepositories: string[];
}

export interface StructuralPattern {
  pattern: string;
  occurrenceCount: number;
  failureCorrelation: number;
  affectedRepositories: string[];
}

export type CompatibilityClassification =
  | 'fully-supported'
  | 'partially-supported'
  | 'replay-fragile'
  | 'mutation-risk-heavy'
  | 'governance-unstable'
  | 'unsupported-architecture';

export interface RepositoryClassification {
  repositoryId: string;
  repositoryPath: string;
  classification: CompatibilityClassification;
  evidence: ClassificationEvidence[];
  confidence: number;
}

export interface ClassificationEvidence {
  metric: string;
  value: number;
  threshold: string;
  passed: boolean;
}

export interface FailureInventory {
  id: string;
  generatedAt: number;
  unsupportedPatterns: UnsupportedPattern[];
  replayInstabilitySources: ReplayInstabilitySource[];
  riskyHealingStructures: RiskyHealingStructure[];
  confidenceCalibrationFailures: ConfidenceCalibrationFailure[];
  parserLimitations: ParserLimitation[];
  governanceWeaknesses: GovernanceWeakness[];
}

export interface UnsupportedPattern {
  pattern: string;
  category: string;
  occurrenceCount: number;
  affectedRepositories: string[];
  recoveryImpossible: boolean;
}

export interface ReplayInstabilitySource {
  source: string;
  type: string;
  occurrenceCount: number;
  severity: 'low' | 'medium' | 'high';
  affectedRepositories: string[];
}

export interface RiskyHealingStructure {
  structure: string;
  riskLevel: 'low' | 'medium' | 'high';
  occurrenceCount: number;
  falsePositiveCorrelation: number;
  affectedRepositories: string[];
}

export interface ConfidenceCalibrationFailure {
  signal: string;
  calibrationError: number;
  occurrenceCount: number;
  affectedRepositories: string[];
}

export interface ParserLimitation {
  limitation: string;
  syntaxType: string;
  occurrenceCount: number;
  affectedRepositories: string[];
}

export interface GovernanceWeakness {
  weakness: string;
  thresholdViolated: string;
  occurrenceCount: number;
  affectedRepositories: string[];
}

export interface CorpusExecutionOptions {
  corpusPath: string;
  verbose?: boolean;
  parallelExecution?: boolean;
  generateAllReports?: boolean;
}