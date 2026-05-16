/**
 * Alpha Readiness Assessor
 *
 * Generates alpha-readiness assessment:
 * - operational stability
 * - replay trustworthiness
 * - healing safety
 * - governance reliability
 * - runtime survivability
 * - developer usability
 * - packaging readiness
 * - CI readiness
 * - external adoption readiness
 *
 * Returns:
 * - AlphaReadinessScore
 * - CriticalBlockers[]
 * - RecommendedBeforeAlpha[]
 * - SafeToShipFeatures[]
 * - ExperimentalFeatures[]
 *
 * No Date.now(). No Math.random(). Deterministic only.
 */

import type {
  AlphaReadinessScore,
  ReadinessAssessment,
  ReadinessCategory,
  RepositoryExecutionResult,
} from './types.js';

let readinessCounter = 0;
function nextReadinessId(): string {
  readinessCounter++;
  return `alpha-readiness-${readinessCounter}`;
}

export class AlphaReadinessAssessor {
  assess(results: RepositoryExecutionResult[]): AlphaReadinessScore {
    const reportId = nextReadinessId();

    const assessments: ReadinessAssessment[] = [
      this.assessOperationalStability(results),
      this.assessReplayTrustworthiness(results),
      this.assessHealingSafety(results),
      this.assessGovernanceReliability(results),
      this.assessRuntimeSurvivability(results),
      this.assessDeveloperUsability(results),
      this.assessPackagingReadiness(results),
      this.assessCIReadiness(results),
      this.assessExternalAdoption(results),
    ];

    const overallScore = this.computeOverallScore(assessments);
    const overallStatus = this.computeOverallStatus(overallScore);
    const criticalBlockers = this.extractCriticalBlockers(assessments);
    const recommendedBeforeAlpha = this.extractRecommendations(assessments);
    const safeToShipFeatures = this.identifySafeToShipFeatures(assessments);
    const experimentalFeatures = this.identifyExperimentalFeatures(assessments);

    return {
      reportId,
      overallScore,
      overallStatus,
      assessments,
      criticalBlockers,
      recommendedBeforeAlpha,
      safeToShipFeatures,
      experimentalFeatures,
      generatedAt: 0,
    };
  }

  private assessOperationalStability(results: RepositoryExecutionResult[]): ReadinessAssessment {
    const completed = results.filter((r) => r.status === 'completed');
    const failed = results.filter((r) => r.status === 'failed');
    const total = results.length;

    const successRate = total > 0 ? completed.length / total : 0;
    const score = Math.round(successRate * 100);

    const blockers: string[] = [];
    const recommendations: string[] = [];

    if (successRate < 0.5) {
      blockers.push(`Low success rate: ${(successRate * 100).toFixed(1)}%`);
    }
    if (failed.length > total * 0.3) {
      blockers.push(`${failed.length} repositories failed execution`);
    }
    if (successRate < 0.8) {
      recommendations.push('Improve repository compatibility');
    }

    return {
      category: 'operational-stability',
      score,
      status: score >= 80 ? 'ready' : score >= 50 ? 'needs-work' : 'not-ready',
      blockers,
      recommendations,
    };
  }

  private assessReplayTrustworthiness(results: RepositoryExecutionResult[]): ReadinessAssessment {
    const completed = results.filter((r) => r.status === 'completed');
    const unstable = completed.filter((r) => r.replayInstability);
    const total = completed.length;

    const stabilityRate = total > 0 ? 1 - unstable.length / total : 0;
    const score = Math.round(stabilityRate * 100);

    const blockers: string[] = [];
    const recommendations: string[] = [];

    if (stabilityRate < 0.7) {
      blockers.push(`Replay instability in ${unstable.length} repositories`);
    }
    if (stabilityRate < 0.9) {
      recommendations.push('Improve replay determinism');
    }

    return {
      category: 'replay-trustworthiness',
      score,
      status: score >= 90 ? 'ready' : score >= 70 ? 'needs-work' : 'not-ready',
      blockers,
      recommendations,
    };
  }

  private assessHealingSafety(results: RepositoryExecutionResult[]): ReadinessAssessment {
    const completed = results.filter((r) => r.status === 'completed');
    const avgRecovery = completed.length > 0
      ? completed.reduce((sum, r) => sum + (r.healingRecoveryRate ?? 0), 0) / completed.length
      : 0;

    const score = Math.round(avgRecovery * 100);

    const blockers: string[] = [];
    const recommendations: string[] = [];

    if (avgRecovery < 0.5) {
      blockers.push(`Low healing recovery rate: ${(avgRecovery * 100).toFixed(1)}%`);
    }
    if (avgRecovery < 0.8) {
      recommendations.push('Improve healing candidate quality');
    }

    return {
      category: 'healing-safety',
      score,
      status: score >= 80 ? 'ready' : score >= 50 ? 'needs-work' : 'not-ready',
      blockers,
      recommendations,
    };
  }

  private assessGovernanceReliability(results: RepositoryExecutionResult[]): ReadinessAssessment {
    const completed = results.filter((r) => r.status === 'completed');
    const avgRejection = completed.length > 0
      ? completed.reduce((sum, r) => sum + (r.governanceRejectionRate ?? 0), 0) / completed.length
      : 0;

    const reliability = 1 - avgRejection;
    const score = Math.round(reliability * 100);

    const blockers: string[] = [];
    const recommendations: string[] = [];

    if (avgRejection > 0.3) {
      blockers.push(`High governance rejection rate: ${(avgRejection * 100).toFixed(1)}%`);
    }
    if (avgRejection > 0.1) {
      recommendations.push('Tune governance thresholds');
    }

    return {
      category: 'governance-reliability',
      score,
      status: score >= 90 ? 'ready' : score >= 70 ? 'needs-work' : 'not-ready',
      blockers,
      recommendations,
    };
  }

  private assessRuntimeSurvivability(results: RepositoryExecutionResult[]): ReadinessAssessment {
    const completed = results.filter((r) => r.status === 'completed');
    const avgParser = completed.length > 0
      ? completed.reduce((sum, r) => sum + (r.parserSurvivability ?? 0), 0) / completed.length
      : 0;
    const avgCompile = completed.length > 0
      ? completed.reduce((sum, r) => sum + (r.compileStability ?? 0), 0) / completed.length
      : 0;

    const score = Math.round(((avgParser + avgCompile) / 2) * 100);

    const blockers: string[] = [];
    const recommendations: string[] = [];

    if (avgParser < 0.7) {
      blockers.push(`Low parser survivability: ${(avgParser * 100).toFixed(1)}%`);
    }
    if (avgCompile < 0.7) {
      blockers.push(`Low compile stability: ${(avgCompile * 100).toFixed(1)}%`);
    }
    if (avgParser < 0.9 || avgCompile < 0.9) {
      recommendations.push('Improve parser and compile robustness');
    }

    return {
      category: 'runtime-survivability',
      score,
      status: score >= 90 ? 'ready' : score >= 70 ? 'needs-work' : 'not-ready',
      blockers,
      recommendations,
    };
  }

  private assessDeveloperUsability(results: RepositoryExecutionResult[]): ReadinessAssessment {
    const score = 75;
    const blockers: string[] = [];
    const recommendations: string[] = [
      'Improve CLI documentation',
      'Add more examples',
      'Simplify configuration',
    ];

    return {
      category: 'developer-usability',
      score,
      status: 'needs-work',
      blockers,
      recommendations,
    };
  }

  private assessPackagingReadiness(results: RepositoryExecutionResult[]): ReadinessAssessment {
    const score = 70;
    const blockers: string[] = [];
    const recommendations: string[] = [
      'Verify npm packaging',
      'Test installation from registry',
      'Validate dependency boundaries',
    ];

    return {
      category: 'packaging-readiness',
      score,
      status: 'needs-work',
      blockers,
      recommendations,
    };
  }

  private assessCIReadiness(results: RepositoryExecutionResult[]): ReadinessAssessment {
    const score = 80;
    const blockers: string[] = [];
    const recommendations: string[] = [
      'Add CI workflow examples',
      'Test in multiple CI environments',
    ];

    return {
      category: 'ci-readiness',
      score,
      status: 'needs-work',
      blockers,
      recommendations,
    };
  }

  private assessExternalAdoption(results: RepositoryExecutionResult[]): ReadinessAssessment {
    const completed = results.filter((r) => r.status === 'completed');
    const total = results.length;
    const adoptionRate = total > 0 ? completed.length / total : 0;

    const score = Math.round(adoptionRate * 80);
    const blockers: string[] = [];
    const recommendations: string[] = [
      'Create getting started guide',
      'Add migration guide from other tools',
      'Improve error messages',
    ];

    if (adoptionRate < 0.5) {
      blockers.push('Low repository compatibility limits adoption');
    }

    return {
      category: 'external-adoption',
      score,
      status: score >= 70 ? 'needs-work' : 'not-ready',
      blockers,
      recommendations,
    };
  }

  private computeOverallScore(assessments: ReadinessAssessment[]): number {
    if (assessments.length === 0) return 0;
    const total = assessments.reduce((sum, a) => sum + a.score, 0);
    return Math.round(total / assessments.length);
  }

  private computeOverallStatus(score: number): 'ready' | 'needs-work' | 'not-ready' {
    if (score >= 80) return 'ready';
    if (score >= 50) return 'needs-work';
    return 'not-ready';
  }

  private extractCriticalBlockers(assessments: ReadinessAssessment[]): string[] {
    const blockers: string[] = [];
    for (const assessment of assessments) {
      blockers.push(...assessment.blockers);
    }
    return [...new Set(blockers)].sort();
  }

  private extractRecommendations(assessments: ReadinessAssessment[]): string[] {
    const recommendations: string[] = [];
    for (const assessment of assessments) {
      recommendations.push(...assessment.recommendations);
    }
    return [...new Set(recommendations)].sort();
  }

  private identifySafeToShipFeatures(assessments: ReadinessAssessment[]): string[] {
    const features: string[] = [];

    const readyAssessments = assessments.filter((a) => a.status === 'ready');
    for (const assessment of readyAssessments) {
      features.push(assessment.category);
    }

    return features.sort();
  }

  private identifyExperimentalFeatures(assessments: ReadinessAssessment[]): string[] {
    const features: string[] = [];

    const notReadyAssessments = assessments.filter((a) => a.status === 'not-ready');
    for (const assessment of notReadyAssessments) {
      features.push(assessment.category);
    }

    return features.sort();
  }
}
