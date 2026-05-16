/**
 * Architecture Cohesion Audit Orchestrator
 *
 * Coordinates all audit components.
 */

import type {
  ArchitectureCohesionAuditResult,
  CohesionAuditConfig,
} from './types.js';

import { ModuleBoundaryAuditor } from './module-boundary-audit.js';
import { SemanticConsistencyAuditor } from './semantic-consistency.js';
import { PersistenceSchemaAuditor } from './persistence-schema-audit.js';
import { DependencyStabilityAuditor } from './dependency-stability.js';
import { DeterminismIntegrityAuditor } from './determinism-integrity.js';
import { TechnicalDebtInventoryGenerator } from './technical-debt.js';

export class ArchitectureCohesionAuditor {
  private config: CohesionAuditConfig;

  constructor(config: CohesionAuditConfig) {
    this.config = config;
  }

  audit(): ArchitectureCohesionAuditResult {
    const modules = this.config.modulesToAudit;

    const moduleBoundaryAuditor = new ModuleBoundaryAuditor(this.config.projectRoot);
    const moduleBoundary = moduleBoundaryAuditor.audit(modules);

    const semanticAuditor = new SemanticConsistencyAuditor(this.config.projectRoot);
    const semanticConsistency = semanticAuditor.audit(modules);

    const persistenceAuditor = new PersistenceSchemaAuditor(this.config.projectRoot);
    const persistenceCohesion = this.config.enablePersistenceAudit
      ? persistenceAuditor.audit()
      : this.createEmptyPersistenceReport();

    const dependencyAuditor = new DependencyStabilityAuditor(this.config.projectRoot);
    const dependencyStability = this.config.enableDependencyAudit
      ? dependencyAuditor.audit(modules)
      : this.createEmptyDependencyReport();

    const determinismAuditor = new DeterminismIntegrityAuditor(this.config.projectRoot);
    const determinismIntegrity = this.config.enableDeterminismAudit
      ? determinismAuditor.audit(modules)
      : this.createEmptyDeterminismReport();

    const debtGenerator = new TechnicalDebtInventoryGenerator(this.config.projectRoot);
    const technicalDebt = debtGenerator.generate(modules);

    return {
      moduleBoundary,
      semanticConsistency,
      persistenceCohesion,
      dependencyStability,
      determinismIntegrity,
      technicalDebt,
    };
  }

  generateSummary(result: ArchitectureCohesionAuditResult): string {
    const lines: string[] = [];

    lines.push('═'.repeat(60));
    lines.push('ARCHITECTURE COHESION AUDIT REPORT');
    lines.push('═'.repeat(60));
    lines.push('');

    lines.push('MODULE BOUNDARY AUDIT:');
    lines.push(`  Modules Analyzed: ${result.moduleBoundary.modulesAnalyzed.length}`);
    lines.push(`  Issues: ${result.moduleBoundary.totalIssues}`);
    lines.push(`  High/Critical: ${result.moduleBoundary.severityBreakdown.high + result.moduleBoundary.severityBreakdown.critical}`);
    lines.push('');

    lines.push('SEMANTIC CONSISTENCY:');
    lines.push(`  Terms Analyzed: ${result.semanticConsistency.termsAnalyzed}`);
    lines.push(`  Inconsistencies: ${result.semanticConsistency.totalInconsistencies}`);
    lines.push(`  High/Critical: ${result.semanticConsistency.severityBreakdown.high + result.semanticConsistency.severityBreakdown.critical}`);
    lines.push('');

    lines.push('PERSISTENCE COHESION:');
    lines.push(`  Directories Analyzed: ${result.persistenceCohesion.directoriesAnalyzed.length}`);
    lines.push(`  Issues: ${result.persistenceCohesion.totalIssues}`);
    lines.push(`  Fragmentation Score: ${(result.persistenceCohesion.fragmentationScore * 100).toFixed(0)}%`);
    lines.push('');

    lines.push('DEPENDENCY STABILITY:');
    lines.push(`  Modules Analyzed: ${result.dependencyStability.modulesAnalyzed.length}`);
    lines.push(`  Issues: ${result.dependencyStability.totalIssues}`);
    lines.push(`  Hotspots: ${result.dependencyStability.hotspots.length}`);
    lines.push('');

    lines.push('DETERMINISM INTEGRITY:');
    lines.push(`  Checks Performed: ${result.determinismIntegrity.checksPerformed}`);
    lines.push(`  Pass Rate: ${(result.determinismIntegrity.passRate * 100).toFixed(0)}%`);
    lines.push(`  Issues: ${result.determinismIntegrity.totalIssues}`);
    lines.push('');

    lines.push('TECHNICAL DEBT:');
    lines.push(`  Total Items: ${result.technicalDebt.totalItems}`);
    lines.push(`  High Risk: ${result.technicalDebt.riskBreakdown['high-risk']}`);
    lines.push(`  Medium Risk: ${result.technicalDebt.riskBreakdown['medium-risk']}`);
    lines.push(`  Low Risk: ${result.technicalDebt.riskBreakdown['low-risk']}`);
    lines.push('');

    const totalIssues =
      result.moduleBoundary.totalIssues +
      result.semanticConsistency.totalInconsistencies +
      result.persistenceCohesion.totalIssues +
      result.dependencyStability.totalIssues +
      result.determinismIntegrity.totalIssues +
      result.technicalDebt.totalItems;

    const totalHigh =
      result.moduleBoundary.severityBreakdown.high +
      result.moduleBoundary.severityBreakdown.critical +
      result.semanticConsistency.severityBreakdown.high +
      result.semanticConsistency.severityBreakdown.critical +
      result.persistenceCohesion.severityBreakdown.high +
      result.persistenceCohesion.severityBreakdown.critical +
      result.dependencyStability.severityBreakdown.high +
      result.dependencyStability.severityBreakdown.critical +
      result.determinismIntegrity.severityBreakdown.high +
      result.determinismIntegrity.severityBreakdown.critical +
      result.technicalDebt.riskBreakdown['high-risk'];

    lines.push('═'.repeat(60));
    lines.push(`TOTAL: ${totalIssues} issues found (${totalHigh} high/critical)`);
    lines.push('═'.repeat(60));

    return lines.join('\n');
  }

  private createEmptyPersistenceReport() {
    return {
      id: `persistence-cohesion-empty-${Date.now()}`,
      directoriesAnalyzed: [],
      issues: [],
      totalIssues: 0,
      severityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
      fragmentationScore: 0,
      summary: 'Persistence audit disabled.',
      createdAt: Date.now(),
    };
  }

  private createEmptyDependencyReport() {
    return {
      id: `dependency-stability-empty-${Date.now()}`,
      modulesAnalyzed: [],
      issues: [],
      totalIssues: 0,
      severityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
      hotspots: [],
      summary: 'Dependency audit disabled.',
      createdAt: Date.now(),
    };
  }

  private createEmptyDeterminismReport() {
    return {
      id: `determinism-integrity-empty-${Date.now()}`,
      checksPerformed: 0,
      checks: [],
      issues: [],
      totalIssues: 0,
      severityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
      passRate: 1,
      summary: 'Determinism audit disabled.',
      createdAt: Date.now(),
    };
  }
}