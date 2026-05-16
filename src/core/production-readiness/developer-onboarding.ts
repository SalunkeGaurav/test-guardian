/**
 * Developer Onboarding
 *
 * Generates deterministic onboarding reports, verifies minimal setup steps,
 * CLI discoverability, config clarity, report readability, and measures
 * operational complexity score.
 *
 * No Date.now(). No Math.random(). Deterministic only.
 */

import type { DeveloperOnboardingReport } from './types.js';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let onboardingCounter = 0;
function nextOnboardingId(): string {
  onboardingCounter++;
  return `onboarding-${onboardingCounter}`;
}

export class DeveloperOnboarding {
  analyze(projectRoot: string): DeveloperOnboardingReport {
    const reportId = nextOnboardingId();

    const minimalSetupSteps = this.countMinimalSetupSteps(projectRoot);
    const cliDiscoverability = this.measureCLIDiscoverability(projectRoot);
    const configClarity = this.measureConfigClarity(projectRoot);
    const reportReadability = this.measureReportReadability(projectRoot);
    const operationalComplexityScore = this.computeComplexityScore(
      minimalSetupSteps,
      cliDiscoverability,
      configClarity,
      reportReadability,
    );

    return {
      reportId,
      minimalSetupSteps,
      cliDiscoverability,
      configClarity,
      reportReadability,
      operationalComplexityScore,
      generatedAt: 0,
    };
  }

  private countMinimalSetupSteps(projectRoot: string): number {
    let steps = 0;

    const packageJsonPath = join(projectRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      steps++;
    }

    const tsconfigPath = join(projectRoot, 'tsconfig.json');
    if (existsSync(tsconfigPath)) {
      steps++;
    }

    const testguardianDir = join(projectRoot, '.testguardian');
    if (existsSync(testguardianDir)) {
      steps++;
    }

    return steps;
  }

  private measureCLIDiscoverability(projectRoot: string): { totalCommands: number; documentedCommands: number; discoverabilityScore: number } {
    const cliIndexPath = join(projectRoot, 'cli', 'index.ts');
    if (!existsSync(cliIndexPath)) {
      return { totalCommands: 0, documentedCommands: 0, discoverabilityScore: 0 };
    }

    const cliContent = readFileSync(cliIndexPath, 'utf-8');
    const commandMatches = cliContent.match(/\.command\(['"]([^'"]+)['"]\)/g) ?? [];
    const totalCommands = commandMatches.length;

    const descriptionMatches = cliContent.match(/\.description\(['"]([^'"]+)['"]\)/g) ?? [];
    const documentedCommands = descriptionMatches.length;

    const discoverabilityScore = totalCommands === 0 ? 0 : documentedCommands / totalCommands;

    return {
      totalCommands,
      documentedCommands,
      discoverabilityScore,
    };
  }

  private measureConfigClarity(projectRoot: string): { hasConfigFile: boolean; configDocumented: boolean; clarityScore: number } {
    const testguardianDir = join(projectRoot, '.testguardian');
    const hasConfigFile = existsSync(testguardianDir);

    const configPath = join(testguardianDir, 'config.json');
    const configDocumented = existsSync(configPath);

    let clarityScore = 0;
    if (hasConfigFile) clarityScore += 0.5;
    if (configDocumented) clarityScore += 0.5;

    return {
      hasConfigFile,
      configDocumented,
      clarityScore,
    };
  }

  private measureReportReadability(projectRoot: string): { reportsPersisted: boolean; reportsHumanReadable: boolean; readabilityScore: number } {
    const testguardianDir = join(projectRoot, '.testguardian');
    if (!existsSync(testguardianDir)) {
      return { reportsPersisted: false, reportsHumanReadable: false, readabilityScore: 0 };
    }

    const entries = readdirSync(testguardianDir);
    const reportsPersisted = entries.length > 0;

    const jsonReports = entries.filter((e) => e.endsWith('.json'));
    const textReports = entries.filter((e) => e.endsWith('.txt'));
    const reportsHumanReadable = textReports.length > 0 || jsonReports.length > 0;

    let readabilityScore = 0;
    if (reportsPersisted) readabilityScore += 0.5;
    if (reportsHumanReadable) readabilityScore += 0.5;

    return {
      reportsPersisted,
      reportsHumanReadable,
      readabilityScore,
    };
  }

  private computeComplexityScore(
    setupSteps: number,
    cliDiscoverability: { discoverabilityScore: number },
    configClarity: { clarityScore: number },
    reportReadability: { readabilityScore: number },
  ): number {
    const avgScore = (cliDiscoverability.discoverabilityScore + configClarity.clarityScore + reportReadability.readabilityScore) / 3;
    const setupPenalty = Math.min(setupSteps / 10, 1);
    return Math.round((1 - setupPenalty) * avgScore * 100) / 100;
  }
}
