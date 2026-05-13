# Engineering Rules

These rules are mandatory.

---

# Rule 1
Deterministic logic always has priority over AI reasoning.

---

# Rule 2
AI may propose.
AI may never silently execute modifications.

---

# Rule 3
Framework-specific logic must never exist inside core modules.

---

# Rule 4
Every system operation must be observable.

This includes:
- prompts
- AI responses
- replay actions
- locator decisions
- validation results

---

# Rule 5
All repairs must be replayable.

No hidden state.
No unreproducible behavior.

---

# Rule 6
No direct cross-layer dependency leakage.

Example:
- core must not depend on adapters
- adapters may depend on interfaces

---

# Rule 7
Do not rewrite large modules using AI.

Changes must be:
- isolated
- incremental
- reviewable
- testable

---

# Rule 8
No autonomous agents.

No:
- autonomous filesystem execution
- autonomous framework patching
- autonomous shell execution
- autonomous credential usage

---

# Rule 9
No premature cloud infrastructure.

Focus first:
- local execution
- deterministic infrastructure
- observability

---

# Rule 10
No hidden magic.

Every decision must be explainable.

---