# Frontend Implementation Plan

## Goal and boundaries

Build a responsive, accessible, installable Next.js App Router PWA for Product Owner, Admin, and User roles. Use TypeScript, Tailwind CSS, ShadCN UI, NextAuth credentials/JWT sessions, and Razorpay Checkout. The Express API remains the source of truth for permissions and business rules.

## Required structure

```text
frontend/src/
  app/
    (auth)/login/
    (dashboard)/dashboard/ organisations/ users/ gallery/ upload/
    (dashboard)/payments/ notifications/ profile/
    api/auth/[...nextauth]/
  components/
  hooks/
  lib/api.ts
  lib/roles.ts
  lib/types.ts
  auth.ts
```

Use reusable loading, empty, error, confirmation, form-field, dialog, table, image-card, quota, and navigation components. Server/API types must match [API_REFERENCE.md](./API_REFERENCE.md).

## Phase 1 — Foundation and design system

1. Configure Next.js, TypeScript strictness, Tailwind, ShadCN UI, ESLint, Prettier, Jest, and React Testing Library.
2. Build responsive dashboard shell, mobile navigation, page header, skeleton/loading, empty, and recoverable error states.
3. Create typed API functions that normalise `{error:{code,message}}`, handle `204`, encode query values, and use a same-origin server bridge that attaches the backend token.
4. Add environment validation for server-only `API_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`.
5. Define accessible colour contrast, focus styles, labels, keyboard operation, and reduced-motion behaviour.

Exit criteria: lint, tests, and production build pass; shared states render at mobile and desktop widths.

## Phase 2 — Authentication and route protection

1. Configure NextAuth credentials provider. Its server-side `authorize` calls `POST /api/auth/login`.
2. Store user profile and backend access token in the encrypted NextAuth JWT. Never use local storage.
3. Align NextAuth lifetime with the backend token. On backend `401`, sign out and redirect to `/login` rather than repeatedly calling with an expired token.
4. Add server/middleware guards where possible and a client RoleGate as defence-in-depth/UI control.
5. Redirect Product Owner → `/organisations`, Admin → `/users`, User → `/gallery`; authenticated users visiting `/login` go to their role home.
6. Logout through NextAuth and clear cached private data.

Exit criteria: valid/invalid login, redirect map, unauthenticated route, wrong-role route, expired-token, and logout tests pass without protected-content flash.

## Phase 3 — Product Owner experience

1. Organisation table shows logo, name, address, phone, Admin, member/image counts, and created date.
2. Create form requires organisation fields plus Admin name/email and shows the generated one-time Admin password with show/copy controls.
3. Edit supported organisation fields; deletion requires name-based or explicit destructive confirmation.
4. Provide a Product Owner control to reset the linked Admin password with configured validation bounds.
5. Handle duplicate Admin email, validation, server failure, empty state, and stale refresh.

Exit criteria: table and all mutations match the API contract and are keyboard accessible.

## Phase 4 — Admin experience

1. User table shows name, email, role, completed uploads, quota, and created date.
2. Create only normal Users and show their generated one-time password with show/copy controls; edit name/email and optional password; delete with confirmation.
3. Allocate additional image slots with the API-provided per-action limit and display the updated quota.
3. Admin dashboard shows organisation details and gallery summary.
4. Gallery is read-only for Admin and supports member tag filtering.

Exit criteria: mutations refresh correctly, errors remain visible, and no User upload/payment controls appear for Admin.

## Phase 5 — User upload and shared gallery

1. Quota card shows `used / total`, remaining slots, exhausted warning, and payment link.
2. File input accepts one image, displays preview/name/size, rejects invalid or oversized files before network activity, and remains re-selectable after errors.
3. Require organisation-public or uploader-private visibility. Member selection uses `/api/members`, is disabled for private images, de-duplicates IDs, and is keyboard/screen-reader usable.
4. Upload state machine is `idle → signing → uploading → completing → success/error`; prevent duplicate submits and show progress by stage.
5. Send PUT using the exact file MIME type, then complete with object key and tags. A signed PUT success is not a completed application upload until API confirmation succeeds.
6. After success, refresh quota, gallery, notifications, clear form, and revoke local preview URLs.
7. Gallery displays image, uploader, timestamp, and tags; filter by tag; open accessible preview; recover when a signed download URL expires by refetching.
8. Profile provides current-password-confirmed self-service password changes for every authenticated role.
9. For the uploader's public images, Gallery creates, copies, opens, and revokes bearer links; `/shared/[shareToken]` renders the image without requiring a session and handles invalid/revoked links safely.

Exit criteria: invalid file, exhausted quota, signing failure, PUT failure, completion failure/retry, success refresh, empty gallery, tag filter, and URL-expiry behaviour are tested.

## Phase 6 — Payments and notifications

1. Payment page shows quota, 1–20 pack selector, computed rupee price/slots, and newest-first history with status.
2. Create order, load/open Razorpay Checkout only from trusted configuration, and send returned `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to verification.
3. Treat checkout dismissal, script failure, pending verification, and API failure separately. Never increment quota optimistically; refresh only after verified API success.
4. Notifications page polls on load and at a modest interval only while authenticated/visible, stops on unmount, and avoids overlapping requests.
5. After an explicit user action, request notification permission, create a PushManager subscription using the VAPID public key, and register it with the API. Allow unsubscribe and keep polling when permission is denied or push is unavailable.
6. Badge semantics must be labelled as recent/total unless durable read state is implemented; do not present a fabricated unread count.

Exit criteria: order initiation, computed totals, Checkout callbacks, dismissal/error, verified refresh, history states, notification visibility, polling cleanup, and badge refresh are tested.

## Phase 7 — PWA, accessibility, and deployment

1. Add valid manifest, 192×192 and 512×512 icons, maskable icon, service-worker registration, install prompt, and offline fallback.
2. Cache only static shell assets safely. Do not cache authenticated API responses, signed S3 URLs, payment responses, or private images in a shared/runtime cache.
3. Handle service-worker `push` and `notificationclick` events, display only non-sensitive summary text on the lock screen, and route clicks to the relevant authenticated page. Never request permission on initial page load.
4. Test keyboard navigation, focus restoration after dialogs, labels/errors, colour contrast, responsive layout, and offline fallback.
5. Set Vercel environment values, HTTPS API URL, and backend CORS origin. Verify PWA installability with production build over HTTPS.

## Minimum frontend test matrix

| Area | Required cases |
| --- | --- |
| Auth | validation, bad credentials, three role redirects, forbidden route, expiry/logout |
| Organisations | render, create validation/success/conflict, edit, confirmed delete |
| Users | render counts, create conflict, edit, confirmed delete, role restrictions |
| Upload | file validation, tags, quota exhausted, all four network stages, retry, success refresh |
| Gallery | organisation list, tag filter, preview, empty/error, expired signed URL recovery |
| Payments | pack calculation, order start, Checkout success/dismiss/error, verify, history |
| Notifications | relevant list, polling refresh, subscribe/unsubscribe, push/click handling, denied permission, badge semantics, cleanup |
| PWA/a11y | manifest/worker registration, offline page, key interactions and labels |

## Delivery sequence

Foundation → auth → Product Owner → Admin → User gallery/upload → payments/notifications → PWA/accessibility → deployment. Keep every milestone usable against the documented API or deterministic mocks.
