"use client";

// =============================================================================
// ProgressHeader — แถบหัวหน้ารายการบทเรียน (แบบ 3a หน้าที่ 2)
//   พื้นสีส้ม + ทักทายชื่อคนขับ + การ์ดขาวสรุปความคืบหน้ารวม
// =============================================================================

import { LogOut } from "lucide-react";

import type { DriverProfile } from "../type";
import { driverFullName } from "../constant";

type Props = {
    driver: DriverProfile;
    summary: { total: number; passed: number; pending: number; percent: number };
    onLogout: () => void;
};

export function ProgressHeader({ driver, summary, onLogout }: Props) {
    const percent = Math.min(100, Math.max(0, summary.percent));

    return (
        <header className="flex flex-col gap-3.5 px-[22px] pb-5 pt-4">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="truncate text-[20px] font-medium text-white">
                        {driverFullName(driver)}
                    </h1>
                    <p className="mt-0.5 truncate text-[11.5px] text-white/75">
                        {driver.driver_id}
                        {driver.client_name ? ` · ${driver.client_name}` : ""}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onLogout}
                    aria-label="ออกจากระบบ"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition active:scale-95"
                >
                    <LogOut className="size-4" strokeWidth={1.8} />
                </button>
            </div>

            <div className="flex flex-col gap-[9px]">
                <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-white">ความคืบหน้ารวม</span>
                    <span className="text-[22px] font-semibold tabular-nums text-lsn-ink">
                        {percent}%
                    </span>
                </div>

                <div
                    className="h-2.5 overflow-hidden rounded-[6px] bg-lsn-line"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="ความคืบหน้ารวม"
                >
                    <div
                        className="lsn-grad-bar h-full rounded-[6px] transition-[width] duration-700"
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>
        </header>
    );
}
