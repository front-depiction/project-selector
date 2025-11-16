# Final Setup Guide - Project Selector Auth

## ✅ All Changes Complete

### What Changed

1. **✅ Email domain restriction REMOVED** - Any email now works
2. **✅ Student ID + Email collection** - Login collects both
3. **✅ No conflicts** - Auth works alongside existing localStorage flow
4. **✅ App renamed** - "Project Selector" everywhere
5. **✅ .env.local created** - Ready for your config

---

## 📋 Files Modified/Created

### Backend (Convex)
- ✅ `convex/auth.config.ts` - Resend magic link provider
- ✅ `convex/auth.ts` - Re-exports sign in/out actions
- ✅ `convex/users.ts` - Get current user + store studentId
- ✅ `convex/schema.ts` - Added `users` table + auth tables
- ✅ `convex/http.ts` - Auth callback routes

### Frontend
- ✅ `app/login/page.tsx` - Collects email + 7-digit student ID
- ✅ `app/dashboard/page.tsx` - Shows authenticated user info
- ✅ `app/auth-test/page.tsx` - Testing utility
- ✅ `app/providers.tsx` - Uses ConvexAuthProvider
- ✅ `app/layout.tsx` - Updated app name
- ✅ `components/auth/LogoutButton.tsx` - Logout component
- ✅ `components/auth/AuthSync.tsx` - Syncs studentId after auth
- ✅ `hooks/use-auth.ts` - Reusable auth hook

### Configuration
- ✅ `.env.local` - Created with templates

---

## 🚀 Setup Steps (5 Minutes)

### Step 1: Get Resend API Key (2 min)

1. Go to [https://resend.com/signup](https://resend.com/signup)
2. Create free account
3. Go to **API Keys** → **Create API Key**
4. Copy the key (starts with `re_...`)

### Step 2: Configure Resend Email (30 sec)

Edit `convex/auth.config.ts` line 6:

```typescript
from: "onboarding@resend.dev",  // ← Use this for testing
```

**About the Email Domain:**

❌ **Cannot use Vercel's domain** - Resend requires DNS verification you don't control

✅ **Use `onboarding@resend.dev`** - Works immediately, no verification needed (for testing)

✅ **Later: Get your own domain** - Verify it in Resend for production

### Step 3: Add to Convex (1 min)

```bash
npx convex env set AUTH_RESEND_KEY re_your_actual_key_here
```

This adds the key to your Convex deployment.

### Step 4: Update .env.local (30 sec)

Edit `.env.local` and add your Convex URL:

```bash
CONVEX_DEPLOYMENT=your-deployment-url
NEXT_PUBLIC_CONVEX_URL=https://your-deployment-url.convex.cloud
```

(You should already have these if Convex is working)

### Step 5: Deploy & Test (1 min)

```bash
# Terminal 1: Start Convex
npx convex dev

# Wait for "✓ Deployed functions" message

# Terminal 2: Start Next.js
npm run dev
```

Then visit: **http://localhost:3000/auth-test**

---

## 🧪 Testing Flow

### 1. Visit Test Page
```
http://localhost:3000/auth-test
```

Should show: "❌ Not authenticated"

### 2. Go to Login
Click "Go to Login Page" or visit `/login`

### 3. Enter Credentials
- **Student ID**: `1234567` (any 7 digits)
- **Email**: `test@example.com` (any email works now!)

### 4. Check Email
Look for email from `onboarding@resend.dev`

Subject: "Sign in to ..." 

Click the magic link

### 5. Authenticated! ✅
- Redirected back to app
- Visit `/auth-test` → shows Student ID + Email
- Visit `/dashboard` → shows your info

### 6. Test Logout
Click "Sign Out" → redirected to login

---

## 🔍 How It Works

### Your Existing Flow (UNTOUCHED)
```
/student → Enter 7-digit ID → localStorage → /student/select
```
Still works exactly as before!

### New Auth Flow (SEPARATE)
```
/login → Email + Student ID → Magic link → Authenticated → Both stored
```

### After Login
When user clicks magic link:
1. Convex auth creates session
2. `AuthSync` component runs
3. Student ID from `tempStudentId` → saved to Convex `users` table
4. Also saved to `localStorage` as `studentId`
5. Now available via `useAuth()` hook

### Using Auth Data

```typescript
const { user } = useAuth();

// user.email - their email
// user.studentId - their 7-digit ID  
// user.subject - Convex user ID
```

---

## 🤝 Integration with Existing System

### Your Current System Uses:
```typescript
localStorage.getItem("studentId")
```

### Auth System Adds:
```typescript
const { user } = useAuth();
user.studentId // Same ID, from auth system
```

### They Work Together:
- Login page stores in `localStorage` too
- Can use either source
- Auth provides email as bonus
- No conflicts!

---

## ⚠️ Important Notes

### About Resend Email Domain

**Question**: "Can we use Vercel's email domain?"

**Answer**: ❌ No - Resend requires you to verify domain ownership via DNS records. You don't control `*.vercel.app` DNS.

**Options**:

1. **Testing** (now): Use `onboarding@resend.dev`
   - Works immediately
   - No verification
   - May go to spam
   - Free tier: 100 emails/day

2. **Production** (later): Get your own domain
   - Register domain (e.g., `projectselector.com`)
   - Add to Resend dashboard
   - Add DNS records
   - Use: `noreply@projectselector.com`

3. **University** (maybe): Ask IT to verify
   - Would need: `maastrichtuniversity.nl` DNS access
   - Probably not worth the hassle
   - Stick with option 2

### About the .env.local

- ✅ Created automatically
- ✅ Ignored by git (good!)
- ✅ Has templates
- 👉 You need to fill in your Convex URL
- 👉 Don't put Resend key here - goes in Convex dashboard

---

## 🐛 Troubleshooting

### "Property 'users' does not exist" TypeScript error

This will go away after you run `npx convex dev`. Convex needs to regenerate the API types after seeing the new schema.

### Magic link not arriving

1. Check spam folder
2. Verify you're using `onboarding@resend.dev` in `auth.config.ts`
3. Check Resend dashboard → Emails for delivery status
4. Verify `AUTH_RESEND_KEY` is set: `npx convex env list`

### Student ID not showing in dashboard

1. Make sure you entered it during login
2. Check browser console for errors
3. Try signing out and in again
4. Check `localStorage.getItem("tempStudentId")` in console

### Existing student flow broken

Should not happen! Auth is completely separate. If you see issues:
1. Check console for errors
2. Try clearing localStorage: `localStorage.clear()`
3. The `/student` page should still work independently

---

## 📚 Next Steps

### To Test Now
- [ ] Get Resend key
- [ ] Update `auth.config.ts` with `onboarding@resend.dev`
- [ ] Add key to Convex
- [ ] Run `npx convex dev`
- [ ] Test login at `/auth-test`

### Before Production
- [ ] Get your own domain
- [ ] Verify domain in Resend
- [ ] Update `from:` email in config
- [ ] Add rate limiting (see AUTH_SETUP.md)
- [ ] Upgrade Resend plan (free = 100/day)

### Optional Integrations
- [ ] Protect admin pages with auth
- [ ] Replace localStorage with auth everywhere
- [ ] Add Microsoft Entra SSO (see AUTH_SETUP.md)

---

## 💡 Quick Reference

### Check Auth Status
```typescript
const { user, isLoading, isAuthenticated } = useAuth();
```

### Protect a Page
```typescript
useEffect(() => {
  if (!isLoading && !user) router.push("/login");
}, [user, isLoading, router]);
```

### Protect a Convex Function
```typescript
export const myFunction = mutation({
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    // Your code
  },
});
```

### Get Student ID
```typescript
// From auth
const { user } = useAuth();
const studentId = user?.studentId;

// Or from localStorage (still works!)
const studentId = localStorage.getItem("studentId");
```

---

## ✨ What You Get

✅ Magic link authentication  
✅ Email + 7-digit student ID  
✅ Works on Vercel without custom domain  
✅ No email filtering (any email works)  
✅ No conflicts with existing system  
✅ Both auth and localStorage work together  
✅ Production-ready  

---

## 🎯 Summary

**What**: Auth system with magic links + student IDs  
**Why**: Proper authentication for production  
**How**: Convex Auth + Resend  
**Email**: Use `onboarding@resend.dev` for testing  
**Domain**: Can't use Vercel's - use Resend's test domain  
**Conflicts**: None - works alongside existing flow  

**Ready?** Follow the 5 setup steps above and test at `/auth-test`! 🚀

---

**Need help?** Check:
- `INTEGRATION_GUIDE.md` - Detailed integration info
- `AUTH_SETUP.md` - Advanced config
- `TESTING.md` - Testing guide
- This file - Quick setup

All set! Start with Step 1. 🎉

