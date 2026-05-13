# AI Context Rules

Any AI working on this repository must follow these constraints.

---

# Project Goal

TestGuardian is a deterministic automation framework intelligence platform.

AI assists.
AI does not control.

---

# Current Milestone

Phase 1:
Deterministic Playwright framework analysis.

---

# Stack Ownership

## TypeScript
Owns:
- CLI
- framework adapters
- AST parsing
- execution tracing
- storage
- patch generation

## Python
Future only.
Not part of current milestone.

---

# Forbidden Behaviors

Do NOT:
- introduce autonomous agents
- introduce orchestration systems
- rewrite large modules
- bypass deterministic logic
- place framework-specific logic in core
- silently apply patches
- generate hidden side effects

---

# Required Behaviors

Always:
- preserve observability
- generate typed interfaces
- create incremental changes
- keep modules isolated
- add structured logging
- preserve replayability
- prioritize deterministic systems

---

# Development Style

Changes must be:
- modular
- reversible
- testable
- observable
- incremental

---