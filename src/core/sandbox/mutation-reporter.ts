/**
 * Mutation Reporter
 *
 * Generates mutation reports and persists them to .testguardian/mutations/
 *
 * No AI. No autonomous execution. Deterministic reporting.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Result } from '../../models/result.js';
import type {
  MutationReport, AppliedPatchInfo, CompileResult, ReplayResult, RuntimeResult, RollbackResult, ValidationSummary
} from '../../models/sandbox.js';
import { success, failure } from '../../models/result.js';

const MUTATION_REPORT_DIR = '.testguardian/mutations';

export class MutationReporter {
  private readonly reportDir: string;

  constructor(private readonly projectRoot: string) {
    this.reportDir = join(projectRoot, MUTATION_REPORT_DIR);
    this.ensureReportDir();
  }

  private ensureReportDir(): void {
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Generate and persist a mutation report.
   */
  generateReport(params: {
    sandboxId: string;
    sandboxPath: string;
    originalFrameworkPath: string;
    appliedPatches: AppliedPatchInfo[];
    compileResult: CompileResult;
    replayResult: ReplayResult;
    runtimeResult: RuntimeResult;
    rollbackResult?: RollbackResult;
    failureReasons: string[];
    mutationDuration: number;
    validationSummaries: ValidationSummary[];
  }): Result<MutationReport> {
    try {
      const reportId = `mutation-${params.sandboxId}-${Date.now()}`;

      const report: MutationReport = {
        reportId,
        sandboxId: params.sandboxId,
        sandboxPath: params.sandboxPath,
        originalFrameworkPath: params.originalFrameworkPath,
        appliedPatches: params.appliedPatches,
        compileResult: params.compileResult,
        replayResult: params.replayResult,
        runtimeResult: params.runtimeResult,
        rollbackResult: params.rollbackResult,
        failureReasons: params.failureReasons,
        mutationDuration: params.mutationDuration,
        validationSummaries: params.validationSummaries,
        createdAt: Date.now(),
      };

      const reportPath = join(this.reportDir, `${reportId}.json`);
      writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

      return success(report);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Load a specific mutation report.
   */
  loadReport(reportId: string): Result<MutationReport> {
    try {
      const reportPath = join(this.reportDir, `${reportId}.json`);
      if (!existsSync(reportPath)) {
        return failure(`Report ${reportId} not found`);
      }
      const content = readFileSync(reportPath, 'utf-8');
      const report = JSON.parse(content) as MutationReport;
      return success(report);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * List all mutation reports.
   */
  listReports(): MutationReport[] {
    try {
      if (!existsSync(this.reportDir)) return [];

      const files = readdirSync(this.reportDir)
        .filter(f => f.endsWith('.json') && f.startsWith('mutation-'))
        .map(f => {
          const content = readFileSync(join(this.reportDir, f), 'utf-8');
          return JSON.parse(content) as MutationReport;
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      return files;
    } catch {
      return [];
    }
  }

  /**
   * Get reports for a specific sandbox.
   */
  getReportsBySandbox(sandboxId: string): MutationReport[] {
    return this.listReports().filter(r => r.sandboxId === sandboxId);
  }

  /**
   * Delete a mutation report.
   */
  deleteReport(reportId: string): Result<void> {
    try {
      const reportPath = join(this.reportDir, `${reportId}.json`);
      if (!existsSync(reportPath)) {
        return failure(`Report ${reportId} not found`);
      }
      const { unlinkSync } = require('node:fs');
      unlinkSync(reportPath);
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Clean all mutation reports.
   */
  cleanAllReports(): Result<number> {
    try {
      if (!existsSync(this.reportDir)) return success(0);

      const files = readdirSync(this.reportDir).filter(f => f.endsWith('.json'));
      let count = 0;
      for (const file of files) {
        const { unlinkSync } = require('node:fs');
        unlinkSync(join(this.reportDir, file));
        count++;
      }
      return success(count);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }
}

export function createMutationReporter(projectRoot: string): MutationReporter {
  return new MutationReporter(projectRoot);
}