"use client";

// =============================================================================
// LessonCard — บทเรียน 1 แถวในรายการ
//   กล่องซ้ายเป็นโลโก้ของบทเรียนที่ผู้ดูแลอัปโหลดไว้ (ไม่ใช่ไอคอนสถานะ)
//   เพราะสถานะอ่านได้จากสีของแถวและข้อความใต้ชื่ออยู่แล้ว ส่วนหัวข้อต้องดูออกทันที
//
//   3 หน้าตาตามสถานะ:
//     • ผ่านแล้ว    → พื้นเทาอ่อน + ติ๊กเขียวมุมกล่อง
//     • ที่ต้องทำต่อ → พื้นไล่สีเข้ม (ไฮไลต์ให้สะดุดตาว่าควรกดอันนี้)
//     • ยังไม่เริ่ม  → พื้นขาวขอบบาง
// =============================================================================

import Link from "next/link";
import { Check } from "lucide-react";

import type { LessonWithProgress } from "../type";
import { daysLeft, formatThaiDate, lessonLogo } from "../constant";

type Props = {
    lesson: LessonWithProgress;
    driverId: string;
    /** บทเรียนถัดไปที่ควรทำ — มีได้ใบเดียวในรายการ */
    highlight?: boolean;
};

/** เปอร์เซ็นต์คะแนนของครั้งล่าสุด (ไม่มีข้อสอบถือว่าเต็ม) */
const scorePercent = (lesson: LessonWithProgress): number | null => {
    const a = lesson.attempt;
    if (!a) return null;
    const total = a.total ?? lesson.questions.length;
    if (!total) return 100;
    return Math.round(((a.score ?? 0) / total) * 100);
};

export function LessonCard({ lesson, driverId, highlight = false }: Props) {
    const passed = lesson.attempt?.status === "ผ่าน";
    const percent = scorePercent(lesson);
    const left = daysLeft(lesson.due_date);
    const href = `/lesson/${encodeURIComponent(lesson.lesson_id)}?driver_id=${encodeURIComponent(driverId)}`;

    /** พื้นหลังกล่องโลโก้ต่างกันตามสถานะ ตัวรูปใช้ชุดเดียวกันทุกแถว */
    const logo = (tone: string) => (
        <span
            className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] ${tone}`}
        >
            {/* URL มาจาก S3 ที่ผู้ดูแลเปลี่ยน bucket ได้อิสระ จึงไม่ใช้ next/image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lessonLogo(lesson.logo)} alt="" className="size-full object-contain p-1.5" />
        </span>
    );

    /* ── ผ่านแล้ว ── */
    if (passed) {
        return (
            <Link
                href={href}
                className="flex items-center gap-3 rounded-[18px] bg-lsn-surface p-3 transition active:scale-[0.99]"
            >
                <span className="relative shrink-0">
                    {logo("bg-white")}
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full bg-lsn-brand text-white ring-2 ring-lsn-surface">
                        <Check className="size-3" strokeWidth={3} />
                    </span>
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-lsn-ink">{lesson.title}</span>
                    <span className="block text-[11px] text-lsn-green-deep">
                        ผ่าน{percent !== null ? ` ${percent}%` : ""}
                    </span>
                </span>
            </Link>
        );
    }

    /* ── บทเรียนถัดไปที่ควรทำ ── */
    if (highlight) {
        return (
            <Link
                href={href}
                className="lsn-grad-cta flex items-center gap-3 rounded-[18px] p-3.5 text-white transition active:scale-[0.99]"
            >
                {logo("bg-white")}
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px]">{lesson.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {lesson.is_overdue ? (
                            <span className="rounded-full bg-lsn-danger px-2 py-[2px] text-[9.5px] text-white">
                                เลยกำหนด
                            </span>
                        ) : (
                            <span className="rounded-full bg-lsn-amber px-2 py-[2px] text-[9.5px] font-medium text-lsn-ink">
                                {lesson.attempt ? "ต้องทำใหม่" : "ต้องเรียน"}
                            </span>
                        )}
                        <span className="text-[10.5px] text-white/85">
                            ครบกำหนด {formatThaiDate(lesson.due_date)}
                            {left !== null && left >= 0 && left <= 7 && ` (เหลือ ${left} วัน)`}
                        </span>
                    </span>
                </span>
            </Link>
        );
    }

    /* ── ยังไม่เริ่ม ── */
    return (
        <Link
            href={href}
            className="flex items-center gap-3 rounded-[18px] border-[1.5px] border-lsn-line bg-white p-3 transition active:scale-[0.99]"
        >
            {logo("bg-lsn-tile")}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] text-lsn-muted">{lesson.title}</span>
                <span className="block text-[11px] text-lsn-faint">
                    {lesson.is_overdue
                        ? `เลยกำหนด ${formatThaiDate(lesson.due_date)}`
                        : lesson.attempt
                          ? "ต้องทำใหม่"
                          : "ยังไม่เริ่ม"}
                </span>
            </span>
        </Link>
    );
}
