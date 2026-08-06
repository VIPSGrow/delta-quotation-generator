"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side guard that checks the session cookie via a lightweight API.
 * Used alongside middleware for defense-in-depth.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        fetch("/api/auth/login", { method: "GET" })
            .then((res) => {
                if (!res.ok) {
                    router.replace("/login");
                } else {
                    setChecking(false);
                }
            })
            .catch(() => {
                router.replace("/login");
            });
    }, [router]);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    return <>{children}</>;
}
