# Project Topic Selection System

A Next.js application for university project topic selection with real-time congestion awareness, powered by Convex and Auth0 authentication.

## Features

- **Real-time Topic Selection**: Students can rank their preferred project topics with live congestion feedback
- **Auth0 Authentication**: Secure login with Auth0 integration
- **Email Allow-List**: Optional per-topic access restrictions based on allowed student emails
- **Admin Dashboard**: Manage topics, selection periods, and view analytics
- **Real-time Analytics**: Live insights into the selection process

## Getting Started

### Prerequisites

- Node.js 20 LTS or newer
- A [Convex](https://convex.dev) account
- An [Auth0](https://auth0.com) account

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Auth0

1. **Create an Auth0 Application**:
   - Go to [Auth0 Dashboard](https://manage.auth0.com/dashboard/)
   - Create a new **Single Page Application**
   - In Settings, configure:
     - **Allowed Callback URLs**: `http://localhost:3000`
     - **Allowed Logout URLs**: `http://localhost:3000`
     - **Allowed Web Origins**: `http://localhost:3000`

2. **Note your Auth0 credentials**:
   - Domain (e.g., `your-tenant.us.auth0.com`)
   - Client ID

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Auth0 - Client-side
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
```

### 4. Configure Convex Backend

Set environment variables in the Convex Dashboard (Settings > Environment Variables):

```
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
```

Then deploy the auth configuration:

```bash
npx convex dev
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Authentication & Authorization

### How Authentication Works

1. Users click "Log In" and are redirected to Auth0
2. After successful login, Auth0 redirects back to the app
3. The app stores/updates user info in Convex on first login
4. The user's allow-list status is checked against the allow-list table

### Email Allow-List

The allow-list system allows restricting certain topics to specific students:

1. **Allow-List Table**: Admins can add/remove student emails via the Convex Dashboard
2. **Per-Topic Restriction**: Topics can have `requiresAllowList: true` to restrict access
3. **Backend Enforcement**: The filtering happens server-side in Convex queries

#### Managing the Allow-List

Via the Convex Dashboard, you can:
- Add individual emails with `users:addToAllowList`
- Bulk add emails with `users:bulkAddToAllowList`
- Remove emails with `users:removeFromAllowList`
- View the list with `users:getAllowList`

### Protected Routes

- `/student` - Requires authentication
- `/student/select` - Requires authentication
- Topics with `requiresAllowList: true` - Only visible to allowed users

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── admin/             # Admin dashboard
│   ├── student/           # Student selection portal
│   └── providers.tsx      # Auth0 + Convex providers
├── components/
│   ├── auth/              # Auth components (LoginButton, AuthGuard, etc.)
│   ├── AdminDashboard/    # Admin UI components
│   └── LandingPage/       # Public landing page
├── convex/
│   ├── auth.config.ts     # Auth0 configuration for Convex
│   ├── users.ts           # User management functions
│   ├── topics.ts          # Topic queries with allow-list filtering
│   └── schemas/           # Data schemas
└── lib/                   # Utility functions
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Auth0 React Quickstart](https://auth0.com/docs/quickstart/spa/react)
- [Convex + Auth0 Integration](https://docs.convex.dev/auth/auth0)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

For production, remember to:
1. Update Auth0 callback URLs to your production domain
2. Set environment variables in Vercel
3. Set environment variables in Convex Dashboard for your production deployment
