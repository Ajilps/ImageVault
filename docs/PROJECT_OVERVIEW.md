# Image Upload and Payment System

## Purpose

This project lets organisations manage members who upload images. Each normal User receives five free image uploads. They can purchase additional five-upload packs for ₹100 through Razorpay. Images are stored privately in MinIO during local development or AWS S3 in production.

## Roles

| Role | Main responsibilities |
| --- | --- |
| Product Owner | Creates, edits, and removes organisations. Creating an organisation also creates its initial Admin. |
| Admin | Manages normal Users in their own organisation and views the organisation gallery. |
| User | Uploads images, tags organisation members, views shared images, buys quota packs, and reads notifications. |

## Key flows

### Organisation setup

1. A Product Owner registers and signs in.
2. They create an organisation and provide the initial Admin account details.
3. The Admin signs in and creates normal User accounts.

### Image upload

1. A User requests a short-lived upload URL from the backend.
2. The browser uploads the image directly to MinIO or S3.
3. The browser confirms the upload with the backend.
4. The backend verifies the stored image, checks quota, stores metadata, and creates notifications.
5. Tagged users receive a direct notification; an untagged image creates an organisation-wide notification.

### Payments

1. A User chooses one or more five-upload packs.
2. The frontend requests a Razorpay order.
3. Razorpay Checkout collects payment.
4. The frontend and Razorpay webhook both verify the payment signature.
5. The backend increases quota once, even if both verification paths arrive.

## Backend API

The backend runs by default at `http://localhost:4000`. Its health endpoint is `GET /health`.

Protected routes require:

```http
Authorization: Bearer <accessToken>
```

| Area | Routes |
| --- | --- |
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Organisations | `GET/POST /api/organisations`, `PATCH/DELETE /api/organisations/:organisationId` |
| User management | `GET/POST /api/users`, `PATCH/DELETE /api/users/:userId` |
| Images and quota | `GET/POST /api/images`, `POST /api/images/upload-url`, `GET /api/quota` |
| Notifications | `GET /api/notifications` |
| Payments | `GET /api/payments`, `POST /api/payments/orders`, `POST /api/payments/verify`, `POST /api/payments/webhook` |

## Storage configuration

Local development uses MinIO:

```env
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_BUCKET=uploads
```

For AWS S3, change configuration without changing frontend code:

```env
STORAGE_PROVIDER=s3
S3_BUCKET=your-private-bucket
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

The backend returns pre-signed upload and download URLs, so storage credentials never enter the browser.
