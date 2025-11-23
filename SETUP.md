# Authentication Setup Guide

This guide covers setting up OAuth providers for Project Selector. The app supports Google OAuth, Microsoft OAuth, and Email magic links.

## Microsoft OAuth Setup

**Step-by-step:**

1. Go to [Azure Portal](https://portal.azure.com) and sign in
2. **Important:** Use the top search bar (not the navigation menu) - type **"App registrations"** and click it
   - This bypasses admin permission requirements
   - If you see "Access Denied" when navigating through Azure Active Directory, this direct search will work
3. Click **"+ New registration"** button (top left)
4. Fill in:
   - **Name**: `Project Selector`
   - **Supported account types**: Select **"Accounts in any organizational directory and personal Microsoft accounts (Multitenant)"** (third option)
   - **Redirect URI**:
     - Platform: Select **"Web"**
     - URI: `http://localhost:3000/api/auth/callback/microsoft-entra-id`
5. Click **"Register"**
6. Copy **Application (client) ID** from the Overview page (click copy icon)
7. Go to **"Certificates & secrets"** → **"+ New client secret"**
   - Description: `Project Selector Secret`
   - Expires: 24 months
   - Click **"Add"**
   - **Copy the Value immediately** (you won't see it again!)
8. Add to Convex:
   npx convex env set AUTH_MICROSOFT_CLIENT_ID "your-client-id"
   npx convex env set AUTH_MICROSOFT_CLIENT_SECRET "your-client-secret"
9. Add to Convex:
   ```bash
   npx convex env set AUTH_MICROSOFT_CLIENT_ID "your-client-id"
   npx convex env set AUTH_MICROSOFT_CLIENT_SECRET "your-client-secret"
   ```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Configure OAuth consent screen
3. Create OAuth client → Add redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Add to Convex:
   ```bash
   npx convex env set AUTH_GOOGLE_CLIENT_ID "your-client-id"
   npx convex env set AUTH_GOOGLE_CLIENT_SECRET "your-client-secret"
   ```

## Email Setup (Resend)

```bash
npx convex env set AUTH_RESEND_KEY "re_xxxxx"
```

Get your API key from [resend.com](https://resend.com)

## Testing

After setup, run:

```bash
# Terminal 1
npx convex dev

# Terminal 2
npm run dev
```

Visit `http://localhost:3000/login` and test all three authentication methods.
