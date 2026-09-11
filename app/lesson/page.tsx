"use client";

// =============================================================================
// Page: /lesson  (mobile first — ธีม 3a)
// -----------------------------------------------------------------------------
// หน้าหลักของผู้เรียน
//   • เข้าใช้งานด้วย driver_id อย่างเดียว — รับผ่าน /lesson?driver_id=xxx ได้
//     โดยไม่ต้องกรอกซ้ำ (จำไว้ใน localStorage)
//   • แสดงความคืบหน้ารวม + รายการบทเรียนของลูกค้าที่สังกัด พร้อมสถานะรายบทเรียน
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, RefreshCw } from "lucide-react";

import type { DriverProfile, LessonWithProgress } from "./type";
import {
    clearDriverSession,
    isDriverSessionStale,
    readDriverSession,
    writeDriverSession,
} from "./constant";
import { DriverLogin } from "./_components/DriverLogin";
import { ProgressHeader } from "./_components/ProgressHeader";
import { LessonCard } from "./_components/LessonCard";

type Summary = { total: number; passed: number; pending: number; percent: number };

const EMPTY_SUMMARY: Summary = { total: 0, passed: 0, pending: 0, percent: 0 };

const FILTERS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "pending", label: "ต้องเรียน" },
    { key: "done", label: "ผ่านแล้ว" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function LessonPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryDriverId = searchParams.get("driver_id")?.trim() ?? "";

    const [driver, setDriver] = useState<DriverProfile | null>(null);
    const [booting, setBooting] = useState(true);
    const [loginError, setLoginError] = useState<string | null>(null);

    const [lessons, setLessons] = useState<LessonWithProgress[]>([]);
    const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterKey>("all");

    /* ── 1. ตัดสินใจว่าจะเข้าด้วย query string หรือ session ที่จำไว้ ── */
    useEffect(() => {
        let cancelled = false;

        const boot = async () => {
            const saved = readDriverSession();
            const stale = isDriverSessionStale(saved);

            // ไม่มี ?driver_id= → ใช้ session เดิมถ้ามี
            if (!queryDriverId && !stale) {
                if (!cancelled) {
                    setDriver(saved);
                    setBooting(false);
                }
                return;
            }

            // ?driver_id= ตรงกับที่จำไว้ และ session ยังใช้ได้ → ไม่ต้องยิง API ซ้ำ
            if (
                !stale &&
                saved?.driver_id?.toLowerCase() === queryDriverId.toLowerCase()
            ) {
                if (!cancelled) {
                    setDriver(saved);
                    setBooting(false);
                }
                router.replace("/lesson");
                return;
            }

            // session เก่าที่ยังไม่มี client_name ให้ดึงโปรไฟล์ใหม่ด้วยรหัสเดิม
            const lookupId = queryDriverId || saved?.driver_id || "";
            if (!lookupId) {
                if (!cancelled) {
                    setDriver(null);
                    setBooting(false);
                }
                return;
            }

            try {
                const res = await fetch(
                    `/api/lesson/driver?driver_id=${encodeURIComponent(lookupId)}`
                );
                const data = await res.json();
                if (cancelled) return;

                if (!res.ok) {
                    setLoginError(data?.error ?? "ไม่พบรหัสพนักงานนี้ในระบบ");
                    if (stale) clearDriverSession();
                    setDriver(stale ? null : saved);
                } else {
                    writeDriverSession(data.driver);
                    setDriver(data.driver);
                    // ล้าง driver_id ออกจาก URL กัน copy ลิงก์ไปให้คนอื่นแล้วสวมสิทธิ์
                    if (queryDriverId) router.replace("/lesson");
                }
            } catch {
                if (!cancelled) {
                    setLoginError("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง");
                    setDriver(stale ? null : saved);
                }
            } finally {
                if (!cancelled) setBooting(false);
            }
        };

        boot();
        return () => {
            cancelled = true;
        };
    }, [queryDriverId, router]);

    /* ── 2. โหลดบทเรียนของคนขับ ── */
    const loadLessons = useCallback(async (d: DriverProfile) => {
        setLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams({ driver_id: d.driver_id });
            if (d.client_name) qs.set("client_name", d.client_name);

            const res = await fetch(`/api/lesson?${qs.toString()}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data?.error ?? "ไม่สามารถโหลดบทเรียนได้");
                return;
            }

            setLessons(data.lessons ?? []);
            setSummary(data.summary ?? EMPTY_SUMMARY);
        } catch {
            setError("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (driver) loadLessons(driver);
    }, [driver, loadLessons]);

    const handleLogout = () => {
        clearDriverSession();
        setDriver(null);
        setLessons([]);
        setSummary(EMPTY_SUMMARY);
        setLoginError(null);
    };

    const visible = useMemo(() => {
        if (filter === "done") return lessons.filter((l) => l.attempt?.status === "ผ่าน");
        if (filter === "pending") return lessons.filter((l) => l.attempt?.status !== "ผ่าน");
        return lessons;
    }, [lessons, filter]);

    /**
     * บทเรียนที่ควรทำต่อ — ใบแรกที่ยังไม่ผ่าน
     * ไฮไลต์ไว้ใบเดียวเพื่อบอกว่า "กดอันนี้" โดยไม่ต้องไล่อ่านทั้งรายการ
     */
    const nextLessonId = useMemo(
        () => lessons.find((l) => l.attempt?.status !== "ผ่าน")?.lesson_id ?? null,
        [lessons]
    );

    if (booting) {
        return (
            <div className="flex min-h-dvh items-center justify-center lg:min-h-full">
                <LoaderCircle className="size-7 animate-spin text-lsn-green-deep" />
            </div>
        );
    }

    if (!driver) {
        return <DriverLogin onSuccess={setDriver} initialError={loginError} />;
    }

    return (
        <div className="lsn-grad-hero flex min-h-dvh flex-col lg:min-h-full">
            <ProgressHeader driver={driver} summary={summary} onLogout={handleLogout} />

            {/* ── แผ่นขาวที่ทับขึ้นมา พร้อมขอบหยักรูปเมฆตามแบบ 3a ── */}
            <section className="relative flex-1 rounded-t-[34px] bg-white px-5 pb-10 pt-[26px]">
                <div className="mb-3.5 flex items-center justify-between gap-2">
                    <h2 className="text-[16px] font-medium text-lsn-ink">หัวข้อการเรียน</h2>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11.5px] text-lsn-green-deep">
                            ทั้งหมด {summary.total}
                        </span>
                        <button
                            type="button"
                            onClick={() => loadLessons(driver)}
                            disabled={loading}
                            aria-label="โหลดใหม่"
                            className="rounded-full p-1.5 text-lsn-mute2 transition active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                <div className="mb-4 flex gap-1.5">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setFilter(f.key)}
                            className={`rounded-full px-3.5 py-1.5 text-[12px] transition ${
                                filter === f.key
                                    ? "lsn-grad-cta text-white"
                                    : "bg-lsn-surface text-lsn-muted"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <p className="mb-4 rounded-[16px] bg-lsn-danger/12 px-4 py-3 text-[13px] text-lsn-danger-ink">
                        {error}
                    </p>
                )}

                {loading && lessons.length === 0 ? (
                    <div className="space-y-2.5">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-[64px] animate-pulse rounded-[18px] bg-lsn-surface"
                            />
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-14 text-center">
                        <div className="flex size-14 items-center justify-center rounded-[18px] bg-lsn-green-tint text-2xl">
                            {filter === "pending" ? "🎉" : "📭"}
                        </div>
                        <p className="text-[13px] text-lsn-mute2">
                            {filter === "done"
                                ? "ยังไม่มีบทเรียนที่ผ่าน"
                                : filter === "pending"
                                  ? "เยี่ยม ไม่มีบทเรียนค้าง"
                                  : "ยังไม่มีบทเรียนสำหรับคุณ"}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-2.5">
                        {visible.map((lesson) => (
                            <li key={lesson.lesson_id}>
                                <LessonCard
                                    lesson={lesson}
                                    driverId={driver.driver_id}
                                    highlight={lesson.lesson_id === nextLessonId}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
