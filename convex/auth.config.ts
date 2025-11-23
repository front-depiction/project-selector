import { convexAuth } from "@convex-dev/auth/server";
import Resend from "@auth/core/providers/resend";
import MicrosoftEntraID from "@auth/core/providers/microsoft-entra-id";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    // Email magic links
    Resend({
      from: "onboarding@resend.dev",
      apiKey: process.env.AUTH_RESEND_KEY,
    }),
    // Microsoft Entra ID - works with any Microsoft account (personal or work/school)
    // Set tenantId to "common" to allow both personal and work/school accounts
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.AUTH_MICROSOFT_TENANT_ID || "common", // "common" allows any Microsoft account
    }),
    // Google OAuth - works with any Google account
    Google({
      clientId: process.env.AUTH_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET!,
    }),
  ],
});

