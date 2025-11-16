import { convexAuth } from "@convex-dev/auth/server";
import Resend from "@auth/core/providers/resend";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Resend({
      from: "noreply@yourdomain.com", 
      apiKey: process.env.AUTH_RESEND_KEY,
    }),
  ],
});

