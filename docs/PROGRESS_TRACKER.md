# Implementation Progress Tracker

Last updated: 2026-08-03

Status values: **COMPLETE** (implemented and verified), **IN PROGRESS** (being changed now), **NOT STARTED** (required by the specification), and **BLOCKED** (needs external credentials/infrastructure or a product decision).

## Current milestone

Bring the existing frontend and backend into line with the updated documentation, move credentials and business limits into environment configuration, and verify critical paths with automated tests and production builds.

## Feature status

| Area | Status | Evidence / remaining work |
| --- | --- | --- |
| Documentation and API contract | COMPLETE | Product specification, API reference, build guide, frontend/backend plans are present in `docs/`. |
| Progress tracking | COMPLETE | This file records implemented, remaining, and externally blocked work. |
| Express foundation, health, errors, CORS, security headers | COMPLETE | Implemented in backend; final regression verification pending. |
| Product Owner bootstrap and credential login | COMPLETE | Values come from backend environment; no public registration. |
| Password management by role | COMPLETE | Every role can change its own password with current-password verification; Product Owners can reset linked Admin passwords and Admins can reset tenant-scoped User passwords. |
| NextAuth session and role redirects | COMPLETE | Credentials provider, JWT session, expiry handling, role homes, and protected-page redirects are implemented and tested. |
| Cross-role API route isolation | COMPLETE | Fixed shared `/api` router guards that previously rejected User requests as Admin-only; regression tests prevent global middleware interception. |
| Frontend page role policy | COMPLETE | One centralized, tested route policy covers Product Owner, Admin, User, shared, and profile pages. |
| Express 5 query validation | COMPLETE | Fixed `request.query` getter-only assignment failures on gallery endpoints; parsed query data now uses `request.validatedQuery` with valid/invalid regression tests. |
| Organisation CRUD and initial Admin | COMPLETE | Atomic creation and role restriction implemented. |
| Organisation/Admin relational integrity | COMPLETE | `adminId` is now a database foreign key and Product Owner responses include Admin details. |
| Admin User CRUD | COMPLETE | Tenant-scoped normal-User management implemented. |
| Admin User slot allocation | COMPLETE | Admins atomically add slots to normal Users in their organisation within environment-configured allocation and total-quota limits. |
| Configurable credentials and business limits | COMPLETE | Backend values are required in environment files; safe UI rules come from `/api/config/public`; test environments prove non-default values work. |
| Private signed image upload/download | COMPLETE | S3/MinIO signed PUT/GET flow exists. |
| Organisation-public and uploader-private images | COMPLETE | Visibility is persisted; gallery queries return organisation-public plus caller-owned private images, private uploads cannot tag/notify, and Admins cannot bypass uploader privacy. |
| Revocable public image links | COMPLETE | Uploaders can create, copy, open, and revoke unguessable links for their public images; anonymous access receives only a minimal payload and a short-lived signed download URL. Private images and images owned by another User cannot be shared. |
| Local MinIO bucket and CORS bootstrap | COMPLETE | Repaired the Compose-mounted initialization script, configured MinIO's server CORS origin from the environment, and added API startup storage readiness validation. |
| Quota concurrency protection | COMPLETE | Upload completion uses a serializable transaction with environment-configured conflict retries; live PostgreSQL race test remains in external/integration work. |
| Storage cleanup on User/organisation deletion | COMPLETE | Object keys are collected transactionally and S3 deletion is attempted after database commit without corrupting committed state. |
| Abandoned/orphan upload lifecycle cleanup | NOT STARTED | Configure an S3 lifecycle or scheduled cleanup for signed uploads that are never completed. |
| Tagged and broadcast database notifications | COMPLETE | Receiver scoping and gallery-linked notifications exist. |
| Notification polling/badge | COMPLETE | Runtime-configured polling pauses while hidden and refreshes on visibility; badge is labelled as total/recent semantics. |
| Web Push subscriptions and delivery | COMPLETE | Prisma model/migration, scoped endpoints, VAPID delivery, expired-subscription cleanup, UI controls, worker push/click handling, and polling fallback implemented. Live delivery is externally blocked. |
| Razorpay order/verify/webhook idempotency | COMPLETE | Server-side verification and atomic pending-to-success transition exist. |
| Configurable payment packs and Checkout UX | COMPLETE | Pack size, price, and maximum come from API config; dismissal and verification states are distinct. |
| PWA manifest, service worker, offline fallback | COMPLETE | Core files exist; caching remains private-safe. |
| PWA install icons | COMPLETE | 192px, 512px, and maskable PNG assets are declared in the manifest. |
| Token/session expiry alignment | COMPLETE | Backend returns token expiry; NextAuth rejects expired API tokens and client API `401` events end the session. |
| Gallery filtering and preview | COMPLETE | Filter options come from all organisation members and images open in an accessible modal preview. |
| Frontend accessibility and responsive states | IN PROGRESS | Core responsive UI and updated state labels exist; a complete keyboard/screen-reader audit is still required. |
| ShadCN component adoption | NOT STARTED | Current interface uses project-local styled components; migrate to ShadCN if strict component-library compliance is required. |
| Backend automated tests | IN PROGRESS | Twenty-two configuration, endpoint-protection, validation, visibility/share-policy, Express 5 compatibility, middleware-isolation, and role-matrix tests pass; broader PostgreSQL/S3/Razorpay integration coverage and >80% critical coverage remain. |
| Frontend automated tests | IN PROGRESS | Thirty-two role-policy, UI, runtime-config, auth-expiry, direct-upload, password, slot-allocation, visibility, and public-share contract tests pass; push, payment, polling, and full route-flow coverage remain. |
| Local test/lint/build verification | COMPLETE | Prisma validation, backend tests/build, frontend tests/lint/build all pass. |
| Live AWS/Azure/Razorpay/Web Push verification | BLOCKED | Requires deployment infrastructure and real/test provider credentials supplied outside source control. |

## Verification log

| Check | Status | Result |
| --- | --- | --- |
| Backend tests | COMPLETE | 22/22 passed, including all role combinations, endpoint protection, password/slot validation, image visibility/share policy, shared-router isolation, and getter-only query validation. |
| Backend TypeScript build | COMPLETE | `tsc` passed. |
| Frontend tests | COMPLETE | 32/32 passed across 6 suites, including the protected-page role matrix and password, slot-allocation, visibility, public-sharing, and direct-storage upload contracts. |
| Signed MinIO upload smoke test | COMPLETE | Browser-style CORS preflight returned 204; signed PNG PUT returned 200, HEAD verification passed, and the temporary object was deleted. |
| Frontend lint | COMPLETE | ESLint passed with no findings. |
| Frontend production build | COMPLETE | Next.js 16 production build generated all routes successfully. |
| Prisma schema/migration review | COMPLETE | `prisma validate` passed; all four migrations are applied locally, including image visibility/indexing and revocable public-share tokens. |
| Documentation/code consistency | COMPLETE | API/setup/readme files reflect runtime config, Push, expiry, and migration changes. |
| Local MinIO readiness | COMPLETE | `minio-init` creates the private bucket and applies browser PUT/GET/HEAD CORS before upload testing. |
| Password/slots/privacy smoke test | COMPLETE | Temporary isolated records verified both password paths, atomic slot allocation, and private-image isolation for Admin and two Users; cleanup completed. |
| Public image-link smoke test | COMPLETE | A public uploader-created link returned 200 anonymously with a safe payload; another User received 404 when managing it, a private image was rejected with 400, revocation returned 204, and the revoked link returned 404. Temporary records were removed. |

## External setup still required by the operator

- A PostgreSQL database URL.
- Docker Compose provisions the private local MinIO bucket and its CORS policy. Production still requires an AWS S3 bucket/identity and equivalent CORS configuration.
- Razorpay test/live key ID, key secret, and webhook secret.
- A generated VAPID public/private key pair and contact subject.
- Azure VM/database and Vercel deployment configuration for live verification.
