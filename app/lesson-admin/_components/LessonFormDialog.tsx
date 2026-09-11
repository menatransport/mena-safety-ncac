"use client";

// =============================================================================
// LessonFormDialog — ฟอร์มสร้าง/แก้ไขบทเรียน (โมดัล, responsive)
// -----------------------------------------------------------------------------
// จัดเป็น 4 ส่วนตามลำดับการกรอกจริง
//   1. ข้อมูลบทเรียน   2. สื่อการเรียน (โลโก้ + วิดีโอ พร้อมพรีวิว)
//   3. กลุ่มผู้เรียน    4. แบบทดสอบ
//
// ทุกข้อในนี้จะอยู่ในแบบทดสอบก่อน/หลังเรียนและนับคะแนนเหมือนกันหมด (ผู้เรียนเจอครบ
// ทุกข้อ แต่สลับลำดับใหม่ทุกรอบ — จัดการฝั่งหน้าเรียนทั้งหมด ไม่มีอะไรต้องตั้งค่าที่นี่)
// คำถามข้อไหนใส่ "นาทีในวิดีโอ" เพิ่มเติม = ข้อนั้นจะขึ้นถามแทรกระหว่างดูวิดีโอด้วย
// (คำตอบตอนนั้นไม่ถูกตรวจ เป็นแค่ตัวกระตุ้นความสนใจ) ส่วนคะแนนจริงยึดจากตอนทำ
// แบบทดสอบก่อน/หลังเรียนเท่านั้น
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
    CalendarDays,
    Clock3,
    FileText,
    ImageOff,
    ListChecks,
    LoaderCircle,
    MonitorPlay,
    Plus,
    Save,
    Search,
    Trash2,
    Upload,
    Users,
    X,
} from "lucide-react";

import { mitr } from "@/app/lesson/font";
import type { Lesson, LessonQuestion } from "@/app/lesson/type";
import { formatClock, lessonLogo, parseClock } from "@/app/lesson/constant";
import { LessonVideo } from "@/app/lesson/_components/LessonVideo";

import { MultiSelect } from "./MultiSelect";

type Props = {
    open: boolean;
    /** null = สร้างใหม่ */
    lesson: Lesson | null;
    clients: string[];
    onClose: () => void;
    onSaved: () => void;
};

type FormState = {
    title: string;
    description: string;
    logo: string;
    video: string;
    due_date: string;
    client_name: string[];
    questions: LessonQuestion[];
    answer: number[];
};

const EMPTY_FORM: FormState = {
    title: "",
    description: "",
    logo: "",
    video: "",
    due_date: "",
    client_name: [],
    questions: [],
    answer: [],
};

/** YYYY-MM-DD → dd/mm/yyyy สำหรับแสดงผล (ค่าว่างคืนสตริงว่าง) */
const toDisplayDate = (value: string) => {
    const [y, m, d] = value.split("-");
    return y && m && d ? `${d}/${m}/${y}` : "";
};

/** ISO timestamp → ค่าที่ <input type="date"> ใช้ได้ (YYYY-MM-DD ตามเวลาท้องถิ่น) */
const toDateInput = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** ลิงก์คลังไอคอนที่แนะนำให้ผู้ดูแลไปคัดลอก URL รูปมาใช้ */
const SVGREPO_URL = "https://www.svgrepo.com/";

/** สอนวิธีคัดลอกลิงก์รูปก่อน แล้วค่อยเปิด SVGRepo ในแท็บใหม่ */
const openSvgrepoGuide = async () => {
    const confirm = await Swal.fire({
        title: "วิธีหารูปโลโก้จาก SVGRepo",
        html: "ค้นหารูปที่ต้องการ → คลิกขวาที่รูป → <b>Copy image address</b> → นำลิงก์มาวางในช่องโลโก้บทเรียน",
        imageUrl: "/findimage_logo.png",
        imageAlt: "ขั้นตอนการคัดลอกลิงก์รูปจาก SVGRepo",
        width: 820,
        showCancelButton: true,
        confirmButtonText: "เปิด SVGRepo",
        cancelButtonText: "ปิด",
        // กล่องของ SweetAlert แปะไว้ที่ body ซึ่งอยู่นอกขอบเขต .lsn จึงต้องส่งฟอนต์เข้าไปเอง
        confirmButtonColor: "#05B865",
        cancelButtonColor: "#7A8A82",
        customClass: { popup: mitr.className },
    });

    if (confirm.isConfirmed) {
        window.open(SVGREPO_URL, "_blank", "noopener,noreferrer");
    }
};

/** ช่องกรอกมาตรฐานของธีม — พื้นจางตอนพัก แล้วกลายเป็นขาว+ขอบเขียวตอนโฟกัส */
const inputClass =
    "h-11 w-full rounded-[18px] border-[1.5px] border-lsn-line bg-lsn-surface px-4 text-sm text-lsn-ink outline-none transition placeholder:text-lsn-faint hover:border-lsn-green/40 focus:border-lsn-green focus:bg-white";

/** ป้ายกำกับช่องกรอก */
const labelClass = "mb-1.5 block text-sm font-medium text-lsn-ink";

/** ปุ่มรอง — ขอบบาง พื้นขาว ใช้กับงานที่ไม่ใช่การกระทำหลักของฟอร์ม */
const ghostButton =
    "flex h-11 shrink-0 items-center gap-1.5 rounded-[18px] border-[1.5px] border-lsn-line bg-white px-4 text-sm text-lsn-ink transition hover:border-lsn-green/40 hover:bg-lsn-surface disabled:opacity-60";

/** หัวข้อของแต่ละส่วนในฟอร์ม */
function SectionHeading({
    icon: Icon,
    title,
    hint,
    action,
}: {
    icon: typeof FileText;
    title: string;
    hint: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[13px] bg-lsn-green-soft text-lsn-green-deep">
                    <Icon className="size-[18px]" strokeWidth={1.8} />
                </span>
                <div>
                    <h3 className="text-sm font-medium text-lsn-ink">{title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-lsn-muted">{hint}</p>
                </div>
            </div>
            {action}
        </div>
    );
}

export function LessonFormDialog({ open, lesson, clients, onClose, onSaved }: Props) {
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    /** ข้อความเวลาของแต่ละคำถาม เก็บแยกเพื่อให้พิมพ์ "2:3" ระหว่างทางได้ */
    const [timeText, setTimeText] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [logoBroken, setLogoBroken] = useState(false);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const dueInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setUploadError(null);
        setLogoBroken(false);

        const questions = lesson && Array.isArray(lesson.questions) ? lesson.questions : [];
        setForm(
            lesson
                ? {
                      title: lesson.title ?? "",
                      description: lesson.description ?? "",
                      logo: lesson.logo ?? "",
                      video: lesson.video ?? "",
                      due_date: toDateInput(lesson.due_date),
                      client_name: Array.isArray(lesson.client_name) ? lesson.client_name : [],
                      questions,
                      answer: Array.isArray(lesson.answer) ? lesson.answer : [],
                  }
                : EMPTY_FORM
        );
        setTimeText(questions.map((q) => formatClock(q.time_sec)));
    }, [open, lesson]);

    const invalidTimes = useMemo(
        () => timeText.map((t) => t.trim() !== "" && parseClock(t) === null),
        [timeText]
    );

    /** จำนวนข้อที่ไม่มีนาทีในวิดีโอ (ไม่ขึ้น popup ระหว่างดู แต่ยังนับคะแนนเหมือนข้ออื่น) */
    const bankSize = useMemo(
        () => timeText.filter((t) => t.trim() === "").length,
        [timeText]
    );

    if (!open) return null;

    const questionCount = form.questions.length;

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    /** เปิดปฏิทินของ input[type=date] ที่ซ่อนไว้ (เบราว์เซอร์เก่าใช้ focus แทน) */
    const openDuePicker = () => {
        const el = dueInputRef.current;
        if (!el) return;
        try {
            el.showPicker();
        } catch {
            el.focus();
        }
    };

    /* ── คำถาม ── */
    const addQuestion = () => {
        setForm((prev) => ({
            ...prev,
            questions: [...prev.questions, { question: "", choices: ["", ""] }],
            answer: [...prev.answer, 0],
        }));
        setTimeText((prev) => [...prev, ""]);
    };

    const removeQuestion = (qi: number) => {
        setForm((prev) => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== qi),
            answer: prev.answer.filter((_, i) => i !== qi),
        }));
        setTimeText((prev) => prev.filter((_, i) => i !== qi));
    };

    const patchQuestion = (qi: number, patch: Partial<LessonQuestion>) =>
        setForm((prev) => ({
            ...prev,
            questions: prev.questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)),
        }));

    const setChoice = (qi: number, ci: number, value: string) =>
        patchQuestion(qi, {
            choices: form.questions[qi].choices.map((c, i) => (i === ci ? value : c)),
        });

    const addChoice = (qi: number) =>
        patchQuestion(qi, { choices: [...form.questions[qi].choices, ""] });

    const removeChoice = (qi: number, ci: number) => {
        patchQuestion(qi, {
            choices: form.questions[qi].choices.filter((_, i) => i !== ci),
        });
        // เฉลยที่ชี้ไปยังตัวเลือกที่ถูกลบต้องถอยกลับมาให้อยู่ในช่วงที่ถูกต้อง
        setForm((prev) => ({
            ...prev,
            answer: prev.answer.map((a, i) => (i !== qi ? a : Math.max(0, a >= ci ? a - 1 : a))),
        }));
    };

    const setAnswer = (qi: number, ci: number) =>
        setForm((prev) => ({
            ...prev,
            answer: prev.answer.map((a, i) => (i === qi ? ci : a)),
        }));

    /* ── อัปโหลดวิดีโอขึ้น S3 แล้วได้ public URL กลับมา ── */
    const uploadVideo = async (file: File) => {
        setUploading(true);
        setUploadError(null);
        try {
            const body = new FormData();
            body.append("file", file);
            body.append("kind", "video");
            // บทเรียนใหม่ยังไม่มีรหัส (ระบบสร้างให้ตอนบันทึก) จึงเก็บไฟล์ไว้ใต้ draft ก่อน
            body.append("lesson_id", lesson?.lesson_id || "draft");

            const res = await fetch("/api/lesson/upload", { method: "POST", body });
            const data = await res.json();

            if (!res.ok) {
                setUploadError(data?.error ?? "อัปโหลดวิดีโอไม่สำเร็จ");
                return;
            }
            set("video", data.url);
        } catch {
            setUploadError("อัปโหลดวิดีโอไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setUploading(false);
            if (videoInputRef.current) videoInputRef.current.value = "";
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();

        const badTime = invalidTimes.findIndex(Boolean);
        if (badTime !== -1) {
            setError(
                `เวลาในวิดีโอของคำถามข้อที่ ${badTime + 1} ไม่ถูกต้อง (ใช้รูปแบบ นาที:วินาที)`
            );
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const payload = {
                ...form,
                questions: form.questions.map((q, i) => {
                    const seconds = parseClock(timeText[i] ?? "");
                    return seconds === null
                        ? { ...q, time_sec: undefined }
                        : { ...q, time_sec: seconds };
                }),
                // เก็บเป็น ISO ให้ตรงกับ schema (due_date เป็น timestamp)
                due_date: form.due_date ? new Date(`${form.due_date}T23:59:59`).toISOString() : "",
            };

            const res = await fetch(
                lesson ? `/api/lesson/${encodeURIComponent(lesson.lesson_id)}` : "/api/lesson",
                {
                    method: lesson ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );
            const data = await res.json();

            if (!res.ok) {
                setError(data?.error ?? "บันทึกไม่สำเร็จ");
                return;
            }

            onSaved();
            onClose();
        } catch {
            setError("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-lsn-ink/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
            <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px]">
                {/* ── หัวโมดัล — ใช้แถบ hero สีเดียวกับหัวหน้าเพจ ให้รู้ว่ายังอยู่ในระบบเดิม ── */}
                <header className="lsn-grad-hero flex items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
                    <div className="min-w-0">
                        <p className="inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-medium text-white">
                            {lesson ? lesson.lesson_id : "บทเรียนใหม่"}
                        </p>
                        <h2 className="mt-1.5 text-lg text-white">
                            {lesson ? "แก้ไขบทเรียน" : "เพิ่มบทเรียน"}
                        </h2>
                        <p className="mt-0.5 text-xs text-white/85">
                            กรอกข้อมูล สื่อการเรียน และแบบทดสอบให้ครบก่อนบันทึก
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="ปิด"
                        className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-white/15 text-white transition hover:bg-white/25"
                    >
                        <X className="size-4" strokeWidth={2} />
                    </button>
                </header>

                <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {/* ── 1. ข้อมูลบทเรียน ── */}
                        <section className="border-b border-lsn-line px-5 py-5 sm:px-6">
                            <SectionHeading
                                icon={FileText}
                                title="ข้อมูลบทเรียน"
                                hint="ชื่อและกำหนดส่งที่ผู้เรียนจะเห็นบนมือถือ (รหัสบทเรียนระบบสร้างให้อัตโนมัติ)"
                            />

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label
                                        htmlFor="lesson-title"
                                        className={labelClass}
                                    >
                                        ชื่อบทเรียน <span className="text-lsn-danger">*</span>
                                    </label>
                                    <input
                                        id="lesson-title"
                                        value={form.title}
                                        onChange={(e) => set("title", e.target.value)}
                                        placeholder="เช่น การขับขี่ปลอดภัยในฤดูฝน"
                                        className={inputClass}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label
                                        htmlFor="lesson-desc"
                                        className={labelClass}
                                    >
                                        คำอธิบาย
                                    </label>
                                    <textarea
                                        id="lesson-desc"
                                        value={form.description}
                                        onChange={(e) => set("description", e.target.value)}
                                        rows={3}
                                        placeholder="สรุปเนื้อหาที่ผู้เรียนจะได้รับ"
                                        className="w-full resize-y rounded-[18px] border-[1.5px] border-lsn-line bg-lsn-surface px-4 py-3 text-sm leading-relaxed text-lsn-ink outline-none transition placeholder:text-lsn-faint hover:border-lsn-green/40 focus:border-lsn-green focus:bg-white"
                                    />
                                </div>

                                <div>
                                    <span className={labelClass}>
                                        กำหนดส่ง <span className="text-lsn-danger">*</span>
                                    </span>

                                    {/* แสดงเป็น dd/mm/yyyy เสมอ ไม่อิงรูปแบบวันที่ของเบราว์เซอร์
                                        ตัว input[type=date] ซ่อนไว้เพื่อใช้ปฏิทินของระบบ */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={openDuePicker}
                                            aria-label="เลือกกำหนดส่ง"
                                            className={`${inputClass} flex items-center justify-between gap-2 text-left`}
                                        >
                                            <span
                                                className={
                                                    form.due_date
                                                        ? "text-lsn-ink"
                                                        : "text-lsn-faint"
                                                }
                                            >
                                                {toDisplayDate(form.due_date) || "dd/mm/yyyy"}
                                            </span>
                                            <CalendarDays className="size-4 shrink-0 text-lsn-mute2" />
                                        </button>

                                        <input
                                            ref={dueInputRef}
                                            type="date"
                                            value={form.due_date}
                                            onChange={(e) => set("due_date", e.target.value)}
                                            tabIndex={-1}
                                            aria-hidden
                                            className="pointer-events-none absolute bottom-0 left-3 size-0 opacity-0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ── 2. สื่อการเรียน ── */}
                        <section className="border-b border-lsn-line px-5 py-5 sm:px-6">
                            <SectionHeading
                                icon={MonitorPlay}
                                title="สื่อการเรียน"
                                hint="วางลิงก์รูปโลโก้ (PNG) และวิดีโอ พร้อมดูตัวอย่างก่อนบันทึก"
                            />

                            <div className="grid gap-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                                {/* โลโก้ — ใช้ลิงก์รูปโดยตรง ไม่ต้องอัปโหลด */}
                                <div>
                                    <label
                                        htmlFor="lesson-logo"
                                        className={labelClass}
                                    >
                                        โลโก้บทเรียน
                                    </label>
                                    <input
                                        id="lesson-logo"
                                        type="url"
                                        value={form.logo}
                                        onChange={(e) => {
                                            set("logo", e.target.value);
                                            setLogoBroken(false);
                                        }}
                                        placeholder="https://.../logo.png"
                                        className={inputClass}
                                    />

                                    <button
                                        type="button"
                                        onClick={openSvgrepoGuide}
                                        className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-[16px] border-[1.5px] border-dashed border-lsn-line text-sm font-medium text-lsn-green-deep transition hover:border-lsn-green hover:bg-lsn-green-tint"
                                    >
                                        <Search className="size-4" />
                                        หารูปจาก SVGRepo
                                    </button>

                                    <div className="mt-2.5 flex items-center gap-3">
                                        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border-[1.5px] border-lsn-line bg-lsn-surface p-1.5">
                                            {!logoBroken ? (
                                                // URL มาจากภายนอก จึงไม่ใช้ next/image
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={lessonLogo(form.logo)}
                                                    alt="ตัวอย่างโลโก้"
                                                    onError={() => setLogoBroken(true)}
                                                    className="size-full object-contain"
                                                />
                                            ) : (
                                                <ImageOff
                                                    className="size-6 text-lsn-faint"
                                                    strokeWidth={1.6}
                                                />
                                            )}
                                        </div>
                                        <p className="text-xs leading-relaxed text-lsn-muted">
                                            {logoBroken
                                                ? "เปิดรูปจากลิงก์นี้ไม่ได้ กรุณาตรวจสอบ URL"
                                                : form.logo
                                                  ? "รองรับ PNG / JPG / SVG ที่เปิดได้แบบสาธารณะ"
                                                  : "ไม่บังคับกรอก — เว้นว่างไว้ระบบจะใช้รูปสำรองนี้ให้"}
                                        </p>
                                    </div>
                                </div>

                                {/* วิดีโอ — วางลิงก์หรืออัปโหลดขึ้น S3 แล้วดูตัวอย่างได้ */}
                                <div>
                                    <label
                                        htmlFor="lesson-video"
                                        className={labelClass}
                                    >
                                        วิดีโอบทเรียน
                                    </label>

                                    <div className="flex gap-2">
                                        <input
                                            id="lesson-video"
                                            type="url"
                                            value={form.video}
                                            onChange={(e) => set("video", e.target.value)}
                                            placeholder="วางลิงก์ YouTube หรืออัปโหลดไฟล์"
                                            className={inputClass}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => videoInputRef.current?.click()}
                                            disabled={uploading}
                                            className={ghostButton}
                                        >
                                            {uploading ? (
                                                <LoaderCircle className="size-4 animate-spin" />
                                            ) : (
                                                <Upload className="size-4" />
                                            )}
                                            <span className="hidden sm:inline">
                                                {uploading ? "กำลังอัปโหลด" : "อัปโหลด"}
                                            </span>
                                        </button>
                                        {form.video && (
                                            <button
                                                type="button"
                                                onClick={() => set("video", "")}
                                                aria-label="ล้างวิดีโอ"
                                                className="flex size-11 shrink-0 items-center justify-center rounded-[18px] border-[1.5px] border-lsn-line bg-white text-lsn-danger-ink transition hover:border-lsn-danger/40 hover:bg-lsn-danger/12"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        )}
                                    </div>

                                    <input
                                        ref={videoInputRef}
                                        type="file"
                                        accept="video/*"
                                        hidden
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) uploadVideo(file);
                                        }}
                                    />

                                    {uploadError && (
                                        <p className="mt-2 text-xs text-lsn-danger-ink">{uploadError}</p>
                                    )}

                                    <div className="mt-2.5 overflow-hidden rounded-[18px] border-[1.5px] border-lsn-line bg-lsn-surface">
                                        {form.video ? (
                                            <LessonVideo url={form.video} title="ตัวอย่างวิดีโอบทเรียน" />
                                        ) : (
                                            <div className="flex aspect-video items-center justify-center">
                                                <p className="text-xs text-lsn-mute2">
                                                    ยังไม่มีวิดีโอ — ตัวอย่างจะแสดงที่นี่
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ── 3. กลุ่มผู้เรียน ── */}
                        <section className="border-b border-lsn-line px-5 py-5 sm:px-6">
                            <SectionHeading
                                icon={Users}
                                title="กลุ่มงานของ พขร. ที่ต้องเรียน"
                                hint="เลือกลูกค้าที่พนักงานขับรถสังกัด เพื่อกำหนดว่าใครต้องเรียนบทเรียนนี้"
                            />

                            <MultiSelect
                                options={clients}
                                value={form.client_name}
                                onChange={(next) => set("client_name", next)}
                                emptyLabel="ทุกกลุ่ม (ไม่จำกัดลูกค้า)"
                                placeholder="ไม่เลือกเลย = พนักงานขับรถทุกคนเห็นบทเรียนนี้"
                                searchPlaceholder="ค้นหาชื่อลูกค้า..."
                                disabled={clients.length === 0}
                            />

                            {clients.length === 0 && (
                                <p className="mt-2 rounded-[14px] bg-lsn-orange-tint px-3 py-2 text-xs text-lsn-orange-ink">
                                    โหลดรายชื่อลูกค้าไม่ได้ — บทเรียนนี้จะแสดงกับทุกคน
                                </p>
                            )}
                        </section>

                        {/* ── 4. แบบทดสอบ ── */}
                        <section className="px-5 py-5 sm:px-6">
                            <SectionHeading
                                icon={ListChecks}
                                title="แบบทดสอบ"
                                hint="ใส่นาทีในวิดีโอเพิ่ม = ขึ้นถามแทรกระหว่างดูด้วย"
                                action={
                                    <button
                                        type="button"
                                        onClick={addQuestion}
                                        className={ghostButton}
                                    >
                                        <Plus className="size-4" />
                                        เพิ่มคำถาม
                                    </button>
                                }
                            />

                            {questionCount > 0 && (
                                <p className="mb-4 rounded-[18px] bg-lsn-surface px-4 py-3 text-xs leading-relaxed text-lsn-muted">
                                    ทั้งหมด {questionCount} ข้อ · แทรกในวิดีโอ{" "}
                                    {questionCount - bankSize} ข้อ
                                </p>
                            )}

                            {questionCount === 0 ? (
                                <div className="rounded-[22px] border-[1.5px] border-dashed border-lsn-line bg-lsn-surface px-4 py-10 text-center">
                                    <span className="mx-auto flex size-11 items-center justify-center rounded-[15px] bg-white text-lsn-green-deep">
                                        <ListChecks className="size-5" strokeWidth={1.7} />
                                    </span>
                                    <p className="mt-3 text-sm font-medium text-lsn-ink">ยังไม่มีคำถาม</p>
                                    <p className="mt-1 text-xs leading-relaxed text-lsn-muted">
                                        บทเรียนที่ไม่มีคำถามจะผ่านเมื่อผู้เรียนยืนยันว่าดูวิดีโอจบ
                                    </p>
                                </div>
                            ) : (
                                <ol className="space-y-3">
                                    {form.questions.map((q, qi) => (
                                        <li
                                            key={qi}
                                            className="rounded-[22px] border-[1.5px] border-lsn-line bg-lsn-surface p-4"
                                        >
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-lsn-ink">
                                                        คำถามข้อที่ {qi + 1}
                                                    </span>
                                                    {/* ทุกข้อนับคะแนนเหมือนกัน ป้ายนี้บอกแค่ว่าข้อนี้มี popup ระหว่างวิดีโอด้วยหรือไม่ */}
                                                    {(timeText[qi] ?? "").trim() === "" ? (
                                                        <span className="rounded-full bg-lsn-green-tint px-2.5 py-1 text-[11px] text-lsn-green-deep">
                                                            ไม่แทรกในวิดีโอ
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-lsn-orange-tint px-2.5 py-1 text-[11px] text-lsn-orange-ink">
                                                            แทรกในวิดีโอ 
                                                        </span>
                                                    )}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeQuestion(qi)}
                                                    aria-label={`ลบคำถามข้อ ${qi + 1}`}
                                                    className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-lsn-danger-ink transition hover:bg-lsn-danger/12"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                    ลบ
                                                </button>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                                                <input
                                                    value={q.question}
                                                    onChange={(e) =>
                                                        patchQuestion(qi, { question: e.target.value })
                                                    }
                                                    placeholder="ข้อความคำถาม"
                                                    className={`${inputClass} bg-white`}
                                                />

                                                <div>
                                                    <div className="relative">
                                                        <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-lsn-mute2" />
                                                        <input
                                                            value={timeText[qi] ?? ""}
                                                            onChange={(e) =>
                                                                setTimeText((prev) =>
                                                                    prev.map((t, i) =>
                                                                        i === qi ? e.target.value : t
                                                                    )
                                                                )
                                                            }
                                                            inputMode="numeric"
                                                            placeholder="2:30"
                                                            aria-label={`นาทีในวิดีโอของคำถามข้อ ${qi + 1}`}
                                                            className={`${inputClass} bg-white pl-10 ${
                                                                invalidTimes[qi]
                                                                    ? "border-lsn-danger focus:border-lsn-danger"
                                                                    : ""
                                                            }`}
                                                        />
                                                    </div>
                                                    <p
                                                        className={`mt-1.5 text-[11px] ${
                                                            invalidTimes[qi]
                                                                ? "text-lsn-danger-ink"
                                                                : "text-lsn-mute2"
                                                        }`}
                                                    >
                                                        {invalidTimes[qi]
                                                            ? "ใช้รูปแบบ นาที:วินาที"
                                                            : "นาทีในวิดีโอ (ไม่บังคับ)"}
                                                    </p>
                                                </div>
                                            </div>

                                            <p className="mb-2 mt-4 text-xs text-lsn-muted">
                                                เลือกปุ่มวงกลมหน้าตัวเลือกเพื่อกำหนดคำตอบที่ถูก
                                            </p>

                                            <div className="space-y-2">
                                                {q.choices.map((c, ci) => (
                                                    <div key={ci} className="flex items-center gap-2.5">
                                                        <input
                                                            type="radio"
                                                            name={`answer-${qi}`}
                                                            checked={form.answer[qi] === ci}
                                                            onChange={() => setAnswer(qi, ci)}
                                                            aria-label={`เฉลยข้อ ${qi + 1} ตัวเลือกที่ ${ci + 1}`}
                                                            className="size-4 shrink-0 accent-[#05B865]"
                                                        />
                                                        <input
                                                            value={c}
                                                            onChange={(e) => setChoice(qi, ci, e.target.value)}
                                                            placeholder={`ตัวเลือกที่ ${ci + 1}`}
                                                            className="h-10 min-w-0 flex-1 rounded-[16px] border-[1.5px] border-lsn-line bg-white px-3.5 text-sm text-lsn-ink outline-none transition placeholder:text-lsn-faint hover:border-lsn-green/40 focus:border-lsn-green"
                                                        />
                                                        {q.choices.length > 2 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeChoice(qi, ci)}
                                                                aria-label={`ลบตัวเลือกที่ ${ci + 1}`}
                                                                className="flex size-9 shrink-0 items-center justify-center rounded-[13px] text-lsn-mute2 transition hover:bg-lsn-danger/12 hover:text-lsn-danger-ink"
                                                            >
                                                                <X className="size-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}

                                                <button
                                                    type="button"
                                                    onClick={() => addChoice(qi)}
                                                    className="rounded-full px-2 py-1 text-xs font-medium text-lsn-green-deep transition hover:bg-lsn-green-tint"
                                                >
                                                    + เพิ่มตัวเลือก
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>
                    </div>

                    {/* ── ท้ายโมดัล ── */}
                    <footer className="border-t border-lsn-line bg-white px-5 py-4 sm:px-6">
                        {error && (
                            <p className="mb-3 rounded-[18px] border-[1.5px] border-lsn-danger/25 bg-lsn-danger/12 px-4 py-3 text-sm text-lsn-danger-ink">
                                {error}
                            </p>
                        )}

                        {/* มือถือ: ปุ่มยืดเต็มบรรทัดให้กดง่าย, จอใหญ่: สรุปซ้าย–ปุ่มขวา */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-lsn-muted">
                                {questionCount} คำถาม ·{" "}
                                {form.client_name.length === 0
                                    ? "ทุกกลุ่ม"
                                    : `${form.client_name.length} กลุ่ม`}
                            </p>

                            <div className="flex w-full gap-2.5 sm:w-auto">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="h-11 flex-1 rounded-[18px] border-[1.5px] border-lsn-line bg-white px-5 text-sm text-lsn-ink transition hover:bg-lsn-surface sm:flex-none"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="lsn-grad-cta flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[18px] px-6 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60 sm:flex-none"
                                >
                                    {saving ? (
                                        <LoaderCircle className="size-4 animate-spin" />
                                    ) : (
                                        <Save className="size-4" />
                                    )}
                                    {lesson ? "บันทึกการแก้ไข" : "สร้างบทเรียน"}
                                </button>
                            </div>
                        </div>
                    </footer>
                </form>
            </div>
        </div>
    );
}
