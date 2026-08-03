# Image Upload and Payment System — Product Specification

## Document status

This document translates `intern_task_brief.txt` into an implementation-ready specification. The brief is the business source of truth. Where it is ambiguous, this repository uses the decisions in **Architecture decisions** below. API payloads are defined in [API_REFERENCE.md](./API_REFERENCE.md), local and production setup in [BUILD_GUIDE.md](./BUILD_GUIDE.md), and implementation order in the backend and frontend plans.

## Product goal

Build an installable, mobile-friendly PWA in which organisations share images. A normal User receives five free uploads. Additional quota is sold through Razorpay in packs of five uploads for ₹100. Images are stored privately in AWS S3; PostgreSQL stores identities, organisations, image metadata, quota, payments, tags, and notifications.

## Architecture decisions

The brief names both “Next.js API routes” and an Azure-hosted Node.js backend. This repository resolves that conflict as follows:

| Concern | Decision |
| --- | --- |
| Web application | Next.js App Router, TypeScript, Tailwind CSS, ShadCN UI, deployed to Vercel |
| Browser authentication | NextAuth credentials provider with a JWT session |
| Business API | Separate TypeScript/Express service deployed to an Azure VM |
| API authentication | Short-lived Bearer JWT issued by Express and carried by the NextAuth session |
| Database | Prisma with Azure Database for PostgreSQL |
| Object storage | Private AWS S3 bucket in production; MinIO only for local development |
| Payments | Razorpay Orders, Checkout verification, and signed webhooks |
| Notifications | Database-backed notifications with polling fallback and Web Push support |

There is one browser login flow: NextAuth calls the Express login endpoint and keeps its access token in the NextAuth JWT/session. Do not add public registration or a second unrelated session store.

Credentials login is the required provider because accounts are provisioned by higher roles. The brief mentions OAuth as an option, but it is outside the minimum contract; adding it requires explicit account-linking rules so an OAuth identity cannot bypass organisation provisioning.

The brief was written for Next.js 14; this repository is already pinned to Next.js 16. Use the committed lockfile/version unless the project owner explicitly requires the older major. Re-run the full auth, PWA, and production-build test matrix after any framework-major change.

## Roles and authorisation matrix

| Capability | Product Owner | Admin | User |
| --- | :---: | :---: | :---: |
| Manage organisations | Yes | No | No |
| Create the initial organisation Admin | Automatically with organisation | No | No |
| Manage organisation Users | No | Own organisation only | No |
| View organisation gallery | No | Own organisation only | Own organisation only |
| Upload and tag images | No | No | Yes |
| View notifications | No | Own organisation/relevant notifications | Own organisation/relevant notifications |
| Buy quota and view own payments | No | No | Yes |
| Change own password | Yes | Yes | Yes |
| Reset subordinate account password | Organisation Admin only | Own organisation Users only | No |
| Allocate additional User slots | No | Own organisation Users only | No |
| Create/revoke public image link | No | No | Own public uploads only |

Rules that must hold on both the UI and API:

- The configured Product Owner is created at API startup and has no organisation.
- Every Admin and User belongs to exactly one organisation. An organisation has one default Admin.
- Product Owners never manage Users directly. Admins can create, edit, or delete only `USER` accounts in their own organisation and cannot delete themselves.
- Gallery, member, tag, notification, and payment queries are scoped from the authenticated identity, never from a client-supplied organisation ID.
- The API is the final security boundary. Hiding navigation in the UI is not authorisation.

## Functional requirements

### Authentication and accounts

- Public sign-up is disabled. Credentials are provisioned through the configured Product Owner, organisation creation, and Admin user creation.
- Passwords are hashed with bcrypt and are never returned by the API.
- The default password is a bootstrap mechanism. Every authenticated role can change its own password after confirming the current password. Product Owners can reset linked organisation Admin passwords, and Admins can reset normal User passwords in their own organisation.
- Successful login redirects Product Owner to `/organisations`, Admin to `/users`, and User to `/gallery`.
- Expired or invalid backend tokens end the frontend session and return the user to `/login`.

### Organisation management

- Product Owner can list, create, edit, and delete organisations.
- Creation requires organisation name, logo URL, address, phone, and initial Admin name/email. `logoUrl` must be a stable browser-renderable HTTPS URL; when hosted in S3, serve it through a deliberately public/CDN logo path or add a dedicated signed-logo response. Do not pass it through the quota-controlled User image endpoint.
- Organisation and Admin creation are atomic; duplicate Admin email fails the entire operation.
- List results include member and image counts.
- Deletion requires a confirmation UI and removes the organisation's database records. Production code must also remove associated S3 objects or retain them under a documented lifecycle policy.

### User management

- Admin can list, create, edit, and delete normal Users in their organisation.
- Admin can atomically allocate additional image slots within environment-configured per-action and per-User limits.
- Email is unique across the whole system and comparisons are case-normalised.
- New Users start with an image quota of five.
- The Admin table displays name, email, quota, upload count, and creation date.

### Image upload, gallery, and quota

1. User chooses one image, selects organisation-public or uploader-private visibility, and optionally tags organisation members on a public image.
2. Frontend validates `image/*` and the configured size limit, then requests a short-lived upload URL.
3. Browser uploads directly to S3/MinIO using `PUT` and the exact declared `Content-Type`.
4. Frontend confirms the returned object key with the API.
5. API verifies object ownership, existence, content type, size, tag membership, and quota again inside the completion transaction.
6. API creates image metadata and its notification atomically, then the frontend refreshes quota and gallery.

Quota means the count of completed image records, not attempted uploads or raw S3 objects. `remaining = max(imageQuota - completedUploads, 0)`. A completed upload consumes one slot. Requesting a URL does not consume quota. The completion endpoint must prevent duplicate object keys and must remain safe under concurrent requests.

All Admins and Users in an organisation can view `PUBLIC` images. A `PRIVATE` image is returned only to its uploader, including when the caller is an Admin. Private images cannot tag or notify other members. `taggedUserId` optionally filters authorised public images containing that member as a tag. Download URLs are short-lived and must be refreshed through the API rather than persisted by clients. “Public” is organisation visibility only; the underlying S3/MinIO bucket remains private.

The uploader of a `PUBLIC` image can additionally create a revocable, high-entropy bearer link for access without an account. Anyone holding the active application link can view safe image metadata and a newly signed storage URL. Other organisation members cannot obtain the token through gallery responses, private images can never be linked, and revocation immediately disables application-level access. Public links must not expose object keys, organisation IDs, tags, or storage credentials.

### Notifications

- An upload with tags creates one notification addressed only to the distinct tagged organisation members.
- An upload without tags creates one broadcast notification addressed to every Admin/User in the organisation, including the uploader unless product requirements later exclude them.
- A caller sees only notifications where they are a receiver.
- Polling on page load and at a modest interval is the reliable fallback. To satisfy the brief's push-support requirement, the service worker also handles Web Push, the API stores per-user subscriptions, and notification creation queues best-effort push delivery.
- The badge-update test may be satisfied by refreshing the visible count; durable unread state requires a future per-user `readAt` receipt model.

### Payments

- One pack is five upload slots and costs ₹100. A request may buy 1–20 packs.
- Amount sent to Razorpay is in paise; amount stored in `Payment.amount` is in rupees.
- An order creates a local `PENDING` payment before Checkout starts.
- Checkout verification uses `HMAC-SHA256(orderId|paymentId, keySecret)`.
- Webhooks use the exact raw request bytes and `X-Razorpay-Signature` with the webhook secret.
- `payment.captured` and `order.paid` mark success; `payment.failed` marks a still-pending payment failed.
- Transition from `PENDING` to `SUCCESS` and incrementing quota occur atomically and at most once. Replayed verification/webhook calls must not add quota twice.
- Never trust client-supplied price, slot count, user ID, organisation ID, or success status.

## Data model and invariants

| Model | Required fields and relationships |
| --- | --- |
| `User` | UUID, name, globally unique lowercase email, password hash, `PRODUCT_OWNER/ADMIN/USER`, quota default 5, nullable organisation only for Product Owner, created timestamp |
| `Organisation` | UUID, name, logo URL, address, phone, unique default Admin ID, created timestamp; owns members, images, payments, notifications |
| `Image` | UUID, stable private storage URI, unique object key, uploader, organisation, `PUBLIC/PRIVATE` visibility, nullable unique public-share token, zero or more tagged Users, created timestamp |
| `Payment` | UUID, User, organisation, amount in rupees, slots purchased, unique Razorpay order ID in `transactionId`, `PENDING/SUCCESS/FAILED`, created timestamp |
| `Notification` | UUID, organisation, sender, image, one or more receiver Users, message, created timestamp |
| `PushSubscription` | UUID, User, unique browser endpoint, P-256 public key, auth secret, created/updated timestamps |

The database schema should enforce unique email, object key, transaction ID, and organisation Admin ID. Service code must enforce role/organisation consistency because the current relational schema cannot express every role invariant as a database constraint.

## Security and reliability requirements

- Keep storage buckets private; never expose AWS/MinIO credentials to the browser.
- Validate all bodies, path parameters, and queries. Return a consistent `{ "error": { "code", "message" } }` envelope.
- Use TLS in production, strong secrets, restricted CORS origins, Helmet, request-size limits, login/API rate limits, and no secrets in source control or logs.
- Configure Razorpay webhook routing before the JSON parser so signature verification sees raw bytes.
- Use database transactions for organisation/Admin creation, image/notification creation, destructive cascades, and payment/quota completion.
- Log request correlation information and payment webhook outcomes without logging credentials, tokens, signatures, or full payment payloads.
- Orphaned uploads and deleted-record objects need an S3 lifecycle/cleanup job; database deletion alone is not sufficient storage cleanup.

## Required pages

| Route | Role | Required content |
| --- | --- | --- |
| `/login` | Public | Credentials form and validation errors |
| `/organisations` | Product Owner | Organisation table and create/edit/delete dialogs |
| `/users` | Admin | User CRUD table and quota/upload counts |
| `/dashboard` | Admin/User | Organisation summary; User quota/purchase call-to-action |
| `/gallery` | Admin/User | Organisation images, tag filter, preview |
| `/upload` | User | File picker, member multi-select, quota state, progress/errors |
| `/payments` | User | Pack selector, Razorpay Checkout, payment history |
| `/notifications` | Admin/User | Relevant recent notifications |
| `/profile` | Authenticated | Identity, role, and organisation information |

## Definition of done

The application is complete only when:

- All role and tenant boundaries above are enforced by integration tests (`401` unauthenticated, `403` wrong role).
- The five-free-upload boundary, concurrent completion, payment signature failure, and replayed payment success are tested.
- Tagged and untagged notification visibility and gallery tag filtering are tested.
- Frontend tests cover login validation, role redirects/guards, quota exhaustion, upload sequence, payment initiation, notification count refresh, and tag filtering.
- Business-critical quota, payment webhook, and access-control paths exceed 80% coverage.
- The PWA has a valid manifest, icons, registered service worker, offline fallback, Web Push subscribe/unsubscribe and notification handling, responsive accessible UI, and installability verification.
- Frontend builds for Vercel; backend builds and runs on Azure VM; production CORS, PostgreSQL, S3, Razorpay, and secrets are configured; health checks pass.
- Setup, environment variables, migrations, API contracts, webhook configuration, deployment, rollback, and smoke tests are documented.
