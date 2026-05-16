/**
 * CI Integration
 *
 * Generates GitHub Actions integration examples and deterministic
 * CI execution plans. Supports validation-only, report-only,
 * strict governance, and full modes.
 *
 * No actual GitHub API usage. Deterministic only.
 */

import type { CIExecutionPlan, CIIntegrationReport, CIStep } from './types.js';

let planCounter = 0;
function nextPlanId(): string {
  planCounter++;
  return `ci-plan-${planCounter}`;
}

let reportCounter = 0;
function nextReportId(): string {
  reportCounter++;
  return `ci-report-${reportCounter}`;
}

export class CIIntegration {
  generateIntegrationReport(repoPath: string): CIIntegrationReport {
    const reportId = nextReportId();

    const executionPlans = this.generateExecutionPlans(repoPath);
    const githubActionsWorkflow = this.generateGitHubActionsWorkflow(repoPath, executionPlans);

    return {
      reportId,
      githubActionsWorkflow,
      executionPlans,
      supportedModes: ['validation-only', 'report-only', 'strict-governance', 'full'],
      generatedAt: 0,
    };
  }

  private generateExecutionPlans(repoPath: string): CIExecutionPlan[] {
    return [
      this.createValidationOnlyPlan(repoPath),
      this.createReportOnlyPlan(repoPath),
      this.createStrictGovernancePlan(repoPath),
      this.createFullPlan(repoPath),
    ];
  }

  private createValidationOnlyPlan(repoPath: string): CIExecutionPlan {
    const steps: CIStep[] = [
      {
        name: 'checkout',
        command: 'actions/checkout@v4',
        description: 'Checkout repository',
        dependsOn: [],
      },
      {
        name: 'setup-node',
        command: 'actions/setup-node@v4',
        description: 'Setup Node.js environment',
        dependsOn: ['checkout'],
      },
      {
        name: 'install',
        command: 'npm ci',
        description: 'Install dependencies',
        dependsOn: ['setup-node'],
      },
      {
        name: 'validate-repo',
        command: `npx testguardian validate-repo --path ${repoPath}`,
        description: 'Validate repository compatibility',
        dependsOn: ['install'],
      },
      {
        name: 'run-validation',
        command: `npx testguardian run --repo ${repoPath} --validate-only`,
        description: 'Run validation-only mode',
        dependsOn: ['validate-repo'],
      },
    ];

    return {
      planId: nextPlanId(),
      mode: 'validation-only',
      steps,
      estimatedDurationMs: 60000,
      generatedAt: 0,
    };
  }

  private createReportOnlyPlan(repoPath: string): CIExecutionPlan {
    const steps: CIStep[] = [
      {
        name: 'checkout',
        command: 'actions/checkout@v4',
        description: 'Checkout repository',
        dependsOn: [],
      },
      {
        name: 'setup-node',
        command: 'actions/setup-node@v4',
        description: 'Setup Node.js environment',
        dependsOn: ['checkout'],
      },
      {
        name: 'install',
        command: 'npm ci',
        description: 'Install dependencies',
        dependsOn: ['setup-node'],
      },
      {
        name: 'run-report',
        command: `npx testguardian run --repo ${repoPath} --report-only`,
        description: 'Run report-only mode',
        dependsOn: ['install'],
      },
    ];

    return {
      planId: nextPlanId(),
      mode: 'report-only',
      steps,
      estimatedDurationMs: 30000,
      generatedAt: 0,
    };
  }

  private createStrictGovernancePlan(repoPath: string): CIExecutionPlan {
    const steps: CIStep[] = [
      {
        name: 'checkout',
        command: 'actions/checkout@v4',
        description: 'Checkout repository',
        dependsOn: [],
      },
      {
        name: 'setup-node',
        command: 'actions/setup-node@v4',
        description: 'Setup Node.js environment',
        dependsOn: ['checkout'],
      },
      {
        name: 'install',
        command: 'npm ci',
        description: 'Install dependencies',
        dependsOn: ['setup-node'],
      },
      {
        name: 'run-strict',
        command: `npx testguardian run --repo ${repoPath} --strict-governance`,
        description: 'Run strict governance mode',
        dependsOn: ['install'],
      },
    ];

    return {
      planId: nextPlanId(),
      mode: 'strict-governance',
      steps,
      estimatedDurationMs: 90000,
      generatedAt: 0,
    };
  }

  private createFullPlan(repoPath: string): CIExecutionPlan {
    const steps: CIStep[] = [
      {
        name: 'checkout',
        command: 'actions/checkout@v4',
        description: 'Checkout repository',
        dependsOn: [],
      },
      {
        name: 'setup-node',
        command: 'actions/setup-node@v4',
        description: 'Setup Node.js environment',
        dependsOn: ['checkout'],
      },
      {
        name: 'install',
        command: 'npm ci',
        description: 'Install dependencies',
        dependsOn: ['setup-node'],
      },
      {
        name: 'analyze',
        command: `npx testguardian analyze --path ${repoPath}`,
        description: 'Analyze repository',
        dependsOn: ['install'],
      },
      {
        name: 'run-full',
        command: `npx testguardian run --repo ${repoPath}`,
        description: 'Run full execution mode',
        dependsOn: ['analyze'],
      },
      {
        name: 'production-readiness',
        command: `npx testguardian production-readiness --repo ${repoPath}`,
        description: 'Run production readiness check',
        dependsOn: ['run-full'],
      },
    ];

    return {
      planId: nextPlanId(),
      mode: 'full',
      steps,
      estimatedDurationMs: 120000,
      generatedAt: 0,
    };
  }

  private generateGitHubActionsWorkflow(repoPath: string, plans: CIExecutionPlan[]): string {
    const lines: string[] = [];

    lines.push('name: TestGuardian CI');
    lines.push('');
    lines.push('on:');
    lines.push('  push:');
    lines.push('    branches: [main]');
    lines.push('  pull_request:');
    lines.push('    branches: [main]');
    lines.push('');
    lines.push('jobs:');
    lines.push('  testguardian:');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('');
    lines.push('    steps:');

    for (const plan of plans) {
      lines.push(`    # Mode: ${plan.mode}`);
      for (const step of plan.steps) {
        lines.push(`    - name: ${step.name}`);
        lines.push(`      run: ${step.command}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
