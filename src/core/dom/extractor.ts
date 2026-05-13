/**
 * Locator Extractor
 *
 * Given an ElementNode, generates all possible locator strategies
 * that could target it. Used during analysis to discover locators
 * and during healing to propose alternatives.
 *
 * Strategies generated:
 * - id → "#value"
 * - class → ".value" (prefers unique classes)
 * - testid → "[data-testid=value]"
 * - aria-label → "[aria-label=value]"
 * - text → "text=value" (for elements with unique text)
 * - role → "[role=value]"
 * - tag + nth-child (fallback)
 *
 * TODO: implement extractStrategies(node: ElementNode): LocatorProposal[]
 */

export {};
