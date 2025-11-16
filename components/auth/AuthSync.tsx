"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

/**
 * Component that syncs studentId from localStorage to Convex after authentication
 */
export function AuthSync() {
  const { user, isLoading } = useAuth();
  const setStudentId = useMutation(api.users.setStudentId);

  useEffect(() => {
    const syncStudentId = async () => {
      if (isLoading || !user) return;
      
      // If user already has studentId, we're done
      if (user.studentId) return;
      
      // Check localStorage for temp studentId from login
      const tempStudentId = localStorage.getItem("tempStudentId");
      if (tempStudentId) {
        try {
          await setStudentId({ studentId: tempStudentId });
          localStorage.removeItem("tempStudentId");
          // Also set in main studentId key
          localStorage.setItem("studentId", tempStudentId);
        } catch (error) {
          console.error("Failed to sync studentId:", error);
        }
      }
    };

    syncStudentId();
  }, [user, isLoading, setStudentId]);

  return null; // This component doesn't render anything
}

