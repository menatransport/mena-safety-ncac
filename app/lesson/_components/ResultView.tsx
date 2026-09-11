"use client";

// =============================================================================
// ResultView — สรุปผลหลังส่งคำตอบ (แบบ 3a หน้าที่ 7 และ 7ข)
//   ผ่าน   → พื้นเขียว ฉลอง + คะแนนเทียบเกณฑ์
//   ไม่ผ่าน → พื้นแดง สรุปข้อที่ผิด + บังคับกลับไปดูวิดีโอซ้ำก่อนทำใหม่
//   เฉลยรายข้อพับเก็บไว้ (server ส่งเฉลยกลับมาหลังส่งคำตอบแล้วเท่านั้น)
// =============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { Award, ChevronDown, RotateCcw } from "lucide-react";

import type { DriverProfile, LessonQuestion, LessonStatus } from "../type";
import { PASS_RATIO } from "../type";
import { driverFullName, formatClock } from "../constant";
import { CertificateModal } from "./CertificateModal";
import type { CertificateData } from "./certificate";

type Props = {
    status: LessonStatus;
    score: number;
    total: number;
    lessonTitle: string;
    questions: LessonQuestion[];
    answerKey: number[];
    answerUser: number[];
    /** คะแนนทดสอบก่อนเรียนของรอบนี้ — null = ข้ามขั้นนั้นมา (เช่น เข้ามาทบทวน) */
    preScore?: number | null;
    preTotal?: number | null;
    /** ข้อมูลที่ต้องใช้ออกใบประกาศนียบัตร — ไม่ครบ = ซ่อนปุ่มไว้ */
    driver?: DriverProfile | null;
    lessonId?: string;
    /** ไม่ผ่าน → กลับไปดูวิดีโอซ้ำแล้วทำใหม่ */
    onRetry: () => void;
};

export function ResultView({
    status,
    score,
    total,
    lessonTitle,
    questions,
    answerKey,
    answerUser,
    preScore = null,
    preTotal = null,
    driver = null,
    lessonId,
    onRetry,
}: Props) {
    const [showKey, setShowKey] = useState(false);
    const [showCert, setShowCert] = useState(false);
    const passed = status === "ผ่าน";
    const percent = total > 0 ? Math.round((score / total) * 100) : 100;
    const passPercent = Math.round(PASS_RATIO * 100);

    /** เทียบก่อน/หลังเรียนได้ต่อเมื่อทำทดสอบก่อนเรียนในรอบนี้จริง */
    const hasPre = preScore != null && preTotal != null && preTotal > 0;
    const prePercent = hasPre ? Math.round((preScore / preTotal) * 100) : null;
    const gain = prePercent === null ? null : percent - prePercent;

    const wrong = questions
        .map((q, i) => ({ q, i }))
        .filter(({ i }) => answerUser[i] !== answerKey[i]);

    /**
     * ข้อมูลใบประกาศนียบัตร — คงที่ตลอดอายุของหน้าสรุปผล (รวมวันที่ออกใบ)
     * ถ้าไม่ memo ไว้ object จะใหม่ทุก render แล้ว modal จะวาด canvas ซ้ำไม่จบ
     */
    const certificate: CertificateData | null = useMemo(() => {
        if (!passed || !driver || !lessonId) return null;
        return {
            recipientName: driverFullName(driver),
            driverId: driver.driver_id,
            lessonId,
            lessonTitle,
            score,
            total,
            issuedAt: new Date(),
            clientName: driver.client_name,
        };
    }, [passed, driver, lessonId, lessonTitle, score, total]);

    return (
        <div
            className={`flex min-h-dvh flex-col lg:min-h-full ${passed ? "lsn-grad-pass" : "lsn-grad-fail"}`}
        >
            {/* ── หัวจอ ── */}
            <div className="flex flex-col items-center gap-2.5 px-[22px] pb-6 pt-[22px] text-center">
                <div className="flex size-[62px] items-center justify-center rounded-[22px] bg-white text-[28px]">
                    {passed ? "🎉" : "!"}
                </div>
                <h1
                    className={`text-[26px] font-semibold leading-tight ${passed ? "text-lsn-ink" : "text-white"}`}
                >
                    {passed ? "ผ่านแล้ว!" : "ยังไม่ผ่าน"}
                </h1>
                <p className={`text-[12.5px] ${passed ? "text-lsn-ink/70" : "text-white/80"}`}>
                    {passed
                        ? lessonTitle
                        : `ได้ ${percent}% · เกณฑ์ผ่าน ${passPercent}%`}
                </p>
            </div>

            {/* ── แผ่นขาว ── */}
            <div className="flex flex-1 flex-col gap-[13px] rounded-t-[34px] bg-white px-[22px] pb-6 pt-[26px] text-lsn-ink">
                {passed ? (
                    <>
                        <div className="flex gap-[11px]">
                            <div className="flex flex-1 flex-col items-center gap-[5px] rounded-[20px] bg-lsn-surface p-3.5">
                                <span className="text-[11px] text-lsn-mute2">
                                    {hasPre ? "ก่อนเรียน" : "เกณฑ์ผ่าน"}
                                </span>
                                <span className="text-[24px] font-semibold tabular-nums text-lsn-faint">
                                    {hasPre ? prePercent : passPercent}%
                                </span>
                            </div>
                            <div className="flex flex-1 flex-col items-center gap-[5px] rounded-[20px] bg-lsn-green-tint p-3.5">
                                <span className="text-[11px] text-lsn-green-deep">
                                    {hasPre ? "หลังเรียน" : "คะแนนที่ได้"}
                                </span>
                                <span className="text-[24px] font-semibold tabular-nums text-lsn-green-deep">
                                    {percent}%
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-[18px] bg-lsn-surface px-[15px] py-[13px] text-[12.5px]">
                            <span className="text-lsn-muted">
                                ตอบถูก {score} จาก {total} ข้อ
                            </span>
                            <span className="text-lsn-green-deep">
                                {gain !== null && gain > 0 ? `ดีขึ้น ${gain}%` : "บันทึกผลแล้ว"}
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                        {hasPre && (
                            <div className="flex items-center justify-between rounded-[18px] bg-lsn-surface px-[15px] py-[13px] text-[12.5px]">
                                <span className="text-lsn-muted">
                                    ก่อนเรียน {prePercent}% → หลังเรียน {percent}%
                                </span>
                                <span className={gain && gain > 0 ? "text-lsn-green-deep" : "text-lsn-mute2"}>
                                    {gain && gain > 0 ? `ดีขึ้น ${gain}%` : "ยังไม่ดีขึ้น"}
                                </span>
                            </div>
                        )}

                        <div className="flex flex-col gap-[9px] rounded-[20px] bg-lsn-surface p-[15px]">
                            <span className="text-[13px] text-lsn-muted">
                                ข้อที่ตอบผิด ({wrong.length} ข้อ)
                            </span>
                            {wrong.slice(0, 5).map(({ q, i }) => (
                                <span key={i} className="flex gap-2.5 text-[13px]">
                                    <span className="text-lsn-x">✕</span>
                                    <span className="line-clamp-1">
                                        ข้อ {i + 1} · {q.question}
                                    </span>
                                </span>
                            ))}
                            {wrong.length > 5 && (
                                <span className="text-[12px] text-lsn-faint">
                                    และอีก {wrong.length - 5} ข้อ
                                </span>
                            )}
                        </div>

                        <p className="rounded-[20px] bg-lsn-orange-tint px-4 py-3.5 text-[12px] leading-[1.6] text-lsn-orange-ink">
                            ต้องดูวิดีโอซ้ำอีกครั้งก่อนทำแบบทดสอบใหม่
                        </p>
                    </>
                )}

                {/* ── เฉลยรายข้อ ── */}
                {questions.length > 0 && (
                    <div className="rounded-[20px] border-[1.5px] border-lsn-line">
                        <button
                            type="button"
                            onClick={() => setShowKey((v) => !v)}
                            aria-expanded={showKey}
                            className="hidden w-full items-center justify-between px-4 py-3.5 text-[13px] text-lsn-ink"
                        >
                            ดูเฉลยทั้งหมด
                            <ChevronDown
                                className={`size-4 text-lsn-mute2 transition ${showKey ? "rotate-180" : ""}`}
                            />
                        </button>

                        {showKey && (
                            <ol className="flex flex-col gap-2.5 border-t border-lsn-line px-4 py-3.5">
                                {questions.map((q, qi) => {
                                    const isRight = answerUser[qi] === answerKey[qi];
                                    return (
                                        <li key={qi} className="text-[12.5px] leading-relaxed">
                                            <p className="flex gap-2">
                                                <span
                                                    className={
                                                        isRight
                                                            ? "text-lsn-green-deep"
                                                            : "text-lsn-x"
                                                    }
                                                >
                                                    {isRight ? "✓" : "✕"}
                                                </span>
                                                <span>
                                                    {qi + 1}. {q.question}
                                                    {q.time_sec != null && (
                                                        <span className="text-lsn-faint">
                                                            {" "}
                                                            ({formatClock(q.time_sec)})
                                                        </span>
                                                    )}
                                                </span>
                                            </p>
                                            <p className="ml-5 text-lsn-mute2">
                                                ตอบ: {q.choices[answerUser[qi]] ?? "ไม่ได้ตอบ"}
                                                {!isRight && (
                                                    <>
                                                        {" · ที่ถูก: "}
                                                        <span className="text-lsn-green-deep">
                                                            {q.choices[answerKey[qi]] ?? "-"}
                                                        </span>
                                                    </>
                                                )}
                                            </p>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </div>
                )}

                {/* ── ปุ่มท้ายจอ ── */}
                <div className="mt-auto flex flex-col gap-[9px] pt-4">
                    {passed ? (
                        <>
                            {/* ใบประกาศนียบัตรเป็นปุ่มหลักของจอนี้ — เป็น "ของรางวัล" ที่ผู้เรียนรอ */}
                            {certificate && (
                                <button
                                    type="button"
                                    onClick={() => setShowCert(true)}
                                    className="lsn-grad-gold flex items-center justify-center gap-2.5 rounded-[20px] py-[17px] text-[16px] font-medium text-lsn-ink shadow-[0_8px_20px_-10px_rgba(138,107,33,.9)] transition active:scale-[0.98]"
                                >
                                    <Award className="size-[18px]" strokeWidth={2.2} />
                                    ดาวน์โหลดใบประกาศนียบัตร
                                </button>
                            )}
                            <Link
                                href="/lesson"
                                className="rounded-[20px] border-[1.5px] border-lsn-line py-[15px] text-center text-[15px] font-medium text-lsn-ink transition active:scale-[0.98]"
                            >
                                เรียนหัวข้อถัดไป
                            </Link>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onRetry}
                                className="lsn-grad-cta flex items-center justify-center gap-2 rounded-[20px] py-[17px] text-[16px] font-medium text-white transition active:scale-[0.98]"
                            >
                                <RotateCcw className="size-4" />
                                ดูวิดีโอซ้ำ
                            </button>
                            <Link
                                href="/lesson"
                                className="text-center text-[12.5px] text-lsn-mute2"
                            >
                                กลับหน้าแรก
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {certificate && (
                <CertificateModal
                    open={showCert}
                    data={certificate}
                    onClose={() => setShowCert(false)}
                />
            )}
        </div>
    );
}
