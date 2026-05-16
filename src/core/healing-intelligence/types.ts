export interface HealingIntelligenceReport {
  id: string;
  generatedAt: number;
  sourceBenchmarkPath: string;
  riskyRecoveryAnalysis: RiskyRecoveryReport;
  replayDivergenceAnalysis: ReplayDivergenceReport;
  validationFailureAnalysis: ValidationFailureReport;
  confidenceCalibration: ConfidenceCalibrationReport;
  structuralWeaknessAnalysis: StructuralWeaknessReport;
  overallStabilityScore: number;
  recommendations: string[];
}

export interface RiskyRecoveryReport {
  totalRiskyRecoveries: number;
  riskCategories: RiskyRecoveryCategory[];
  weakConfidenceSignals: WeakSignal[];
  ambiguousResolutions: AmbiguousResolution[];
  structurallyUnstableMutations: UnstableMutation[];
}

export interface RiskyRecoveryCategory {
  category: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
}

export interface WeakSignal {
  signalType: string;
  occurrenceCount: number;
  falsePositiveCorrelation: number;
}

export interface AmbiguousResolution {
  locator: string;
  ambiguityLevel: number;
  alternativeCount: number;
  riskScore: number;
}

export interface UnstableMutation {
  originalLocator: string;
  mutatedTo: string;
  instabilityFactors: string[];
}

export interface ReplayDivergenceReport {
  totalDivergences: number;
  divergenceTypes: DivergenceType[];
  navigationDrift: NavigationDrift[];
  selectorInstability: SelectorInstability[];
  asyncHazards: AsyncHazard[];
  modalIframeInstability: ModalIframeInstability[];
}

export interface DivergenceType {
  type: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
}

export interface NavigationDrift {
  originalUrl: string;
  reconstructedUrl: string;
  driftType: string;
  driftMagnitude: number;
}

export interface SelectorInstability {
  selector: string;
  instabilityScore: number;
  failurePoints: string[];
}

export interface AsyncHazard {
  type: string;
  occurrenceCount: number;
  recoveryImpact: number;
}

export interface ModalIframeInstability {
  type: string;
  occurrenceCount: number;
}

export interface ValidationFailureReport {
  totalFailures: number;
  governanceRejections: GovernanceRejection[];
  semanticMutationFailures: SemanticFailure[];
  unsupportedStructureFailures: UnsupportedStructure[];
  ambiguityHotspots: AmbiguityHotspot[];
}

export interface GovernanceRejection {
  reason: string;
  count: number;
  thresholdViolated: string;
}

export interface SemanticFailure {
  originalLocator: string;
  mutatedLocator: string;
  failureReason: string;
  compileSuccess: boolean;
}

export interface UnsupportedStructure {
  structureType: string;
  count: number;
  recoveryImpossible: boolean;
}

export interface AmbiguityHotspot {
  location: string;
  ambiguityScore: number;
  competingPatterns: string[];
}

export interface ConfidenceCalibrationReport {
  overallAccuracy: number;
  confidenceReliability: ConfidenceReliability[];
  weakScoringSignals: WeakScoringSignal[];
  falseConfidencePatterns: FalseConfidencePattern[];
  governanceThresholdEffectiveness: ThresholdEffectiveness;
}

export interface ConfidenceReliability {
  confidenceBand: string;
  accuracy: number;
  sampleSize: number;
}

export interface WeakScoringSignal {
  signal: string;
  reliabilityScore: number;
  recommendation: string;
}

export interface FalseConfidencePattern {
  pattern: string;
  falseConfidenceRate: number;
}

export interface ThresholdEffectiveness {
  threshold: number;
  truePositiveRate: number;
  falsePositiveRate: number;
  recommendation: string;
}

export interface StructuralWeaknessReport {
  totalWeakPoints: number;
  wrapperChainWeakness: WrapperChainWeakness[];
  dynamicLocatorWeakness: DynamicLocatorWeakness[];
  repeatedSelectorWeakness: RepeatedSelectorWeakness[];
  oversizedPOWeakness: OversizedPOWeakness[];
  hierarchyInstability: HierarchyInstability[];
}

export interface WrapperChainWeakness {
  chainDepth: number;
  occurrenceCount: number;
  instabilityCorrelation: number;
}

export interface DynamicLocatorWeakness {
  dynamicType: string;
  occurrenceCount: number;
  healingFailureCorrelation: number;
}

export interface RepeatedSelectorWeakness {
  selector: string;
  repetitionCount: number;
  divergenceRisk: number;
}

export interface OversizedPOWeakness {
  pageObjectName: string;
  locatorCount: number;
  instabilityScore: number;
}

export interface HierarchyInstability {
  pattern: string;
  occurrenceCount: number;
}