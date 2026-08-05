# Build, Run, and Deploy Guide

## Prerequisites

- Node.js 20.9 or newer and npm
- PostgreSQL 15 or newer (local or Azure)
- An S3-compatible MinIO service and bucket for local uploads, or AWS S3
- Razorpay test credentials for payment work
- Two terminals; backend and frontend have separate `package.json` files

Use Razorpay test mode and non-production data during development. Never commit `.env`, credentials, tokens, database dumps, or private keys.

## 1. Backend environment

From `backend`, install dependencies and create an ignored `.env` from `.env.example`.

```bash
cd backend
npm ci
cp .env.example .env
```

Set at least:

| Variable | Required | Meaning |
| --- | --- | --- |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `PORT` | Yes | API listening port |
| `DATABASE_URL` | Yes | PostgreSQL connection URL, including desired schema |
| `CORS_ORIGIN` | Yes | Comma-separated exact frontend origins; no wildcard with credentials |
| `JWT_ACCESS_SECRET` | Yes | Long random signing secret; rotate deliberately because rotation logs users out |
| `JWT_ACCESS_EXPIRES_IN` | Yes | Backend token lifetime such as `15m` |
| `BCRYPT_SALT_ROUNDS` | Yes | Password hashing cost |
| `DEFAULT_PRODUCT_OWNER_NAME` | Yes | Bootstrap owner display name |
| `DEFAULT_PRODUCT_OWNER_EMAIL` | Yes | Bootstrap owner login; globally unique |
| `DEFAULT_ACCOUNT_PASSWORD` | Yes | Initial Product Owner password within configured bounds; other accounts receive generated passwords |
| `DEFAULT_IMAGE_QUOTA` | Yes | Initial quota assigned to newly provisioned accounts |
| `SLOT_PACK_SIZE` | Yes | Upload slots added by one payment pack |
| `SLOT_PACK_PRICE_INR` | Yes | Rupee price of one pack |
| `MAX_SLOT_PACKS_PER_ORDER` | Yes | Maximum packs accepted in one order |
| `MAX_ADMIN_SLOT_ALLOCATION` | Yes | Maximum slots an Admin can add in one allocation |
| `MAX_USER_IMAGE_QUOTA` | Yes | Maximum resulting quota for one User |
| `MAX_TAGS_PER_IMAGE` | Yes | Maximum tagged member IDs on one upload |
| `PASSWORD_MIN_LENGTH` / `PASSWORD_MAX_LENGTH` | Yes | Account password validation bounds |
| `NAME_MAX_LENGTH`, `EMAIL_MAX_LENGTH`, `ADDRESS_MAX_LENGTH` | Yes | Text validation bounds |
| `PHONE_MIN_LENGTH` / `PHONE_MAX_LENGTH` | Yes | Phone validation bounds |
| `URL_MAX_LENGTH`, `FILE_NAME_MAX_LENGTH`, `OBJECT_KEY_MAX_LENGTH` | Yes | URL/storage validation bounds |
| `JSON_BODY_LIMIT_BYTES` | Yes | Express JSON request limit |
| `LOGIN_RATE_LIMIT_*`, `API_RATE_LIMIT_*` | Yes | Rate-limit windows and request counts |
| `RATE_LIMIT_MAX_TRACKED_CLIENTS` | Yes | In-memory limiter cleanup threshold |
| `QUOTA_TRANSACTION_MAX_RETRIES` | Yes | Serializable upload-completion retry count |
| `NOTIFICATION_POLL_INTERVAL_MS` | Yes | Polling interval returned to the frontend |
| `STORAGE_PROVIDER` | Yes | `minio` locally or `s3` in production |
| `S3_PUBLIC_ENDPOINT` | MinIO via Docker/Tunnel | Browser-visible MinIO endpoint used in signed URLs |
| `S3_PRESIGN_EXPIRES_IN` | Yes | Signed PUT/GET lifetime in seconds |
| `MAX_FILE_SIZE` | Yes | Maximum image bytes |
| `PUBLIC_SHARE_TOKEN_BYTES` | Yes | Entropy bytes used for revocable public image links; minimum 16 |
| `RAZORPAY_KEY_ID` | Payments | Public Checkout key ID returned by order endpoint |
| `RAZORPAY_KEY_SECRET` | Payments | Server-side order/Checkout signing secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhooks | Independent webhook signing secret |
| `VAPID_PUBLIC_KEY` | Push | Web Push application-server public key |
| `VAPID_PRIVATE_KEY` | Push | Server-only Web Push private key |
| `VAPID_SUBJECT` | Push | Contact URI such as `mailto:ops@example.com` |

For MinIO also set `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_BUCKET`, `MINIO_ACCESS_KEY`, and `MINIO_SECRET_KEY`. `S3_PUBLIC_ENDPOINT` must be the endpoint reachable by the browser (`http://localhost:9000` locally or the HTTPS storage Tunnel hostname when deployed). `docker compose -f docker/Docker-compose.yml up --build -d` builds the multi-stage backend image, applies Prisma migrations, creates the private bucket, and starts the API after its dependencies are ready. MinIO CORS uses `CORS_ORIGIN`. If MinIO is managed separately, create the bucket and configure the equivalent allowed origin before starting the API; the API fails its startup readiness check when the bucket is unavailable.

For AWS set `S3_BUCKET` and `AWS_REGION`. Prefer an Azure VM managed/workload identity or tightly scoped AWS role. If static keys are unavoidable, inject `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` through the deployment secret store. The principal needs only the required object operations on the application prefix/bucket. Keep Block Public Access enabled and configure bucket CORS for the deployed frontend origin.

## 2. Database and backend

To run the complete local backend stack in containers:

```bash
cp backend/.env.example backend/.env
cp docker/.env.example docker/.env
docker compose -f docker/Docker-compose.yml up --build -d
docker compose -f docker/Docker-compose.yml ps
curl http://localhost:4000/health
```

The one-shot `backend-migrate` service must complete successfully before `backend` starts. For a Cloudflare Tunnel deployment, set `S3_PUBLIC_ENDPOINT=https://storage.<your-domain>` and `CORS_ORIGIN=https://<your-vercel-domain>` in `docker/.env`, then route the API hostname to `http://localhost:4000` and storage hostname to `http://localhost:9000`.

For backend development outside Docker, point `DATABASE_URL` at a fresh development database, then:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm test
npm run build
npm run dev
```

The API connects to PostgreSQL and idempotently provisions `DEFAULT_PRODUCT_OWNER_EMAIL` on startup. Confirm `GET http://localhost:4000/health` returns `{"status":"ok"}`, then log in with the configured owner email/password.

Use `npx prisma migrate dev --name <description>` only while authoring a new development migration. Review and commit the generated SQL. Use `prisma migrate deploy` in CI/production. Never use `migrate reset` against a database containing valuable data.

## 3. Frontend environment and startup

Create `frontend/.env.local`:

```env
API_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-long-random-secret
```

The browser obtains payment, validation, polling, and VAPID public configuration from `GET /api/config/public`; do not duplicate those values in frontend environment files.

Then:

```bash
cd frontend
npm ci
npm test -- --runInBand
npm run lint
npm run build
npm run dev
```

Open `http://localhost:3000`. `API_URL` must be reachable by the Next.js/NextAuth server runtime. The browser uses the same-origin `/api/backend` bridge and never receives the backend JWT. Do not put backend JWT, Razorpay key secret, AWS secret, or webhook secret in a `NEXT_PUBLIC_*` variable.

## 4. Razorpay test setup

1. Put test-mode key ID/secret in the backend environment.
2. Create a separate webhook secret and configure the Razorpay test webhook URL as a publicly reachable HTTPS tunnel/API URL ending `/api/payments/webhook`.
3. Subscribe to `payment.captured`, `order.paid`, and `payment.failed`.
4. Keep the webhook body raw; proxies must not rewrite it.
5. Test successful Checkout, invalid signatures, failed payment, repeated webhook delivery, and the race between frontend verification and webhook delivery. Quota must increase once.

## 5. Local end-to-end smoke test

1. Log in as Product Owner; create an organisation and initial Admin; edit the organisation.
2. Log in as Admin; create two Users; confirm Users outside this organisation cannot be accessed.
3. Log in as User A; upload five valid images and confirm quota reaches `5/5`.
4. Confirm a sixth signing/completion attempt is blocked.
5. Upload with User B tagged and confirm only User B receives the direct notification.
6. Upload without tags after obtaining quota and confirm all organisation members receive the broadcast.
7. Verify Admin/User gallery visibility and tag filtering; verify a different organisation cannot see the images.
8. Purchase one test pack; confirm payment history is successful and quota becomes 10. Replay verification/webhook and confirm it stays 10.
9. Subscribe a supported browser to push, trigger direct/broadcast notifications, test notification click routing, then unsubscribe. Confirm polling still works when permission is denied.
10. Check login/role failures return `401`/`403`, mobile navigation works, the app installs, and offline navigation reaches the fallback.

## 6. Production deployment

### Database

Create Azure Database for PostgreSQL with private networking/firewall rules, TLS-required connections, automated backups, monitoring, and a least-privilege application user. Run reviewed migrations once per release before switching application traffic. Record backup/restore and rollback procedures.

### Storage

Create a private S3 bucket in the chosen region with encryption, Block Public Access, lifecycle cleanup for abandoned objects, restricted CORS, and a least-privilege role. Do not persist signed URLs; persist object keys/private URIs.

### Backend on Azure VM

1. Provision supported Node.js, a non-root service user, firewall rules, and HTTPS reverse proxy/load balancer.
2. Inject production environment secrets from a secret manager; set `NODE_ENV=production`, exact Vercel `CORS_ORIGIN`, Azure `DATABASE_URL`, `STORAGE_PROVIDER=s3`, S3 configuration, and live Razorpay values.
3. Run `npm ci`, `npx prisma generate`, `npm run build`, and the controlled `prisma migrate deploy` release step.
4. Run `node dist/server.js` under systemd/container supervision with restart policy, resource limits, log shipping, and graceful SIGTERM.
5. Expose `/health` to monitoring. Alert on process/database failure, elevated 5xx/429, storage failures, and webhook failures.

### Frontend on Vercel

Set production `API_URL=https://<api-host>`, `NEXTAUTH_URL=https://<frontend-host>`, and a production `NEXTAUTH_SECRET`. Deploy only after the backend URL is reachable from the Vercel runtime. The frontend reads the public VAPID key and business rules through its same-origin API bridge. Verify manifest/service worker/icons and Web Push over HTTPS, and ensure private API/image/payment responses are not cached by the service worker.

### Razorpay live mode

Create live keys and webhook secret separately from test mode, configure the exact HTTPS webhook URL, verify signatures in logs/metrics without logging secrets, and perform a small controlled live transaction before launch.

## 7. Release verification and rollback

Before release: run backend/frontend tests, lint/build, migration review, dependency/security review, environment validation, backup confirmation, and the smoke test against staging.

After release: check health, login for each role, signed upload/download, notification scoping, payment order/verification/webhook, PWA installability, logs, and metrics.

For rollback, deploy the previous compatible application build. Database migrations should be backward compatible whenever possible; destructive schema rollback requires a reviewed restore/forward-fix plan. Rotating JWT/NextAuth secrets intentionally invalidates sessions and must be communicated.

## Known hardening work before real users

- Replace shared bootstrap-password delivery with invitations or password-reset/forced-change flow.
- Add robust concurrent quota enforcement at the database/transaction isolation level.
- Delete storage objects on User/organisation deletion and clean abandoned signed uploads.
- Add durable per-user notification read receipts if the UI claims unread counts.
- Persist Razorpay payment ID if reconciliation/auditing requires both order and payment identifiers.
- Add request IDs, structured logs, monitoring, backups/restore drill, and documented incident ownership.
