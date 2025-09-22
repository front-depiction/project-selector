"use client";

import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export default function AdminAuthPage() {
const router = useRouter();

function handleEnter() {
router.replace("/admin/dashboard");
}

return (
<div className="min-h-[70vh] flex items-center justify-center px-4">
    <Card className="w-full max-w-md border-0 shadow-sm">
    <CardHeader className="space-y-2">
        <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center">
        <ShieldCheck className="h-8 w-8" />
        </div>
        <CardTitle className="text-center">Admin Access</CardTitle>
        <CardDescription className="text-center">
        Temp screen - replace with atuehtification
        </CardDescription>
    </CardHeader>
    <CardContent>
        <Button size="lg" onClick={handleEnter} className="w-full">
        enter Admin Dashboard
        </Button>
    </CardContent>
    </Card>
</div>
);
}