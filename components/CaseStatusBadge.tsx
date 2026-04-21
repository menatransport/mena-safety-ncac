"use client";

import { useEffect, useState } from "react";
import {
    CheckCircle2,
    Clock3,
    XCircle,
    ShieldAlert,
    User2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

/* =============================================================================
 * CaseStatusBadge — Collapsible side panel
 * -----------------------------------------------------------------------------
 *  • แสดงเป็น panel ลอยติดขอบซ้าย (fixed)
 *  • เริ่มต้นเปิดแสดง 1.8s แล้วเลื่อนซ่อนเข้าด้านซ้ายอัตโนมัติ
 *  • มีปุ่ม toggle แบบแถบเล็ก (handle) ที่ขอบไว้กดเปิด-ปิดได้ตลอด
 *  • Modern, minimal, ใช้ semantic color + icon (a11y)
 * ===========================================================================*/

type StatusToken = {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    accent: string;
    soft: string;
    ring: string;
    dot: string;
};

const STATUS_MAP: Record<string, StatusToken> = {
    Pending: {
        label: "Pending",
        Icon: Clock3,
        accent: "text-amber-600",
        soft: "bg-amber-50",
        ring: "ring-amber-200/70",
        dot: "bg-amber-500",
    },
    "Completed Investigate": {
        label: "Completed",
        Icon: CheckCircle2,
        accent: "text-emerald-600",
        soft: "bg-emerald-50",
        ring: "ring-emerald-200/70",
        dot: "bg-emerald-500",
    },
    Voided: {
        label: "Voided",
        Icon: XCircle,
        accent: "text-rose-600",
        soft: "bg-rose-50",
        ring: "ring-rose-200/70",
        dot: "bg-rose-500",
    },
};

const PRIORITY_MAP: Record<string, { text: string; bg: string }> = {
    High: { text: "text-rose-700", bg: "bg-rose-100/80" },
    Medium: { text: "text-amber-700", bg: "bg-amber-100/80" },
    Low: { text: "text-sky-700", bg: "bg-sky-100/80" },
};

interface CaseStatusBadgeProps {
    status: string;
    priority?: string | number | null;
    reporter?: string | null;
    /** เวลา (ms) ก่อนซ่อนตัวเองอัตโนมัติเมื่อเริ่มต้น (ตั้งเป็น 0 เพื่อปิด auto-hide) */
    autoHideAfter?: number;
}

export function CaseStatusBadge({
    status,
    priority,
    reporter,
    autoHideAfter = 1800,
}: CaseStatusBadgeProps) {
    const [open, setOpen] = useState(true);

    useEffect(() => {
        if (!status || autoHideAfter <= 0) return;
        const t = setTimeout(() => setOpen(false), autoHideAfter);
        return () => clearTimeout(t);
    }, [status, autoHideAfter]);

    if (!status) return null;

    const token =
        STATUS_MAP[status] ?? {
            label: status,
            Icon: ShieldAlert,
            accent: "text-slate-600",
            soft: "bg-slate-50",
            ring: "ring-slate-200/70",
            dot: "bg-slate-400",
        };
    const StatusIcon = token.Icon;

    const priKey = priority ? String(priority).trim() : "";
    const pri = PRIORITY_MAP[priKey];

    return (
        <div
            aria-live="polite"
            className={`
                fixed left-0 top-24 z-40 flex items-stretch
                transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                ${open ? "translate-x-0" : "translate-x-[calc(-100%+1.5rem)]"}
            `}
        >
            {/* Panel */}
            <div
                role="status"
                aria-hidden={!open}
                className={`
                    flex items-center gap-3
                    rounded-r-2xl border border-l-0 border-slate-200/80
                    bg-white/95 backdrop-blur-md
                    pl-3 pr-4 py-2.5 shadow-lg shadow-slate-900/5
                `}
            >
                {/* Status icon tile */}
                <span
                    className={`
                        relative flex h-10 w-10 shrink-0 items-center justify-center
                        rounded-xl ring-1 ${token.ring} ${token.soft} ${token.accent}
                    `}
                >
                    <StatusIcon className="h-5 w-5" aria-hidden="true" />
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                        <span
                            className={`absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping ${token.dot}`}
                        />
                        <span
                            className={`relative inline-flex h-2 w-2 rounded-full ${token.dot}`}
                        />
                    </span>
                </span>

                {/* Text block */}
                <div className="flex min-w-0 flex-col leading-tight">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                            Status
                        </span>
                        <span className={`text-sm font-semibold ${token.accent}`}>
                            {token.label}
                        </span>
                        {priority && (
                            <span
                                className={`
                                    inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                    text-[10px] font-semibold tracking-wide
                                    ${pri ? `${pri.bg} ${pri.text}` : "bg-slate-100 text-slate-600"}
                                `}
                            >
                                <span className="font-normal opacity-70">ระดับ</span>
                                {priority}
                            </span>
                        )}
                    </div>

                    {reporter && (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 max-w-[220px]">
                            <User2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">{reporter}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Toggle handle */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={open ? "ซ่อนสถานะเอกสาร" : "แสดงสถานะเอกสาร"}
                title={open ? "ซ่อน" : "แสดงสถานะ"}
                className={`
                    relative flex items-center justify-center
                    w-6 h-12 self-center
                    rounded-r-xl border border-l-0 border-slate-200/80
                    bg-white/95 backdrop-blur-md text-slate-500
                    shadow-md shadow-slate-900/5
                    hover:text-slate-800 hover:bg-white
                    transition-colors duration-300
                `}
            >
                {/* Status dot indicator (visible when collapsed for context) */}
                {!open && (
                    <span
                        className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${token.dot}`}
                        aria-hidden="true"
                    />
                )}
                {open ? (
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                ) : (
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                )}
            </button>
        </div>
    );
}

export default CaseStatusBadge;
