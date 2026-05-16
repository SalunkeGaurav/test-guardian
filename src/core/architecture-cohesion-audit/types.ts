/**
 * Architecture Cohesion Audit Types
 *
 * Models for verifying architectural cohesion, eliminating hidden duplication,
 * and stabilizing module boundaries. Audit-only — no new capabilities.
 */

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AuditCategory =
  | 'module-boundary'
  | 'semantic-consistency'
  | 'persistence-schema'
  | 'dependency-stability'
  | 'determinism-integrity'
  | 'technical-debt';

// ── Module Boundary Audit ──────────────────────────────────────────

export interface ModuleResponsibility {
  moduleName: string;
  declaredResponsibilities: string[];
  actualResponsibilities: string[];
  overlappingWith: string[];
  duplicatedLogic: string[];
}

export interface ModuleBoundaryIssue {
  id: string;
  type: 'overlapping-responsibility' | 'duplicated-logic' | 'conflicting-terminology' | 'orchestration-inflation' | 'hidden-coupling' | 'unstable-dependency';
  severity: AuditSeverity;
  modules: string[];
  description: string;
  evidence: string[];
}

export interface ModuleBoundaryAuditReport {
  id: string;
  modulesAnalyzed: string[];
  responsibilities: ModuleResponsibility[];
  issues: ModuleBoundaryIssue[];
  totalIssues: number;
  severityBreakdown: Record<AuditSeverity, number>;
  summary: string;
  createdAt: number;
}

// ── Semantic Consistency Audit ──────────────────────────────────────

export interface TermDefinition {
  term: string;
  module: string;
  modules: string[];
  definition: string;
  usageContext: string[];
}

export interface SemanticInconsistency {
  id: string;
  type: 'duplicated-concept-different-name' | 'same-name-different-meaning' | 'inconsistent-threshold' | 'conflicting-status';
  severity: AuditSeverity;
  term: string;
  modules: string[];
  definitions: string[];
  recommendation: string;
}

export interface SemanticConsistencyReport {
  id: string;
  termsAnalyzed: number;
  terms: TermDefinition[];
  inconsistencies: SemanticInconsistency[];
  totalInconsistencies: number;
  severityBreakdown: Record<AuditSeverity, number>;
  summary: string;
  createdAt: number;
}

// ── Persistence Schema Audit ────────────────────────────────────────

export interface PersistenceDirectory {
  path: string;
  fileCount: number;
  schemas: string[];
  namingConvention: string;
}

export interface PersistenceSchemaIssue {
  id: string;
  type: 'redundant-structure' | 'duplicate-format' | 'inconsistent-metadata' | 'unstable-schema' | 'naming-violation';
  severity: AuditSeverity;
  paths: string[];
  description: string;
  evidence: string[];
}

export interface PersistenceCohesionReport {
  id: string;
  directoriesAnalyzed: PersistenceDirectory[];
  issues: PersistenceSchemaIssue[];
  totalIssues: number;
  severityBreakdown: Record<AuditSeverity, number>;
  fragmentationScore: number;
  summary: string;
  createdAt: number;
}

// ── Dependency Stability Audit ──────────────────────────────────────

export interface ModuleDependency {
  moduleName: string;
  imports: string[];
  importedBy: string[];
  fanOut: number;
  fanIn: number;
}

export interface DependencyIssue {
  id: string;
  type: 'circular-dependency-risk' | 'orchestration-overreach' | 'unstable-import' | 'fan-out-growth' | 'dependency-hotspot';
  severity: AuditSeverity;
  modules: string[];
  description: string;
  evidence: string[];
}

export interface DependencyStabilityReport {
  id: string;
  modulesAnalyzed: ModuleDependency[];
  issues: DependencyIssue[];
  totalIssues: number;
  severityBreakdown: Record<AuditSeverity, number>;
  hotspots: string[];
  summary: string;
  createdAt: number;
}

// ── Determinism Integrity Audit ─────────────────────────────────────

export interface DeterminismCheck {
  id: string;
  module: string;
  check: string;
  passed: boolean;
  detail: string;
}

export interface DeterminismIssue {
  id: string;
  type: 'non-deterministic-ordering' | 'unstable-serialization' | 'irreproducible-scoring' | 'unstable-hashing' | 'non-reproducible-replay';
  severity: AuditSeverity;
  module: string;
  description: string;
  evidence: string[];
}

export interface DeterminismIntegrityReport {
  id: string;
  checksPerformed: number;
  checks: DeterminismCheck[];
  issues: DeterminismIssue[];
  totalIssues: number;
  severityBreakdown: Record<AuditSeverity, number>;
  passRate: number;
  summary: string;
  createdAt: number;
}

// ── Technical Debt Inventory ────────────────────────────────────────

export type DebtRiskLevel = 'low-risk' | 'medium-risk' | 'high-risk';

export interface TechnicalDebtItem {
  id: string;
  type: 'dead-abstraction' | 'duplicated-utility' | 'oversized-orchestrator' | 'unstable-interface' | 'weak-type-contract' | 'fragile-coupling';
  riskLevel: DebtRiskLevel;
  location: string;
  description: string;
  impact: string;
  recommendation: string;
  evidence: string[];
}

export interface TechnicalDebtInventoryReport {
  id: string;
  totalItems: number;
  items: TechnicalDebtItem[];
  riskBreakdown: Record<DebtRiskLevel, number>;
  categoryBreakdown: Record<TechnicalDebtItem['type'], number>;
  summary: string;
  createdAt: number;
}

// ── Combined Audit ──────────────────────────────────────────────────

export interface ArchitectureCohesionAuditResult {
  moduleBoundary: ModuleBoundaryAuditReport;
  semanticConsistency: SemanticConsistencyReport;
  persistenceCohesion: PersistenceCohesionReport;
  dependencyStability: DependencyStabilityReport;
  determinismIntegrity: DeterminismIntegrityReport;
  technicalDebt: TechnicalDebtInventoryReport;
}

export interface CohesionAuditConfig {
  projectRoot: string;
  modulesToAudit: string[];
  enablePersistenceAudit: boolean;
  enableDependencyAudit: boolean;
  enableDeterminismAudit: boolean;
}