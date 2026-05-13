import type { FrameworkInfo, TestFile } from '../../models/framework.js';
import type { Locator } from '../../models/locator.js';
import type { NavigationStep } from '../../models/navigation.js';

export interface AnalysisResult {
  framework: DetectedFramework;
  testFiles: TestFile[];
  locators: Locator[];
  pageObjects: PageObjectDefinition[];
  navigations: NavigationDefinition[];
  stats: AnalysisStats;
  parserWarnings: string[];
  locatorCounts: Record<string, number>;
}

export interface DetectedFramework {
  name: string;
  version: string | null;
  configPath: string | null;
  detectionSource: 'config' | 'dependency' | 'none';
}

export interface PageObjectDefinition {
  name: string;
  filePath: string;
  line: number;
  locators: Locator[];
  navigationMethods: NavigationMethod[];
}

export interface NavigationDefinition {
  url: string | null;
  urlPattern: 'absolute' | 'relative' | 'variable' | 'unknown';
  filePath: string;
  line: number;
  contextName: string;
}

export interface NavigationMethod {
  name: string;
  line: number;
  navigations: NavigationDefinition[];
}

export interface AnalysisStats {
  totalFiles: number;
  totalTests: number;
  totalLocators: number;
  totalPageObjects: number;
  totalNavigations: number;
  totalSkipped: number;
  analyzedAt: number;
  durationMs: number;
}

export interface FrameworkMap {
  schemaVersion: string;
  framework: DetectedFramework;
  testFiles: Array<{
    path: string;
    relativePath: string;
    tests: Array<{ name: string; line: number; tags: string[] }>;
    locatorIds: string[];
    navigationCount: number;
  }>;
  pageObjects: Array<{
    name: string;
    file: string;
    locators: Array<{ name: string; strategy: string; value: string }>;
  }>;
  navigations: NavigationDefinition[];
  totalTests: number;
  totalLocators: number;
  totalNavigations: number;
  analyzedAt: number;
}

export interface LocatorRecord {
  id: string;
  strategy: string;
  value: string;
  expression: string;
  sourceFile: string;
  sourceLine: number;
  context?: string;
  propertyName: string | null;
  pageObjectName: string | null;
  occurrences: number;
  verified: boolean;
}

export interface AnalysisMeta {
  analysisVersion: string;
  schemaVersion: string;
  analyzedAt: number;
  durationMs: number;
  fileCount: number;
  skippedCount: number;
  parserWarnings: string[];
}
