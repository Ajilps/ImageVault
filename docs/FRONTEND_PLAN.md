# Frontend Implementation Plan

## Goal

Build a responsive Next.js PWA for three roles:

- **Product Owner** — manages organisations and their initial Admin accounts.
- **Admin** — manages Users within one organisation and views its image gallery.
- **User** — uploads images within a quota, tags colleagues, buys extra upload slots, and receives notifications.

The frontend should use Next.js (App Router), TypeScript, Tailwind CSS, and ShadCN UI. It will call the Express API through `NEXT_PUBLIC_API_URL` (for example, `http://localhost:4000`).

## Phase 1 — Project foundation

1. Initialise the Next.js App Router project inside `frontend`.
2. Add Tailwind CSS, ShadCN UI, ESLint, Prettier, and a small icon library.
3. Create the base layout: navigation, responsive sidebar, page header, loading state, empty state, and error state.
4. Add `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:4000`.
5. Create a typed API client that adds `Authorization: Bearer <token>` to protected requests and normalises API errors.

Suggested structure:

```text
frontend/
  app/
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    (dashboard)/layout.tsx
    (dashboard)/organisations/page.tsx
    (dashboard)/users/page.tsx
    (dashboard)/gallery/page.tsx
    (dashboard)/upload/page.tsx
    (dashboard)/payments/page.tsx
    (dashboard)/notifications/page.tsx
    (dashboard)/profile/page.tsx
  components/
  lib/api/
  lib/auth/
  hooks/
  types/
```

## Phase 2 — Authentication and route protection

1. Build Login and Product Owner registration forms with client-side validation.
2. Call `POST /api/auth/login` and `POST /api/auth/register`.
3. Read `GET /api/auth/me` on application load to obtain the current role and organisation.
4. Redirect users by role:
   - Product Owner → `/organisations`
   - Admin → `/users`
   - User → `/gallery`
5. Prevent users from visiting pages outside their role.
6. Add logout by clearing the stored access token and returning to `/login`.

The current backend returns a Bearer JWT in JSON. Store it in an in-memory/session-based auth store for this project; for production, change the backend to issue a secure HTTP-only cookie instead of exposing the token to browser JavaScript.

## Phase 3 — Product Owner experience

1. Build an organisation table using ShadCN Table/Data Table.
2. Add create, edit, and delete organisation dialogs.
3. Include the required initial Admin details in the create form.
4. Display organisation name, contact details, image count, user count, and creation date.
5. Connect to:
   - `GET /api/organisations`
   - `POST /api/organisations`
   - `PATCH /api/organisations/:organisationId`
   - `DELETE /api/organisations/:organisationId`

## Phase 4 — Admin experience

1. Build a user-management table with create, edit, and delete actions.
2. Let Admins create only normal User accounts; the initial Admin is created with the organisation.
3. Show each User's upload count and image quota.
4. Build a read-only organisation gallery with an optional tag filter.
5. Connect to:
   - `GET /api/users`
   - `POST /api/users`
   - `PATCH /api/users/:userId`
   - `DELETE /api/users/:userId`
   - `GET /api/admin/images`

## Phase 5 — User gallery and upload flow

1. Build the gallery as responsive image cards with uploader, upload time, and tagged users.
2. Add a tag filter and an image-preview dialog.
3. Add a quota card that shows `used / total` uploads and a clear warning when quota is exhausted.
4. Build the upload form with image selection and multi-select user tagging.
5. Implement the upload sequence:
   1. Request a pre-signed URL from `POST /api/images/upload-url`.
   2. Upload the selected file directly to S3 or MinIO using that URL and its declared `Content-Type`.
   3. Save the image metadata through `POST /api/images` with `objectKey` and optional `tagUserIds`.
   4. Refresh the gallery, quota, and notifications.
6. Connect to:
   - `GET /api/images`
   - `GET /api/quota`
   - `POST /api/images/upload-url`
   - `POST /api/images`
   - `GET /api/notifications`

## Phase 6 — Payments and notifications

1. Display the user's payment history and quota status.
2. Allow the user to choose the number of five-slot packs to buy.
3. Create a Razorpay order with `POST /api/payments/orders`.
4. Open Razorpay Checkout with the returned order ID and key ID.
5. Send the completed checkout signature to `POST /api/payments/verify`.
6. Refresh the quota only after verification succeeds.
7. Add a notification page and unread indicator. Initially poll `GET /api/notifications` on page load and at a modest interval; add real-time delivery later if needed.

## Phase 7 — PWA, quality, and deployment

1. Add web manifest, icons, install prompt, and offline fallback page.
2. Add accessible labels, keyboard support, form validation messages, and mobile layouts.
3. Write tests for login redirects, role guards, quota messages, upload flow, payment start, and tag filtering.
4. Deploy the frontend to Vercel and set `NEXT_PUBLIC_API_URL` to the deployed backend URL.
5. Configure the backend's `CORS_ORIGIN` with the deployed frontend URL.

## Delivery order

Build in this order to keep each milestone testable:

1. Foundation and API client
2. Authentication and role guards
3. Product Owner organisation management
4. Admin user management
5. User gallery, quota, and uploads
6. Payments and notifications
7. PWA polish, tests, and deployment
