# Architecture Strategy

TestGuardian uses a hybrid architecture.

Reason:
Browser automation ecosystems and AI ecosystems have different strengths.

---

# TypeScript Responsibilities

TypeScript owns:
- CLI
- framework adapters
- Playwright integration
- Selenium integration
- Cypress integration
- AST parsing
- execution tracing
- filesystem operations
- runtime hooks
- patch generation
- framework analysis
- project scanning
- storage management

---

# Why TypeScript?

Reasons:
- strongest browser automation ecosystem
- native Playwright ecosystem
- strong AST tooling
- excellent CLI tooling
- shared browser/runtime language
- strong static typing support

---

# Python Responsibilities (Future)

Python owns:
- advanced semantic analysis
- embeddings
- ranking systems
- ML pipelines
- AI reasoning
- semantic DOM similarity
- advanced healing intelligence

Python services are NOT part of the initial milestone.

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