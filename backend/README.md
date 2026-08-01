# Image Upload API

This Express API implements the backend from the task brief: JWT authentication, role-scoped organisation and user management, quota-controlled image uploads, notifications, and Razorpay slot payments.

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
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Product owner | `GET/POST /api/organisations`, `PATCH/DELETE /api/organisations/:organisationId` |
| Admin | `GET/POST /api/users`, `PATCH/DELETE /api/users/:userId`, `GET /api/admin/images` |
| Users | `GET /api/quota`, `POST /api/images/upload-url`, `POST /api/images` (or `/complete`), `GET /api/images`, `GET /api/notifications` |
| Payments | `GET /api/payments`, `POST /api/payments/orders`, `POST /api/payments/verify`, `POST /api/payments/webhook` |

All protected endpoints require `Authorization: Bearer <accessToken>`. Only a public registration can create a Product Owner. A Product Owner creates an organisation and its initial Admin; Admins create normal User accounts in their own organisation.

To upload an image, request a signed URL, upload the file directly to storage using that URL and its declared `Content-Type`, then send its `objectKey` to `POST /api/images` (or `/api/images/complete`). The server verifies the stored object, applies the quota, saves metadata, and creates either tagged-user or organisation-wide notifications.

Razorpay slot packs are fixed at five uploads for ₹100. `/api/payments/verify` validates the checkout signature, while `/api/payments/webhook` independently validates the Razorpay webhook signature; payment processing is idempotent so quota is increased once.
