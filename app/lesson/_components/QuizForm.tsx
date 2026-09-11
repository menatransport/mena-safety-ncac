"use client";

// =============================================================================
// QuizForm — แบบทดสอบทีละข้อเต็มจอ (แบบ 3a หน้าที่ 3 และ 6)
//   ใช้ได้ทั้ง "ทดสอบก่อนเรียน" และ "ทดสอบหลังเรียน" ต่างกันแค่ข้อความหัวจอ
//   และวิธีจบ: ก่อนเรียนแตะข้อสุดท้ายแล้วไปต่อเลย ส่วนหลังเรียนมีปุ่มส่งให้ทบทวนก่อน
//   การตรวจคำตอบทำที่ server เท่านั้น ที่นี่ไม่มีเฉลย
// =============================================================================

import { useState } from "react";
import { ChevronLeft, LoaderCircle, X } from "lucide-react";

import type { TimedQuestion } from "./LessonPlayer";
import { formatClock } from "../constant";

type Props = {
    /** ข้อที่ต้องถามในหน้านี้ พร้อมตำแหน่งเดิมในอาร์เรย์ questions */
    items: TimedQuestion[];
    /** คำตอบทั้งชุดของบทเรียน (-1 = ยังไม่ตอบ) */
    answers: number[];
    onAnswer: (questionIndex: number, choice: number) => void;
    /** ส่งอาร์เรย์คำตอบชุดล่าสุดกลับไปเลย เพื่อไม่ต้องรอ state ของหน้าแม่อัปเดต */
    onSubmit: (finalAnswers: number[]) => void;
    submitting: boolean;
    onExit: () => void;
    /** ข้อความมุมขวาบน เช่น "ทดสอบหลังเรียน · ผ่าน 80%" */
    heading: string;
    /** บรรทัดใต้แถบความคืบหน้า (ต่อท้าย "ข้อ x จาก y") */
    note?: string;
    /** true = แตะคำตอบข้อสุดท้ายแล้วส่งเลย ไม่มีปุ่ม (ใช้กับทดสอบก่อนเรียน) */
    autoSubmit?: boolean;
    submitLabel?: string;
};

export function QuizForm({
    items,
    answers,
    onAnswer,
    onSubmit,
    submitting,
    onExit,
    heading,
    note,
    autoSubmit = false,
    submitLabel = "ส่งคำตอบ · ดูผล",
}: Props) {
    const [step, setStep] = useState(0);

    const currentItem = items[step];
    const isLast = step === items.length - 1;
    const picked = currentItem ? answers[currentItem.index] : -1;
    const allAnswered = items.every((it) => answers[it.index] >= 0);

    if (!currentItem) return null;

    const pick = (choice: number) => {
        const next = answers.map((v, i) => (i === currentItem.index ? choice : v));
        onAnswer(currentItem.index, choice);

        if (!isLast) {
            setTimeout(() => setStep((s) => s + 1), 180);
            return;
        }
        // ข้อสุดท้ายของแบบทดสอบหลังเรียนค้างไว้ให้กดปุ่มส่งเอง จะได้ทบทวนคำตอบก่อน
        if (!autoSubmit) return;

        // ถ้ายังมีข้อที่กระโดดข้ามไว้ ให้วนกลับไปเก็บก่อนแทนที่จะส่งทั้งที่ตอบไม่ครบ
        const missing = items.findIndex((it) => next[it.index] < 0);
        setTimeout(() => (missing === -1 ? onSubmit(next) : setStep(missing)), 180);
    };

    return (
        <div className="lsn-grad-hero flex min-h-dvh flex-col lg:min-h-full">
            {/* ── หัวจอบนพื้นส้ม: ปุ่มออก + แถบความคืบหน้ารายข้อ ── */}
            <div className="flex flex-col gap-3 px-[22px] pb-[22px] pt-3.5">
                <div className="flex items-center justify-between text-[12px] text-white">
                    <button
                        type="button"
                        onClick={step === 0 ? onExit : () => setStep((s) => s - 1)}
                        className="flex items-center gap-1 transition active:scale-95"
                    >
                        {step === 0 ? <X className="size-3.5" /> : <ChevronLeft className="size-4" />}
                        {step === 0 ? "ออก" : "ย้อนกลับ"}
                    </button>
                    <span>{heading}</span>
                </div>

                {/* แถบความคืบหน้ากดข้ามไปข้อที่เว้นไว้ได้ ไม่ต้องกดย้อนทีละข้อ */}
                <div className="flex gap-[5px]">
                    {items.map((it, i) => (
                        <button
                            key={it.index}
                            type="button"
                            onClick={() => setStep(i)}
                            aria-label={`ไปข้อ ${i + 1}`}
                            aria-current={i === step}
                            className={`h-1.5 flex-1 rounded-[4px] transition ${
                                answers[it.index] >= 0
                                    ? "bg-lsn-step"
                                    : i === step
                                      ? "bg-white/45"
                                      : "bg-white/20"
                            }`}
                        />
                    ))}
                </div>

                <p className="text-[12px] text-white/85">
                    ข้อ {step + 1} จาก {items.length}
                    {note ? ` · ${note}` : isLast ? " · ข้อสุดท้าย" : ""}
                </p>
            </div>

            {/* ── แผ่นขาว: คำถาม + ตัวเลือก ── */}
            <div className="flex flex-1 flex-col gap-4 rounded-t-[34px] bg-white px-[22px] pb-6 pt-7">
                <h2 className="text-[19px] font-medium leading-[1.4] text-lsn-ink">
                    {currentItem.question.question}
                </h2>

                {currentItem.question.time_sec != null && (
                    <span className="-mt-1 w-fit rounded-full bg-lsn-surface px-3 py-1 text-[11px] text-lsn-muted">
                        อ้างอิงนาทีที่ {formatClock(currentItem.question.time_sec)} ของวิดีโอ
                    </span>
                )}

                <div className="flex flex-col gap-2.5">
                    {currentItem.question.choices.map((choice, ci) => {
                        const selected = picked === ci;
                        return (
                            <button
                                key={ci}
                                type="button"
                                onClick={() => pick(ci)}
                                aria-pressed={selected}
                                disabled={submitting}
                                className={`rounded-[18px] p-[15px] text-left text-[14.5px] transition active:scale-[0.99] ${
                                    selected
                                        ? "border-2 border-lsn-green bg-lsn-pick font-normal text-lsn-ink"
                                        : "border-[1.5px] border-lsn-line bg-lsn-surface text-lsn-ink"
                                }`}
                            >
                                {choice}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-auto pt-4">
                    {isLast && !autoSubmit ? (
                        <button
                            type="button"
                            onClick={() => onSubmit(answers)}
                            disabled={submitting || !allAnswered}
                            className="lsn-grad-cta flex w-full items-center justify-center gap-2 rounded-[20px] py-[17px] text-[16px] font-medium text-white transition active:scale-[0.98] disabled:opacity-45"
                        >
                            {submitting && <LoaderCircle className="size-5 animate-spin" />}
                            {submitting ? "กำลังส่งคำตอบ..." : submitLabel}
                        </button>
                    ) : (
                        <p className="flex items-center justify-center gap-2 text-center text-[11.5px] text-lsn-faint">
                            {submitting && <LoaderCircle className="size-4 animate-spin" />}
                            {submitting
                                ? "กำลังบันทึก..."
                                : "แตะคำตอบเพื่อไปข้อถัดไป · ไม่มีปุ่ม"}
                        </p>
                    )}

                    {isLast && !autoSubmit && !allAnswered && (
                        <p className="mt-2 text-center text-[11.5px] text-lsn-orange-ink">
                            ยังตอบไม่ครบ — แตะแถบด้านบนเพื่อย้อนกลับไปข้อที่เว้นไว้
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
