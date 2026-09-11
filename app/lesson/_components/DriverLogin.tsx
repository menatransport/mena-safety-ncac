"use client";

// =============================================================================
// DriverLogin — หน้าเข้าใช้งานด้วย "รหัสพนักงาน" อย่างเดียว (แบบ 3a หน้าที่ 1)
//   • ไม่มีรหัสผ่าน ตามข้อกำหนดของระบบ Safety Self Learning
//   • ยืนยันรหัสกับ /api/lesson/driver แล้วจำไว้ใน localStorage
// =============================================================================

import { useState } from "react";
import { Info, LoaderCircle } from "lucide-react";

import type { DriverProfile } from "../type";
import { writeDriverSession } from "../constant";

type Props = {
    onSuccess: (driver: DriverProfile) => void;
    /** ข้อความแจ้งเตือนจากการพยายามเข้าด้วย ?driver_id= ที่ไม่สำเร็จ */
    initialError?: string | null;
};

export function DriverLogin({ onSuccess, initialError = null }: Props) {
    const [driverId, setDriverId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = driverId.trim();
        if (!id) {
            setError("กรุณากรอกรหัสพนักงาน");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/lesson/driver?driver_id=${encodeURIComponent(id)}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data?.error ?? "เข้าใช้งานไม่สำเร็จ");
                return;
            }

            writeDriverSession(data.driver);
            onSuccess(data.driver);
        } catch {
            setError("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="lsn-grad-hero flex min-h-dvh flex-col lg:min-h-full">
            {/* ── ส่วนหัวบนพื้นสีส้ม ── */}
            <div className="flex flex-col gap-2.5 px-[26px] pb-5 pt-[26px]">
                <div className="flex size-[52px] items-center justify-center rounded-[16px] bg-white text-[22px]">
                    🛡
                </div>
                <h1 className="mt-1.5 text-[31px] font-semibold leading-[1.15] text-white">
                    Safety
                    <br />
                    Self Learning
                </h1>
                <p className="text-[13px] leading-relaxed text-white/85">
                    เรียนเรื่องความปลอดภัยด้วยตัวเอง
                    <br />
                    ใช้เวลาหัวข้อละไม่เกิน 15 นาที
                </p>
            </div>

            {/* ── แผ่นขาวที่ทับขึ้นมา ── */}
            <form
                onSubmit={submit}
                className="mt-2 flex flex-1 flex-col gap-[15px] rounded-t-[34px] bg-white px-6 pb-[18px] pt-[26px]"
            >
                <h2 className="text-[21px] font-medium text-lsn-ink">เข้าใช้งาน</h2>

                <div className="flex flex-col gap-[9px]">
                    <label htmlFor="driver_id" className="text-[13px] text-lsn-muted">
                        รหัสพนักงาน
                    </label>
                    <input
                        id="driver_id"
                        name="driver_id"
                        value={driverId}
                        onChange={(e) => setDriverId(e.target.value)}
                        autoComplete="off"
                        autoCapitalize="characters"
                        enterKeyHint="go"
                        placeholder="EMP-00000"
                        disabled={loading}
                        className="w-full rounded-[18px] border-[1.5px] border-lsn-input-line bg-lsn-surface p-[18px] text-[17px] text-lsn-ink outline-none transition placeholder:text-lsn-faint focus:border-lsn-green focus:bg-white disabled:opacity-60"
                    />
                </div>

                <div className="flex items-start gap-[9px] rounded-[16px] bg-lsn-info p-3.5 text-[12.5px] leading-[1.6] text-lsn-info-ink">
                    <Info className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
                    <span>ใช้รหัสเดียวกับบัตรพนักงาน ไม่ต้องตั้งรหัสผ่าน ระบบจะจำรหัสไว้ในเครื่องนี้</span>
                </div>

                {error && (
                    <p
                        role="alert"
                        className="rounded-[16px] bg-lsn-danger/12 px-4 py-3 text-[13px] text-lsn-danger-ink"
                    >
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="lsn-grad-cta mt-auto flex items-center justify-center gap-2 rounded-[22px] py-[19px] text-[17px] font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
                >
                    {loading && <LoaderCircle className="size-5 animate-spin" />}
                    {loading ? "กำลังตรวจสอบ..." : "เข้าใช้งาน"}
                </button>
            </form>
        </main>
    );
}
