---
description: DealFlow360 hackathon project rules
alwaysApply: true
---

You are working on the DealFlow360 hackathon project.

Read `AGENTS.md` first.

Before implementing a task, read only the relevant project context:

- `docs/PROJECT.md`
- `docs/ARCHITECTURE.md`
- `docs/BUSINESS_RULES.md`
- `docs/API_CONTRACT.md` when APIs are involved
- `docs/TASKS.md` for ownership

Core principles:

1. Build a working MVP.
2. Preserve the existing architecture.
3. Modify only files needed for the assigned task.
4. Do not refactor unrelated code.
5. Do not invent new APIs if an existing contract exists.
6. Do not hardcode business-rule outcomes.
7. Keep business logic in backend/domain services.
8. Prefer deterministic, explainable logic over unnecessary ML.
9. Test business rules and edge cases.
10. Never commit secrets.

Do not automatically change architecture, dependencies, or shared interfaces.

Before finishing:
- run relevant tests/checks;
- inspect the diff;
- summarize changed files and integration implications.