# Documentation index

Read these documents in order:

1. [imagevault_product_brief.txt](./imagevault_product_brief.txt) — original ImageVault business brief and source record.
2. [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) — normative product rules, resolved architecture decisions, data invariants, and definition of done.
3. [BUILD_GUIDE.md](./BUILD_GUIDE.md) — local setup, environment variables, production deployment, and smoke tests.
4. [API_REFERENCE.md](./API_REFERENCE.md) — exact HTTP authentication, payload, response, error, and role contracts.
5. [BACKEND_PLAN.md](./BACKEND_PLAN.md) — backend implementation sequence and phase exit criteria.
6. [FRONTEND_PLAN.md](./FRONTEND_PLAN.md) — frontend implementation sequence, UI states, PWA rules, and test matrix.
7. [PROGRESS_TRACKER.md](./PROGRESS_TRACKER.md) — live implementation and verification status.

## Precedence

The ImageVault product brief controls business intent. `PROJECT_OVERVIEW.md` resolves technical ambiguities in the brief for this repository. `API_REFERENCE.md` controls integration details. If code and documentation disagree, confirm the intended behaviour, then update code, shared types, tests, and documentation in the same change.

## Terminology

- The brief uses `organization_id`; code and API route names use British spelling (`organisation`, `organizationId`). JSON fields use `organizationId` to match the current application types.
- Brief roles `product_owner`, `admin`, and `user` map to API/database values `PRODUCT_OWNER`, `ADMIN`, and `USER`.
- “Quota” is the maximum number of completed images a User may own. “Used” is the number of completed Image rows.
- `Payment.transactionId` currently stores the Razorpay **order ID**, which is the idempotency key. The Razorpay payment ID is used for signature verification but is not currently persisted.

## Change checklist

When changing a requirement, update the product specification, API reference, Prisma schema/migration, validators, frontend types/client, tests, and setup/environment guidance as applicable. Never edit the original task brief to hide a design decision.
