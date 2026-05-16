/**
 * Alpha Consolidation Orchestrator
 *
 * Orchestrates the alpha consolidation process:
 * - API manifest generation
 * - Deprecated API report
 * - Unstable export report
 * - Packaging validation
 * - Documentation generation
 * - Alpha release preparation
 *
 * Deterministic output only.
 *
 * @module alpha-consolidation
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { generateApiManifest, persistApiManifest } from './api-manifest-generator.js';
import { generateDeprecatedApiReport, persistDeprecatedApiReport } from './deprecated-api-report-generator.js';
import { generateUnstableExportReport, persistUnstableExportReport } from './unstable-export-report-generator.js';
import { validatePackaging, persistPackagingReport } from './packaging-validator.js';
import { generateAllDocs } from './docs-generator.js';

export interface AlphaConsolidationOptions {
  projectRoot: string;
  corpusPath?: string;
  outputDir?: string;
  verbose?: boolean;
}

export interface AlphaConsolidationResult {
  reportId: string;
  generatedAt: number;
  apiManifest: string;
  deprecatedApiReport: string;
  unstableExportReport: string;
  packagingReport: string;
  docs: string[];
  alphaReleaseReports: string[];
  overallStatus: 'ready' | 'needs-work' | 'not-ready';
}

let consolidationCounter = 0;
function nextConsolidationId(): string {
  consolidationCounter++;
  return `alpha-consolidation-${consolidationCounter}`;
}

function loadExistingReport<T>(path: string): T | null {
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8')) as T;
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

export async function executeAlphaConsolidation(options: AlphaConsolidationOptions): Promise<AlphaConsolidationResult> {
  const projectRoot = resolve(options.projectRoot);
  const outputDir = options.outputDir || projectRoot;
  const alphaReleaseDir = join(outputDir, '.testguardian', 'alpha-release');

  if (options.verbose) {
    console.log(`[alpha-prepare] Project root: ${projectRoot}`);
    console.log(`[alpha-prepare] Output directory: ${outputDir}`);
  }

  // Ensure output directory exists
  if (!existsSync(alphaReleaseDir)) {
    mkdirSync(alphaReleaseDir, { recursive: true });
  }

  // Generate API manifest
  if (options.verbose) console.log('[alpha-prepare] Generating API manifest...');
  const apiManifestPath = persistApiManifest(outputDir);

  // Generate deprecated API report
  if (options.verbose) console.log('[alpha-prepare] Generating deprecated API report...');
  const deprecatedApiPath = persistDeprecatedApiReport(outputDir);

  // Generate unstable export report
  if (options.verbose) console.log('[alpha-prepare] Generating unstable export report...');
  const unstableExportPath = persistUnstableExportReport(outputDir);

  // Validate packaging
  if (options.verbose) console.log('[alpha-prepare] Validating packaging...');
  const packagingPath = persistPackagingReport(projectRoot, outputDir);

  // Generate documentation
  if (options.verbose) console.log('[alpha-prepare] Generating documentation...');
  const srcDir = join(projectRoot, 'src');
  const docsResult = generateAllDocs(srcDir, outputDir);

  // Generate alpha release reports
  const alphaReleaseReports: string[] = [];

  // Load existing stabilization data if available
  const stabilizationSummaryPath = join(projectRoot, '.testguardian', 'stabilization', 'stabilization-summary.json');
  const stabilizationSummary = loadExistingRecord(stabilizationSummaryPath);

  // Load existing corpus execution data if available
  const corpusSummaryPath = join(projectRoot, '.testguardian', 'large-scale-corpus', 'execution-summary.json');
  const corpusSummary = loadExistingRecord(corpusSummaryPath);

  // Load existing alpha readiness data if available
  const alphaReadinessPath = join(projectRoot, '.testguardian', 'stabilization', 'alpha-readiness.json');
  const alphaReadiness = loadExistingRecord(alphaReadinessPath);

  // Generate supported features report
  const supportedFeaturesPath = join(alphaReleaseDir, 'supported-features.json');
  const supportedFeatures = {
    generatedAt: 0,
    features: [
      { name: 'Healing Pipeline', status: 'stable', description: 'Automated test healing with confidence governance' },
      { name: 'Patch Generation', status: 'stable', description: 'AST-aware patch generation and validation' },
      { name: 'Confidence Governance', status: 'stable', description: 'Deterministic confidence scoring and gating' },
      { name: 'Stability Analysis', status: 'stable', description: 'Test stability monitoring and reporting' },
      { name: 'Audit Trail', status: 'stable', description: 'Complete audit trail for all decisions' },
      { name: 'Repository Validation', status: 'stable', description: 'Framework detection and compatibility validation' },
      { name: 'Execution Lab', status: 'stable', description: 'Test execution and evidence collection' },
      { name: 'Developer Review', status: 'stable', description: 'Developer-facing review bundles' },
      { name: 'Production Readiness', status: 'stable', description: 'Production readiness assessment' },
      { name: 'Corpus Execution', status: 'stable', description: 'Large-scale corpus analysis' },
      { name: 'Stabilization Analysis', status: 'stable', description: 'Stabilization priorities and alpha readiness' },
    ],
  };
  writeFileSync(supportedFeaturesPath, JSON.stringify(supportedFeatures, null, 2), 'utf-8');
  alphaReleaseReports.push(supportedFeaturesPath);

  // Generate experimental features report
  const experimentalFeaturesPath = join(alphaReleaseDir, 'experimental-features.json');
  const experimentalFeatures = {
    generatedAt: 0,
    features: [
      { name: 'Confidence Calibration', status: 'experimental', description: 'Confidence score calibration and validation' },
      { name: 'Healing Benchmark', status: 'experimental', description: 'Healing strategy benchmarking' },
      { name: 'Healing Intelligence', status: 'experimental', description: 'Pattern-based healing intelligence' },
      { name: 'Pattern Intelligence', status: 'experimental', description: 'Test pattern analysis and intelligence' },
      { name: 'Adversarial Testing', status: 'experimental', description: 'Adversarial test generation and execution' },
      { name: 'Developer Workflow', status: 'experimental', description: 'Developer workflow orchestration' },
      { name: 'CI Failure Validation', status: 'experimental', description: 'CI failure classification and validation' },
      { name: 'Architecture Cohesion Audit', status: 'experimental', description: 'Architecture cohesion and dependency analysis' },
      { name: 'Risk Discrimination', status: 'experimental', description: 'Risk-based mutation and discrimination' },
    ],
  };
  writeFileSync(experimentalFeaturesPath, JSON.stringify(experimentalFeatures, null, 2), 'utf-8');
  alphaReleaseReports.push(experimentalFeaturesPath);

  // Generate known limitations report
  const knownLimitationsPath = join(alphaReleaseDir, 'known-limitations.json');
  const knownLimitations = {
    generatedAt: 0,
    limitations: [
      { category: 'Framework Support', limitation: 'Primary support for Playwright only; Cypress and Selenium are experimental' },
      { category: 'Test Types', limitation: 'UI and API tests supported; visual regression and performance tests not supported' },
      { category: 'Healing Scope', limitation: 'Locator failures, navigation issues, timing problems supported; logic errors not supported' },
      { category: 'Governance', limitation: 'Confidence thresholds and safety validation supported; custom rules and ML not supported' },
      { category: 'Performance', limitation: 'Large repositories (>1000 test files) may experience slower analysis' },
      { category: 'Complex Patterns', limitation: 'Deeply nested POM hierarchies may not be fully analyzed' },
      { category: 'Dynamic Locators', limitation: 'Locators generated at runtime may not be detected' },
      { category: 'Custom Frameworks', limitation: 'Custom test frameworks require adapter development' },
    ],
  };
  writeFileSync(knownLimitationsPath, JSON.stringify(knownLimitations, null, 2), 'utf-8');
  alphaReleaseReports.push(knownLimitationsPath);

  // Generate performance summary report
  const performanceSummaryPath = join(alphaReleaseDir, 'performance-summary.json');
  const performanceSummary = {
    generatedAt: 0,
    corpusSize: corpusSummary ? (corpusSummary as any).totalRepositories || 0 : 0,
    completionRate: corpusSummary ? (corpusSummary as any).completionRate || 0 : 0,
    averageValidationTime: corpusSummary ? (corpusSummary as any).averageValidationTime || 0 : 0,
    parserSurvivability: corpusSummary ? (corpusSummary as any).parserSurvivability || 0 : 0,
    compileStability: corpusSummary ? (corpusSummary as any).compileStability || 0 : 0,
    healingRecoveryRate: corpusSummary ? (corpusSummary as any).healingRecoveryRate || 0 : 0,
    stabilityScore: stabilizationSummary ? (stabilizationSummary as any).stabilityScore || 0 : 0,
    falseConfidenceRate: stabilizationSummary ? (stabilizationSummary as any).falseConfidenceRate || 0 : 0,
  };
  writeFileSync(performanceSummaryPath, JSON.stringify(performanceSummary, null, 2), 'utf-8');
  alphaReleaseReports.push(performanceSummaryPath);

  // Generate repository compatibility summary
  const compatibilitySummaryPath = join(alphaReleaseDir, 'repository-compatibility-summary.json');
  const compatibilitySummary = {
    generatedAt: 0,
    totalRepositories: corpusSummary ? (corpusSummary as any).totalRepositories || 0 : 0,
    supported: corpusSummary ? (corpusSummary as any).supported || 0 : 0,
    partiallySupported: corpusSummary ? (corpusSummary as any).partiallySupported || 0 : 0,
    unsupported: corpusSummary ? (corpusSummary as any).unsupported || 0 : 0,
    categories: corpusSummary ? (corpusSummary as any).categories || [] : [],
  };
  writeFileSync(compatibilitySummaryPath, JSON.stringify(compatibilitySummary, null, 2), 'utf-8');
  alphaReleaseReports.push(compatibilitySummaryPath);

  // Copy alpha readiness report if available
  if (alphaReadiness) {
    const alphaReadinessOutPath = join(alphaReleaseDir, 'alpha-readiness-report.json');
    writeFileSync(alphaReadinessOutPath, JSON.stringify(alphaReadiness, null, 2), 'utf-8');
    alphaReleaseReports.push(alphaReadinessOutPath);
  }

  // Determine overall status
  const packagingReport = loadExistingRecord(packagingPath);
  const overallStatus = (packagingReport as any)?.overallStatus || 'needs-work';

  return {
    reportId: nextConsolidationId(),
    generatedAt: 0,
    apiManifest: apiManifestPath,
    deprecatedApiReport: deprecatedApiPath,
    unstableExportReport: unstableExportPath,
    packagingReport: packagingPath,
    docs: docsResult.files,
    alphaReleaseReports,
    overallStatus,
  };
}

function loadExistingRecord(path: string): unknown | null {
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'));
    }
  } catch {
    // Ignore read errors
  }
  return null;
}
