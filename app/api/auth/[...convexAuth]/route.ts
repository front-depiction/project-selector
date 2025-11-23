import { handlers } from "@convex-dev/auth/nextjs";
import auth from "@/convex/auth.config";

export const { GET, POST } = handlers(auth);

