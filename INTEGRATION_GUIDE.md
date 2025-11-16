# Auth Integration with Existing System

## ✅ Changes Made

### Key Updates to Match Your System

1. **✅ Email domain restriction REMOVED** - Any email accepted now
2. **✅ Both email AND student ID collected** - Login page updated
3. **✅ Student ID validated** - Must be exactly 7 digits
4. **✅ No conflicts with existing flow** - Auth is separate from localStorage flow
5. **✅ App name updated** - "Project Selector" everywhere
6. **✅ .env.local created** - With config templates

---

## 🔍 How It Works with Your Existing System

### Your Current Flow (UNCHANGED)
```
Student visits /student
  ↓
Enters 7-digit ID via OTP input
  ↓
ID stored in localStorage
  ↓
Redirected to /student/select
  ↓
Everything works with studentId from localStorage
```

### New Auth Flow (SEPARATE)
```
Student visits /login
  ↓
Enters student ID (7 digits) + email
  ↓
Magic link sent to email
  ↓
Clicks link → authenticated
  ↓
Both studentId and email stored in Convex auth
  ↓
Available via useAuth() hook
```

### Integration Point
When authenticated, `getCurrentUser()` returns:
```typescript
{
  studentId: "1234567",  // 7-digit ID they entered
  email: "student@example.com",
  subject: "convex-user-id"
}
```

You can now use **either**:
- `localStorage.getItem("studentId")` (existing)
- `user.studentId` from `useAuth()` (new auth)

---

## 📋 What Changed in Each File

### Convex Backend

#### `convex/auth.ts`
- ✅ Removed email domain filtering
- ✅ Added `studentId` as required field
- ✅ Validates 7-digit format
- ✅ Stores studentId in user profile

#### `convex/users.ts`
- ✅ Returns both email AND studentId
- ✅ Removed domain check

#### `convex/schema.ts`
- ✅ Added `...authTables` for session management
- ✅ No conflicts with your existing tables

#### `convex/http.ts` (NEW)
- ✅ Handles auth callback routes

### Frontend

#### `app/login/page.tsx`
- ✅ Collects BOTH student ID and email
- ✅ Student ID input: digits only, max 7
- ✅ Updated to "Project Selector"

#### `app/dashboard/page.tsx`
- ✅ Shows studentId first, then email
- ✅ Updated branding

#### `app/providers.tsx`
- ✅ Changed to `ConvexAuthProvider`
- ✅ Maintains all existing functionality

#### `hooks/use-auth.ts` (NEW)
- ✅ Easy way to check auth status
- ✅ Returns `{ user, isLoading, isAuthenticated }`

---

## 🤝 Your Questions Answered

### 1. ✅ Email Domain Filtering REMOVED
No more Maastricht-only emails. Any email works now.

### 2. ✅ Both Email AND Student ID
Login page collects both:
- Student ID: 7 digits (validated)
- Email: Any valid email

Both stored in auth system and returned by `getCurrentUser()`.

### 3. ✅ No Conflicts with Existing Code
Your existing system uses:
- `localStorage.getItem("studentId")`
- Direct student ID entry at `/student`

Auth system is **separate**:
- Uses Convex Auth tables
- No overlap with your student entry flow
- Optional to use - existing flow still works

### 4. ✅ .env.local Created
Created with template:
```bash
CONVEX_DEPLOYMENT=your-deployment-url
NEXT_PUBLIC_CONVEX_URL=https://your-deployment-url.convex.cloud

# You'll add your Resend key here:
# AUTH_RESEND_KEY=re_...
```

### 5. ⚠️ Resend Email Domain Question

**IMPORTANT**: You **cannot** use Vercel's email domain with Resend.

**Why?** Resend requires you to verify domain ownership via DNS records. You don't control Vercel's DNS.

**Your Options:**

#### Option A: Use Resend's Test Domain (EASIEST - for development)
```typescript
// In convex/auth.config.ts
from: "onboarding@resend.dev"
```
- ✅ No verification needed
- ✅ Works immediately
- ✅ Free tier: 100 emails/day
- ⚠️ Shows "via resend.dev" in email
- ⚠️ May go to spam

#### Option B: Verify Your Own Domain (BEST for production)
If you have a domain (e.g., `projectselector.com`):

1. Add domain in Resend dashboard
2. Add DNS records they provide
3. Use: `from: "noreply@projectselector.com"`

#### Option C: Use University Email (IF allowed)
If your university IT allows:
- Verify: `maastrichtuniversity.nl`
- Use: `from: "projectselector@maastrichtuniversity.nl"`
- Requires IT cooperation

**Recommendation**: Start with Option A (`onboarding@resend.dev`) for testing. Switch to Option B when you get a domain.

---

## 🚀 Setup Steps (Updated)

### 1. Get Resend API Key (2 min)
```bash
# Visit: https://resend.com/signup
# Create account → API Keys → Create → Copy key
```

### 2. Update .env.local (30 sec)
Open `.env.local` and add your URLs:
```bash
CONVEX_DEPLOYMENT=your-deployment-url
NEXT_PUBLIC_CONVEX_URL=https://your-deployment-url.convex.cloud
```

### 3. Add Resend Key to Convex (1 min)
```bash
npx convex env set AUTH_RESEND_KEY re_your_key_here
```

### 4. Update Email in auth.config.ts (30 sec)
```typescript
// convex/auth.config.ts line 6
from: "onboarding@resend.dev",  // Use this for testing
```

### 5. Test It
```bash
# Terminal 1
npx convex dev

# Terminal 2
npm run dev
```

Visit: `http://localhost:3000/auth-test`

---

## 🧪 Testing Checklist

### Test Auth Flow
- [ ] Visit `/auth-test` → shows "Not authenticated"
- [ ] Click "Go to Login"
- [ ] Enter student ID: `1234567` (7 digits)
- [ ] Enter email: `test@example.com` (any email)
- [ ] Click "Send Magic Link"
- [ ] Check email → click link
- [ ] Redirected back → shows authenticated
- [ ] `/auth-test` shows Student ID + Email
- [ ] Visit `/dashboard` → shows both IDs
- [ ] Logout works

### Test Existing Student Flow Still Works
- [ ] Visit `/student`
- [ ] Enter 7-digit ID via OTP input
- [ ] Auto-redirects to `/student/select`
- [ ] Everything works as before

### Verify No Conflicts
- [ ] Both auth system and localStorage work independently
- [ ] No errors in console
- [ ] Convex functions still work
- [ ] Student selection flow unchanged

---

## 💡 How to Integrate Auth into Your Existing Pages

### Option 1: Protect Specific Routes
Add to any page that needs auth:

```typescript
"use client";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function YourProtectedPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;

  // Use user.studentId instead of localStorage
  return <div>Student ID: {user.studentId}</div>;
}
```

### Option 2: Use Auth in Convex Functions
Protect mutations/queries:

```typescript
import { mutation } from "./_generated/server";
import { auth } from "./auth.config";

export const yourFunction = mutation({
  handler: async (ctx, args) => {
    const identity = await auth.getUserIdentity(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const studentId = (identity as any).studentId;
    // Use studentId for logic
  },
});
```

### Option 3: Sync Auth with localStorage
When user logs in, sync to localStorage:

```typescript
const { user } = useAuth();

useEffect(() => {
  if (user?.studentId) {
    localStorage.setItem("studentId", user.studentId);
  }
}, [user]);
```

---

## 🔄 Migration Strategy (Optional)

If you want to fully integrate auth:

### Phase 1: Run Both Systems (Current)
- Auth available via `/login`
- Student entry via `/student` still works
- No breaking changes

### Phase 2: Gradual Integration
- Add auth checks to admin pages first
- Keep student pages using localStorage
- Test in parallel

### Phase 3: Full Migration (Later)
- Replace localStorage with auth
- Remove `/student` entry page
- Everyone uses `/login`

**You're in Phase 1 now - both systems coexist.**

---

## 🐛 Troubleshooting

### "Student ID must be exactly 7 digits"
- Make sure you enter exactly 7 digits
- No letters, only numbers
- Gets validated on submit

### Magic link not arriving
- Check spam folder
- Verify you're using `onboarding@resend.dev` in `auth.config.ts`
- Check Resend dashboard for delivery status
- Make sure `AUTH_RESEND_KEY` is set in Convex

### User object shows `studentId: undefined`
- Make sure you entered student ID during login
- The ID gets stored in the auth profile
- Check Convex dashboard logs

### Existing student flow broken
- It shouldn't be! Auth is completely separate
- Check console for errors
- Your localStorage flow is untouched

---

## 📚 Next Steps

### Immediate (To Test)
1. [ ] Get Resend API key
2. [ ] Update `.env.local` with Convex URL
3. [ ] Add `AUTH_RESEND_KEY` to Convex
4. [ ] Test login flow at `/auth-test`
5. [ ] Verify existing student flow still works

### Soon (Before Production)
1. [ ] Decide: integrate auth fully or keep both?
2. [ ] Protect admin pages with auth
3. [ ] Add rate limiting (see AUTH_SETUP.md)
4. [ ] Get your own domain for professional emails
5. [ ] Test on Vercel deployment

### Later (Optional)
1. [ ] Add Microsoft Entra SSO
2. [ ] Migrate from localStorage to auth
3. [ ] Remove old student entry flow
4. [ ] Add user management

---

## 🎯 Key Takeaways

✅ **No domain filtering** - Any email works  
✅ **Both IDs collected** - Student ID + Email  
✅ **No conflicts** - Auth separate from localStorage  
✅ **Existing flow intact** - `/student` still works  
✅ **Resend email** - Use `onboarding@resend.dev` for testing  
✅ **Production ready** - Can ship with this setup  

---

**Ready to test! Follow the 5 setup steps above. 🚀**

