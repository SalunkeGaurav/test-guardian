# Core Entities

---

# FrameworkMap

Purpose:
Represents discovered framework structure.

Contains:
- framework type
- test files
- page objects
- locator references
- navigation flows
- dependencies

---

# Locator

Purpose:
Represents a discovered automation locator.

Fields:
- id
- framework
- selector
- selector type
- source file
- line number
- page object reference
- usage history
- confidence metadata

---

# ExecutionTrace

Purpose:
Represents a runtime execution session.

Fields:
- trace id
- test id
- execution timestamp
- navigation steps
- runtime metadata
- failures
- snapshots

---

# DomSnapshot

Purpose:
Represents DOM state at a specific execution point.

Fields:
- snapshot id
- DOM content
- URL
- viewport
- timestamp
- related trace id

---

# NavigationStep

Purpose:
Represents a replayable user interaction.

Fields:
- action type
- target locator
- input value
- timestamp
- execution result

---

# HealingProposal

Purpose:
Represents a proposed framework repair.

Fields:
- proposal id
- original locator
- proposed locator
- confidence score
- validation status
- explanation
- generated patch

---

# Patch

Purpose:
Represents a reversible framework modification.

Fields:
- patch id
- file path
- diff
- created timestamp
- validation metadata
- approval state

---