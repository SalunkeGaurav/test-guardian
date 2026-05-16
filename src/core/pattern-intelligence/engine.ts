import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import type {
  PatternIntelligenceReport,
  LocatorPatternReport,
  PageObjectReport,
  MutationRiskReport,
  ReplayRiskReport,
  CompatibilityTaxonomy,
  CompatibilityTier,
} from './types.js';
import { parseSourceFile } from '../../adapters/playwright/parser.js';
import { info } from '../../logger/index.js';

const REPORT_DIR = '.testguardian/pattern-intelligence';

export class PatternIntelligence {
  private reportId: string;

  constructor() {
    this.reportId = `pattern-intel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async extractIntelligence(repoPath: string): Promise<PatternIntelligenceReport> {
    info('PatternIntelligence', `Extracting pattern intelligence from: ${repoPath}`);

    const locatorIntelligence = await this.analyzeLocatorPatterns(repoPath);
    const pageObjectIntelligence = await this.analyzePageObjects(repoPath);
    const mutationRiskIntelligence = await this.analyzeMutationRisk(repoPath);
    const replayRiskIntelligence = await this.analyzeReplayRisk(repoPath);
    const compatibilityTaxonomy = this.generateTaxonomy(
      locatorIntelligence,
      pageObjectIntelligence,
      mutationRiskIntelligence,
      replayRiskIntelligence
    );

    const report: PatternIntelligenceReport = {
      id: this.reportId,
      generatedAt: Date.now(),
      repositoryPath: repoPath,
      locatorIntelligence,
      pageObjectIntelligence,
      mutationRiskIntelligence,
      replayRiskIntelligence,
      compatibilityTaxonomy,
    };

    this.persistReport(report);
    info('PatternIntelligence', `Intelligence extraction complete. Tier: ${compatibilityTaxonomy.tier}`);

    return report;
  }

  private async analyzeLocatorPatterns(repoPath: string): Promise<LocatorPatternReport> {
    const strategyFrequency: Record<string, number> = {};
    let totalLocators = 0;
    let chainedCount = 0;
    let maxDepth = 0;
    const depthDistribution: Record<number, number> = {};
    let dynamicCount = 0;
    const dynamicTypes: Record<string, number> = {};
    let duplicateCount = 0;
    let unstableCount = 0;
    const unstablePatterns: string[] = [];
    let wrapperGenerated = 0;

    const testFiles = this.findTestFiles(repoPath);
    const seenSelectors = new Map<string, number>();

    for (const file of testFiles) {
      try {
        const content = readFileSync(file, 'utf-8');
        const result = parseSourceFile(relative(repoPath, file), content);

        for (const locator of result.locators) {
          totalLocators++;
          const strategy = this.normalizeStrategy(locator.strategy);
          strategyFrequency[strategy] = (strategyFrequency[strategy] || 0) + 1;

          const expr = locator.expression || '';
          const chainDepth = (expr.match(/\.locator\(/g) || []).length;
          if (chainDepth > 0) {
            chainedCount++;
            maxDepth = Math.max(maxDepth, chainDepth);
            depthDistribution[chainDepth] = (depthDistribution[chainDepth] || 0) + 1;
          }

          if (this.isDynamicSelector(expr)) {
            dynamicCount++;
            const type = this.categorizeDynamicSelector(expr);
            dynamicTypes[type] = (dynamicTypes[type] || 0) + 1;
          }

          if (locator.value) {
            const count = seenSelectors.get(locator.value) || 0;
            if (count > 0) duplicateCount++;
            seenSelectors.set(locator.value, count + 1);
          }

          if (this.isUnstableSelector(locator.value || '')) {
            unstableCount++;
            unstablePatterns.push(locator.value || '');
          }

          if (this.isWrapperGenerated(content, locator)) {
            wrapperGenerated++;
          }
        }
      } catch (e) {
        // Skip parsing failures
      }
    }

    const strategyPercentages: Record<string, number> = {};
    for (const [strat, count] of Object.entries(strategyFrequency)) {
      strategyPercentages[strat] = Math.round((count / totalLocators) * 1000) / 10;
    }

    return {
      totalLocators,
      strategyFrequency,
      strategyPercentages,
      chainedLocatorDepth: {
        count: chainedCount,
        maxDepth,
        depthDistribution,
        averageDepth: this.calculateAverageDepth(depthDistribution, chainedCount),
      },
      dynamicLocators: {
        count: dynamicCount,
        percentage: totalLocators > 0 ? Math.round((dynamicCount / totalLocators) * 1000) / 10 : 0,
        types: dynamicTypes,
      },
      duplicateSelectors: duplicateCount,
      unstablePatterns: {
        count: unstableCount,
        percentage: totalLocators > 0 ? Math.round((unstableCount / totalLocators) * 1000) / 10 : 0,
        patterns: [...new Set(unstablePatterns)].slice(0, 10),
      },
      wrapperGenerated,
      customAbstractions: {
        count: 0,
        wrapperTypes: [],
      },
    };
  }

  private async analyzePageObjects(repoPath: string): Promise<PageObjectReport> {
    const pageObjects: { name: string; locatorCount: number; filePath: string }[] = [];
    const inheritancePatterns: string[] = [];
    const compositionPatterns: string[] = [];
    const wrapperTypes: string[] = [];
    let indirectionLayers = 0;

    const testFiles = this.findTestFiles(repoPath);

    for (const file of testFiles) {
      try {
        const content = readFileSync(file, 'utf-8');
        const result = parseSourceFile(relative(repoPath, file), content);

        for (const po of result.pageObjects) {
          const locatorCount = po.locators?.length || 0;
          pageObjects.push({
            name: po.name,
            locatorCount,
            filePath: po.filePath || '',
          });

          if (content.includes('extends') || content.includes('inherit')) {
            inheritancePatterns.push(po.name);
          }
          if (content.includes('new') || content.includes('create')) {
            compositionPatterns.push(po.name);
          }
          if (content.includes('wrapper') || content.includes('factory')) {
            wrapperTypes.push(po.name);
          }
        }
      } catch (e) {
        // Skip
      }
    }

    const locatorCounts = pageObjects.map(p => p.locatorCount);
    const avgLocators = locatorCounts.length > 0
      ? Math.round(locatorCounts.reduce((a, b) => a + b, 0) / locatorCounts.length * 10) / 10
      : 0;

    const sizeDist = this.categorizeSizes(locatorCounts);

    return {
      totalPageObjects: pageObjects.length,
      sizeDistribution: sizeDist,
      locatorDensity: {
        averageLocatorsPerPO: avgLocators,
        minLocators: Math.min(...locatorCounts, 0),
        maxLocators: Math.max(...locatorCounts, 0),
      },
      inheritancePatterns: [...new Set(inheritancePatterns)],
      compositionPatterns: [...new Set(compositionPatterns)],
      wrapperAbstractions: {
        count: wrapperTypes.length,
        wrapperTypes: [...new Set(wrapperTypes)],
        indirectionLayers,
      },
      antiPatternClusters: this.detectAntiPatterns(pageObjects),
    };
  }

  private async analyzeMutationRisk(repoPath: string): Promise<MutationRiskReport> {
    let dynamicSelectorRisk = 0;
    let computedLocatorRisk = 0;
    let indirectWrapperRisk = 0;
    let runtimeCompositionRisk = 0;
    let astAmbiguityRisk = 0;
    let compileFragileRisk = 0;
    const affectedFiles: string[] = [];

    const testFiles = this.findTestFiles(repoPath);

    for (const file of testFiles) {
      try {
        const content = readFileSync(file, 'utf-8');
        const result = parseSourceFile(relative(repoPath, file), content);

        if (content.includes('${') || content.includes('format(')) {
          dynamicSelectorRisk++;
        }
        if (content.includes('Math.') || content.includes('Date.')) {
          computedLocatorRisk++;
        }
        if (content.includes('factory') || content.includes('create')) {
          indirectWrapperRisk++;
        }
        if (content.includes('eval') || content.includes('Function')) {
          runtimeCompositionRisk++;
        }
        if (result.locators.length > 20) {
          astAmbiguityRisk++;
        }
        if (content.includes('//@') || content.includes('@@@')) {
          compileFragileRisk++;
        }

        if (dynamicSelectorRisk + computedLocatorRisk + indirectWrapperRisk > 0) {
          affectedFiles.push(relative(repoPath, file));
        }
      } catch (e) {
        // Skip
      }
    }

    const riskScore = Math.round(
      ((dynamicSelectorRisk * 0.2 + computedLocatorRisk * 0.15 +
        indirectWrapperRisk * 0.25 + runtimeCompositionRisk * 0.3 +
        astAmbiguityRisk * 0.05 + compileFragileRisk * 0.05) /
        Math.max(testFiles.length, 1)) * 100
    );

    return {
      overallRiskScore: Math.min(riskScore, 100),
      riskCategories: [
        { category: 'Dynamic Selectors', score: dynamicSelectorRisk, affectedFiles: [] },
        { category: 'Computed Locators', score: computedLocatorRisk, affectedFiles: [] },
        { category: 'Indirect Wrappers', score: indirectWrapperRisk, affectedFiles: [] },
        { category: 'Runtime Composition', score: runtimeCompositionRisk, affectedFiles: [] },
        { category: 'AST Ambiguity', score: astAmbiguityRisk, affectedFiles: [] },
        { category: 'Compile Fragile', score: compileFragileRisk, affectedFiles: [] },
      ],
      dynamicSelectorRisk,
      computedLocatorRisk,
      indirectWrapperRisk,
      runtimeCompositionRisk,
      astAmbiguityRisk,
      compileFragileRisk,
    };
  }

  private async analyzeReplayRisk(repoPath: string): Promise<ReplayRiskReport> {
    let navigationRisks = 0;
    let selectorRisks = 0;
    let modalHeavyFlows = 0;
    let dynamicRenderingRisks = 0;
    let iframeUsage = 0;
    let asyncInteractionChains = 0;

    const testFiles = this.findTestFiles(repoPath);

    for (const file of testFiles) {
      try {
        const content = readFileSync(file, 'utf-8');

        if (content.includes('.waitFor') || content.includes('waitForSelector')) {
          navigationRisks++;
        }
        if (content.includes(':nth-child') || content.includes('nth(')) {
          selectorRisks++;
        }
        if (content.includes('.modal') || content.includes('dialog')) {
          modalHeavyFlows++;
        }
        if (content.includes('waitForLoadState') || content.includes('networkidle')) {
          dynamicRenderingRisks++;
        }
        if (content.includes('frame') || content.includes('iframe')) {
          iframeUsage++;
        }
        if (content.includes('Promise') || content.includes('await')) {
          asyncInteractionChains++;
        }
      } catch (e) {
        // Skip
      }
    }

    const totalRisk = navigationRisks + selectorRisks + modalHeavyFlows + dynamicRenderingRisks + iframeUsage + asyncInteractionChains;
    const riskScore = Math.round((totalRisk / Math.max(testFiles.length, 1)) * 20);

    return {
      overallRiskScore: Math.min(riskScore, 100),
      navigationRisks: [
        { type: 'Wait For Selector', severity: 'low', count: navigationRisks },
      ],
      selectorRisks: [
        { type: 'nth-child Usage', severity: 'medium', count: selectorRisks },
      ],
      modalHeavyFlows,
      dynamicRenderingRisks,
      iframeUsage,
      asyncInteractionChains,
    };
  }

  private generateTaxonomy(
    locators: LocatorPatternReport,
    pageObjects: PageObjectReport,
    mutation: MutationRiskReport,
    replay: ReplayRiskReport
  ): CompatibilityTaxonomy {
    const supportedFeatures: string[] = [];
    const partiallySupported: string[] = [];
    const unsupported: string[] = [];
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if ((locators.strategyPercentages['getBy'] ?? 0) > 30 || (locators.strategyPercentages['css'] ?? 0) > 30) {
      supportedFeatures.push('Standard Playwright locators');
    }

    if (locators.dynamicLocators.percentage < 20) {
      supportedFeatures.push('Predictable selectors');
    } else {
      partiallySupported.push('Dynamic selectors present');
    }

    if (locators.chainedLocatorDepth.count > locators.totalLocators * 0.5) {
      partiallySupported.push('Heavy chained locator usage');
    }

    if (pageObjects.sizeDistribution.giant > 0) {
      riskFactors.push('Giant page objects detected');
      recommendations.push('Split large page objects into smaller components');
    }

    if (mutation.overallRiskScore > 30) {
      riskFactors.push('High mutation risk score');
      unsupported.push('Complex dynamic selector generation');
    }

    if (replay.overallRiskScore > 40) {
      riskFactors.push('Replay instability factors present');
      partiallySupported.push('Complex async interaction patterns');
    }

    let tier: CompatibilityTier;
    if (mutation.overallRiskScore < 20 && replay.overallRiskScore < 30) {
      tier = 'fully-supported';
    } else if (mutation.overallRiskScore < 50 && replay.overallRiskScore < 60) {
      tier = 'partially-supported';
    } else if (mutation.overallRiskScore >= 50) {
      tier = 'high-mutation-risk';
    } else if (replay.overallRiskScore >= 60) {
      tier = 'replay-fragile';
    } else {
      tier = 'unsupported';
    }

    return {
      tier,
      supportedFeatures,
      partiallySupportedFeatures: partiallySupported,
      unsupportedFeatures: unsupported,
      riskFactors,
      recommendations,
    };
  }

  private findTestFiles(repoPath: string): string[] {
    const patterns = ['**/*.spec.ts', '**/*.test.ts', '**/*.spec.js', '**/*.test.js'];
    const files: string[] = [];

    const scanDir = (dir: string, depth = 0): void => {
      if (depth > 5) return;
      if (!existsSync(dir)) return;

      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) continue;

        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (patterns.some(p => this.matchPattern(entry.name, p))) {
          files.push(fullPath);
        }
      }
    };

    scanDir(join(repoPath, 'tests') || repoPath);
    scanDir(join(repoPath, 'test') || repoPath);
    scanDir(repoPath);

    return files;
  }

  private matchPattern(filename: string, pattern: string): boolean {
    const regex = pattern.replace('**/', '').replace('*', '.*');
    return new RegExp(regex).test(filename);
  }

  private normalizeStrategy(strategy: string): string {
    const map: Record<string, string> = {
      css: 'css', xpath: 'xpath', text: 'text', role: 'role',
      testid: 'testid', label: 'label', placeholder: 'placeholder',
      title: 'title', getby: 'getBy', locator: 'locator',
    };
    return map[strategy.toLowerCase()] || strategy;
  }

  private isDynamicSelector(value: string): boolean {
    return /\$\{|\$\[|concat\(|\bformat\(/.test(value) ||
      /\{.*:.*\}/.test(value);
  }

  private categorizeDynamicSelector(value: string): string {
    if (value.includes('${')) return 'template-literal';
    if (value.includes('format(')) return 'format-function';
    if (value.includes('$[')) return 'computed-array';
    return 'dynamic';
  }

  private isUnstableSelector(value: string): boolean {
    return /^#[\w-]+$/.test(value) || /^\.[\w-]+$/.test(value) || /^[a-z]+$/i.test(value);
  }

  private isWrapperGenerated(content: string, locator: unknown): boolean {
    return content.includes('factory') || content.includes('createLocator');
  }

  private categorizeSizes(locatorCounts: number[]): { small: number; medium: number; large: number; giant: number } {
    return {
      small: locatorCounts.filter(c => c <= 5).length,
      medium: locatorCounts.filter(c => c > 5 && c <= 15).length,
      large: locatorCounts.filter(c => c > 15 && c <= 30).length,
      giant: locatorCounts.filter(c => c > 30).length,
    };
  }

  private detectAntiPatterns(pageObjects: { name: string; locatorCount: number }[]): { type: string; severity: 'low' | 'medium' | 'high'; locations: string[] }[] {
    const antiPatterns: { type: string; severity: 'low' | 'medium' | 'high'; locations: string[] }[] = [];

    const giantPOs = pageObjects.filter(p => p.locatorCount > 30);
    if (giantPOs.length > 0) {
      antiPatterns.push({
        type: 'Giant Page Object',
        severity: 'high',
        locations: giantPOs.map(p => p.name),
      });
    }

    return antiPatterns;
  }

  private persistReport(report: PatternIntelligenceReport): void {
    const reportDir = join(process.cwd(), REPORT_DIR);
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = join(reportDir, `${report.id}.json`);
    writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf-8');

    const latestFile = join(reportDir, 'latest.json');
    writeFileSync(latestFile, JSON.stringify(report, null, 2), 'utf-8');

    info('PatternIntelligence', `Report saved to: ${reportFile}`);
  }

  private calculateAverageDepth(depthDistribution: Record<number, number>, totalCount: number): number {
    if (totalCount === 0) return 0;
    const sum = Object.entries(depthDistribution).reduce((acc, [depth, count]) => {
      return acc + parseInt(depth) * count;
    }, 0);
    return Math.round((sum / totalCount) * 10) / 10;
  }
}

function calculateAverageDepth(depthDistribution: Record<number, number>, totalCount: number): number {
  if (totalCount === 0) return 0;
  const sum = Object.entries(depthDistribution).reduce((acc, [depth, count]) => {
    return acc + parseInt(depth) * count;
  }, 0);
  return Math.round((sum / totalCount) * 10) / 10;
}

export function generatePatternSummary(report: PatternIntelligenceReport): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('           Repository Pattern Intelligence Report');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Report ID: ${report.id}`);
  lines.push(`Generated: ${new Date(report.generatedAt).toISOString()}`);
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                 LOCATOR PATTERN INTELLIGENCE');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  const loc = report.locatorIntelligence;
  lines.push(`  Total Locators: ${loc.totalLocators}`);
  lines.push(`  Strategy Breakdown:`);
  for (const [strat, pct] of Object.entries(loc.strategyPercentages)) {
    lines.push(`    - ${strat}: ${pct}%`);
  }
  lines.push(`  Chained Locators: ${loc.chainedLocatorDepth.count} (max depth: ${loc.chainedLocatorDepth.maxDepth})`);
  lines.push(`  Dynamic Selectors: ${loc.dynamicLocators.percentage}%`);
  lines.push(`  Duplicate Selectors: ${loc.duplicateSelectors}`);
  lines.push(`  Unstable Patterns: ${loc.unstablePatterns.percentage}%`);
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                 PAGE OBJECT INTELLIGENCE');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  const po = report.pageObjectIntelligence;
  lines.push(`  Total Page Objects: ${po.totalPageObjects}`);
  lines.push(`  Size Distribution: Small=${po.sizeDistribution.small}, Medium=${po.sizeDistribution.medium}, Large=${po.sizeDistribution.large}, Giant=${po.sizeDistribution.giant}`);
  lines.push(`  Average Locator Density: ${po.locatorDensity.averageLocatorsPerPO}`);
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                 MUTATION RISK INTELLIGENCE');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  const mut = report.mutationRiskIntelligence;
  lines.push(`  Overall Risk Score: ${mut.overallRiskScore}/100`);
  lines.push(`  Dynamic Selector Risk: ${mut.dynamicSelectorRisk}`);
  lines.push(`  Indirect Wrapper Risk: ${mut.indirectWrapperRisk}`);
  lines.push(`  Runtime Composition Risk: ${mut.runtimeCompositionRisk}`);
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                 REPLAY RISK INTELLIGENCE');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  const replay = report.replayRiskIntelligence;
  lines.push(`  Overall Risk Score: ${replay.overallRiskScore}/100`);
  lines.push(`  Modal-Heavy Flows: ${replay.modalHeavyFlows}`);
  lines.push(`  Dynamic Rendering Risks: ${replay.dynamicRenderingRisks}`);
  lines.push(`  Async Interaction Chains: ${replay.asyncInteractionChains}`);
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                 COMPATIBILITY TAXONOMY');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`  Tier: ${report.compatibilityTaxonomy.tier.toUpperCase()}`);
  lines.push('');
  if (report.compatibilityTaxonomy.supportedFeatures.length > 0) {
    lines.push('  Supported Features:');
    for (const f of report.compatibilityTaxonomy.supportedFeatures) {
      lines.push(`    ✓ ${f}`);
    }
  }
  if (report.compatibilityTaxonomy.riskFactors.length > 0) {
    lines.push('  Risk Factors:');
    for (const r of report.compatibilityTaxonomy.riskFactors) {
      lines.push(`    ⚠ ${r}`);
    }
  }
  if (report.compatibilityTaxonomy.recommendations.length > 0) {
    lines.push('  Recommendations:');
    for (const rec of report.compatibilityTaxonomy.recommendations) {
      lines.push(`    → ${rec}`);
    }
  }
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}