"use client";

import { ClipboardCheck, CalendarDays } from "lucide-react";

export function ProjectHeader({ title, date }: { title: string; date?: string | null }) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-900 p-6 sm:p-8">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-amber-400/10 blur-2xl" />

            {/* Dot grid overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.2] bg-repeat"
                style={{
                    backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                }}
            />

            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    {/* <div className="flex items-center gap-2.5 mb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 backdrop-blur-sm">
                            <ClipboardCheck size={20} />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Inspection</span>
                    </div> */}
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                       {title}
                    </h1>
                    {date && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                            <CalendarDays size={14} />
                            {date}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
