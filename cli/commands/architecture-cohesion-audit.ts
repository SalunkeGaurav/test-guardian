/**
 * Architecture Cohesion Audit CLI Command
 *
 * Implements Architecture Cohesion Audit v1.
 * Verifies architectural cohesion, eliminates hidden duplication,
 * and stabilizes module boundaries.
 */

import { info, error } from '../../src/logger/index.js';
import {
  ArchitectureCohesionAuditor,
  ArchitectureCohesionStorage,
} from '../../src/core/architecture-cohesion-audit/index.js';
import type { CohesionAuditConfig } from '../../src/core/architecture-cohesion-audit/types.js';

export interface ArchitectureCohesionOptions {
  modules?: string;
  skipPersistence?: boolean;
  skipDependency?: boolean;
  skipDeterminism?: boolean;
  verbose?: boolean;
}

const DEFAULT_MODULES = [
  'validation',
  'risk-discrimination',
  'developer-workflow',
  'ci-failure-validation',
  'storage',
  'patcher',
  'analyzer',
  'tracer',
  'healing-intelligence',
];

export async function runArchitectureCohesionAudit(options: ArchitectureCohesionOptions): Promise<void> {
  info('CLI', 'Architecture Cohesion Audit v1');

  try {
    const modules = options.modules
      ? options.modules.split(',').map(m => m.trim())
      : DEFAULT_MODULES;

    const config: CohesionAuditConfig = {
      projectRoot: process.cwd(),
      modulesToAudit: modules,
      enablePersistenceAudit: !options.skipPersistence,
      enableDependencyAudit: !options.skipDependency,
      enableDeterminismAudit: !options.skipDeterminism,
    };

    const auditor = new ArchitectureCohesionAuditor(config);
    const storage = new ArchitectureCohesionStorage(process.cwd());

    info('CLI', `Auditing ${modules.length} modules...`);

    const result = auditor.audit();

    storage.saveModuleBoundaryReport(result.moduleBoundary);
    storage.saveSemanticConsistencyReport(result.semanticConsistency);
    storage.savePersistenceCohesionReport(result.persistenceCohesion);
    storage.saveDependencyStabilityReport(result.dependencyStability);
    storage.saveDeterminismIntegrityReport(result.determinismIntegrity);
    storage.saveTechnicalDebtReport(result.technicalDebt);
    storage.saveFullAudit(result);

    console.log(auditor.generateSummary(result));

    info('CLI', 'Audit complete. Reports saved to .testguardian/architecture-cohesion-audit/');
  } catch (err) {
    error('CLI', `Architecture cohesion audit failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}