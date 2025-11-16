import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Re-export signIn and signOut actions from auth.config
// These will be callable from the client
export { signIn, signOut } from "./auth.config";

// Custom mutation to validate and store studentId
export const validateAndSignIn = mutation({
  args: { 
    email: v.string(),
    studentId: v.string(),
  },
  handler: async (ctx, { email, studentId }) => {
    // Validate student ID format (7 digits)
    if (!/^\d{7}$/.test(studentId)) {
      throw new Error("Student ID must be exactly 7 digits");
    }
    
    // Store student ID in a users table or return for client to use with signIn
    // For now, return validation success - the client will call signIn with this data
    return { validated: true, email, studentId };
  },
});

