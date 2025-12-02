import { AuthConfig } from "convex/server"

/**
 * Auth0 configuration for Convex backend.
 * Uses environment variables set in Convex dashboard for different environments.
 * 
 * @see https://docs.convex.dev/auth/auth0
 */
export default {
  providers: [
    {
      // Auth0 domain (e.g., "your-tenant.us.auth0.com")
      domain: process.env.AUTH0_DOMAIN!,
      // Auth0 client/application ID
      applicationID: process.env.AUTH0_CLIENT_ID!,
    },
  ],
} satisfies AuthConfig

