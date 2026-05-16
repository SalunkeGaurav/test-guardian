# Compatibility Matrix

TestGuardian compatibility with testing frameworks, Node.js versions, and operating systems.

## Framework Compatibility

| Framework | Version | Status | Adapter | Notes |
|-----------|---------|--------|---------|-------|
| Playwright | >= 1.30.0 | **Stable** | Built-in | Full feature support |
| Playwright | 1.20.0 - 1.29.0 | Supported | Built-in | Minor feature limitations |
| Cypress | >= 12.0.0 | Experimental | `adapters/cypress/` | Basic test discovery |
| Cypress | 10.0.0 - 11.x | Experimental | `adapters/cypress/` | Limited support |
| Selenium | >= 4.0.0 | Experimental | `adapters/selenium/` | Java test files only |
| Selenium | 3.x | Not Supported | - | Legacy version |

## Node.js Compatibility

| Node.js Version | Status | Notes |
|-----------------|--------|-------|
| 22.x | **Supported** | Recommended |
| 20.x | **Supported** | LTS |
| 18.x | **Supported** | Minimum version |
| 16.x | Not Supported | End of life |
| 14.x | Not Supported | End of life |

## Operating System Compatibility

| OS | Status | Notes |
|----|--------|-------|
| Windows 10/11 | **Supported** | PowerShell, CMD |
| macOS 12+ | **Supported** | Terminal, iTerm2 |
| Ubuntu 20.04+ | **Supported** | Bash |
| Debian 11+ | **Supported** | Bash |
| CentOS 8+ | **Supported** | Bash |
| Alpine Linux | **Supported** | Requires glibc |

## Repository Structure Compatibility

| Structure | Status | Notes |
|-----------|--------|-------|
| Standard Playwright | **Supported** | `playwright.config.ts` |
| Page Object Model | **Supported** | POM pattern detection |
| Monorepo (pnpm) | **Supported** | Workspace detection |
| Monorepo (npm) | **Supported** | Workspace detection |
| Monorepo (yarn) | **Supported** | Workspace detection |
| Mixed Framework | Partial | Primary framework detected |
| Custom Structure | Partial | Marker-based detection |

## Feature Compatibility by Framework

| Feature | Playwright | Cypress | Selenium |
|---------|------------|---------|----------|
| Test Discovery | Yes | Yes | Yes |
| Locator Extraction | Yes | Partial | No |
| Page Object Detection | Yes | Partial | No |
| Navigation Extraction | Yes | Partial | No |
| Healing Pipeline | Yes | No | No |
| Patch Generation | Yes | No | No |
| Confidence Governance | Yes | No | No |
| Runtime Hardening | Yes | No | No |
| Corpus Execution | Yes | Partial | No |
| Stabilization Analysis | Yes | No | No |

## Corpus Validation Results

Based on validation of 105 real repositories:

| Category | Repos | Compatibility | Parser Survivability | Compile Stability |
|----------|-------|---------------|---------------------|-------------------|
| Enterprise And Clean | 8 | 99.7% | 100% | 99.7% |
| JS And Brittle POM | 12 | 100% | 100% | 100% |
| JS Legacy Brittle | 10 | 100% | 100% | 100% |
| Cucumber Hybrids | 6 | 100% | 100% | 100% |
| Beginner And Chaotic | 15 | 100% | 100% | 100% |
| Enterprise Giant POMs | 4 | 100% | 100% | 100% |
| Wrapper Heavy Abstractions | 3 | 100% | 100% | 100% |
| Chaotic Beginner Codegen | 25 | 98.8% | 100% | 98.8% |
| Monorepos Lite | 3 | 99.9% | 100% | 99.9% |
| Iframe Modal Flaky | 2 | 100% | 100% | 100% |
| **Overall** | **105** | **99.5%** | **100%** | **99.9%** |
