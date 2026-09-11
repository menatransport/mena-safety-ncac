"use client";

// =============================================================================
// Page: /lesson/[id]  (mobile first — ธีม 3a)
// -----------------------------------------------------------------------------
// เดินตาม flow 3a ครบ 3 ขั้น:
//   หน้าแนะนำบทเรียน → ① ทดสอบก่อนเรียน → ② วิดีโอเต็มจอ (มีคำถามแทรกตามเวลา)
//   → ③ ทดสอบหลังเรียน → สรุปผลเทียบคะแนนก่อน/หลัง
//
// คลังข้อสอบก่อน/หลังเรียน = คำถามทั้งหมดในบทเรียนเสมอ
//   • มี time_sec   → นอกจากอยู่ในคลังแล้ว ยังแทรก popup ระหว่างวิดีโอด้วย (ตอบตอนนั้นไม่ถูกตรวจ)
//   • ไม่มี time_sec → อยู่ในคลังเฉย ๆ ไม่มี popup ระหว่างวิดีโอ
// ทั้งสองแบบนับคะแนนในแบบทดสอบก่อน/หลังเรียนเหมือนกันทุกข้อ (server ตรวจจากทั้งคลัง)
//
// ทั้งสองรอบใช้ข้อชุดเดียวกัน (ทั้งคลัง) คะแนนจึงเทียบกันได้ตรง ๆ ต่างกันแค่ลำดับ:
// ก่อนเรียนเรียงตามบทเรียน ส่วนหลังเรียนสลับลำดับใหม่ทุกครั้ง (รวมตอนกด "ทำใหม่")
// เพื่อไม่ให้จำได้ว่า "ข้อ 3 ตอบข้อ ข" — ไม่มีการตั้งค่าอะไรฝั่ง admin
// ทดสอบก่อนเรียนเป็นการวัดพื้นฐาน — server ตรวจให้แต่ไม่บันทึกและไม่ส่งเฉลยกลับ
// (ถ้าส่งเฉลยตอนนั้น ผู้เรียนจะเห็นคำตอบก่อนดูวิดีโอ) มีแต่รอบหลังเรียนที่ตัดสินผ่าน
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Award, CalendarClock, Check, ChevronLeft, LoaderCircle, Play } from "lucide-react";

import type { DriverProfile, Lesson, LessonStatus, LessonUserRecord } from "../type";
import {
    driverFullName,
    formatThaiDate,
    formatThaiDateTime,
    lessonLogo,
    readDriverSession,
    scrollToTop,
} from "../constant";
import { CertificateModal } from "../_components/CertificateModal";
import type { CertificateData } from "../_components/certificate";
import { quizBankIndices, shuffle } from "@/lib/lesson";
import { LessonPlayer, type TimedQuestion } from "../_components/LessonPlayer";
import { QuizForm } from "../_components/QuizForm";
import { ResultView } from "../_components/ResultView";

/** บทเรียนที่ส่งมาให้ฝั่ง user จะไม่มีฟิลด์ answer */
type UserLesson = Omit<Lesson, "answer">;

type Result = {
    status: LessonStatus;
    score: number;
    total: number;
    answer_key: number[];
    answer_user: number[];
};

type Stage = "intro" | "pretest" | "video" | "quiz" | "result";

/** ขั้นตอนที่ผู้เรียนต้องผ่าน ใช้แสดง "ขั้นที่ x จาก 3" บนจอวิดีโอ */
const TOTAL_STEPS = 3;

export default function LessonDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const lessonId = decodeURIComponent(String(params?.id ?? ""));

    const [driver, setDriver] = useState<DriverProfile | null>(null);
    const [lesson, setLesson] = useState<UserLesson | null>(null);
    const [attempt, setAttempt] = useState<LessonUserRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [stage, setStage] = useState<Stage>("intro");
    /** คำตอบรอบหลังเรียน (ตัดสินผ่าน/ไม่ผ่าน) */
    const [answers, setAnswers] = useState<number[]>([]);
    /** คำตอบรอบก่อนเรียน — แยกกันเพื่อไม่ให้คำตอบเดิมติดไปรอบหลัง */
    const [preAnswers, setPreAnswers] = useState<number[]>([]);
    const [pre, setPre] = useState<{ score: number; total: number } | null>(null);
    /** ลำดับข้อของทดสอบหลังเรียนรอบนี้ (index ใน questions) สลับใหม่ทุกครั้งที่เริ่ม */
    const [quizOrder, setQuizOrder] = useState<number[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<Result | null>(null);
    /** โหมดทดลองของผู้ดูแล เปิดจากหน้าจัดการบทเรียนด้วย ?preview=1 */
    const [preview, setPreview] = useState(false);
    const [showCert, setShowCert] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    /* ── ต้องมี session ก่อน ไม่งั้นเด้งกลับไปหน้า login ──
       ยกเว้นโหมดทดลองของผู้ดูแล ซึ่งตั้งใจให้เข้ามาได้โดยไม่มี session คนขับ
       ดูหมายเหตุเรื่องสิทธิ์เข้าถึงได้ที่ /api/lesson/[id] */
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get("preview") === "1") {
            setPreview(true);
            setDriver({
                driver_id: "__preview__",
                first_name: "ทดลอง",
                last_name: "เรียน",
                client_name: "",
            });
            return;
        }

        const saved = readDriverSession();
        if (!saved) {
            router.replace("/lesson");
            return;
        }
        setDriver(saved);
    }, [router]);

    const load = useCallback(
        async (d: DriverProfile) => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/lesson/${encodeURIComponent(lessonId)}?driver_id=${encodeURIComponent(d.driver_id)}${preview ? "&preview=1" : ""}`
                );
                const data = await res.json();

                if (!res.ok) {
                    setError(data?.error ?? "ไม่สามารถโหลดบทเรียนได้");
                    return;
                }

                const blank = ((data.lesson?.questions ?? []) as unknown[]).map(() => -1);
                setLesson(data.lesson);
                setAttempt(data.attempt ?? null);
                setAnswers(blank);
                setPreAnswers([...blank]);
            } catch {
                setError("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง");
            } finally {
                setLoading(false);
            }
        },
        [lessonId, preview]
    );

    useEffect(() => {
        if (driver) load(driver);
    }, [driver, load]);

    /**
     * คำถามที่แทรกระหว่างวิดีโอ (ทั้งไฟล์ S3 และ YouTube ผ่าน IFrame API)
     * ไม่มีวิดีโอ = ไม่มีที่ให้แทรก คำถามพวกนี้จะไม่มี popup เลย (แต่ยังนับคะแนนในแบบทดสอบตามปกติ)
     */
    const timedQuestions = useMemo<TimedQuestion[]>(() => {
        if (!lesson?.video) return [];
        return lesson.questions
            .map((question, index) => ({ index, question }))
            .filter((it) => it.question.time_sec != null)
            .sort((a, b) => (a.question.time_sec ?? 0) - (b.question.time_sec ?? 0));
    }, [lesson]);

    /** คลังข้อสอบ = คำถามทั้งหมดในบทเรียน เรียงตามลำดับเดิม — ใช้เป็นทดสอบก่อนเรียน */
    const bankItems = useMemo<TimedQuestion[]>(() => {
        if (!lesson) return [];
        return quizBankIndices(lesson.questions).map((index) => ({
            index,
            question: lesson.questions[index],
        }));
    }, [lesson]);

    /** ทดสอบหลังเรียน = ข้อชุดเดิมแต่สลับลำดับของรอบนี้ */
    const quizItems = useMemo<TimedQuestion[]>(() => {
        if (!lesson) return [];
        return quizOrder
            .filter((i) => lesson.questions[i] != null)
            .map((index) => ({ index, question: lesson.questions[index] }));
    }, [lesson, quizOrder]);

    /**
     * ใบประกาศนียบัตรของ "ผลที่บันทึกไว้แล้ว" — ใช้บนหน้าแนะนำบทเรียน
     * คนที่เคยผ่านไปแล้วจึงกลับมาโหลดใบซ้ำได้ โดยวันที่บนใบยังเป็นวันที่สอบผ่านจริง
     * (หน้าสรุปผลออกใบจากคะแนนของรอบที่เพิ่งทำ — คนละชุดข้อมูลกัน)
     */
    const certificate = useMemo<CertificateData | null>(() => {
        if (!driver || !lesson || attempt?.status !== "ผ่าน") return null;
        const total = attempt.total ?? lesson.questions.length;
        return {
            recipientName: driverFullName(driver),
            driverId: driver.driver_id,
            lessonId: lesson.lesson_id,
            lessonTitle: lesson.title,
            score: attempt.score ?? total,
            total,
            issuedAt: attempt.created_at ? new Date(attempt.created_at) : new Date(),
            clientName: driver.client_name,
        };
    }, [driver, lesson, attempt]);

    /** สลับลำดับข้อของทดสอบหลังเรียนใหม่ 1 รอบ */
    const rollQuizOrder = useCallback(() => {
        setQuizOrder(shuffle(quizBankIndices(lesson?.questions)));
    }, [lesson]);

    const answerOne = useCallback((questionIndex: number, choice: number) => {
        setAnswers((prev) => prev.map((v, i) => (i === questionIndex ? choice : v)));
    }, []);

    const answerPre = useCallback((questionIndex: number, choice: number) => {
        setPreAnswers((prev) => prev.map((v, i) => (i === questionIndex ? choice : v)));
    }, []);

    /* ── ① ส่งทดสอบก่อนเรียน แล้วปลดล็อกวิดีโอ ── */
    const submitPre = useCallback(
        async (finalAnswers: number[]) => {
            if (!driver || !lesson) return;

            setSubmitting(true);
            setError(null);
            try {
                const res = await fetch("/api/lesson/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        driver_id: driver.driver_id,
                        lesson_id: lesson.lesson_id,
                        answer_user: finalAnswers,
                        phase: "pre",
                        ...(preview ? { preview: true } : {}),
                    }),
                });
                const data = await res.json();

                // ตรวจคะแนนพื้นฐานไม่ได้ ก็ไม่ควรขวางไม่ให้เรียนต่อ — ข้ามไปดูวิดีโอเลย
                if (res.ok) setPre({ score: data.score, total: data.total });

                setStage(lesson.video ? "video" : "quiz");
                scrollToTop(rootRef.current);
            } catch {
                setError("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง");
            } finally {
                setSubmitting(false);
            }
        },
        [driver, lesson, preview]
    );

    /* ── ③ ส่งทดสอบหลังเรียน — รอบนี้เท่านั้นที่บันทึกผลและตัดสินผ่าน ── */
    const submitPost = useCallback(
        async (finalAnswers: number[]) => {
            if (!driver || !lesson) return;

            setSubmitting(true);
            setError(null);
            try {
                const res = await fetch("/api/lesson/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        driver_id: driver.driver_id,
                        lesson_id: lesson.lesson_id,
                        answer_user: finalAnswers,
                        phase: "post",
                        ...(pre ? { pre_score: pre.score, pre_total: pre.total } : {}),
                        ...(preview ? { preview: true } : {}),
                    }),
                });
                const data = await res.json();

                if (!res.ok) {
                    setError(data?.error ?? "ส่งคำตอบไม่สำเร็จ");
                    return;
                }

                setResult({
                    status: data.status,
                    score: data.score,
                    total: data.total,
                    answer_key: data.answer_key ?? [],
                    answer_user: data.record?.answer_user ?? finalAnswers,
                });
                setAttempt(data.record ?? null);
                setStage("result");
                scrollToTop(rootRef.current);
            } catch {
                setError("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง");
            } finally {
                setSubmitting(false);
            }
        },
        [driver, lesson, pre, preview]
    );

    /** ② ดูวิดีโอจบแล้ว — บทเรียนที่ไม่มีคลังข้อสอบก็ปิดผลได้เลย */
    const finishVideo = useCallback(() => {
        if (quizItems.length === 0) {
            submitPost(answers);
            return;
        }
        // ล้างคำตอบที่เลือกไว้ตอนตอบคำถามแทรกระหว่างวิดีโอทิ้งก่อนเข้าทดสอบหลังเรียน
        // ไม่งั้นข้อที่ตอบไปแล้วระหว่างดูจะเด้งมาเป็นคำตอบที่เลือกไว้ล่วงหน้าในแบบทดสอบจริง
        setAnswers((prev) => prev.map(() => -1));
        setStage("quiz");
        scrollToTop(rootRef.current);
    }, [answers, quizItems.length, submitPost]);

    /**
     * ไม่ผ่าน → ล้างคำตอบรอบหลังเรียนแล้วบังคับกลับไปดูวิดีโอซ้ำตามแบบ 3a
     * สลับลำดับข้อใหม่ด้วย จะได้ไม่ใช่การจำว่า "ข้อ 3 ตอบข้อ ข" มาตอบซ้ำ
     * ไม่ต้องทำทดสอบก่อนเรียนใหม่ (คะแนนพื้นฐานของรอบนี้เก็บไว้เทียบต่อได้)
     */
    const retry = () => {
        setAnswers((prev) => prev.map(() => -1));
        setResult(null);
        rollQuizOrder();
        setStage(lesson?.video ? "video" : "quiz");
        scrollToTop(rootRef.current);
    };

    if (loading) {
        return (
            <div className="flex min-h-dvh items-center justify-center lg:min-h-full">
                <LoaderCircle className="size-7 animate-spin text-lsn-green-deep" />
            </div>
        );
    }

    if (!lesson) {
        return (
            <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center lg:min-h-full">
                <div className="flex size-14 items-center justify-center rounded-[18px] bg-lsn-orange-tint text-2xl">
                    ⚠
                </div>
                <p className="text-[13px] text-lsn-mute2">{error ?? "ไม่พบบทเรียนนี้"}</p>
                <Link
                    href="/lesson"
                    className="lsn-grad-cta rounded-[20px] px-6 py-3 text-[14px] font-medium text-white"
                >
                    กลับหน้าบทเรียน
                </Link>
            </div>
        );
    }

    const passed = attempt?.status === "ผ่าน";

    /* ── สรุปผล ── */
    if (stage === "result" && result) {
        /* ResultView อ่านทั้งสามอาร์เรย์แบบเรียงตรงกันทีละข้อ — bankItems คือคำถาม
           ทั้งหมดในบทเรียนเรียงตามลำดับเดิม ใช้เป็นลำดับแสดงเฉลยให้อ่านง่าย */
        const shown = bankItems.map((it) => it.index);

        return (
            <div ref={rootRef} className="contents">
                <ResultView
                    status={result.status}
                    score={result.score}
                    total={result.total}
                    lessonTitle={lesson.title}
                    questions={shown.map((i) => lesson.questions[i])}
                    answerKey={shown.map((i) => result.answer_key[i])}
                    answerUser={shown.map((i) => result.answer_user[i])}
                    preScore={pre?.score ?? null}
                    preTotal={pre?.total ?? null}
                    driver={driver}
                    lessonId={lesson.lesson_id}
                    onRetry={retry}
                />
            </div>
        );
    }

    /* ── ① ทดสอบก่อนเรียน ── */
    if (stage === "pretest") {
        return (
            <div ref={rootRef} className="contents">
                {error && (
                    <p className="bg-lsn-danger/12 px-5 py-3 text-[13px] text-lsn-danger-ink">
                        {error}
                    </p>
                )}
                <QuizForm
                    items={bankItems}
                    answers={preAnswers}
                    onAnswer={answerPre}
                    onSubmit={submitPre}
                    submitting={submitting}
                    onExit={() => setStage("intro")}
                    heading="ทดสอบก่อนเรียน"
                    note="วัดพื้นฐาน"
                    autoSubmit
                />
            </div>
        );
    }

    /* ── ② วิดีโอเต็มจอ ── */
    if (stage === "video") {
        return (
            <div ref={rootRef} className="contents">
                <LessonPlayer
                    url={lesson.video}
                    title={lesson.title}
                    subtitle={
                        timedQuestions.length > 0
                            ? `ขั้นที่ 2 จาก ${TOTAL_STEPS} · มีคำถามแทรก ${timedQuestions.length} ข้อ`
                            : `ขั้นที่ 2 จาก ${TOTAL_STEPS}`
                    }
                    timedQuestions={timedQuestions}
                    answers={answers}
                    onAnswer={answerOne}
                    onExit={() => setStage("intro")}
                    onFinish={finishVideo}
                />
            </div>
        );
    }

    /* ── ③ ทดสอบหลังเรียน ── */
    if (stage === "quiz") {
        return (
            <div ref={rootRef} className="contents">
                {error && (
                    <p className="bg-lsn-danger/12 px-5 py-3 text-[13px] text-lsn-danger-ink">
                        {error}
                    </p>
                )}
                <QuizForm
                    items={quizItems}
                    answers={answers}
                    onAnswer={answerOne}
                    onSubmit={submitPost}
                    submitting={submitting}
                    onExit={() => setStage("intro")}
                    heading="ทดสอบหลังเรียน · ผ่าน 80%"
                />
            </div>
        );
    }

    /* ── หน้าแนะนำบทเรียน ── */

    /**
     * เข้ามาทบทวนบทที่ผ่านแล้ว ไม่ต้องวัดพื้นฐานซ้ำ — ข้ามไปดูวิดีโอเลย
     * ส่วนคนที่ยังไม่ผ่าน ต้องเริ่มจากทดสอบก่อนเรียนตาม flow
     */
    const quizCount = bankItems.length;
    const startsWithPretest = quizCount > 0 && !passed;

    const startLabel = startsWithPretest
        ? "เริ่มเรียน · ทดสอบก่อนเรียน"
        : lesson.video
          ? passed
              ? "ทบทวนบทเรียนอีกครั้ง"
              : "เริ่มเรียน · ดูวิดีโอ"
          : quizCount > 0
            ? "เริ่มทำแบบทดสอบ"
            : "ยืนยันว่าเรียนจบแล้ว";

    /** สลับลำดับข้อของทดสอบหลังเรียนไว้ก่อน แล้วค่อยเข้าขั้นตอนแรก */
    const start = () => {
        // บทเรียนที่ไม่มีคำถามเลย: มีวิดีโอก็ยังต้องดูให้จบ ไม่มีก็ปิดผลได้ทันที
        if (quizCount === 0) {
            if (!lesson.video) {
                submitPost([]);
                return;
            }
            setStage("video");
            scrollToTop(rootRef.current);
            return;
        }

        rollQuizOrder();
        setStage(startsWithPretest ? "pretest" : lesson.video ? "video" : "quiz");
        scrollToTop(rootRef.current);
    };

    /** 3 ขั้นตอนที่จะเจอ — บอกล่วงหน้าให้ผู้เรียนรู้ว่าต้องใช้เวลาเท่าไหร่ */
    const steps = [
        {
            no: 1,
            label: "ทดสอบก่อนเรียน",
            detail: `${quizCount} ข้อ · วัดพื้นฐาน`,
            skipped: !startsWithPretest,
        },
        {
            no: 2,
            label: "ดูวิดีโอบทเรียน",
            detail: lesson.video
                ? timedQuestions.length > 0
                    ? `มีคำถามแทรก ${timedQuestions.length} ข้อ · เลื่อนข้ามไม่ได้`
                    : "เลื่อนข้ามไม่ได้"
                : "บทเรียนนี้ไม่มีวิดีโอ",
            skipped: !lesson.video,
        },
        {
            no: 3,
            label: "ทดสอบหลังเรียน · เก็บคะแนน",
            detail:
                quizCount === 0
                    ? "ไม่มีแบบทดสอบ"
                    : `${quizCount} ข้อ · ผ่าน 80%`,
            skipped: quizCount === 0,
        },
    ];

    return (
        <div ref={rootRef} className="lsn-grad-hero flex min-h-dvh flex-col lg:min-h-full">
            {/* ── หัวจอบนพื้นส้ม ── */}
            <div className="px-5 pb-6 pt-4">
                <Link
                    href="/lesson"
                    aria-label="ย้อนกลับ"
                    className="mb-4 flex size-9 items-center justify-center rounded-full bg-white/20 text-white transition active:scale-95"
                >
                    <ChevronLeft className="size-5" />
                </Link>

                <div className="flex items-start gap-3.5">
                    {/* URL มาจาก S3 ที่ผู้ดูแลเปลี่ยน bucket ได้อิสระ จึงไม่ใช้ next/image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={lessonLogo(lesson.logo)}
                        alt=""
                        className="size-[52px] shrink-0 rounded-[16px] bg-white object-contain p-1.5"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-white/80">{lesson.lesson_id}</p>
                        <h1 className="mt-0.5 text-[22px] font-medium leading-[1.25] text-white">
                            {lesson.title}
                        </h1>
                    </div>
                </div>

                <p className="mt-3 flex items-center gap-1.5 text-[12px] text-white/85">
                    <CalendarClock className="size-3.5" />
                    ครบกำหนด {formatThaiDate(lesson.due_date)}
                </p>
            </div>

            {/* ── แผ่นขาว ── */}
            <div className="relative flex flex-1 flex-col gap-3.5 rounded-t-[34px] bg-white px-[22px] pb-7 pt-[26px]">

                {passed && (
                    <div className="flex items-center gap-2.5 rounded-[18px] bg-lsn-green-tint px-4 py-3">
                        <span className="flex size-8 items-center justify-center rounded-[11px] bg-lsn-green-soft text-lsn-green-deep">
                            <Check className="size-4" strokeWidth={2.6} />
                        </span>
                        <span className="text-[13px] text-lsn-green-deep">
                            ผ่านบทเรียนนี้แล้ว · ทบทวนซ้ำได้ไม่จำกัด
                        </span>
                    </div>
                )}

                {/* ผ่านแล้วต้องหยิบใบรับรองย้อนหลังได้ ไม่ต้องสอบใหม่เพื่อขอใบ */}
                {certificate && (
                    <button
                        type="button"
                        onClick={() => setShowCert(true)}
                        className="lsn-grad-gold flex items-center justify-center gap-2.5 rounded-[20px] py-[16px] text-[15px] font-medium text-lsn-ink shadow-[0_8px_20px_-10px_rgba(138,107,33,.9)] transition active:scale-[0.98]"
                    >
                        <Award className="size-[18px]" strokeWidth={2.2} />
                        ดาวน์โหลดใบประกาศนียบัตร
                    </button>
                )}

                {lesson.description && (
                    <p className="whitespace-pre-line rounded-[20px] bg-lsn-surface p-4 text-[13px] leading-relaxed text-lsn-muted">
                        {lesson.description}
                    </p>
                )}

                {/* ── ลำดับขั้นตอนของบทเรียน ── */}
                <ol className="flex flex-col gap-2">
                    {steps.map((s) => (
                        <li
                            key={s.no}
                            className={`flex items-center gap-3 rounded-[18px] border-[1.5px] border-lsn-line p-3 ${
                                s.skipped ? "opacity-45" : ""
                            }`}
                        >
                            <span
                                className={`flex size-9 shrink-0 items-center justify-center rounded-[13px] text-[13px] ${
                                    s.skipped
                                        ? "bg-lsn-tile text-lsn-faint"
                                        : "bg-lsn-green-soft text-lsn-green-deep"
                                }`}
                            >
                                {s.no}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13.5px] text-lsn-ink">{s.label}</span>
                                <span className="block text-[11px] text-lsn-mute2">{s.detail}</span>
                            </span>
                        </li>
                    ))}
                </ol>

                {attempt && (
                    <div
                        className={`rounded-[20px] p-4 ${passed ? "bg-lsn-green-tint" : "bg-lsn-orange-tint"}`}
                    >
                        <p
                            className={`text-[13px] font-medium ${passed ? "text-lsn-green-deep" : "text-lsn-orange-ink"}`}
                        >
                            ผลล่าสุด: {attempt.status}
                        </p>
                        <p className="mt-1 text-[11.5px] text-lsn-mute2">
                            ตอบถูก {attempt.score ?? 0}/{attempt.total ?? quizCount} ข้อ
                            {" · "}
                            {formatThaiDateTime(attempt.created_at)}
                        </p>
                    </div>
                )}

                {error && (
                    <p className="rounded-[16px] bg-lsn-danger/12 px-4 py-3 text-[13px] text-lsn-danger-ink">
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={start}
                    disabled={submitting}
                    className="lsn-grad-cta mt-auto flex items-center justify-center gap-2 rounded-[22px] py-[19px] text-[16px] font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
                >
                    {submitting ? (
                        <LoaderCircle className="size-5 animate-spin" />
                    ) : (
                        !startsWithPretest && lesson.video && (
                            <Play className="size-4 fill-current" strokeWidth={0} />
                        )
                    )}
                    {submitting ? "กำลังบันทึก..." : startLabel}
                </button>

                {quizCount > 0 && (
                    <p className="text-center text-[11.5px] leading-relaxed text-lsn-faint">
                        ทดสอบหลังเรียนสลับลำดับข้อใหม่ทุกรอบ ·
                        ทุกข้อนับคะแนน แม้เป็นข้อที่แทรกถามระหว่างวิดีโอด้วย
                    </p>
                )}
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
