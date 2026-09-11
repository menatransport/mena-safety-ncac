"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Loading from "@/components/loading";
import Swal from "sweetalert2";

/**
 * เส้นทางที่เข้าได้โดยไม่ต้อง login ด้วย userData
 *   /login  — หน้าเข้าสู่ระบบเอง
 *   /lesson — Safety Self Learning ฝั่งผู้เรียน ยืนยันตัวตนด้วย driver_id อย่างเดียว
 *             (ไม่ครอบ /lesson-admin ซึ่งยังต้อง login ตามปกติ)
 */
const isPublicPath = (pathname: string) =>
    pathname === "/login" || pathname === "/lesson" || pathname.startsWith("/lesson/");

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {

        if (isPublicPath(pathname)) {
            setIsLoading(false);
            setIsAuthenticated(true);
            return;
        }

        const user = localStorage.getItem("userData");

        if (!user) {
            const currentUrl = searchParams.toString()
                ? `${pathname}?${searchParams.toString()}`
                : pathname;
            const redirectUrl = encodeURIComponent(currentUrl);
            Swal.fire({
                icon: "warning",
                title: "Unauthorized",
                text: "โปรดเข้าสู่ระบบเพื่อใช้งาน",
                confirmButtonText: "OK",
            }).then(() => {
                setTimeout(() => {
                    router.replace("/login");
                }, 500);
            });
        } else {
            setIsAuthenticated(true);
        }

        setIsLoading(false);
    }, [pathname, router]);

    if (isLoading) {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(127, 255, 212, 0.6)' }}>
                <Loading />
            </div>
        );
    }

    if (!isAuthenticated && !isPublicPath(pathname)) {
        return null;
    }

    return <>{children}</>;
}
