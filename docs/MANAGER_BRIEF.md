# Manager Brief — Changes, Risks, and Steps

This brief is written for managers to understand common change requests, impact, and the step-by-step actions a developer will take to implement them.

Project summary
- Interactive supply chain simulator: frontend (`client/`), backend (`server/`), Postgres DB.

Common manager requests and implementation steps

1) Change UI copy or labels
- Impact: Low. No backend changes.
- Steps: edit text in `client/src` components, run frontend, verify UI.
- Typical time: 10–30 minutes.

2) Change simulation parameter (e.g., depot capacity)
- Impact: Low–medium. May require backend validation and DB seed changes.
- Steps:
  - Update default parameter in `server` simulation code.
  - Update seed data if default needs to change.
  - Run local seed and verify UI behavior.
- Typical time: 30 minutes–2 hours.

3) Add a new depot or node type
- Impact: Medium. Data model and UI changes required.
- Steps:
  - Update DB schema if necessary (migration).
  - Update `server` logic to include new node type and relationships.
  - Update `client` UI to render new node and controls.
  - Add seed entries and test end-to-end flow.
- Typical time: 1–3 days depending on QA.

4) API contract change (endpoint or payload)
- Impact: High. Breaks clients unless coordinated.
- Steps:
  - Propose API changes, document contract, and bump versioning.
  - Implement backend changes and provide compatibility shims if needed.
  - Update frontend to the new contract and test.
  - Communicate change and roll out in a coordinated release.
- Typical time: 1–5 days depending on complexity.

Testing, rollout, and rollback
- Always run local seed and regression checks when changing simulation logic.
- For production releases, deploy to staging first and run a smoke test suite.
- Rollback: keep database migration scripts reversible. If not possible, perform data backups before migration.

Security & compliance notes
- Secrets: keep DB credentials out of source; use environment variables or secret managers.
- Access controls: restrict production DB access to authorized deploy pipelines and admin users.

Requesting a change
- Provide a short description, expected behavior, and acceptance criteria.
- If data changes are required, provide sample data and migration acceptance tests.
