# Architecture Strategy

TestGuardian uses a hybrid architecture.

Reason:
Browser automation ecosystems and AI ecosystems have different strengths.

---
# Language Boundary Rules

## TypeScript Responsibilities

The following systems MUST remain in TypeScript:

* framework adapters
* Playwright integration
* AST parsing
* execution tracing
* replay modeling
* DOM normalization
* DOM comparison
* locator survivability
* deterministic scoring
* storage systems
* patch generation
* CLI orchestration

Reason:
These systems are tightly coupled to browser automation runtimes and deterministic infrastructure workflows.

---

## Python Responsibilities (Future Only)

Python is reserved ONLY for:

* semantic embeddings
* vector similarity
* LLM orchestration
* ML ranking systems
* adaptive confidence models
* semantic DOM reasoning
* advanced AI-assisted healing

Python services must remain isolated from core runtime infrastructure.

---

## Forbidden Architecture Violations

Do NOT:

* mix Python into deterministic runtime layers
* create shared mutable runtime state across languages
* place browser automation hooks inside Python services
* move replay/tracing infrastructure into Python
* implement deterministic DOM infrastructure in Python

Core infrastructure remains TypeScript-first.


---

# Communication Strategy

Future communication options:
- local HTTP APIs
- gRPC
- message queues

NOT:
- mixed runtime imports
- shared mutable state

---

# Initial Technology Stack

## Core
- TypeScript
- Node.js

## Testing
- Vitest

## Parsing
- TypeScript AST
- Babel parser if needed later

## Browser Automation
- Playwright first

## Storage
- local filesystem
- JSON metadata

## Future AI Layer
- Python FastAPI

---

# Initial Framework Support Strategy

Phase 1:
- Playwright only

Phase 2:
- Selenium

Phase 3:
- Cypress

Important:
Architecture supports multi-framework expansion.
Implementation does not need parity initially.

---