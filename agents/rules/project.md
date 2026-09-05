# DealFlow360 Workspace Rules

Follow `AGENTS.md` as the primary project instruction.

Before coding, read:

- `docs/PROJECT.md`
- `docs/ARCHITECTURE.md`
- `docs/BUSINESS_RULES.md`
- relevant sections of `docs/API_CONTRACT.md`
- `docs/TASKS.md`

Work only on the assigned task.

DealFlow360 is a hackathon MVP, so prioritize:

1. Correct business rules
2. End-to-end functionality
3. Integration
4. Demo reliability
5. UX

Avoid unnecessary complexity.

Do not:

- refactor unrelated files
- introduce unnecessary frameworks
- duplicate existing services
- change API contracts silently
- hardcode required business-rule results
- commit secrets

Business logic must live in the appropriate backend/domain service.

Prefer deterministic, explainable implementations unless an AI/ML solution
is explicitly required.

Always test the implementation and inspect the final diff.