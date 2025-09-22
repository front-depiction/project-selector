"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/auth");
  }, [router]);
  return <div className="p-6 text-sm text-muted-foreground">Redirecting…</div>;
}




/* import { AdminDashboard } from "@/components/AdminDashboard/views"

export default function AdminPage() {
  return <AdminDashboard />
} */