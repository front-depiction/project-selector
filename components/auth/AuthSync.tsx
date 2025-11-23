"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

/**
 * Component that syncs studentId from localStorage to Convex after authentication
 * Also redirects to student ID collection if user signed in via SSO without student ID
 */
export function AuthSync() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const setStudentId = useMutation(api.users.setStudentId);

  useEffect(() => {
    const syncStudentId = async () => {
      if (isLoading || !isAuthenticated || !user) return;
      
      // If user already has studentId, we're done
      if (user.studentId) return;
      
      // Check localStorage for temp studentId from email login
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
      } else {
        // User signed in via SSO (Google/Microsoft) but no student ID
        // Redirect to collection page if we're not already there
        const currentPath = window.location.pathname;
        if (!currentPath.includes("/login/collect-student-id")) {
          router.push("/login/collect-student-id");
        }
      }
    };

    syncStudentId();
  }, [user, isLoading, isAuthenticated, setStudentId, router]);

  return null; // This component doesn't render anything
}

