# Authentication Setup Guide

## ✅ Completed Installation

All code has been implemented. Here's what was added:

### Files Created/Modified:

#### Convex Backend:
- ✅ `convex/auth.config.ts` - Main auth configuration
- ✅ `convex/auth.ts` - Sign in/out mutations with email domain check
- ✅ `convex/users.ts` - User query with domain validation
- ✅ `convex/http.ts` - HTTP routes for auth callbacks
- ✅ `convex/schema.ts` - Updated with auth tables

#### Next.js Frontend:
- ✅ `app/providers.tsx` - Updated to use ConvexAuthProvider
- ✅ `app/login/page.tsx` - Login page with magic link
- ✅ `app/dashboard/page.tsx` - Protected dashboard example
- ✅ `components/auth/LogoutButton.tsx` - Logout component
- ✅ `hooks/use-auth.ts` - Reusable auth hook

---

## 🚀 Setup Steps

### 1. Get a Resend API Key

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day)
3. Verify your domain OR use the testing domain `onboarding@resend.dev` for development
4. Go to **API Keys** and create a new key
5. Copy the key (starts with `re_...`)

### 2. Configure Convex Environment Variables

Add the Resend key to your Convex deployment:

```bash
# Option 1: Via Convex Dashboard
# 1. Go to your Convex dashboard
# 2. Settings → Environment Variables
# 3. Add: AUTH_RESEND_KEY = re_your_key_here

# Option 2: Via CLI
npx convex env set AUTH_RESEND_KEY re_your_key_here
```

### 3. Update the "from" Email Address

Edit `convex/auth.config.ts`:

```typescript
Resend({
  from: "noreply@yourdomain.com", // Replace with your verified domain
  // OR for testing:
  from: "onboarding@resend.dev",
  apiKey: process.env.AUTH_RESEND_KEY,
}),
```

### 4. Deploy to Convex

```bash
npx convex dev
# or for production:
npx convex deploy
```

This will create the auth tables and HTTP routes.

### 5. Test the Authentication Flow

1. Start your Next.js app:
   ```bash
   npm run dev
   ```

2. Navigate to `/login`

3. Enter an email ending with `@student.maastrichtuniversity.nl`

4. Check your email for the magic link

5. Click the link → you'll be redirected and authenticated

6. Navigate to `/dashboard` to see your protected page

---

## 🔒 Security Features

✅ **Email domain restriction** - Only `@student.maastrichtuniversity.nl` emails allowed  
✅ **Magic link authentication** - No passwords to manage  
✅ **Double validation** - Domain checked both at sign-in and in every protected query  
✅ **Automatic session management** - 30-day sessions by default  
✅ **Works on Vercel domains** - No custom domain needed  

---

## 📝 How to Protect Your Existing Pages

### Method 1: Using the `useAuth` hook

```typescript
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function YourPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;

  return <div>Protected content - User: {user.email}</div>;
}
```

### Method 2: Protecting Convex Functions

Add domain check to any mutation/query:

```typescript
import { mutation } from "./_generated/server";
import { auth } from "./auth.config";

export const yourProtectedMutation = mutation({
  handler: async (ctx, args) => {
    const identity = await auth.getUserIdentity(ctx);
    if (!identity?.email?.endsWith("@student.maastrichtuniversity.nl")) {
      throw new Error("Unauthorized");
    }
    
    // Your protected logic here
  },
});
```

---

## 🎯 Next Steps

### For Production:

1. **Upgrade Resend** - Free tier is 100 emails/day. Upgrade before launch.

2. **Add Rate Limiting** - See section below.

3. **Configure Session Duration** (optional):
   ```typescript
   // In convex/auth.config.ts
   export const { auth, signIn, signOut } = convexAuth({
     providers: [...],
     session: {
       totalDurationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
     },
   });
   ```

4. **Monitor Auth Failures** - Add logging to track failed attempts.

### For Microsoft Entra SSO (Later):

When you get Azure AD app registration for Maastricht University:

1. Install provider:
   ```bash
   npm install @auth/core
   ```

2. Update `convex/auth.config.ts`:
   ```typescript
   import AzureAD from "@auth/core/providers/azure-ad";
   
   export const { auth, signIn, signOut } = convexAuth({
     providers: [
       Resend({ ... }), // Keep for fallback
       AzureAD({
         clientId: process.env.AZURE_AD_CLIENT_ID,
         clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
         tenantId: "your-maastricht-tenant-id",
       }),
     ],
   });
   ```

3. Add SSO button to login page:
   ```typescript
   import { useAuthActions } from "@convex-dev/auth/react";
   
   const { signIn } = useAuthActions();
   
   <button onClick={() => signIn("azuread")}>
     Sign in with Microsoft
   </button>
   ```

---

## 🛡️ Rate Limiting (Recommended for Production)

Create `convex/rateLimits.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const RateLimit = {
  key: v.string(),
  count: v.number(),
  timestamp: v.number(),
};

// Add to schema.ts:
// rateLimits: defineTable(RateLimit).index("by_key", ["key"]),
```

Update `convex/auth.ts`:

```typescript
export const signInMagicLink = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Rate limit check
    const rateLimitKey = `magiclink:${email}`;
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", rateLimitKey))
      .first();

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (existing && now - existing.timestamp < oneHour) {
      if (existing.count >= 5) {
        throw new Error("Too many attempts. Try again in 1 hour.");
      }
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      if (existing) {
        await ctx.db.patch(existing._id, { count: 1, timestamp: now });
      } else {
        await ctx.db.insert("rateLimits", { key: rateLimitKey, count: 1, timestamp: now });
      }
    }

    // Domain check
    if (!email.endsWith("@student.maastrichtuniversity.nl")) {
      throw new Error("Only @student.maastrichtuniversity.nl emails allowed");
    }

    return signIn(ctx, { email, provider: "resend" });
  },
});
```

---

## 🧪 Testing Checklist

- [ ] Magic link email arrives
- [ ] Non-university emails are rejected
- [ ] Login redirects to dashboard
- [ ] Dashboard shows user email
- [ ] Logout works and redirects to login
- [ ] Protected pages redirect when not authenticated
- [ ] Sessions persist across page refreshes
- [ ] Works on Vercel deployment (not just localhost)

---

## 🐛 Troubleshooting

### "Magic link not arriving"

1. Check spam folder
2. Verify Resend API key is set in Convex dashboard
3. Check Resend dashboard for delivery logs
4. Make sure you're using a verified "from" domain (or `onboarding@resend.dev` for testing)

### "Unauthorized email domain" after clicking magic link

- The email verification might have passed, but the domain check in `getCurrentUser` failed
- Make sure you're using an email that ends with `@student.maastrichtuniversity.nl`
- Check Convex function logs in the dashboard

### "Session not persisting"

- Make sure you're using `ConvexAuthProvider` (not `ConvexProvider`)
- Check browser console for errors
- Clear localStorage and try again

### "Module not found" errors

- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then `npm install`
- Restart your dev server

---

## 📚 Additional Resources

- [Convex Auth Docs](https://labs.convex.dev/auth)
- [Resend Docs](https://resend.com/docs)
- [Auth.js Providers](https://authjs.dev/getting-started/providers)

---

**You're all set! 🎉**

Run `npx convex dev` and `npm run dev` to test the authentication flow.

