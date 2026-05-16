import { describe, it, expect } from 'vitest';
import { ArchitectureAuditor } from '../../src/core/stabilization/architecture-auditor.js';
import { SimplificationDetector } from '../../src/core/stabilization/simplification-detector.js';
import { AlphaReadinessAssessor } from '../../src/core/stabilization/alpha-readiness.js';
import type { RepositoryExecutionResult } from '../../src/core/large-scale-corpus/types.js';

function createMockResult(overrides: Partial<RepositoryExecutionResult> = {}): RepositoryExecutionResult {
  return {
    repoPath: '/test/repo',
    name: 'repo',
    category: 'root',
    status: 'completed',
    compatibilityStatus: 'supported',
    parserSurvivability: 1,
    compileStability: 0.9,
    healingRecoveryRate: 0.8,
    governanceRejectionRate: 0,
    replayInstability: false,
    unsupportedPatterns: [],
    executionDurationMs: 100,
    completedAt: 0,
    ...overrides,
  };
}

describe('ArchitectureAuditor', () => {
  it('audits architecture deterministically', () => {
    const auditor = new ArchitectureAuditor();
    const report = auditor.audit('/nonexistent/path');

    expect(report.reportId).toBeDefined();
    expect(report.totalHotspots).toBe(0);
    expect(report.criticalHotspots).toBe(0);
    expect(report.hotspots).toEqual([]);
    expect(report.generatedAt).toBe(0);
  });

  it('produces deterministic output for same input', () => {
    const auditor = new ArchitectureAuditor();
    const report1 = auditor.audit('/nonexistent/path');
    const report2 = auditor.audit('/nonexistent/path');

    expect(report1.totalHotspots).toBe(report2.totalHotspots);
    expect(report1.criticalHotspots).toBe(report2.criticalHotspots);
  });
});

describe('SimplificationDetector', () => {
  it('detects simplification opportunities deterministically', () => {
    const detector = new SimplificationDetector();
    const report = detector.detect('/nonexistent/path');

    expect(report.reportId).toBeDefined();
    expect(report.totalOpportunities).toBe(0);
    expect(report.highImpactOpportunities).toBe(0);
    expect(report.opportunities).toEqual([]);
    expect(report.generatedAt).toBe(0);
  });

  it('produces deterministic output for same input', () => {
    const detector = new SimplificationDetector();
    const report1 = detector.detect('/nonexistent/path');
    const report2 = detector.detect('/nonexistent/path');

    expect(report1.totalOpportunities).toBe(report2.totalOpportunities);
    expect(report1.highImpactOpportunities).toBe(report2.highImpactOpportunities);
  });
});

describe('AlphaReadinessAssessor', () => {
  it('assesses alpha readiness deterministically', () => {
    const assessor = new AlphaReadinessAssessor();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', name: 'a', compatibilityStatus: 'supported', parserSurvivability: 1, compileStability: 0.9, healingRecoveryRate: 0.8 }),
      createMockResult({ repoPath: '/repo/b', name: 'b', compatibilityStatus: 'supported', parserSurvivability: 0.8, compileStability: 0.7, healingRecoveryRate: 0.6 }),
      createMockResult({ repoPath: '/repo/c', name: 'c', compatibilityStatus: 'unsupported', parserSurvivability: 0.5, compileStability: 0.3, healingRecoveryRate: 0.2 }),
    ];

    const readiness = assessor.assess(results);

    expect(readiness.reportId).toBeDefined();
    expect(readiness.overallScore).toBeGreaterThanOrEqual(0);
    expect(readiness.overallScore).toBeLessThanOrEqual(100);
    expect(readiness.assessments.length).toBe(9);
    expect(readiness.generatedAt).toBe(0);
  });

  it('identifies critical blockers', () => {
    const assessor = new AlphaReadinessAssessor();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', name: 'a', status: 'failed', error: 'critical failure' }),
      createMockResult({ repoPath: '/repo/b', name: 'b', status: 'failed', error: 'critical failure' }),
      createMockResult({ repoPath: '/repo/c', name: 'c', status: 'failed', error: 'critical failure' }),
    ];

    const readiness = assessor.assess(results);

    expect(readiness.criticalBlockers.length).toBeGreaterThan(0);
    expect(readiness.overallStatus).toBe('not-ready');
  });

  it('identifies safe to ship features', () => {
    const assessor = new AlphaReadinessAssessor();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', name: 'a', compatibilityStatus: 'supported', parserSurvivability: 1, compileStability: 1, healingRecoveryRate: 1, governanceRejectionRate: 0, replayInstability: false }),
      createMockResult({ repoPath: '/repo/b', name: 'b', compatibilityStatus: 'supported', parserSurvivability: 1, compileStability: 1, healingRecoveryRate: 1, governanceRejectionRate: 0, replayInstability: false }),
    ];

    const readiness = assessor.assess(results);

    expect(readiness.safeToShipFeatures.length).toBeGreaterThan(0);
  });

  it('identifies experimental features', () => {
    const assessor = new AlphaReadinessAssessor();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', name: 'a', status: 'failed', error: 'critical failure' }),
      createMockResult({ repoPath: '/repo/b', name: 'b', status: 'failed', error: 'critical failure' }),
    ];

    const readiness = assessor.assess(results);

    expect(readiness.experimentalFeatures.length).toBeGreaterThan(0);
  });

  it('produces deterministic output for same input', () => {
    const assessor = new AlphaReadinessAssessor();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', name: 'a', compatibilityStatus: 'supported', parserSurvivability: 1, compileStability: 0.9, healingRecoveryRate: 0.8 }),
      createMockResult({ repoPath: '/repo/b', name: 'b', compatibilityStatus: 'unsupported', parserSurvivability: 0.5, compileStability: 0.3, healingRecoveryRate: 0.2 }),
    ];

    const readiness1 = assessor.assess(results);
    const readiness2 = assessor.assess(results);

    expect(readiness1.overallScore).toBe(readiness2.overallScore);
    expect(readiness1.overallStatus).toBe(readiness2.overallStatus);
    expect(readiness1.assessments.length).toBe(readiness2.assessments.length);
    expect(readiness1.criticalBlockers).toEqual(readiness2.criticalBlockers);
    expect(readiness1.safeToShipFeatures).toEqual(readiness2.safeToShipFeatures);
    expect(readiness1.experimentalFeatures).toEqual(readiness2.experimentalFeatures);
  });

  it('handles empty results gracefully', () => {
    const assessor = new AlphaReadinessAssessor();
    const readiness = assessor.assess([]);

    expect(readiness.overallScore).toBe(36);
    expect(readiness.overallStatus).toBe('not-ready');
    expect(readiness.assessments.length).toBe(9);
    expect(readiness.criticalBlockers).toEqual([
      'Low compile stability: 0.0%',
      'Low healing recovery rate: 0.0%',
      'Low parser survivability: 0.0%',
      'Low repository compatibility limits adoption',
      'Low success rate: 0.0%',
      'Replay instability in 0 repositories',
    ]);
    expect(readiness.safeToShipFeatures).toEqual(['governance-reliability']);
    expect(readiness.experimentalFeatures).toEqual(['external-adoption', 'healing-safety', 'operational-stability', 'replay-trustworthiness', 'runtime-survivability']);
  });

  it('computes correct readiness categories', () => {
    const assessor = new AlphaReadinessAssessor();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', name: 'a', compatibilityStatus: 'supported', parserSurvivability: 1, compileStability: 1, healingRecoveryRate: 1, governanceRejectionRate: 0, replayInstability: false }),
    ];

    const readiness = assessor.assess(results);

    const categories = readiness.assessments.map((a) => a.category);
    expect(categories).toContain('operational-stability');
    expect(categories).toContain('replay-trustworthiness');
    expect(categories).toContain('healing-safety');
    expect(categories).toContain('governance-reliability');
    expect(categories).toContain('runtime-survivability');
    expect(categories).toContain('developer-usability');
    expect(categories).toContain('packaging-readiness');
    expect(categories).toContain('ci-readiness');
    expect(categories).toContain('external-adoption');
  });
});
