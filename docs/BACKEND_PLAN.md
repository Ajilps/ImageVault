# Backend Implementation Plan

## Goal

Build a secure Node.js and Express REST API for the Image Upload and Payment System. The backend owns authentication, role-based access control, PostgreSQL data, image quota rules, signed storage URLs, Razorpay verification, and notifications.

The backend uses TypeScript, Express, Prisma, PostgreSQL, JWT, MinIO/AWS S3, and Razorpay.

## Phase 1 — Project foundation

1. Set up TypeScript, Express, Nodemon, environment loading, security headers, CORS, request logging, and a health endpoint.
2. Add a consistent application structure:

```text
backend/
  prisma/
  src/
    config/
    controllers/
    errors/
    middleware/
    routes/
    services/
    validators/
    app.ts
    server.ts
```

3. Add central error handling, unknown-route handling, asynchronous route handling, and request validation.
4. Configure environment variables in `.env`, with `.env.example` as the safe template.

## Phase 2 — Database and Prisma

1. Define Prisma models for Users, Organisations, Images, Payments, and Notifications.
2. Add enums for `UserRole` and `PaymentStatus`.
3. Store secure password hashes, image object keys, upload quotas, transaction IDs, and timestamps.
4. Add database indexes for frequently used lookups such as organisation galleries, user payments, and notifications.
5. Generate the Prisma client and commit migration files.
6. Use a fresh development database or restore all historical migration files before applying migrations; never reset a database with important data without an explicit backup and approval.

## Phase 3 — Authentication and authorisation

1. Create public Product Owner registration and credential-based login endpoints.
2. Hash passwords with bcrypt before saving them.
3. Sign access tokens with a strong JWT secret and short expiration.
4. Add `requireAuth` middleware to verify Bearer tokens and load the current user.
5. Add role middleware to restrict routes to Product Owner, Admin, or User roles.
6. Add `GET /api/auth/me` so the frontend can load role and organisation context after login.

## Phase 4 — Product Owner module

1. Allow Product Owners to list, create, update, and delete organisations.
2. When an organisation is created, automatically create its first Admin account in the same transaction.
3. Validate that the Admin email is not already in use.
4. Return organisation user and image counts for dashboard display.
5. Expose:
   - `GET /api/organisations`
   - `POST /api/organisations`
   - `PATCH /api/organisations/:organisationId`
   - `DELETE /api/organisations/:organisationId`

## Phase 5 — Admin user management

1. Restrict Admins to their own organisation.
2. Allow Admins to list, create, update, and delete normal User accounts.
3. Reject duplicate email addresses and cross-organisation access attempts.
4. Remove dependent image, payment, and notification records in the correct order when deleting a User.
5. Expose:
   - `GET /api/users`
   - `POST /api/users`
   - `PATCH /api/users/:userId`
   - `DELETE /api/users/:userId`
   - `GET /api/admin/images`

## Phase 6 — S3-compatible image uploads and quota

1. Abstract object storage behind one service so the API works with local MinIO and AWS S3.
2. Select the provider with `STORAGE_PROVIDER=minio` or `STORAGE_PROVIDER=s3`.
3. Keep buckets private. Generate short-lived pre-signed URLs for browser uploads and downloads.
4. Check that files are images and do not exceed the configured maximum size.
5. Enforce quota by counting the User's completed images before storing a new image record.
6. Use the image object-key prefix to prevent one User from completing another User's upload.
7. Expose:
   - `POST /api/images/upload-url`
   - `POST /api/images`
   - `GET /api/images`
   - `GET /api/quota`

## Phase 7 — Notifications

1. Validate that every tagged User belongs to the uploader's organisation.
2. Create a direct notification for tagged Users.
3. Create an organisation-wide notification when an image has no tags.
4. Return only notifications where the current User is a receiver.
5. Start with polling and add WebSocket or push notifications only if real-time updates are required.
6. Expose `GET /api/notifications`.

## Phase 8 — Razorpay payments

1. Price one upload pack as ₹100 for five slots.
2. Create a Razorpay order through `POST /api/payments/orders`.
3. Save a pending Payment record before returning the order to the frontend.
4. Verify the frontend checkout signature through `POST /api/payments/verify`.
5. Verify Razorpay webhook signatures using the raw, unparsed request body at `POST /api/payments/webhook`.
6. Make payment completion idempotent so both verification paths cannot increase quota twice.
7. Expose payment history through `GET /api/payments`.

## Phase 9 — Testing and operational readiness

1. Unit test JWT verification, role guards, validation, quota calculations, payment signatures, and storage key ownership.
2. Integration test organisation creation, Admin user creation, quota exhaustion, tagged notifications, and payment completion against a temporary database.
3. Confirm CORS only permits the deployed frontend origin.
4. Use strong production secrets and AWS workload credentials instead of committing keys.
5. Add request rate limiting, structured logging, and monitoring before public deployment.

## Delivery order

1. Foundation, environment configuration, and Prisma schema
2. JWT authentication and role middleware
3. Product Owner organisation management
4. Admin user management
5. MinIO/S3 upload and quota workflow
6. Notifications
7. Razorpay order, checkout verification, and webhook handling
8. Tests, production hardening, and deployment
