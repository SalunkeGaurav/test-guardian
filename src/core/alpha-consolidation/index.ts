/**
 * Alpha Consolidation Module
 *
 * Executes alpha consolidation and packaging preparation.
 *
 * @module alpha-consolidation
 */

export { executeAlphaConsolidation } from './alpha-consolidation.js';
export { generateApiManifest, persistApiManifest } from './api-manifest-generator.js';
export { generateDeprecatedApiReport, persistDeprecatedApiReport } from './deprecated-api-report-generator.js';
export { generateUnstableExportReport, persistUnstableExportReport } from './unstable-export-report-generator.js';
export { validatePackaging, persistPackagingReport } from './packaging-validator.js';
export { generateAllDocs } from './docs-generator.js';
export { verifyInstallation, persistInstallationReport } from './installation-verifier.js';
export { evaluateDeveloperExperience, persistDeveloperExperienceReport } from './developer-experience-review.js';
export { evaluateAlphaStabilityGate, persistAlphaGateReport } from './alpha-stability-gate.js';

export type {
  AlphaConsolidationOptions,
  AlphaConsolidationResult,
} from './alpha-consolidation.js';

export type {
  ApiManifest,
  ApiManifestEntry,
} from './api-manifest-generator.js';

export type {
  DeprecatedApiReport,
  DeprecatedApiEntry,
} from './deprecated-api-report-generator.js';

export type {
  UnstableExportReport,
  UnstableExportEntry,
} from './unstable-export-report-generator.js';

export type {
  PackagingReport,
  PackageValidationResult,
  InstallVerificationResult,
  DependencyAuditResult,
  ExportIntegrityResult,
} from './packaging-validator.js';

export type {
  DocsGenerationResult,
} from './docs-generator.js';

export type {
  InstallationReport,
  CliSmokeTestResult,
  PackageStartupResult,
} from './installation-verifier.js';

export type {
  DeveloperExperienceReport,
  ExperienceDimension,
} from './developer-experience-review.js';

export type {
  AlphaGateReport,
  GateCheck,
} from './alpha-stability-gate.js';
