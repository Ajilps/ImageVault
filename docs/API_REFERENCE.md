# API Reference

## Conventions

- Local base URL: `http://localhost:4000`.
- JSON is used except the Razorpay raw-body webhook and direct signed S3 `PUT`.
- Protected endpoints require `Authorization: Bearer <accessToken>`.
- Timestamps are ISO-8601 UTC strings. IDs are UUIDs except Razorpay identifiers.
- Roles are `PRODUCT_OWNER`, `ADMIN`, and `USER`; payment statuses are `PENDING`, `SUCCESS`, and `FAILED`.
- `amount` stored on a Payment is rupees. `order.amount` returned for Razorpay Checkout is paise.
- Successful deletes return `204` with no body.
- Validation rejects unknown/malformed values according to the schemas below; client code must not rely on database errors for validation.

### Error envelope

```json
{
  "error": {
    "code": "QUOTA_EXHAUSTED",
    "message": "Your image quota has been exhausted. Purchase another five-slot pack to continue."
  }
}
```

Use `400` for invalid input/signature, `401` for missing/invalid authentication, `403` for role/ownership/quota denial, `404` for missing records, `409` for state or uniqueness conflicts, `429` for rate limiting, `502` for provider failure, `503` for unconfigured/unavailable payments, and `500` for unexpected/configuration failures.

## Shared representations

```ts
type Role = "PRODUCT_OWNER" | "ADMIN" | "USER";

type CurrentUser = {
  id: string; name: string; email: string; role: Role;
  imageQuota: number; organizationId: string | null;
  organization: { id: string; name: string } | null;
  createdAt: string;
};

type Organisation = {
  id: string; name: string; logoUrl: string; address: string; phone: string;
  adminId: string; createdAt: string;
  admin: { id: string; name: string; email: string; role: "ADMIN"; createdAt: string };
  _count: { users: number; images: number };
};

type ImageRecord = {
  id: string; url: string; objectKey: string; createdAt: string;
  downloadUrl: string; visibility: "PUBLIC" | "PRIVATE";
  shareToken: string | null; // non-null only for the uploader
  uploadedBy: { id: string; name: string; email: string };
  tags: Array<{ id: string; name: string; email: string }>;
};

type Payment = {
  id: string; userId: string; organizationId: string;
  amount: number; slotsPurchased: number; transactionId: string;
  status: "PENDING" | "SUCCESS" | "FAILED"; createdAt: string;
};
```

Password hashes, storage credentials, and secrets are never returned.

## Health and authentication

### `GET /health` — public

Returns `200 {"status":"ok"}` when the process is ready to serve. A production readiness check should additionally validate database connectivity if the deployment platform needs that distinction.

### `GET /api/config/public` — public

Returns the non-secret runtime rules the frontend must use instead of duplicating constants:

```json
{
  "config": {
    "defaultImageQuota": 5,
    "slotPackSize": 5,
    "slotPackPriceInr": 100,
    "maxSlotPacksPerOrder": 20,
    "maxAdminSlotAllocation": 1000,
    "maxUserImageQuota": 100000,
    "maxTagsPerImage": 50,
    "maxFileSize": 5242880,
    "notificationPollIntervalMs": 60000,
    "passwordMinLength": 8,
    "passwordMaxLength": 128,
    "pushEnabled": true,
    "vapidPublicKey": "public-key-or-null"
  }
}
```

Only the VAPID public key is exposed. Passwords, JWT/AWS/Razorpay secrets, VAPID private key, and bootstrap identity are never returned.

### `POST /api/auth/login` — public, rate limited

Request:

```json
{ "email": "user@example.com", "password": "bootstrap-or-user-password" }
```

`email` must be valid and at most 255 characters; password must be non-empty. Returns `200`:

```json
{ "user": { "id": "uuid", "name": "A User", "email": "user@example.com", "role": "USER", "imageQuota": 5, "organizationId": "uuid", "organization": { "id": "uuid", "name": "Acme" }, "createdAt": "2026-08-03T00:00:00.000Z" }, "accessToken": "jwt", "accessTokenExpiresAt": 1785716100000 }
```

Invalid credentials return `401 INVALID_CREDENTIALS` without revealing whether the email exists.

### `GET /api/auth/me` — authenticated

Returns `200 {"user": CurrentUser}` loaded from the current database record.

### `PATCH /api/auth/password` — authenticated, every role

Request: `{ "currentPassword": "current value", "newPassword": "new value" }`. The current password must be correct, the new password must satisfy the environment-configured bounds, and it must differ from the current password. Returns `204`. This is the self-service password path for Product Owner, Admin, and User accounts.

## Product Owner: organisations

All endpoints in this section require `PRODUCT_OWNER`.

### `GET /api/organisations`

Returns `200 {"organisations": Organisation[]}`, newest first.

### `POST /api/organisations`

Request:

```json
{
  "name": "Acme",
  "logoUrl": "https://assets.example.com/acme.png",
  "address": "1 Example Road, Kochi",
  "phone": "+91 98765 43210",
  "admin": { "name": "Admin Name", "email": "admin@acme.example" }
}
```

Names: 1–120 trimmed characters; logo: optional stable browser-renderable URL up to 2048 (normally HTTPS via a logo CDN/public asset path); address: 1–500; phone: 5–40; email: valid and up to 255. Returns `201 {"organisation": {...Organisation, "admin": {id,name,email,role,createdAt}}, "temporaryPassword": "..."}`. The generated Admin password is returned only once in this response. Duplicate global email returns `409 EMAIL_IN_USE`.

### `PATCH /api/organisations/:organisationId`

UUID path. Body contains at least one of `name`, `logoUrl`, `address`, or `phone`, with the same validation. Returns `200 {"organisation": Organisation}`.

### `PATCH /api/organisations/:organisationId/admin/password`

UUID path. Request: `{ "newPassword": "new value" }`. Resets only that organisation's linked Admin password and returns `200 {"admin": Organisation["admin"]}`. The Product Owner never supplies an arbitrary User ID.

### `DELETE /api/organisations/:organisationId`

UUID path. Returns `204`. Missing organisation returns `404 ORGANISATION_NOT_FOUND` (or the consistent not-found code selected by the service).

## Admin: user management

All endpoints in this section require `ADMIN` and derive the organisation from the authenticated Admin.

### `GET /api/users`

Returns `200 {"users": ManagedUser[]}` for the caller's organisation. Each entry contains `id`, `name`, `email`, `role`, `imageQuota`, `organizationId`, `createdAt`, and `_count.uploads`.

### `POST /api/users`

Request: `{ "name": "User Name", "email": "user@acme.example" }` with the same name/email limits. Role and organisation are server-assigned. Returns `201 {"user": ManagedUser, "temporaryPassword": "..."}`. The generated User password is returned only once in this response. Duplicate email returns `409 EMAIL_IN_USE`.

### `PATCH /api/users/:userId`

UUID path. Body contains at least one of `name`, `email`, or `password`; password is 8–128 characters. Only a normal User in the Admin's organisation can be updated. Returns `200 {"user": ManagedUser}`.

### `POST /api/users/:userId/slots`

Request: `{ "additionalSlots": 10 }`. Atomically adds a positive number of slots to a normal User in the Admin's organisation. One allocation cannot exceed `MAX_ADMIN_SLOT_ALLOCATION`, and the resulting quota cannot exceed `MAX_USER_IMAGE_QUOTA`. Returns `200 {"user": ManagedUser}`.

### `DELETE /api/users/:userId`

UUID path. Deletes only a normal User in the Admin's organisation and returns `204`.

### `GET /api/admin/images?taggedUserId=:uuid`

Returns `200 {"images": ImageRecord[]}` scoped to the Admin's organisation, newest first. This is retained for the Admin dashboard; the shared `GET /api/images` returns the same scoped representation.

## Organisation members, gallery, quota, and uploads

### `GET /api/members` — Admin or User

Returns `200 {"users": ManagedUser[]}` for the caller's organisation. Use IDs from this response for tag filtering and upload tags.

### `GET /api/images?taggedUserId=:uuid` — Admin or User

Returns `200 {"images": ImageRecord[]}` newest first. A caller receives organisation `PUBLIC` images plus only their own `PRIVATE` images; an Admin cannot see another User's private upload. The optional UUID filters the already-authorised result for images tagged with that User. `downloadUrl` is short-lived.

### `GET /api/quota` — User

Returns `200 {"quota":{"total":10,"used":7,"remaining":3}}`.

### `POST /api/images/upload-url` — User

Request:

```json
{ "fileName": "photo.jpg", "contentType": "image/jpeg" }
```

File name is 1–255 trimmed characters and content type must begin `image/`. Returns `201`:

```json
{ "upload": { "objectKey": "organisations/.../photo.jpg", "uploadUrl": "https://signed-put-url", "expiresIn": 900, "maxFileSize": 5242880 } }
```

The browser must `PUT` the raw file to `uploadUrl` with the exact `Content-Type`. Do not send the API Bearer token or cookies to the storage URL. URL creation does not consume quota.

### `POST /api/images` — User

Alias: `POST /api/images/complete`.

Request:

```json
{ "objectKey": "value-returned-above", "tagUserIds": ["uuid"], "visibility": "PUBLIC" }
```

`visibility` is `PUBLIC` (visible to every Admin/User in the organisation) or `PRIVATE` (visible only to the uploader). The S3/MinIO object remains infrastructure-private in both cases. `tagUserIds` defaults to `[]`, accepts at most 50 UUIDs, and is de-duplicated. Private images cannot contain tags and create no database or push notifications. The key must belong to the caller; the object must exist, be an image, and not exceed `MAX_FILE_SIZE`; all public-image tags must belong to the organisation. Returns `201 {"image": ImageRecord}`. `403 QUOTA_EXHAUSTED` means the S3 object may be orphaned and eligible for cleanup.

### `POST /api/images/:imageId/share` — User uploader

Creates or returns an existing high-entropy share token for an organisation-public image uploaded by the caller. Private images return `400 PRIVATE_IMAGE_NOT_SHAREABLE`; another User's image returns `404 IMAGE_NOT_FOUND`. Returns `201 {"share":{"shareToken":"url-safe-token"}}`. The frontend constructs `/shared/:shareToken` from its current public origin.

### `DELETE /api/images/:imageId/share` — User uploader

Revokes the caller's public link by clearing its token. Returns `204`; subsequent public requests return `404`.

### `GET /api/public/images/:shareToken` — public bearer link

No account authentication is required. A valid active token for a `PUBLIC` image returns safe public metadata (`id`, `createdAt`, `visibility`, `uploadedBy`) and a fresh short-lived `downloadUrl`. It does not return object keys, organisation identifiers, tags, or the share token. Invalid, revoked, and private-image tokens return the same `404 PUBLIC_SHARE_NOT_FOUND` response.

## Notifications

### `GET /api/notifications` — Admin or User

Returns `200 {"notifications": Notification[]}` where the caller is a receiver, newest first:

```ts
type Notification = {
  id: string; message: string; createdAt: string;
  sender: { id: string; name: string };
  image: { id: string };
};
```

Notification responses intentionally omit storage object keys and signed download URLs. The frontend links to the authenticated `/gallery?imageId=:id` route, which applies the normal organisation/visibility policy and opens the image preview.

### `DELETE /api/notifications/:notificationId` — Admin or User

Clears the notification only for the authenticated recipient. Other recipients continue to see their copy.

- Response: `204 No Content`
- Errors: `404 NOTIFICATION_NOT_FOUND` when the notification does not belong to the authenticated recipient.

### `POST /api/push/subscriptions` — Admin or User

Target contract required for the brief's Web Push support:

```json
{
  "endpoint": "https://push-service.example/subscription-id",
  "expirationTime": null,
  "keys": { "p256dh": "base64url-public-key", "auth": "base64url-auth-secret" }
}
```

The API associates the subscription with the authenticated caller; it never accepts a client User ID. Re-registering the same endpoint is idempotent and returns `200` or `201 {"subscription":{"id":"uuid"}}`.

### `DELETE /api/push/subscriptions` — Admin or User

Request: `{ "endpoint": "the-exact-subscribed-endpoint" }`. Deletes only a subscription belonging to the caller and returns `204`, including an idempotent already-absent result.

## Payments

All endpoints except the webhook require `USER`.

### `GET /api/payments`

Returns `200 {"payments": Payment[]}` for only the caller, newest first.

### `POST /api/payments/orders`

Request: `{ "slotPacks": 2 }`; integer range 1–20. Returns `201`:

```json
{ "order": { "orderId": "order_...", "amount": 20000, "currency": "INR", "keyId": "rzp_...", "slotsPurchased": 10 } }
```

`amount` here is paise for Checkout. Price and slots are calculated only by the server.

### `POST /api/payments/verify`

Request maps the Razorpay Checkout callback fields:

```json
{ "orderId": "order_...", "paymentId": "pay_...", "signature": "hex-signature" }
```

Returns `200 {"payment": Payment}`. It verifies signature and ownership, then atomically applies quota at most once. Tampering returns `400 INVALID_PAYMENT_SIGNATURE`.

### `POST /api/payments/webhook` — public signature-authenticated endpoint

Razorpay sends `Content-Type: application/json`, `X-Razorpay-Signature`, and the original raw JSON bytes. Configure the provider URL as `https://<api-host>/api/payments/webhook`. Handle `payment.captured`, `order.paid`, and `payment.failed`; unrelated valid events return `200 {"processed":false}`. Never protect this endpoint with the user Bearer token or parse/re-serialize its body before HMAC verification.

## Compatibility rules

- Additive response fields are allowed; clients must tolerate them.
- Removing/renaming fields, changing units/status values, or tightening valid input requires a coordinated versioned change.
- Any endpoint change must update this file, backend validation/tests, frontend `lib/types.ts` and `lib/api.ts`, and affected UI tests.
