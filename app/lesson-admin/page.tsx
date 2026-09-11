'use client';

// =============================================================================
// Page: /lesson-admin
// -----------------------------------------------------------------------------
// แดชบอร์ดผู้ดูแลระบบ Safety Self Learning — หน้าเดียวจบ 2 แท็บ
//   • จัดการบทเรียน : ตารางบทเรียน + สร้าง/แก้ไข/เปิด-ปิดสถานะ
//   • ผลการเรียน    : ผลการทำแบบทดสอบของพนักงานขับรถ
// ทั้งสองแท็บส่งออกเป็น Excel ได้ (ส่งออกเฉพาะที่กรองไว้)
//
// สเกล "สบายตา"
// -----------------------------------------------------------------------------
// ตัวอักษร ปุ่ม และแถวตารางถูกขยายขึ้นทั้งชุด สำหรับคนที่ต้องนั่งดูหน้านี้ทั้งวัน
// ตารางตรึงไว้ที่ความหนาแน่นเดียว ไม่มีปุ่มตั้งค่าให้เลือก — ตัวเลือกที่ต้องมานั่ง
// ปรับเองคือภาระ ไม่ใช่ความสามารถ
//
// แถบ hero ไล่สีแบบเดิมถูกถอดออก เพราะกินความสูงราว 460px ก่อนถึงแถวแรกของตาราง
// ท่าทางของแบรนด์ย้ายไปอยู่ที่เส้นไล่สี 2px ใต้แถบบนแทน
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import {
    BookOpen,
    Download,
    Plus,
    Search,
    Send,
    Target,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';

import { mitr } from '@/app/lesson/font';
import type { Lesson } from '@/app/lesson/type';

import type { AdminTab, LessonUserRow, LessonUserSummary } from './type';
import { LessonTable } from './_components/LessonTable';
import { UserTable } from './_components/UserTable';
import { LessonFormDialog } from './_components/LessonFormDialog';
import { AdminBar } from './_components/AdminBar';
import {
    MonthFilter,
    monthKeyOf,
    monthLabelOf,
    yearLabelOf,
    type MonthOption,
} from './_components/MonthFilter';
import { control, sheet } from './_components/sheet';
import { TableSkeleton } from './_components/TableChrome';

/** กล่องแจ้งเตือนของ SweetAlert ถูกแปะไว้ที่ body ซึ่งอยู่นอกขอบเขต .lsn
 *  จึงต้องส่งฟอนต์ Mitr และสีของธีมเข้าไปเองทุกครั้ง */
const swalTheme = {
    confirmButtonColor: '#067A5B',
    cancelButtonColor: '#5F7A6E',
    customClass: { popup: mitr.className },
};

const isActive = (l: Lesson) => l.is_active !== false;

/**
 * แปลงเวลา ISO เป็น Date object สำหรับ Excel
 *
 * เดิมส่งสตริง ISO ดิบ ("2026-09-04T15:17:00.000Z") ลงไปตรง ๆ Excel จึงมองเป็น
 * "ข้อความ" เรียงลำดับตามตัวอักษรและใช้สูตรวันที่ไม่ได้เลย
 * ส่ง Date จริงแล้วกำหนด number format ทีหลัง จะได้เป็นเซลล์วันที่ที่กรอง
 * เรียง และคำนวณต่อได้จริง
 */
const toDateCell = (value?: string): Date | string => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d;
};

/** ตัวเลขที่จะเอาไปคำนวณต่อใน Excel ต้องเป็น number ไม่ใช่ '' หรือข้อความ */
const toNumberCell = (value: unknown): number | string =>
    typeof value === 'number' && Number.isFinite(value) ? value : '';

/* ────────────────────────────────────────────────────────────────────────────
 * การ์ดสรุป
 * ------------------------------------------------------------------------- */

/**
 * นับเลขขึ้นตอนเปิดหน้าและตอนกดโหลดใหม่เท่านั้น
 * ไม่นับตอนเปลี่ยนตัวกรอง เพราะตัวเลขวิ่งทุกครั้งที่พิมพ์จะกวนสายตามาก
 */
function useCountUp(target: number, run: number) {
    const [value, setValue] = useState(0);
    const frame = useRef<number | null>(null);

    useEffect(() => {
        const reduce =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            setValue(target);
            return;
        }

        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 900);
            // easeOutExpo — พุ่งเร็วตอนต้นแล้วค่อย ๆ นิ่ง ให้ความรู้สึกว่าข้อมูลมาถึงแล้ว
            const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            setValue(target * eased);
            if (t < 1) frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);

        return () => {
            if (frame.current !== null) cancelAnimationFrame(frame.current);
        };
    }, [target, run]);

    return value;
}

function StatCard({
    icon: Icon,
    label,
    value,
    unit,
    delta,
    deltaTone,
    delay,
    emphasis,
    ratio,
}: {
    icon: typeof BookOpen;
    label: string;
    value: string;
    unit: string;
    delta: string;
    deltaTone: 'up' | 'down';
    delay: number;
    /** ใบชี้วัดหลัก — ตัวเลขใหญ่ขึ้นหนึ่งขั้นและมีวงแหวนบอกสัดส่วน */
    emphasis?: boolean;
    /** 0–1 สำหรับวงแหวน (ใช้เฉพาะใบชี้วัดหลัก) */
    ratio?: number;
}) {
    const Delta = deltaTone === 'up' ? TrendingUp : TrendingDown;
    const RADIUS = 30;
    const CIRC = 2 * Math.PI * RADIUS;
    // ต่ำกว่า 70% ถือว่าต้องเข้าไปดู วงแหวนจึงเปลี่ยนเป็นโทนเตือน
    const alert = (ratio ?? 1) < 0.7;

    return (
        <div
            className="lsn-rise lsn-e1 rounded-2xl border border-lsn-line-strong bg-white p-5"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lsn-green-tint text-lsn-green-900">
                            <Icon className="size-5" strokeWidth={1.8} />
                        </span>
                        <span className="truncate text-sm leading-6 text-lsn-muted">{label}</span>
                    </div>

                    <div className="mt-3 flex items-baseline gap-1.5">
                        <span
                            className={`font-semibold leading-none tracking-[-.01em] tabular-nums text-lsn-ink ${
                                emphasis ? 'text-[40px]' : 'text-4xl'
                            }`}
                        >
                            {value}
                        </span>
                        <span
                            className={
                                emphasis
                                    ? 'text-lg font-medium text-lsn-forest'
                                    : 'text-base text-lsn-muted'
                            }
                        >
                            {unit}
                        </span>
                    </div>

                    {/* บรรทัดนี้ต้องไม่เคยว่าง — สี่ใบที่มีสามใบมีบรรทัดล่างจะดูเหมือนเรนเดอร์พลาด */}
                    <div
                        className={`mt-2 flex items-center gap-1.5 text-sm leading-5 ${
                            deltaTone === 'up' ? 'text-lsn-green-900' : 'text-lsn-danger-ink'
                        }`}
                    >
                        <Delta className="size-4 shrink-0" strokeWidth={2} />
                        <span className="truncate">{delta}</span>
                    </div>
                </div>

                {emphasis && (
                    <svg
                        className="lsn-ring size-[72px] shrink-0"
                        viewBox="0 0 72 72"
                        role="img"
                        aria-label={`อัตราผ่าน ${value}%`}
                    >
                        <defs>
                            <linearGradient id="lsnPassRing" x1="0" y1="1" x2="1" y2="0">
                                <stop offset="0%" stopColor={alert ? '#F5A524' : '#12B981'} />
                                <stop offset="100%" stopColor={alert ? '#F0654F' : '#0FB5C7'} />
                            </linearGradient>
                        </defs>
                        <circle
                            cx="36"
                            cy="36"
                            r={RADIUS}
                            fill="none"
                            stroke="#E6F0EA"
                            strokeWidth="6"
                        />
                        <circle
                            cx="36"
                            cy="36"
                            r={RADIUS}
                            fill="none"
                            stroke="url(#lsnPassRing)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={CIRC}
                            strokeDashoffset={CIRC * (1 - (ratio ?? 0))}
                            transform="rotate(-90 36 36)"
                            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }}
                        />
                    </svg>
                )}
            </div>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * หน้าแอดมิน
 * ------------------------------------------------------------------------- */

const TABS: { key: AdminTab; label: string; icon: typeof BookOpen }[] = [
    { key: 'lesson', label: 'จัดการบทเรียน', icon: BookOpen },
    { key: 'user', label: 'ผลการเรียน', icon: Users },
];

export default function LessonAdminPage() {
    const [tab, setTab] = useState<AdminTab>('lesson');

    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [records, setRecords] = useState<LessonUserRow[]>([]);
    const [clients, setClients] = useState<string[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadedAt, setLoadedAt] = useState<Date | null>(null);
    /** เพิ่มขึ้นทุกครั้งที่โหลดสำเร็จ ใช้สั่งให้ตัวเลขนับขึ้นใหม่ */
    const [loadRun, setLoadRun] = useState(0);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    /** เดือนที่เลือก (YYYY-MM) — null = ยังไม่ตั้งค่าเริ่มต้น, [] = ทุกเดือน */
    const [months, setMonths] = useState<string[] | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Lesson | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    /* ── โหลดข้อมูลทั้งหมดของหน้า ── */
    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [lessonRes, userRes, clientRes] = await Promise.all([
                fetch('/api/lesson'),
                fetch('/api/lesson/user'),
                fetch('/api/lesson/client'),
            ]);

            const [lessonData, userData, clientData] = await Promise.all([
                lessonRes.json(),
                userRes.json(),
                clientRes.json(),
            ]);

            if (!lessonRes.ok) {
                setError(lessonData?.error ?? 'โหลดข้อมูลบทเรียนไม่สำเร็จ');
                return;
            }

            setLessons(lessonData.lessons ?? []);
            setRecords(userRes.ok ? (userData.records ?? []) : []);
            setClients(clientData.clients ?? []);
            setLoadedAt(new Date());
            setLoadRun((n) => n + 1);
            // ค่าเริ่มต้น = เดือนปัจจุบัน ตั้งครั้งเดียวตอนโหลดรอบแรก
            // ถ้าตั้งทุกรอบ การกดโหลดใหม่จะไปล้างเดือนที่ผู้ดูแลเลือกไว้ทิ้ง
            setMonths((prev) => prev ?? [monthKeyOf()]);
        } catch {
            setError('เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    // เปลี่ยนแท็บแล้วเงื่อนไขค้นหาเดิมไม่เกี่ยวข้องอีก จึงล้างทิ้ง
    useEffect(() => {
        setSearch('');
        setStatusFilter('');
        setClientFilter('');
        // กลับเข้าแท็บผลการเรียนใหม่ ให้เริ่มที่เดือนปัจจุบันเหมือนตอนเปิดหน้า
        setMonths([monthKeyOf()]);
    }, [tab]);

    /* ── ตัวกรอง (คำนวณที่นี่ เพื่อให้ปุ่มส่งออกรู้ว่ากำลังจะส่งกี่รายการ) ── */
    const q = search.trim().toLowerCase();

    const visibleLessons = useMemo(
        () =>
            lessons.filter((l) => {
                const on = isActive(l);
                if (statusFilter === 'on' && !on) return false;
                if (statusFilter === 'off' && on) return false;
                if (clientFilter && !(l.client_name ?? []).includes(clientFilter)) return false;
                if (!q) return true;
                return [l.lesson_id, l.title, l.description, ...(l.client_name ?? [])]
                    .join(' ')
                    .toLowerCase()
                    .includes(q);
            }),
        [lessons, statusFilter, clientFilter, q]
    );

    /**
     * ตัวเลือกเดือนสร้างจากเดือนที่มีข้อมูลจริงเท่านั้น จะได้ไม่มีรายการเปล่ายาวเหยียด
     * แต่บวกเดือนปัจจุบันเข้าไปเสมอ เพราะเป็นค่าเริ่มต้น ถ้าไม่มีในรายการ
     * ผู้ดูแลจะเห็นตารางว่างโดยไม่รู้ว่ากรองอะไรอยู่
     */
    const monthOptions = useMemo<MonthOption[]>(() => {
        const counts = new Map<string, number>();
        for (const r of records) {
            const d = new Date(r.created_at);
            if (Number.isNaN(d.getTime())) continue;
            const key = monthKeyOf(d);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        const current = monthKeyOf();
        if (!counts.has(current)) counts.set(current, 0);

        return [...counts.keys()]
            .sort((a, b) => b.localeCompare(a))
            .map((key) => ({
                value: key,
                label: monthLabelOf(key),
                year: yearLabelOf(key),
                count: counts.get(key) ?? 0,
            }));
    }, [records]);

/**
     * ยุบผลการเรียนเหลือหนึ่งแถวต่อคู่ "พนักงาน × บทเรียน" โดยใช้ผลของครั้งล่าสุด
     *
     * ลำดับสำคัญ: กรองเดือนก่อน แล้วค่อยหาครั้งล่าสุด "ภายในเดือนที่เลือก"
     * รายงานของแต่ละเดือนจะได้จบในตัวเอง — ถ้าหาครั้งล่าสุดก่อนแล้วค่อยกรองเดือน
     * คนที่ทำเดือน ส.ค. แล้วทำซ้ำเดือน ก.ย. จะหายไปจากรายงานเดือน ส.ค. ทั้งที่ทำจริง
     *
     * ส่วนตัวกรองสถานะและคำค้นต้องมาทีหลัง เพราะต้องเทียบกับ "สถานะล่าสุด"
     * ไม่ใช่สถานะของครั้งใดครั้งหนึ่งระหว่างทาง
     */
    const summaryAll = useMemo<LessonUserSummary[]>(() => {
        const inWindow = records.filter((r) => {
            if (!months || months.length === 0) return true;
            const d = new Date(r.created_at);
            if (Number.isNaN(d.getTime())) return false;
            return months.includes(monthKeyOf(d));
        });

        const latest = new Map<string, LessonUserSummary>();
        for (const r of inWindow) {
            const key = `${r.driver_id}__${r.lesson_id}`;
            const current = latest.get(key);
            const total = r.total ?? r.answer_user?.length ?? 0;
            const newer = !current || r.created_at > current.created_at;

            latest.set(key, {
                key,
                driver_id: r.driver_id,
                lesson_id: r.lesson_id,
                lesson_title: newer ? r.lesson_title : current.lesson_title,
                status: newer ? r.status : current.status,
                score: newer ? (r.score ?? 0) : current.score,
                total: newer ? total : current.total,
                pre_score: newer ? r.pre_score : current.pre_score,
                created_at: newer ? r.created_at : current.created_at,
                attempts: (current?.attempts ?? 0) + 1,
            });
        }
        return [...latest.values()];
    }, [records, months]);

    const visibleRecords = useMemo(
        () =>
            summaryAll.filter((r) => {
                if (statusFilter && r.status !== statusFilter) return false;
                if (!q) return true;
                return [r.driver_id, r.lesson_id, r.lesson_title]
                    .join(' ')
                    .toLowerCase()
                    .includes(q);
            }),
        [summaryAll, statusFilter, q]
    );

    const isLessonTab = tab === 'lesson';
    const monthFilterOn = !isLessonTab && !!months && months.length > 0;
    const hasFilter = Boolean(q || statusFilter || clientFilter || monthFilterOn);
    const visibleCount = isLessonTab ? visibleLessons.length : visibleRecords.length;

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('');
        setClientFilter('');
        // ล้างแล้วต้องเห็นทุกอย่างจริง ๆ ไม่ใช่ย้อนกลับไปเดือนปัจจุบัน
        setMonths([]);
    };

    /* ── สถิติ ── */
    const stats = useMemo(() => {
        const passed = records.filter((r) => r.status === 'ผ่าน').length;
        const drivers = new Set(records.map((r) => r.driver_id)).size;
        return {
            // นับเฉพาะบทเรียนที่เปิดใช้งาน — ตรงกับจำนวนที่คนขับเห็นจริง
            lessons: lessons.filter(isActive).length,
            drivers,
            submissions: records.length,
            passRate: records.length === 0 ? 0 : (passed / records.length) * 100,
        };
    }, [lessons, records]);

    const cLessons = useCountUp(stats.lessons, loadRun);
    const cDrivers = useCountUp(stats.drivers, loadRun);
    const cSubmissions = useCountUp(stats.submissions, loadRun);
    const cPassRate = useCountUp(stats.passRate, loadRun);

    /* ── เปิด/ปิดสถานะบทเรียน ── */
    const setActive = async (lesson: Lesson, next: boolean) => {
        const res = await fetch(`/api/lesson/${encodeURIComponent(lesson.lesson_id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: next }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'เปลี่ยนสถานะไม่สำเร็จ');
        // อัปเดตเฉพาะแถวที่เปลี่ยน เร็วกว่าโหลดทั้งหน้าใหม่
        setLessons((prev) =>
            prev.map((l) => (l.lesson_id === lesson.lesson_id ? { ...l, is_active: next } : l))
        );
    };

    /** ปิดบทเรียนคือการทำให้คนขับมองไม่เห็น จึงถามยืนยันก่อน ส่วนการเปิดไม่ต้อง */
    const handleToggleActive = async (lesson: Lesson) => {
        const next = !isActive(lesson);

        if (!next) {
            const confirm = await Swal.fire({
                title: 'ปิดบทเรียนนี้?',
                html: `<b>${lesson.lesson_id}</b> — ${lesson.title}<br/>พนักงานขับรถจะไม่เห็นบทเรียนนี้ ผลการเรียนเดิมยังอยู่ครบ`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'ปิดบทเรียน',
                cancelButtonText: 'ยกเลิก',
                ...swalTheme,
                confirmButtonColor: '#F0654F',
            });
            if (!confirm.isConfirmed) return;
        }

        setTogglingId(lesson.lesson_id);
        try {
            await setActive(lesson, next);
            Swal.fire({
                title: next ? 'เปิดบทเรียนแล้ว' : 'ปิดบทเรียนแล้ว',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: mitr.className },
            });
        } catch (e) {
            Swal.fire({
                title: 'เปลี่ยนสถานะไม่สำเร็จ',
                text: e instanceof Error ? e.message : 'เชื่อมต่อระบบไม่ได้',
                icon: 'error',
                ...swalTheme,
            });
        } finally {
            setTogglingId(null);
        }
    };

    /** ส่งออกตารางที่กำลังดูอยู่ — ยึดตามตัวกรองที่เห็นบนจอ ไม่ใช่ข้อมูลทั้งหมด */
    const exportExcel = async () => {
        const XLSX = await import('xlsx');

        const rows = isLessonTab
            ? visibleLessons.map((l) => ({
                  รหัสบทเรียน: l.lesson_id,
                  ชื่อบทเรียน: l.title,
                  คำอธิบาย: l.description,
                  ลูกค้าที่ต้องเรียน: (l.client_name ?? []).join(', ') || 'ทุกลูกค้า',
                  จำนวนข้อ: l.questions?.length ?? 0,
                  กำหนดส่ง: toDateCell(l.due_date),
                  สถานะ: isActive(l) ? 'เปิด' : 'ปิด',
                  โลโก้: l.logo,
              }))
            : // ส่งออกให้ตรงกับสรุปที่เห็นบนจอ — หนึ่งแถวต่อคู่ พนักงาน × บทเรียน
              visibleRecords.map((r) => ({
                  รหัสพนักงาน: r.driver_id,
                  รหัสบทเรียน: r.lesson_id,
                  ชื่อบทเรียน: r.lesson_title,
                  // แยกเป็นสามคอลัมน์ตัวเลข แทนข้อความ "1/3" ที่เอาไปหาผลรวมหรือ
                  // ค่าเฉลี่ยต่อไม่ได้ — ช่องคะแนนก่อนเรียนจะว่างถ้าผู้เรียนข้ามขั้นนั้น
                  // ซึ่งมีความหมายต่างจากได้ 0 คะแนน จึงไม่เติม 0 ให้
                  คะแนนก่อนเรียน: toNumberCell(r.pre_score),
                  คะแนนหลังเรียน: toNumberCell(r.score),
                  คะแนนเต็ม: toNumberCell(r.total),
                  ครั้งที่ทำ: toNumberCell(r.attempts),
                  สถานะล่าสุด: r.status,
                  ส่งล่าสุด: toDateCell(r.created_at),
              }));

        // cellDates ทำให้ค่า Date กลายเป็นเซลล์ชนิดวันที่จริง ไม่ใช่ข้อความ
        const sheetData = XLSX.utils.json_to_sheet(rows, { cellDates: true });

        // บทเรียนดูแค่วัน ส่วนผลการเรียนต้องเห็นเวลาด้วยเพราะส่งได้หลายครั้งต่อวัน
        const dateFormat = isLessonTab ? 'dd/mm/yyyy' : 'dd/mm/yyyy hh:mm';
        const range = XLSX.utils.decode_range(sheetData['!ref'] ?? 'A1');
        for (let row = range.s.r; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cell = sheetData[XLSX.utils.encode_cell({ r: row, c: col })];
                if (cell?.t === 'd') cell.z = dateFormat;
            }
        }

        // ถ้าคอลัมน์แคบเกินไป Excel จะโชว์วันที่เป็น ##### จึงต้องกว้างพอตั้งแต่แรก
        const headers = Object.keys(rows[0] ?? {});
        sheetData['!cols'] = headers.map((key) => {
            const widest = rows.reduce((max, row) => {
                const value = (row as Record<string, unknown>)[key];
                const length = value instanceof Date ? 16 : String(value ?? '').length;
                return Math.max(max, length);
            }, key.length);
            return { wch: Math.min(46, Math.max(12, widest + 2)) };
        });

        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheetData, isLessonTab ? 'Lessons' : 'Users');
        XLSX.writeFile(book, `safety-lesson-${tab}-${Date.now()}.xlsx`, { cellDates: true });
    };

    const openCreate = () => {
        setEditing(null);
        setDialogOpen(true);
    };

    return (
        <div className="flex min-h-dvh flex-col bg-lsn-canvas">
            <AdminBar loading={loading} loadedAt={loadedAt} onRefresh={loadAll} />

            <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-10 pt-6 sm:px-8">
                {/* ══ การ์ดสรุป ══ */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        icon={BookOpen}
                        label="บทเรียนที่เปิดใช้งาน"
                        value={Math.round(cLessons).toLocaleString('th-TH')}
                        unit="บทเรียน"
                        delta={`จากทั้งหมด ${lessons.length} รายการ`}
                        deltaTone="up"
                        delay={0}
                    />
                    <StatCard
                        icon={Users}
                        label="พนักงานที่เข้าเรียน"
                        value={Math.round(cDrivers).toLocaleString('th-TH')}
                        unit="คน"
                        delta={`ส่งแล้วเฉลี่ย ${
                            stats.drivers === 0
                                ? 0
                                : Math.round((stats.submissions / stats.drivers) * 10) / 10
                        } ครั้ง/คน`}
                        deltaTone="up"
                        delay={45}
                    />
                    <StatCard
                        icon={Send}
                        label="จำนวนครั้งที่ส่ง"
                        value={Math.round(cSubmissions).toLocaleString('th-TH')}
                        unit="ครั้ง"
                        delta={`ครอบคลุม ${new Set(records.map((r) => r.lesson_id)).size} บทเรียน`}
                        deltaTone="up"
                        delay={90}
                    />
                    <StatCard
                        icon={Target}
                        label="อัตราผ่าน"
                        value={cPassRate.toFixed(1)}
                        unit="%"
                        delta={`ผ่าน ${records.filter((r) => r.status === 'ผ่าน').length} จาก ${
                            records.length
                        } ครั้ง`}
                        deltaTone={stats.passRate >= 70 ? 'up' : 'down'}
                        delay={135}
                        emphasis
                        ratio={stats.passRate / 100}
                    />
                </div>

                {/* ══ แท็บ — ปุ่มกดธรรมดาในเนื้อหา ไม่ใช่แถบนำทาง ══ */}
                <div className="mt-6 inline-flex w-full rounded-2xl border border-lsn-line-strong bg-lsn-surface p-1.5 sm:w-auto">
                    {TABS.map((t) => {
                        const on = tab === t.key;
                        const count = t.key === 'lesson' ? lessons.length : records.length;
                        return (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setTab(t.key)}
                                aria-pressed={on}
                                className={`flex h-12 flex-1 items-center justify-center gap-2.5 whitespace-nowrap rounded-xl px-5 text-[15px] transition-all duration-200 sm:flex-none sm:px-7 ${
                                    on
                                        ? 'lsn-e1 bg-lsn-ink font-medium text-white'
                                        : 'text-lsn-muted hover:text-lsn-ink'
                                }`}
                            >
                                <t.icon className="size-5" strokeWidth={1.8} />
                                {t.label}
                                {!loading && (
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[13px] leading-4 tabular-nums ${
                                            on ? 'bg-white/15 text-white' : 'bg-white text-lsn-muted'
                                        }`}
                                    >
                                        {count.toLocaleString('th-TH')}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {error && (
                    <p className="mt-5 rounded-xl border border-lsn-danger/25 bg-lsn-danger/10 px-5 py-4 text-sm text-lsn-danger-ink">
                        {error}
                    </p>
                )}

                {/* ══ แผงตาราง ══
                    บนจอเล็กแผงถูกทำให้โปร่ง เพราะรายการเปลี่ยนเป็นการ์ดที่มีกรอบของตัวเองแล้ว
                    การ์ดซ้อนในกรอบอีกชั้นจะดูเป็นกล่องในกล่อง */}
                <div
                    className={`mt-5 max-md:!rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none ${sheet.panel}`}
                >
                    {/* แถบเครื่องมือ (ตั้งใจให้เลื่อนหายไปได้ ไม่ปักหมุด —
                        ปักหมุดสามชั้นซ้อนกันคือความผิดพลาดที่คอนโซลส่วนใหญ่ทำ) */}
                    <div
                        className={`${sheet.toolbar} max-md:!border-0 max-md:!px-0 max-md:py-4`}
                    >
                        <div className="relative flex min-w-0 flex-1 items-center md:max-w-88 md:flex-none">
                            <Search className="pointer-events-none absolute left-3.5 size-5 text-lsn-muted" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={
                                    isLessonTab
                                        ? 'ค้นหารหัสหรือชื่อบทเรียน'
                                        : 'ค้นหารหัสพนักงานหรือชื่อบทเรียน'
                                }
                                aria-label="ค้นหา"
                                className={control.input}
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            aria-label="กรองตามสถานะ"
                            className={`${control.select} w-40`}
                        >
                            <option value="">ทุกสถานะ</option>
                            {isLessonTab ? (
                                <>
                                    <option value="on">เปิดใช้งาน</option>
                                    <option value="off">ปิดใช้งาน</option>
                                </>
                            ) : (
                                <>
                                    <option value="ผ่าน">ผ่าน</option>
                                    <option value="ไม่ผ่าน">ไม่ผ่าน</option>
                                </>
                            )}
                        </select>

                        {/* คอลัมน์ลูกค้ามีอยู่แล้วแต่เดิมกรองไม่ได้ ทั้งที่เป็นสิ่งที่ผู้ดูแลถามบ่อยที่สุด */}
                        {isLessonTab && clients.length > 0 && (
                            <select
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                                aria-label="กรองตามลูกค้า"
                                className={`${control.select} w-52`}
                            >
                                <option value="">ทุกลูกค้า</option>
                                {clients.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* ตัวกรองปี-เดือน มีเฉพาะแท็บผลการเรียน
                            เพราะบทเรียนไม่ได้ผูกกับเดือนที่ส่งคำตอบ */}
                        {!isLessonTab && (
                            <MonthFilter
                                options={monthOptions}
                                value={months ?? []}
                                onChange={setMonths}
                                currentKey={monthKeyOf()}
                            />
                        )}

                        {hasFilter && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className={control.btnGhost}
                            >
                                ล้างตัวกรอง
                            </button>
                        )}

                        <div className="hidden flex-1 md:block" />

                        {/* ปุ่มบอกจำนวนที่จะส่งออกจริงเมื่อมีตัวกรอง — กันคำถามยอดฮิต
                            ว่าทำไมไฟล์ที่ได้ไม่ตรงกับที่เห็นบนจอ */}
                        <button
                            type="button"
                            onClick={exportExcel}
                            className={`${control.btnSecondary} max-md:flex-1 max-md:justify-center`}
                            title={hasFilter ? 'ส่งออกเฉพาะรายการที่กรองไว้' : 'ส่งออกทั้งหมด'}
                        >
                            <Download className="size-5" />
                            ส่งออก Excel{hasFilter ? ` (${visibleCount})` : ''}
                        </button>

                        {isLessonTab && (
                            <button
                                type="button"
                                onClick={openCreate}
                                className={`${control.btnPrimary} max-md:flex-1 max-md:justify-center`}
                            >
                                <Plus className="size-5" strokeWidth={2.2} />
                                เพิ่มบทเรียน
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <TableSkeleton columns={isLessonTab ? 7 : 6} />
                    ) : isLessonTab ? (
                        <LessonTable
                            lessons={visibleLessons}
                            sourceTotal={lessons.length}
                            filtering={hasFilter}
                            onEdit={(l) => {
                                setEditing(l);
                                setDialogOpen(true);
                            }}
                            onToggleActive={handleToggleActive}
                            onClearFilters={clearFilters}
                            onCreate={openCreate}
                            togglingId={togglingId}
                        />
                    ) : (
                        <UserTable
                            records={visibleRecords}
                            sourceTotal={summaryAll.length}
                            filtering={hasFilter}
                            onClearFilters={clearFilters}
                        />
                    )}
                </div>
            </main>

            <LessonFormDialog
                open={dialogOpen}
                lesson={editing}
                clients={clients}
                onClose={() => setDialogOpen(false)}
                onSaved={loadAll}
            />
        </div>
    );
}
