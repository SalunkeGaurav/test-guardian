export type CompatibilityStatus = 'supported' | 'partially-supported' | 'unsupported';

export interface RepositoryValidationReport {
  id: string;
  repositoryPath: string;
  analyzedAt: number;
  compatibilityStatus: CompatibilityStatus;
  parserResults: ParserResults;
  locatorPatternStats: LocatorPatternStats;
  mutationSafetyResults: MutationSafetyResults;
  stabilityMetrics: StabilityMetrics;
  architecturalRisks: ArchitecturalRisk[];
}

export interface ParserResults {
  totalFiles: number;
  successfullyParsed: number;
  failedFiles: ParsingFailure[];
  unsupportedSyntax: string[];
  parseDurationMs: number;
}

export interface ParsingFailure {
  file: string;
  error: string;
  line?: number;
  column?: number;
}

export interface LocatorPatternStats {
  totalLocators: number;
  strategyBreakdown: Record<string, number>;
  dynamicSelectors: number;
  unstableSelectors: number;
  chainedLocators: number;
  pageObjects: PageObjectStat[];
  customWrappers: number;
  mixedFrameworkConventions: string[];
}

export interface PageObjectStat {
  name: string;
  locatorCount: number;
  filePath: string;
}

export interface MutationSafetyResults {
  totalTestFiles: number;
  successfullyMutated: number;
  failedMutations: MutationFailure[];
  compileSuccessRate: number;
  rollbackSuccessRate: number;
  formattingPreserved: boolean;
  importPreserved: boolean;
}

export interface MutationFailure {
  file: string;
  mutationType: string;
  error: string;
}

export interface StabilityMetrics {
  parserSurvivability: number;
  compileStability: number;
  replayStability: number;
  overallCompatibilityScore: number;
}

export interface ArchitecturalRisk {
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedFiles: string[];
}

export interface RepositoryValidationInput {
  repositoryPath: string;
  testPatterns?: string[];
  maxDepth?: number;
}

export interface LocatorAnalysis {
  strategy: string;
  value: string;
  sourceFile: string;
  sourceLine: number;
  isDynamic: boolean;
  isChained: boolean;
  pageObjectName?: string;
}