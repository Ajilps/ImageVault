# Backend Implementation Plan

## Goal and boundaries

Build a TypeScript/Express REST API that owns authorisation, Prisma/PostgreSQL persistence, tenant isolation, quota, private S3 access, notifications, Razorpay verification, and provisioning. NextAuth owns the browser session; the API issues the short-lived Bearer token that NextAuth carries.

The endpoint and payload contract is [API_REFERENCE.md](./API_REFERENCE.md). Do not change it silently: update API types, tests, frontend client, and that document together.

## Required structure

```text
backend/
  prisma/schema.prisma
  prisma/migrations/
  src/
    config/ controllers/ errors/ lib/ middleware/ routes/ services/ validators/
    app.ts
    server.ts
```

Controllers translate HTTP; services implement business rules; validators reject malformed input; Prisma access stays out of frontend code. Central middleware handles auth, roles, validation, not-found routes, and errors.

## Phase 1 — Foundation and configuration

1. Configure TypeScript ESM, Express, environment loading, Prisma, PostgreSQL adapter, CORS, Helmet, request logging, JSON limit, and graceful shutdown.
2. Expose unauthenticated `GET /health` returning `200 {"status":"ok"}`.
3. Validate required environment at startup and fail fast with a non-zero exit.
4. Mount the Razorpay webhook with `express.raw({type:"application/json"})` before `express.json()`.
5. Add global rate limiting and a stricter login rate limit.
6. Return all handled errors as `{error:{code,message}}`; do not expose stack traces in production.

Exit criteria: clean install, migration, build, test, startup, health response, invalid JSON response, and graceful SIGTERM all work.

## Phase 2 — Prisma schema and migrations

1. Define `UserRole`, `PaymentStatus`, and all models from the product specification.
2. Add unique constraints for User email, Organisation admin ID, Image object key, and Payment transaction/order ID.
3. Add indexes for organisation images, uploader images, user/organisation payments, and chronological notifications.
4. Commit forward-only migration files. Use a disposable database in development/tests; never reset valuable data without an approved backup.
5. Seed by idempotently ensuring the configured Product Owner at startup. Refuse startup if that email belongs to another role.

Exit criteria: a fresh database migrates and starts; running startup twice does not duplicate the Product Owner.

## Phase 3 — Authentication and RBAC

1. `POST /api/auth/login` normalises email, verifies bcrypt, returns safe user data and a short-lived JWT.
2. `GET /api/auth/me` reloads the current database user; never authorise solely from stale role claims.
3. `requireAuth` parses `Authorization: Bearer`, verifies signature/expiry, and rejects deleted users.
4. `authorize(...roles)` produces `403` for authenticated callers outside allowed roles.
5. Do not expose registration. Hash all provisioned/reset passwords.
6. Allow every authenticated role to change its own password only after verifying the current password.

Exit criteria: valid login/me, invalid credentials, missing/malformed/expired token, wrong role, and deleted-account token cases are tested.

## Phase 4 — Product Owner organisations

1. Implement list/create/update/delete routes from the API reference.
2. Create organisation and default Admin in one transaction with generated UUIDs and the configured default password.
3. Reject duplicate emails and validate every field.
4. Return member/image counts.
5. Delete dependent notifications, images, payments, members, and organisation in a transaction. Collect object keys and delete S3 objects after commit; retry/log storage cleanup failure rather than restoring deleted database rows.

Exit criteria: CRUD, atomic rollback, duplicate email, not found, cascade deletion, and Product Owner-only access are tested.

## Phase 5 — Admin user management

1. Derive organisation from the authenticated Admin.
2. List organisation members; create/update/delete only normal Users in that organisation.
3. Prevent cross-tenant access and Admin self-management through these routes.
4. Normalise email globally and hash optional password updates.
5. When deleting a User, transactionally delete dependent notifications, uploaded image metadata, payments, and the User; clean up storage objects after commit.
6. Allow Admins to reset normal User passwords and atomically add slots within environment-configured allocation and total-quota limits.

Exit criteria: CRUD, duplicate email, cross-tenant IDs, attempts to modify an Admin, and dependent deletion are tested.

## Phase 6 — Storage, uploads, quota, and gallery

1. Implement an S3 service compatible with AWS in production and MinIO locally. Use private buckets and short-lived signed PUT/GET URLs.
2. Generate keys server-side as `organisations/{orgId}/users/{userId}/{uuid}-{safeName}`.
3. Upload-URL route accepts only `image/*`, checks remaining quota, and returns object key, signed URL, expiry, and maximum bytes.
4. Completion verifies key prefix, S3 `HEAD` existence/content type/size, distinct valid organisation tags, unique object key, and quota again.
5. Create Image plus Notification in one transaction. Serialise or otherwise protect the quota check/create section so concurrent completions cannot exceed quota.
6. Gallery queries derive organisation from auth, apply optional tag filtering, and generate fresh download URLs.
7. Persist `PUBLIC/PRIVATE` visibility. Return public organisation images plus only the caller's private images; private uploads cannot tag or notify other members.
8. Let only the uploader create/revoke a high-entropy bearer link for a public image. Public retrieval returns minimal metadata and a fresh signed URL, while invalid/revoked/private tokens are indistinguishable.
9. Add a cleanup policy for abandoned pre-signed uploads.

Exit criteria: invalid type/size/key/tag, missing object, exhausted quota, duplicate completion, concurrent final-slot requests, signed URL expiry, gallery isolation, and filter cases are tested.

## Phase 7 — Notifications

1. Tagged upload connects only distinct tagged organisation members as receivers.
2. Untagged upload connects all organisation Admin/User members as receivers.
3. Query requires current caller among receivers and orders newest first.
4. Add authenticated Web Push subscribe/unsubscribe endpoints and a `PushSubscription` record keyed by User and unique endpoint. Encrypt/protect subscription key material as operational policy requires.
5. After the database transaction commits, enqueue best-effort push delivery to receivers. A push-provider failure must not roll back the completed upload/notification; remove subscriptions that return permanent expiry (`404`/`410`) and retry only transient failures.
6. Keep polling as fallback and do not claim durable unread support unless a per-user receipt/read timestamp is added.

Exit criteria: direct, broadcast, cross-organisation, non-receiver, ordering, subscription ownership, expired subscription cleanup, and push-failure isolation cases are tested.

## Phase 8 — Razorpay payments

1. Server constants define pack size 5 and price ₹100; input is only `slotPacks` from 1–20.
2. Create Razorpay order in paise and persist a `PENDING` Payment with rupee amount and unique order ID before returning Checkout data.
3. Verify Checkout HMAC and ownership in `/verify`.
4. Verify webhook HMAC against raw bytes; process paid/captured/failed events and acknowledge unrelated events without mutation.
5. Atomically condition success on `status=PENDING`, increment quota only when that transition wins, and return success for safe replays.

Exit criteria: provider unavailable, order creation, tampered signatures, wrong owner, unknown order, success/failure events, duplicate verify, duplicate webhook, and verify/webhook race are tested.

## Phase 9 — Test, observe, and deploy

1. Unit test validation, JWT/roles, storage ownership, quota, and HMAC helpers.
2. Integration test routes with an isolated PostgreSQL database and mocked S3/Razorpay boundaries.
3. Add structured production logs, request IDs, health monitoring, webhook outcome metrics, and alerts for repeated failures.
4. Build a production artifact, run migrations as a controlled release step, run the API under a process manager/container on Azure VM, and terminate TLS at a trusted proxy.
5. Restrict database/network access, use Azure/AWS workload credentials where possible, rotate secrets, and back up PostgreSQL.
6. Run the smoke checklist in [BUILD_GUIDE.md](./BUILD_GUIDE.md).

## Delivery sequence

Foundation → schema → authentication → organisations → users → uploads/gallery → notifications → payments → PWA integration → hardening/deployment. Each phase must build and test before the next begins.
