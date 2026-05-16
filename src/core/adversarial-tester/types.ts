export type FailureCategory =
  | 'unsupported-pattern'
  | 'parser-limitation'
  | 'mutation-instability'
  | 'replay-instability'
  | 'determinism-violation'
  | 'runtime-validation-weakness'
  | 'architectural-coupling';

export interface AdversarialStressReport {
  id: string;
  generatedAt: number;
  fixturePath: string;
  overallStability: number;
  parserSurvivability: number;
  compileSurvivability: number;
  rollbackIntegrity: number;
  replayStability: number;
  results: StressTestResult[];
  unsupportedPatterns: string[];
  failureCategories: Record<FailureCategory, number>;
  architecturalWeakPoints: ArchitecturalWeakPoint[];
}

export interface StressTestResult {
  fixtureName: string;
  category: string;
  passed: boolean;
  error?: string;
  details: Record<string, unknown>;
}

export interface ArchitecturalWeakPoint {
  location: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  category: FailureCategory;
}

export interface FixtureTest {
  name: string;
  file: string;
  type: 'parser' | 'mutation' | 'replay';
}