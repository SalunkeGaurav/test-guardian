/**
 * Analyzer-specific result types.
 *
 * These extend the domain models (src/models/) with analysis-specific
 * metadata like detection confidence and source locations.
 */

import type { FrameworkInfo, TestFile } from '../../models/framework.js';
import type { Locator } from '../../models/locator.js';
import type { NavigationStep } from '../../models/navigation.js';

/** Full result of an analysis pass. */
export interface AnalysisResult {
  framework: DetectedFramework;
  testFiles: TestFile[];
  locators: Locator[];
  pageObjects: PageObjectDefinition[];
  navigations: NavigationDefinition[];
  stats: AnalysisStats;
}

/** Framework detected in the project. */
export interface DetectedFramework {
  name: string;
  version: string | null;
  configPath: string | null;
  detectionSource: 'config' | 'dependency' | 'none';
}

/** A page object class or factory function. */
export interface PageObjectDefinition {
  name: string;
  filePath: string;
  /** Line number of the class/factory declaration. */
  line: number;
  /** Locators owned by this page object. */
  locators: Locator[];
  /** Methods that perform navigation. */
  navigationMethods: NavigationMethod[];
}

/** A navigation action extracted from test code. */
export interface NavigationDefinition {
  url: string | null;
  urlPattern: 'absolute' | 'relative' | 'variable' | 'unknown';
  filePath: string;
  line: number;
  /** Name of the test or method containing this navigation. */
  contextName: string;
}

/** A method that performs navigation within a page object. */
export interface NavigationMethod {
  name: string;
  line: number;
  navigations: NavigationDefinition[];
}

/** Summary statistics about the analysis. */
export interface AnalysisStats {
  totalFiles: number;
  totalTests: number;
  totalLocators: number;
  totalPageObjects: number;
  totalNavigations: number;
  analyzedAt: number;
  /** How long the analysis took (ms). */
  durationMs: number;
}

/** Schema for .testguardian/framework-map.json */
export interface FrameworkMap {
  framework: DetectedFramework;
  testFiles: Array<{
    path: string;
    relativePath: string;
    tests: Array<{ name: string; line: number; tags: string[] }>;
  }>;
  pageObjects: Array<{
    name: string;
    file: string;
    locators: Array<{ name: string; strategy: string; value: string }>;
  }>;
  totalTests: number;
  analyzedAt: number;
}
