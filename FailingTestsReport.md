# Failing Tests Report

**Generated**: 2026-05-15
**Test Suite**: vitest run
**Total Failures**: 14 tests across 2 test files

---

## Summary

| Test File | Failing Tests | Category |
|-----------|---------------|----------|
| tests/unit/analyzer-persist.test.ts | 13 | Integration Mismatch |
| tests/unit/healing-explainability.test.ts | 1 | Invalid Assumption / Boundary Logic |

---

## Failing Test Details

### 1. tests/unit/analyzer-persist.test.ts (13 failures)

#### Test: "writes all three output files"
- **Line**: 67
- **Failure**: `expected false to be true // Object.is equality`
- **Root Cause**: Test expects `framework-map.json`, `locators.json`, and `analysis-meta.json` to exist as separate files, but `FileStorage.saveAnalysis()` writes all data to a single file: `analysis.json`
- **Category**: Integration Mismatch (Test assumes file-per-artifact, implementation uses single-file consolidation)
- **Affected Modules**:
  - `src/core/storage/file.ts` (lines 219-233: saveAnalysis method)
  - `tests/unit/analyzer-persist.test.ts` (lines 62-70)
- **Architectural Severity**: Medium
  - Data persistence is functioning correctly
  - Output format differs from test expectations
  - No data loss - all information is stored in analysis.json

#### Tests 2-13: All ENOENT errors (secondary failures)
- **Pattern**: `ENOENT: no such file or directory, open '...\.testguardian\framework-map.json'`
- **Root Cause**: Cascading failure from first test - once first assertion fails, subsequent tests cannot read non-existent files
- **Affected Tests**:
  - "framework-map.json has correct schema version"
  - "framework-map.json contains navigations"
  - "framework-map.json has per-file locatorIds"
  - "framework-map.json testFiles are sorted deterministically"
  - "framework-map.json pageObjects are sorted deterministically"
  - "locators.json entries are sorted deterministically"
  - "locators.json deduplicates identical strategy:value pairs"
  - "locators.json has pageObjectName for PO-owned locators"
  - "locators.json has occurrence counts"
  - "analysis-meta.json has correct structure"
  - "analysis-meta.json preserves parser warnings"
  - "re-analysis produces identical output (deterministic)"

**Recommended Fix Scope**: The test expectations need to be updated to match the actual implementation's single-file output format, OR the implementation needs to be modified to write separate files if that is the intended design.

---

### 2. tests/unit/healing-explainability.test.ts (1 failure)

#### Test: "generates explanation for a high-confidence candidate"
- **Line**: 41
- **Failure**: `expected 'High-confidence; Overall rank: 0.7; S…' to contain 'Moderate-confidence'`
- **Root Cause**: Boundary condition in confidence labeling logic at line 121 of `explainability-engine.ts`:
  ```typescript
  const confidenceLabel = r.overall < 0.3 ? 'Low-confidence'
    : r.overall < 0.7 ? 'Moderate-confidence'
    : 'High-confidence';
  ```
  For `r.overall = 0.7`:
  - `0.7 < 0.3` is FALSE
  - `0.7 < 0.7` is FALSE (0.7 is not less than 0.7)
  - Returns `'High-confidence'`
- **Category**: Invalid Assumption (Test expects 0.7 to be "Moderate-confidence") or Boundary Logic Error (Implementation should use `<= 0.7`)
- **Affected Modules**:
  - `src/core/pipeline/explainability-engine.ts` (line 121)
  - `tests/unit/healing-explainability.test.ts` (line 41)
- **Architectural Severity**: Low
  - Affects only display label, not functional behavior
  - Confidence value of 0.7 is correctly passed through
  - No impact on healing decisions or validation

**Recommended Fix Scope**: Either:
1. Change test expectation to expect "High-confidence" (since 0.7 is at the high end), OR
2. Change implementation threshold to `<= 0.7` for "Moderate-confidence" (if 0.7 should be considered moderate)

---

## Architectural Risk Assessment

### Integration Mismatch (High Concern)
The analyzer-persist tests assume a file-per-artifact storage model but the implementation uses a consolidated single-file approach. This indicates:
- **Unclear specification**: No documented contract on file structure
- **Test drift**: Tests written against understanding of design, not actual implementation

### Boundary Logic (Low Concern)
The explainability confidence threshold is a minor UI/display issue. The core healing logic functions correctly regardless of the label.

---

## Recommendations

1. **analyzer-persist.test.ts**: Determine intended design - either update tests to read from `analysis.json` or add separate file writes to `FileStorage.saveAnalysis()`
2. **healing-explainability.test.ts**: Clarify confidence threshold semantics and align test with intended behavior
3. **Documentation**: Add storage layer contract documenting expected file outputs