/**
 * Production Readiness & Real-World Integration Module
 *
 * Transitions TestGuardian from architecture-expansion mode into
 * production-readiness mode. Measures performance, memory stability,
 * API surface, CI integration, packaging readiness, and developer onboarding.
 *
 * @module production-readiness
 */

export { ProductionReadiness } from './production-readiness.js';
export { PerformanceProfiler } from './performance-profiler.js';
export { MemoryStability } from './memory-stability.js';
export { APISurfaceAudit } from './api-surface-audit.js';
export { CIIntegration } from './ci-integration.js';
export { PackageReadiness } from './package-readiness.js';
export { DeveloperOnboarding } from './developer-onboarding.js';

export type {
  StageDuration,
  PerformanceProfile,
  MemoryStabilityReport,
  APIExportEntry,
  APISurfaceAuditReport,
  CIExecutionPlan,
  CIStep,
  CIIntegrationReport,
  PackagingReadinessSummary,
  DeveloperOnboardingReport,
  ProductionReadinessReport,
  PerformanceSummary,
  StabilitySummary,
  APIReadinessSummary,
  CIReadinessSummary,
  ProductionReadinessInput,
} from './types.js';
