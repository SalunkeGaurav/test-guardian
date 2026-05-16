# Current Goal

Deterministic healing candidate generation and ranking.

Build a healing engine that generates ranked locator repair candidates using historical locator intelligence, DOM comparison, survivability analysis, and deterministic scoring. Never modifies code directly.

---

# Completed Milestones

### Milestone 1: Replay-compatible execution modeling

Delivered:
- ReplayStep schema, canonical action types, NavigationSessionModel
- ReplayModelGenerator: ExecutionTrace → deterministic ReplaySession
- ReplaySessionPersister: corruption-safe writes to `.testguardian/replay/`
- Schema versioning (SCHEMA_VERSION = 1)
- 43 tests

---

### Milestone 2: DOM Intelligence Engine v1

Delivered:
- DOM normalization pipeline (whitespace, dynamic attrs, auto-IDs, timestamps, randomized classes)
- DOM comparison engine (two-tree diff, change classification, structural similarity)
- Locator survivability analysis (existence, movement, attribute renames, hierarchy changes)
- Deterministic similarity scoring (Jaccard + weighted composite)
- Snapshot indexer (lookup, pairing, comparison)
- 7 new models, 44 tests

---

### Milestone 3: Deterministic Healing Candidate Engine v1

Delivered:
- **7 deterministic strategies** (`strategies.ts`):
  - attribute-similarity — match by stable attributes (testid, aria-label, role, name)
  - structural-proximity — same tag/depth/parent matching
  - hierarchy-matching — grandparent structural pattern
  - sibling-relationship — sibling tag signature matching
  - text-proximity — word overlap in text content
  - accessibility-metadata — aria-* and role attribute matching
  - historical-selector-evolution — derives alternative selectors from the original element's own attributes
  - All strategies return confidence scores, matched node references, and matching attribute metadata

- **Deterministic ranking** (`ranker.ts`):
  - Weighted composite: survivability(30%) + structural(20%) + attribute(20%) + hierarchy(15%) + replay(15%)
  - Reproducible — same inputs always produce same ordering
  - Tiebreaker by strategy priority
  - Configurable confidence threshold (default 0.15)

- **HealingEngine** (`engine.ts`):
  - Full pipeline: survivability analysis → DOM comparison → similarity metrics → candidate generation → ranking → filtering → deduplication → explanation
  - Attaches replay context when available
  - Builds structural change explanations
  - Surfaces attribute change details in reasoning
  - Never applies patches, never modifies filesystem

- **Candidate schemas** (`models/healing-candidate.ts`):
  - HealingCandidate: id, locatorId, original/proposed expression, strategy, confidence, ranking, explanation, DOM evidence, replay ref
  - CandidateRanking: overall + 5 sub-scores
  - CandidateExplanation: why matched + structural changes + confidence breakdown + survivability reasoning
  - DomEvidence: original/matched paths, stable attribute matches, text content

- **53 tests** covering:
  - Engine: produces ranked candidates, handles missing locator, structure validation
  - Strategies: all 7 strategies produce candidates for their target scenarios
  - Ranking: descending order, deterministic, breakdown metadata
  - Low-confidence rejection: threshold filtering, default threshold, empty results
  - Duplicate prevention: dedup by expression, first-occurrence preservation
  - Broken locator recovery: id change with stable testid, class change with stable aria-label, structural move with preserved text
  - Moved element detection
  - Attribute rename detection
  - Deterministic reproducibility
  - Malformed DOM: empty trees, deep nesting (200 levels), missing attributes
  - Replay context integration
  - Candidate explanation structure

---

# In Scope (NEXT)

- deterministic replay execution (navigator.ts / step.ts — ReplayEngine contract)
- runtime diagnostics
- validation workflows

---

# Out Of Scope

- patch generation / filesystem modification
- AI reasoning / LLMs / semantic embeddings
- autonomous healing / repair application
- browser replay execution (out of scope for this milestone)
- cloud sync
- Selenium / Cypress implementation
- frontend dashboard
- autonomous crawling / execution

---

# Architecture Constraints

- no patch generation — candidates only
- no filesystem modification
- no browser replay execution in this module
- no AI reasoning or LLMs
- no semantic embeddings
- framework-agnostic core logic
- pure deterministic algorithms

---

# Session Context

If you are a new AI session reading this file:

**Where we are:**
- Phase 1 (Framework Analysis) — complete
- Phase 2 (Runtime Intelligence) — in progress
  - Replay-compatible modeling — complete
  - DOM Intelligence v1 — complete
  - Healing Candidate Engine v1 — complete (this milestone)
  - Deterministic replay execution — NEXT

**What to do next:**
- Implement executeStep in step.ts
- Implement executeSession in navigator.ts
- Wire up ReplayEngine contract (interfaces/replay.ts)
- Integrate DOM comparison + healing candidates into validation workflow

**What NOT to do:**
- Do NOT apply patches or modify files
- Do NOT add AI reasoning, LLMs, or embeddings
- Do NOT build browser automation — only use adapters
- Do NOT modify analyzer, tracer, validator, or patcher modules
- Do NOT rewrite existing modules
- Do NOT implement autonomous healing

---

# Success Criteria

The system can:
- generate repair candidates from 7 deterministic strategies
- rank candidates by weighted composite scores
- reject low-confidence candidates
- deduplicate proposals
- explain why each candidate matched and what changed structurally
- recover from broken locators (id/class changes, structural moves)
- handle malformed or deeply nested DOM
- produce deterministic, reproducible rankings

without AI.
