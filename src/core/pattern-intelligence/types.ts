export type CompatibilityTier = 'fully-supported' | 'partially-supported' | 'high-mutation-risk' | 'replay-fragile' | 'unsupported';

export interface PatternIntelligenceReport {
  id: string;
  generatedAt: number;
  repositoryPath: string;
  locatorIntelligence: LocatorPatternReport;
  pageObjectIntelligence: PageObjectReport;
  mutationRiskIntelligence: MutationRiskReport;
  replayRiskIntelligence: ReplayRiskReport;
  compatibilityTaxonomy: CompatibilityTaxonomy;
}

export interface LocatorPatternReport {
  totalLocators: number;
  strategyFrequency: Record<string, number>;
  strategyPercentages: Record<string, number>;
  chainedLocatorDepth: ChainedLocatorStats;
  dynamicLocators: DynamicLocatorStats;
  duplicateSelectors: number;
  unstablePatterns: UnstableSelectorStats;
  wrapperGenerated: number;
  customAbstractions: CustomSelectorStats;
}

export interface ChainedLocatorStats {
  count: number;
  maxDepth: number;
  depthDistribution: Record<number, number>;
  averageDepth: number;
}

export interface DynamicLocatorStats {
  count: number;
  percentage: number;
  types: Record<string, number>;
}

export interface UnstableSelectorStats {
  count: number;
  percentage: number;
  patterns: string[];
}

export interface CustomSelectorStats {
  count: number;
  wrapperTypes: string[];
}

export interface PageObjectReport {
  totalPageObjects: number;
  sizeDistribution: SizeDistribution;
  locatorDensity: LocatorDensityStats;
  inheritancePatterns: string[];
  compositionPatterns: string[];
  wrapperAbstractions: WrapperAbstractionStats;
  antiPatternClusters: AntiPattern[];
}

export interface SizeDistribution {
  small: number;
  medium: number;
  large: number;
  giant: number;
}

export interface LocatorDensityStats {
  averageLocatorsPerPO: number;
  minLocators: number;
  maxLocators: number;
}

export interface WrapperAbstractionStats {
  count: number;
  wrapperTypes: string[];
  indirectionLayers: number;
}

export interface AntiPattern {
  type: string;
  severity: 'low' | 'medium' | 'high';
  locations: string[];
}

export interface MutationRiskReport {
  overallRiskScore: number;
  riskCategories: RiskCategory[];
  dynamicSelectorRisk: number;
  computedLocatorRisk: number;
  indirectWrapperRisk: number;
  runtimeCompositionRisk: number;
  astAmbiguityRisk: number;
  compileFragileRisk: number;
}

export interface RiskCategory {
  category: string;
  score: number;
  affectedFiles: string[];
}

export interface ReplayRiskReport {
  overallRiskScore: number;
  navigationRisks: NavigationRisk[];
  selectorRisks: SelectorRisk[];
  modalHeavyFlows: number;
  dynamicRenderingRisks: number;
  iframeUsage: number;
  asyncInteractionChains: number;
}

export interface NavigationRisk {
  type: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
}

export interface SelectorRisk {
  type: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
}

export interface CompatibilityTaxonomy {
  tier: CompatibilityTier;
  supportedFeatures: string[];
  partiallySupportedFeatures: string[];
  unsupportedFeatures: string[];
  riskFactors: string[];
  recommendations: string[];
}