# ImageVault API

This Express API implements the ImageVault backend: JWT authentication, role-scoped organisation and user management, quota-controlled image uploads, notifications, and Razorpay slot payments.

## Run locally

1. Copy `.env.example` to `.env` and set secure values.
2. Generate the Prisma client with `npx prisma generate`.
3. Apply the database migration with `npx prisma migrate deploy` against a fresh database.
4. Start the API with `npm run build && npm start`, or use `npm run dev` while developing.

## Storage provider

The upload API uses pre-signed S3 URLs. Set `STORAGE_PROVIDER=minio` for local MinIO or `STORAGE_PROVIDER=s3` for AWS. Both use the same API surface; switching provider only requires changing environment variables. Objects are private and API responses include a short-lived `downloadUrl`.

For AWS, set `STORAGE_PROVIDER=s3`, `S3_BUCKET`, and `AWS_REGION`. Supply `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, or use the AWS default credentials available to the deployed workload. Do not set `S3_ENDPOINT` for AWS.

## API overview

| Area | Endpoint |
| --- | --- |
| Auth | `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/password` |
| Product owner | `GET/POST /api/organisations`, `PATCH/DELETE /api/organisations/:organisationId`, `PATCH /api/organisations/:organisationId/admin/password` |
| Admin | `GET/POST /api/users`, `PATCH/DELETE /api/users/:userId`, `POST /api/users/:userId/slots`, `GET /api/admin/images` |
| Users | `GET /api/members`, `GET /api/quota`, `POST /api/images/upload-url`, `POST /api/images` (or `/complete`), `GET /api/images`, `POST/DELETE /api/images/:imageId/share`, `GET /api/notifications` |
| Public sharing | `GET /api/public/images/:shareToken` |
| Payments | `GET /api/payments`, `POST /api/payments/orders`, `POST /api/payments/verify`, `POST /api/payments/webhook` |

All protected endpoints require `Authorization: Bearer <accessToken>`. There is no public sign-up endpoint. On startup, the API ensures the configured Product Owner exists. A Product Owner creates an organisation and its initial Admin; Admins create normal User accounts in their own organisation. New Admin and User accounts receive `DEFAULT_ACCOUNT_PASSWORD`.

## Default account credentials

Set these values in the ignored `.env` file before starting the API:

| Setting | Purpose |
| --- | --- | --- |
| `DEFAULT_PRODUCT_OWNER_NAME` | Display name for the first Product Owner |
| `DEFAULT_PRODUCT_OWNER_EMAIL` | Login email for the first Product Owner |
| `DEFAULT_ACCOUNT_PASSWORD` | Password assigned to the initial Product Owner and all new Admin/User accounts |

The API refuses to start without a Product Owner email and a valid default password. Use a unique password and distribute it only to the intended account holders.

To upload an image, request a signed URL, upload the file directly to storage using that URL and its declared `Content-Type`, then send its `objectKey` and `PUBLIC` or `PRIVATE` visibility to `POST /api/images` (or `/api/images/complete`). The server verifies the stored object, applies the quota, and saves metadata. Public images can tag or notify organisation members; private images are visible only to their uploader and create no teammate notifications. The storage bucket remains private for both visibility values.

The uploader can create or revoke an unguessable bearer link for a public image. Public retrieval returns minimal metadata plus a fresh signed download URL; the share token is hidden from every other organisation member. Configure token entropy with `PUBLIC_SHARE_TOKEN_BYTES`.

Quota, pack size/price, purchase/tag limits, validation bounds, rate limits, and polling interval are configured in `.env`; the frontend reads safe values through `GET /api/config/public`. `/api/payments/verify` validates the checkout signature, while `/api/payments/webhook` independently validates the Razorpay webhook signature; payment processing is idempotent so quota is increased once.

Web Push subscriptions are persisted through `POST/DELETE /api/push/subscriptions` when VAPID values are configured. Database notifications and polling continue to work when Push is unavailable.

After changing the Prisma schema, run `npx prisma generate` and apply committed migrations. The `20260803000000_configurable_quota_and_push` migration removes the database's fixed quota default, adds persisted push subscriptions, and enforces the organisation-to-Admin foreign key. `20260803010000_password_slots_and_visibility` adds `ImageVisibility` while preserving existing images as organisation-public. `20260803020000_public_image_sharing` adds nullable unique share tokens.
