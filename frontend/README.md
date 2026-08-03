# ImageVault Frontend

Next.js PWA for Product Owner, Admin, and User workflows. It uses NextAuth credentials/JWT sessions and calls the separate Express API.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm test -- --runInBand
npm run lint
npm run dev
```

Required frontend environment:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-long-random-secret
```

Passwords, account emails, AWS/Razorpay/VAPID private secrets, quota, prices, limits, and polling intervals do not belong in frontend source. The frontend obtains safe business rules and the VAPID public key from `GET /api/config/public`.

## Verification

Run `npm test -- --runInBand`, `npm run lint`, and `npm run build`. Push notifications require VAPID values on the backend and HTTPS (or supported localhost development). Provider-backed upload/payment checks also require the backend services described in [the build guide](../docs/BUILD_GUIDE.md).
