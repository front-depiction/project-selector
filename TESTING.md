# Quick Testing Guide

## 🚀 Start Testing in 3 Steps

### Step 1: Get Resend API Key (2 minutes)

1. Go to [https://resend.com/signup](https://resend.com/signup)
2. Sign up (free)
3. Go to **API Keys** → **Create API Key**
4. Copy the key (starts with `re_...`)

### Step 2: Configure Convex (1 minute)

Add your Resend key to Convex:

```bash
npx convex env set AUTH_RESEND_KEY re_your_key_here
```

OR via dashboard:
1. Open your Convex dashboard
2. Go to **Settings** → **Environment Variables**
3. Add: `AUTH_RESEND_KEY` = `re_your_key_here`

### Step 3: Update Email Config (30 seconds)

Edit `convex/auth.config.ts` line 6:

```typescript
from: "onboarding@resend.dev",  // Use this for testing (no domain verification needed)
// OR use your own verified domain:
// from: "noreply@yourdomain.com",
```

---

## ▶️ Run the App

### Terminal 1: Start Convex
```bash
npx convex dev
```

Wait for: `✓ Deployed functions` message

### Terminal 2: Start Next.js
```bash
npm run dev
```

---

## 🧪 Test the Flow

### 1. Visit the Test Page
```
http://localhost:3000/auth-test
```

You should see "❌ Not authenticated"

### 2. Click "Go to Login Page"

Enter an email: `yourname@student.maastrichtuniversity.nl`

Click "Send Magic Link"

### 3. Check Your Email

Look for email from `onboarding@resend.dev` (or your domain)

Subject: "Sign in to [Your App]"

Click the magic link

### 4. You're In! 🎉

You should be redirected and see:
- ✅ Authenticated
- Your email address
- User ID

### 5. Test Protected Routes

Visit: `http://localhost:3000/dashboard`

You should see your dashboard with user info.

### 6. Test Logout

Click "Sign Out" button

You should be redirected to login.

---

## 🔍 What to Test

- ✅ **Valid email works** - `test@student.maastrichtuniversity.nl`
- ✅ **Invalid domain rejected** - `test@gmail.com` should show error
- ✅ **Magic link works** - Email arrives and clicking logs you in
- ✅ **Session persists** - Refresh page, still logged in
- ✅ **Protected routes** - `/dashboard` requires auth
- ✅ **Logout works** - Signs you out and redirects
- ✅ **Auth state** - Check `/auth-test` shows correct status

---

## 🐛 Common Issues

### "Resend error: Missing API key"
→ Make sure you ran: `npx convex env set AUTH_RESEND_KEY re_...`

### "Magic link not arriving"
→ Check spam folder
→ Verify you used `onboarding@resend.dev` in `auth.config.ts`
→ Check Resend dashboard for delivery status

### "Only @student.maastrichtuniversity.nl emails allowed"
→ This is working correctly! Use a university email.

### "Cannot find module '@convex-dev/auth'"
→ Run: `npm install`

### Convex dev not starting
→ Make sure you have `NEXT_PUBLIC_CONVEX_URL` in `.env.local`
→ Run: `npx convex dev --once` to initialize

---

## 📍 Test URLs

- **Test Page**: http://localhost:3000/auth-test
- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard (protected)
- **Home**: http://localhost:3000/

---

## ✅ Success Criteria

If all these work, you're ready for production:

1. [ ] Can sign in with university email
2. [ ] Non-university emails are rejected
3. [ ] Magic link arrives in email
4. [ ] Clicking magic link authenticates you
5. [ ] Session persists across page refreshes
6. [ ] Protected pages redirect when not authenticated
7. [ ] Logout works and clears session
8. [ ] Auth state visible in `/auth-test`

---

## 🎯 Next: Integrate with Your Existing Pages

Once testing works, protect your existing pages:

### Option 1: Client Component with Hook

```typescript
"use client";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function YourPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;

  return <div>Your protected content</div>;
}
```

### Option 2: Protect Convex Functions

```typescript
import { auth } from "./auth.config";

export const yourFunction = mutation({
  handler: async (ctx, args) => {
    const identity = await auth.getUserIdentity(ctx);
    if (!identity?.email?.endsWith("@student.maastrichtuniversity.nl")) {
      throw new Error("Unauthorized");
    }
    // Your code
  },
});
```

---

**Ready? Start with Step 1! 🚀**

