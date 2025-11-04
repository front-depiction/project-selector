# Authentication System Documentation

## ✅ Complete Setup

### 1. **Frontend Auth (Clerk + Convex)**

- **Provider**: `app/providers.tsx` - ClerkProvider with custom sign-in/sign-up URLs
- **Sign-in page**: `app/sign-in/[[...sign-in]]/page.tsx`
- **Sign-up page**: `app/sign-up/[[...sign-up]]/page.tsx`
- **Middleware**: `middleware.ts` - Protects `/student/*` and `/admin/*` routes

### 2. **Backend Auth (Convex)**

- **Auth config**: `convex/auth.config.ts` - JWT verification with Clerk
- **User schema**: `convex/schema.ts` - Users table with Clerk integration
- **User mutations**: `convex/users.ts`
  - `getOrCreateUser` - Manual user creation on first visit
  - `syncUserFromWebhook` - Auto user sync from Clerk webhooks
  - `updateStudentId` - Link student IDs to Clerk accounts
  - `getUserByClerkId` - Query user by Clerk ID
  - `getCurrentUser` - Get authenticated user
  - `getUserByStudentId` - Query by student ID (admin function)

### 3. **Webhook Integration**

- **Endpoint**: `app/api/webhooks/clerk/route.ts`
- **URL**: `https://project-selector-theta.vercel.app/api/webhooks/clerk`
- **Events handled**: `user.created`, `user.updated`
- **Security**: SVIX signature verification

## 🔐 Environment Variables

### Required in `.env.local` (Development):

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://rapid-grouper-83.clerk.accounts.dev
CLERK_WEBHOOK_SECRET=whsec_...

# Convex
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud
CONVEX_DEPLOYMENT=...
```

### Required in Vercel (Production):

Same as above, but with production Clerk keys

## 📋 Setup Checklist

### In Clerk Dashboard:

- [x] Create application
- [x] Get publishable and secret keys
- [ ] Configure webhook:
  - URL: `https://project-selector-theta.vercel.app/api/webhooks/clerk`
  - Events: `user.created`, `user.updated`
  - Copy signing secret
- [ ] Set custom sign-in/sign-up URLs (optional):
  - Sign-in URL: `/sign-in`
  - Sign-up URL: `/sign-up`

### In Vercel Dashboard:

- [ ] Add all environment variables
- [ ] Redeploy after adding env vars

### In Convex Dashboard:

- [x] Link project
- [x] Configure auth provider (Clerk)
- [x] Deploy schema and functions

## 🔄 Authentication Flow

### User Sign-up:

1. User visits `/sign-up`
2. Fills out Clerk sign-up form
3. Clerk creates account
4. **Webhook fires** → `syncUserFromWebhook` creates user in Convex
5. User redirected to `/` (home)

### User Sign-in:

1. User visits `/sign-in`
2. Enters credentials
3. Clerk authenticates
4. JWT token issued
5. ConvexProviderWithClerk verifies token
6. User can access protected routes

### Student ID Assignment:

1. User visits `/student` (authenticated)
2. If no `studentId`, shows `StudentIdForm`
3. Student enters their ID
4. `updateStudentId` mutation links ID to Clerk account
5. Redirects to `/student/select`

## 🛡️ Protected Routes

- `/student/*` - Requires authentication
- `/admin/*` - Requires authentication
- `/api/webhooks/*` - Public (protected by SVIX signature)

## 🔍 Testing

### Test Authentication:

1. Sign up at: `https://project-selector-theta.vercel.app/sign-up`
2. Check Convex dashboard → Data → users table
3. User should appear automatically (via webhook)

### Test Webhook:

1. Sign up a new user
2. Go to Clerk Dashboard → Webhooks → Your endpoint
3. Click "Requests" tab
4. Should see successful `200` responses

## 🚨 Troubleshooting

### "Missing CLERK_WEBHOOK_SECRET":

- Add secret to Vercel env vars
- Redeploy

### Webhook failures:

- Check Clerk Dashboard → Webhooks → Requests for error details
- Verify endpoint is publicly accessible
- Check Convex logs for mutation errors

### Users not syncing:

- Verify webhook is configured correctly
- Check webhook signing secret matches
- Ensure `NEXT_PUBLIC_CONVEX_URL` is set in Vercel

## 📚 Documentation Links

- [Clerk Webhooks](https://clerk.com/docs/webhooks/overview)
- [Convex Auth](https://docs.convex.dev/auth)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
