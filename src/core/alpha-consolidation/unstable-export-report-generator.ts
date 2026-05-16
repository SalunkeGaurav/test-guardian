/**
 * Unstable Export Report Generator
 *
 * Identifies exports that are internal or experimental and should not
 * be used by external consumers. Deterministic output.
 *
 * @module unstable-export-report-generator
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface UnstableExportEntry {
  name: string;
  location: string;
  type: 'internal' | 'experimental';
  reason: string;
  recommendation: string;
}

export interface UnstableExportReport {
  generatedAt: number;
  totalUnstable: number;
  internalExports: number;
  experimentalExports: number;
  entries: UnstableExportEntry[];
}

export function generateUnstableExportReport(): UnstableExportReport {
  const entries: UnstableExportEntry[] = [
    // Internal exports
    {
      name: 'internal.UnifiedRuntime',
      location: 'src/core/unified-runtime/',
      type: 'internal',
      reason: 'Internal runtime orchestration, subject to change',
      recommendation: 'Use public HealingPipeline or PatchGenerator instead',
    },
    {
      name: 'internal.RepositoryValidator',
      location: 'src/core/repository-validator/',
      type: 'internal',
      reason: 'Internal validation logic, subject to change',
      recommendation: 'Use public PipelineInput/PipelineResult instead',
    },
    {
      name: 'internal.RuntimeHardening',
      location: 'src/core/runtime-hardening/',
      type: 'internal',
      reason: 'Internal runtime stability, subject to change',
      recommendation: 'Use public HealingPipeline instead',
    },
    {
      name: 'internal.RuntimeHealingLoop',
      location: 'src/core/runtime-healing-loop/',
      type: 'internal',
      reason: 'Internal healing orchestration, subject to change',
      recommendation: 'Use public HealingPipeline instead',
    },
    {
      name: 'internal.ExecutionLab',
      location: 'src/core/execution-lab/',
      type: 'internal',
      reason: 'Internal execution lab, subject to change',
      recommendation: 'Use public PipelineResult instead',
    },
    {
      name: 'internal.OperationalReliability',
      location: 'src/core/operational-reliability/',
      type: 'internal',
      reason: 'Internal reliability monitoring, subject to change',
      recommendation: 'Use public StabilityAnalyzer instead',
    },
    {
      name: 'internal.LargeScaleCorpus',
      location: 'src/core/large-scale-corpus/',
      type: 'internal',
      reason: 'Internal corpus execution, subject to change',
      recommendation: 'Use CLI command testguardian corpus-scale instead',
    },
    {
      name: 'internal.Stabilization',
      location: 'src/core/stabilization/',
      type: 'internal',
      reason: 'Internal stabilization analysis, subject to change',
      recommendation: 'Use CLI command testguardian stabilization instead',
    },
    {
      name: 'internal.ProductionReadiness',
      location: 'src/core/production-readiness/',
      type: 'internal',
      reason: 'Internal production readiness, subject to change',
      recommendation: 'Use CLI command testguardian production-readiness instead',
    },
    {
      name: 'internal.DeveloperReview',
      location: 'src/core/developer-review/',
      type: 'internal',
      reason: 'Internal developer review, subject to change',
      recommendation: 'Use CLI command testguardian review instead',
    },

    // Experimental exports
    {
      name: 'experimental.ConfidenceCalibration',
      location: 'src/core/confidence-calibration/',
      type: 'experimental',
      reason: 'Experimental confidence calibration, may be removed',
      recommendation: 'Not recommended for production use',
    },
    {
      name: 'experimental.HealingBenchmark',
      location: 'src/core/healing-benchmark/',
      type: 'experimental',
      reason: 'Experimental healing benchmark, may be removed',
      recommendation: 'Not recommended for production use',
    },
    {
      name: 'experimental.HealingIntelligence',
      location: 'src/core/healing-intelligence/',
      type: 'experimental',
      reason: 'Experimental healing intelligence, may be removed',
      recommendation: 'Not recommended for production use',
    },
    {
      name: 'experimental.PatternIntelligence',
      location: 'src/core/pattern-intelligence/',
      type: 'experimental',
      reason: 'Experimental pattern intelligence, may be removed',
      recommendation: 'Not recommended for production use',
    },
    {
      name: 'experimental.AdversarialTester',
      location: 'src/core/adversarial-tester/',
      type: 'experimental',
      reason: 'Experimental adversarial testing, may be removed',
      recommendation: 'Not recommended for production use',
    },
    {
      name: 'experimental.CorpusExecution',
      location: 'src/core/corpus-execution/',
      type: 'experimental',
      reason: 'Experimental corpus execution, may be removed',
      recommendation: 'Use CLI command testguardian corpus-scale instead',
    },
    {
      name: 'experimental.DeveloperWorkflow',
      location: 'src/core/developer-workflow/',
      type: 'experimental',
      reason: 'Experimental developer workflow, may be removed',
      recommendation: 'Not recommended for production use',
    },
    {
      name: 'experimental.CIFailureValidation',
      location: 'src/core/ci-failure-validation/',
      type: 'experimental',
      reason: 'Experimental CI failure validation, may be removed',
      recommendation: 'Not recommended for production use',
    },
    {
      name: 'experimental.ArchitectureCohesionAudit',
      location: 'src/core/architecture-cohesion-audit/',
      type: 'experimental',
      reason: 'Experimental architecture audit, may be removed',
      recommendation: 'Not recommended for production use',
    },
    {
      name: 'experimental.RiskDiscrimination',
      location: 'src/core/risk-discrimination/',
      type: 'experimental',
      reason: 'Experimental risk discrimination, may be removed',
      recommendation: 'Not recommended for production use',
    },
  ];

  const internalExports = entries.filter((e) => e.type === 'internal');
  const experimentalExports = entries.filter((e) => e.type === 'experimental');

  return {
    generatedAt: 0,
    totalUnstable: entries.length,
    internalExports: internalExports.length,
    experimentalExports: experimentalExports.length,
    entries,
  };
}

export function persistUnstableExportReport(outputDir: string): string {
  const report = generateUnstableExportReport();
  const dir = join(outputDir, 'alpha-release');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = join(dir, 'unstable-export-report.json');
  writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}
