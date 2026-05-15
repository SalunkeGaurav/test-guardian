import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { info, warn } from '../../logger/index.js';
import type {
  HealingReviewSession,
  WorkflowStageHistory,
  GovernanceDecisionSummary,
  ReplayEvidenceSummary,
  MutationDiff,
  StructuralRiskSummary,
  ConfidenceBreakdown,
  RollbackMetadata,
  ReviewErgonomicsReport,
  GovernanceVisibilityReport,
  ApprovalWorkflowBenchmark,
  ReviewPackage,
  DeveloperWorkflowOptions,
  WorkflowSimulationResult,
  ErgonomicsScore,
  ErgonomicsRecommendation,
  GovernanceWarning,
  UncertaintyIndicator,
  DeveloperDecision,
} from './types.js';

function generateId(): string {
  return `dwf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface BenchmarkResult {
  originalLocator: string;
  outcome: string;
  category: string;
}

interface HealingIntelReport {
  riskyRecoveryAnalysis?: {
    totalRiskyRecoveries: number;
    riskCategories: Array<{ category: string; severity: string }>;
  };
  replayDivergenceAnalysis?: {
    totalDivergences: number;
    divergenceTypes: Array<{ type: string; severity: string }>;
  };
  validationFailureAnalysis?: {
    governanceRejections: Array<{ reason: string }>;
  };
  structuralWeaknessAnalysis?: {
    wrapperChainWeakness: Array<{ chainDepth: number }>;
    dynamicLocatorWeakness: Array<{ dynamicType: string }>;
  };
  confidenceCalibration?: {
    weakScoringSignals: Array<{ signal: string; reliabilityScore: number }>;
    confidenceReliability: Array<{ confidenceBand: string; accuracy: number }>;
  };
}

interface PatternReport {
  locatorIntelligence?: {
    dynamicLocators: { count: number };
    chainedLocatorDepth: { count: number; maxDepth: number };
  };
  mutationRiskIntelligence?: {
    overallRiskScore: number;
    dynamicSelectorRisk: number;
    indirectWrapperRisk: number;
  };
  replayRiskIntelligence?: {
    asyncInteractionChains: number;
    modalHeavyFlows: number;
  };
  compatibilityTaxonomy?: {
    tier: string;
  };
}

interface ValidationReport {
  stabilityMetrics?: {
    parserSurvivability: number;
    compileStability: number;
    replayStability: number;
  };
  architecturalRisks?: Array<{ category: string; severity: string }>;
}

async function loadCorpusData(): Promise<{
  benchmarks: BenchmarkResult[];
  healingIntels: HealingIntelReport[];
  patterns: PatternReport[];
  validations: ValidationReport[];
}> {
  const benchmarks: BenchmarkResult[] = [];
  const healingIntels: HealingIntelReport[] = [];
  const patterns: PatternReport[] = [];
  const validations: ValidationReport[] = [];

  const corpusDir = join('.testguardian', 'corpus-reports');
  
  try {
    const aggPath = join(corpusDir, 'aggregate-report.json');
    const aggData = JSON.parse(await readFile(aggPath, 'utf-8'));
    
    if (aggData.executionResults) {
      for (const result of aggData.executionResults) {
        if (result.benchmarkReport?.benchmarkResults) {
          benchmarks.push(...result.benchmarkReport.benchmarkResults);
        }
        if (result.intelligenceReport) {
          healingIntels.push(result.intelligenceReport as HealingIntelReport);
        }
        if (result.patternReport) {
          patterns.push(result.patternReport as PatternReport);
        }
        if (result.validationReport) {
          validations.push(result.validationReport as ValidationReport);
        }
      }
    }
  } catch (e) {
    warn('DeveloperWorkflow', `Could not load corpus data: ${e}`);
  }

  return { benchmarks, healingIntels, patterns, validations };
}

function generateMockReviewSessions(count: number, benchmarks: BenchmarkResult[]): HealingReviewSession[] {
  const sessions: HealingReviewSession[] = [];
  
  const locatorTypes = [
    { original: '#login-btn', proposed: '[data-testid="login-button"]', strategy: 'data-testid' },
    { original: '.menu-item:nth-child(2)', proposed: 'button:has-text("Settings")', strategy: 'text' },
    { original: 'div.container > span', proposed: '[class*="header"]', strategy: 'class-regex' },
    { original: 'a[href="/profile"]', proposed: 'nav >> text=Profile', strategy: 'chained' },
    { original: '#submit-form button', proposed: 'button[type="submit"]', strategy: 'type-selector' },
  ];

  const failureReasons = [
    'Element became stale due to React re-render',
    'Dynamic class generation changed selector',
    'Nested element structure changed',
    'SPA routing altered DOM hierarchy',
    'Accessibility attributes updated',
  ];

  const decisions: DeveloperDecision[] = ['approve', 'reject', 'needs-more-info', 'rollback'];
  const decisionReasons = [
    'Clear improvement, safe to apply',
    'Confidence too low, needs investigation',
    'Structural changes too risky',
    'Unclear if replay is reliable',
    'Better alternative available manually',
    'Rollback needed - caused test failure',
  ];

  for (let i = 0; i < count; i++) {
    const locType = locatorTypes[i % locatorTypes.length] || { original: 'div#test', proposed: '[data-test]', strategy: 'data-test' };
    const isRisky = i % 4 === 0;
    const stageHistory: WorkflowStageHistory[] = [];
    
    const stages: string[] = [
      'failure-detected', 'proposal-generated', 'governance-evaluated',
      'replay-evidence-shown', 'mutation-reviewed'
    ];
    
    let currentTime = Date.now() - 600000;
    for (const stage of stages) {
      stageHistory.push({
        stage: stage as 'failure-detected',
        enteredAt: currentTime,
        exitedAt: currentTime + 60000,
        duration: 60000,
      });
      currentTime += 60000;
    }

    const decision = decisions[Math.floor(Math.random() * decisions.length)] || 'approve';
    const finalStage: string = decision === 'approve' ? 'approved' 
      : decision === 'reject' ? 'rejected' 
      : decision === 'rollback' ? 'rolled-back' 
      : 'mutation-reviewed';

    stageHistory.push({
      stage: finalStage as 'approved',
      enteredAt: currentTime,
      exitedAt: currentTime + 30000,
      duration: 30000,
    });

    const confidence = isRisky ? 55 + Math.random() * 15 : 70 + Math.random() * 20;

    const session: HealingReviewSession = {
      id: generateId(),
      repositoryId: `repo-${(i % 6) + 1}`,
      locator: locType.original,
      originalSelector: locType.original,
      proposedSelector: locType.proposed,
      failureReason: failureReasons[i % failureReasons.length] || 'Unknown failure',
      stages: stageHistory,
      currentStage: finalStage as 'approved' | 'rejected' | 'rolled-back' | 'mutation-reviewed',
      governanceAnalysis: {
        passed: !isRisky,
        rejected: isRisky && Math.random() > 0.5,
        reasons: isRisky ? ['High structural risk', 'Chained locator detected'] : ['Safe mutation', 'Low risk'],
        warnings: isRisky ? ['Chained locator may fail on DOM changes', 'Computed selector unstable'] : [],
        riskyRecoveryIndicators: isRisky ? [
          { indicator: 'chained-locator', severity: 'high', description: 'Deep locator chain detected' },
          { indicator: 'dynamic-class', severity: 'medium', description: 'Class may regenerate' },
        ] : [],
        confidenceScore: confidence,
      },
      replayEvidence: {
        validated: !isRisky || Math.random() > 0.3,
        diverged: isRisky && Math.random() > 0.6,
        divergenceType: isRisky ? 'selector-mismatch' : null,
        comparisonUrl: '/replay/compare/123',
        validationScore: isRisky ? 65 + Math.random() * 20 : 80 + Math.random() * 15,
      },
      mutationDiff: {
        original: locType.original,
        proposed: locType.proposed,
        addedLines: 1,
        removedLines: 1,
        changedSelectors: 1,
        strategy: locType.strategy,
      },
      structuralRisk: {
        overallRisk: isRisky ? 'high' : 'low',
        chainedLocatorRisk: i % 3 === 0,
        wrapperAbstractionRisk: i % 5 === 0,
        dynamicSelectorRisk: i % 4 === 0,
        repeatedSelectorRisk: i % 6 === 0,
        oversizedPageObjectRisk: i % 7 === 0,
        asyncFlowRisk: i % 8 === 0,
      },
      confidenceBreakdown: {
        overall: confidence,
        replay: confidence - 5 + Math.random() * 10,
        uniqueness: confidence - 8 + Math.random() * 12,
        structural: confidence - 10 + Math.random() * 15,
        validation: confidence - 3 + Math.random() * 8,
        runtime: confidence - 12 + Math.random() * 18,
      },
      rollbackMetadata: {
        available: true,
        backupId: `backup-${Date.now()}-${i}`,
        rollbackCommand: 'tg rollback --id=backup-123',
        lastValidState: locType.original,
      },
      developerDecision: decision as 'approve' | 'reject' | 'needs-more-info' | 'rollback',
      decisionReason: decisionReasons[Math.floor(Math.random() * decisionReasons.length)] || 'Reviewed and decided',
      reviewedAt: Date.now(),
    };

    sessions.push(session);
  }

  return sessions;
}

function analyzeReviewErgonomics(sessions: HealingReviewSession[]): ReviewErgonomicsReport {
  const calculateScore = (base: number, variance: number): ErgonomicsScore => {
    const score = Math.max(0, Math.min(100, base + (Math.random() - 0.5) * variance));
    const rating = score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'acceptable' : 'poor';
    return {
      score,
      maxScore: 100,
      rating,
      breakdown: ['Clear explanations', 'Visual diff helpful', 'Evidence accessible'],
    };
  };

  const explanationClarity = calculateScore(75, 10);
  const governanceUnderstandability = calculateScore(68, 15);
  const mutationReadability = calculateScore(82, 8);
  const replayEvidenceUsefulness = calculateScore(70, 12);
  const rollbackConfidence = calculateScore(78, 10);
  const ambiguityVisibility = calculateScore(55, 20);

  const overallScore = (
    explanationClarity.score * 0.15 +
    governanceUnderstandability.score * 0.20 +
    mutationReadability.score * 0.20 +
    replayEvidenceUsefulness.score * 0.15 +
    rollbackConfidence.score * 0.15 +
    ambiguityVisibility.score * 0.15
  );

  const recommendations: ErgonomicsRecommendation[] = [
    {
      category: 'governance-understandability',
      currentState: 'Warnings are technical and unclear',
      recommendedImprovement: 'Add plain-language explanations for governance decisions',
      impact: 'high',
    },
    {
      category: 'ambiguity-visibility',
      currentState: 'Low confidence signals not clearly highlighted',
      recommendedImprovement: 'Add visual indicators for uncertain healing proposals',
      impact: 'high',
    },
    {
      category: 'replay-evidence',
      currentState: 'Divergence details hard to interpret',
      recommendedImprovement: 'Show visual side-by-side comparison with highlights',
      impact: 'medium',
    },
    {
      category: 'rollback-confidence',
      currentState: 'Rollback metadata not easily accessible',
      recommendedImprovement: 'Add one-click rollback with clear state preview',
      impact: 'medium',
    },
  ];

  return {
    id: generateId(),
    generatedAt: Date.now(),
    sessionCount: sessions.length,
    explanationClarity,
    governanceUnderstandability,
    mutationReadability,
    replayEvidenceUsefulness,
    rollbackConfidence,
    ambiguityVisibility,
    overallErgonomicsScore: overallScore,
    improvementRecommendations: recommendations,
  };
}

function analyzeGovernanceVisibility(sessions: HealingReviewSession[]): GovernanceVisibilityReport {
  const warnings: GovernanceWarning[] = [];
  const uncertaintyIndicators: UncertaintyIndicator[] = [];

  for (const session of sessions) {
    if (session.governanceAnalysis.riskyRecoveryIndicators.length > 0) {
      for (const indicator of session.governanceAnalysis.riskyRecoveryIndicators) {
        warnings.push({
          type: 'risky-recovery',
          message: `Risky healing: ${indicator.indicator}`,
          severity: indicator.severity as 'info' | 'warning' | 'critical',
          actionable: true,
          explanation: indicator.description,
        });
      }
    }

    if (session.replayEvidence.diverged) {
      warnings.push({
        type: 'replay-divergence',
        message: 'Replay validation shows divergence',
        severity: 'warning',
        actionable: true,
        explanation: `Divergence type: ${session.replayEvidence.divergenceType}`,
      });
    }

    if (session.structuralRisk.overallRisk === 'high') {
      warnings.push({
        type: 'structural-instability',
        message: 'High structural risk detected',
        severity: 'critical',
        actionable: true,
        explanation: 'Multiple structural risk factors present',
      });
    }

    if (session.confidenceBreakdown.overall < 60) {
      uncertaintyIndicators.push({
        indicator: 'low-confidence',
        uncertaintyLevel: 100 - session.confidenceBreakdown.overall,
        affectedLocators: [session.locator],
        recommendation: 'Review manually before approval',
      });
    }
  }

  const uniqueWarnings = warnings.filter((w, i, arr) => 
    arr.findIndex(x => x.type === w.type) === i
  );

  const comprehensionRate = sessions.length > 0 
    ? (sessions.filter(s => s.governanceAnalysis.warnings.length <= 2).length / sessions.length) * 100
    : 0;

  return {
    id: generateId(),
    generatedAt: Date.now(),
    riskyRecoveryWarnings: uniqueWarnings.filter(w => w.type === 'risky-recovery'),
    replayDivergenceWarnings: uniqueWarnings.filter(w => w.type === 'replay-divergence'),
    structuralInstabilityWarnings: uniqueWarnings.filter(w => w.type === 'structural-instability'),
    unsupportedPatternWarnings: [],
    confidenceUncertaintyIndicators: uncertaintyIndicators,
    developerComprehensionRate: comprehensionRate,
  };
}

function benchmarkApprovalWorkflow(sessions: HealingReviewSession[]): ApprovalWorkflowBenchmark {
  const decisions = sessions.map(s => s.developerDecision).filter(Boolean);
  const approveCount = decisions.filter(d => d === 'approve').length;
  const rejectCount = decisions.filter(d => d === 'reject').length;
  const rollbackCount = decisions.filter(d => d === 'rollback').length;
  const needsMoreCount = decisions.filter(d => d === 'needs-more-info').length;

  const safeApprovals = sessions.filter(s => 
    s.developerDecision === 'approve' && s.structuralRisk.overallRisk !== 'high'
  ).length;
  
  const riskyApprovals = sessions.filter(s => 
    s.developerDecision === 'approve' && s.structuralRisk.overallRisk === 'high'
  ).length;

  const safeApprovalRate = approveCount > 0 ? (safeApprovals / approveCount) * 100 : 100;
  const riskyApprovalRate = approveCount > 0 ? (riskyApprovals / approveCount) * 100 : 0;

  const precision = (approveCount + rejectCount) > 0 
    ? (rejectCount / (approveCount + rejectCount)) * 100 
    : 50;

  const avgApprovalTime = sessions
    .filter(s => s.developerDecision === 'approve')
    .reduce((sum, s) => {
      const firstStage = s.stages[0];
      const lastStage = s.stages[s.stages.length - 1];
      return sum + (lastStage && firstStage ? lastStage.enteredAt - firstStage.enteredAt : 0);
    }, 0) 
    / Math.max(1, approveCount);

  const avgRejectionTime = sessions
    .filter(s => s.developerDecision === 'reject')
    .reduce((sum, s) => {
      const firstStage = s.stages[0];
      const lastStage = s.stages[s.stages.length - 1];
      return sum + (lastStage && firstStage ? lastStage.enteredAt - firstStage.enteredAt : 0);
    }, 0)
    / Math.max(1, rejectCount);

  const confidenceEffective = sessions.filter(s => {
    const conf = s.confidenceBreakdown.overall;
    const decision = s.developerDecision;
    return (decision === 'approve' && conf >= 70) || (decision === 'reject' && conf < 70);
  }).length;

  return {
    id: generateId(),
    generatedAt: Date.now(),
    totalSessions: sessions.length,
    safeApprovalRate,
    riskyApprovalRate,
    rejectionPrecision: precision,
    rollbackUsageFrequency: (rollbackCount / sessions.length) * 100,
    confidenceComprehensionEffectiveness: (confidenceEffective / sessions.length) * 100,
    approvalTimeAverage: avgApprovalTime / 1000,
    rejectionTimeAverage: avgRejectionTime / 1000,
    decisionDistribution: {
      approve: approveCount,
      reject: rejectCount,
      rollback: rollbackCount,
      needsMoreInfo: needsMoreCount,
    },
  };
}

function generateReviewPackages(sessions: HealingReviewSession[]): ReviewPackage[] {
  return sessions.map(session => ({
    id: generateId(),
    sessionId: session.id,
    generatedAt: Date.now(),
    patchDiff: `--- ${session.originalSelector}\n+++ ${session.proposedSelector}\n`,
    replayEvidence: session.replayEvidence,
    governanceAnalysis: session.governanceAnalysis,
    structuralRisk: session.structuralRisk,
    confidenceBreakdown: session.confidenceBreakdown,
    rollbackMetadata: session.rollbackMetadata,
    reviewInstructions: [
      '1. Review the mutation diff above',
      '2. Check replay validation evidence',
      '3. Consider governance warnings',
      '4. Evaluate structural risk factors',
      '5. Make approval decision or request more info',
    ],
  }));
}

export async function runDeveloperWorkflowSimulation(
  options: DeveloperWorkflowOptions
): Promise<WorkflowSimulationResult> {
  const sessionCount = options.sessionCount || 20;
  
  info('DeveloperWorkflow', `Starting developer workflow simulation with ${sessionCount} sessions`);

  const { benchmarks } = await loadCorpusData();

  const effectiveBenchmarks = benchmarks.length > 0 ? benchmarks : Array(30).fill(null).map((_, i) => ({
    originalLocator: `locator-${i}`,
    outcome: 'successful-safe-recovery',
    category: 'locator-mutation',
  }));

  const sessions = generateMockReviewSessions(sessionCount, effectiveBenchmarks);

  info('DeveloperWorkflow', `Generated ${sessions.length} review sessions`);

  const ergonomicsReport = analyzeReviewErgonomics(sessions);
  const governanceVisibility = analyzeGovernanceVisibility(sessions);
  const approvalBenchmark = benchmarkApprovalWorkflow(sessions);
  const reviewPackages = generateReviewPackages(sessions);

  info('DeveloperWorkflow', `Ergonomics score: ${ergonomicsReport.overallErgonomicsScore.toFixed(1)}`);
  info('DeveloperWorkflow', `Safe approval rate: ${approvalBenchmark.safeApprovalRate.toFixed(1)}%`);

  return {
    sessions,
    ergonomicsReport,
    governanceVisibility,
    approvalBenchmark,
    reviewPackages,
  };
}

export function generateWorkflowSummary(result: WorkflowSimulationResult): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('            DEVELOPER WORKFLOW SIMULATION REPORT');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Total Review Sessions: ${result.sessions.length}`);
  lines.push('');

  const erg = result.ergonomicsReport;
  lines.push('─── Review Ergonomics ───');
  lines.push(`  Overall Score: ${erg.overallErgonomicsScore.toFixed(1)}/100`);
  lines.push(`  Explanation Clarity: ${erg.explanationClarity.rating} (${erg.explanationClarity.score.toFixed(0)})`);
  lines.push(`  Governance Understandability: ${erg.governanceUnderstandability.rating} (${erg.governanceUnderstandability.score.toFixed(0)})`);
  lines.push(`  Mutation Readability: ${erg.mutationReadability.rating} (${erg.mutationReadability.score.toFixed(0)})`);
  lines.push(`  Replay Evidence Usefulness: ${erg.replayEvidenceUsefulness.rating} (${erg.replayEvidenceUsefulness.score.toFixed(0)})`);
  lines.push(`  Rollback Confidence: ${erg.rollbackConfidence.rating} (${erg.rollbackConfidence.score.toFixed(0)})`);
  lines.push(`  Ambiguity Visibility: ${erg.ambiguityVisibility.rating} (${erg.ambiguityVisibility.score.toFixed(0)})`);
  lines.push('');

  const gov = result.governanceVisibility;
  lines.push('─── Governance Visibility ───');
  lines.push(`  Risky Recovery Warnings: ${gov.riskyRecoveryWarnings.length}`);
  lines.push(`  Replay Divergence Warnings: ${gov.replayDivergenceWarnings.length}`);
  lines.push(`  Structural Instability Warnings: ${gov.structuralInstabilityWarnings.length}`);
  lines.push(`  Developer Comprehension Rate: ${gov.developerComprehensionRate.toFixed(1)}%`);
  lines.push('');

  const bench = result.approvalBenchmark;
  lines.push('─── Approval Workflow Benchmark ───');
  lines.push(`  Safe Approval Rate: ${bench.safeApprovalRate.toFixed(1)}%`);
  lines.push(`  Risky Approval Rate: ${bench.riskyApprovalRate.toFixed(1)}%`);
  lines.push(`  Rejection Precision: ${bench.rejectionPrecision.toFixed(1)}%`);
  lines.push(`  Rollback Usage: ${bench.rollbackUsageFrequency.toFixed(1)}%`);
  lines.push(`  Confidence Comprehension: ${bench.confidenceComprehensionEffectiveness.toFixed(1)}%`);
  lines.push(`  Avg Approval Time: ${bench.approvalTimeAverage.toFixed(1)}s`);
  lines.push(`  Avg Rejection Time: ${bench.rejectionTimeAverage.toFixed(1)}s`);
  lines.push('');
  lines.push(`  Decision Distribution:`);
  for (const [decision, count] of Object.entries(bench.decisionDistribution)) {
    lines.push(`    ${decision}: ${count}`);
  }
  lines.push('');

  lines.push('─── Top Ergonomics Improvements ───');
  for (const rec of erg.improvementRecommendations.slice(0, 3)) {
    lines.push(`  [${rec.impact}] ${rec.category}: ${rec.recommendedImprovement.substring(0, 60)}...`);
  }
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}