'use client';

// =============================================================================
// LessonTable — ตารางจัดการบทเรียน
//   เรียงคอลัมน์ / เลือกหลายรายการ / แบ่งหน้า / แก้ไข / เปิด-ปิดสถานะ
//   บนจอเล็กเปลี่ยนเป็นรายการการ์ด เพราะตารางเลื่อนข้างบนมือถือใช้งานไม่ได้จริง
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { CirclePlay, Globe, Pencil } from 'lucide-react';

import type { Lesson } from '@/app/lesson/type';
import { daysLeft, formatThaiDate, lessonLogo } from '@/app/lesson/constant';

import { compareValues, control, ROW_HEIGHT, sheet, toggleSort, type SortDir } from './sheet';
import { EmptyState, RowNumberCell, SortHeader, TableFooter } from './TableChrome';

type SortKey = 'lesson_id' | 'title' | 'due_date' | 'questions' | 'client_name' | 'is_active';

/** ไม่ระบุ is_active ถือว่าเปิดใช้งาน (บทเรียนเก่าที่สร้างก่อนมีฟีเจอร์นี้) */
const isActive = (l: Lesson) => l.is_active !== false;

// ใช้ daysLeft ร่วมกับหน้าผู้เรียน (/lesson) โดยตั้งใจ — ถ้าคำนวณคนละแบบ
// ฝั่งคนขับอาจเห็นว่า "เลยกำหนด" ขณะที่ฝั่งแอดมินยังเห็นว่าเหลืออีก 1 วัน

/**
 * บรรทัดความเร่งด่วนใต้วันที่ — ขึ้นเฉพาะเมื่อเหลือ ≤7 วันหรือเลยกำหนดแล้ว
 * ความเร่งด่วนที่ขึ้นตลอดเวลาไม่ใช่ความเร่งด่วน
 */
function DueCell({ lesson }: { lesson: Lesson }) {
    const d = daysLeft(lesson.due_date);
    const overdue = d !== null && d < 0;
    const soon = d !== null && d >= 0 && d <= 7;

    return (
        <>
            <div className="whitespace-nowrap tabular-nums">{formatThaiDate(lesson.due_date)}</div>
            {(overdue || soon) && (
                <div
                    className={`mt-0.5 flex items-center gap-2 text-sm leading-6 ${
                        overdue ? 'text-lsn-danger-ink' : 'text-lsn-orange-ink'
                    }`}
                >
                    <span
                        className={`size-1.5 shrink-0 rounded-full ${
                            overdue ? 'bg-lsn-danger' : 'bg-lsn-amber'
                        }`}
                    />
                    {overdue ? `เลยกำหนด ${Math.abs(d!)} วัน` : `อีก ${d} วัน`}
                </div>
            )}
        </>
    );
}

/** ชิปลูกค้า — แสดง 2 รายแรกแล้วยุบที่เหลือเป็น +N */
function ClientChips({ clients }: { clients: string[] }) {
    if (clients.length === 0) {
        // "ทุกลูกค้า" เป็นวัตถุคนละชนิดกับชื่อลูกค้า ไม่ใช่ชิปที่เขียนคำว่าทุกลูกค้า
        return (
            <span className={sheet.chipAccent}>
                <Globe className="size-3.5" strokeWidth={2} />
                ทุกลูกค้า
            </span>
        );
    }
    const shown = clients.slice(0, 2);
    const rest = clients.slice(2);
    return (
        <div className="flex flex-wrap items-center gap-1">
            {shown.map((c) => (
                <span key={c} className={sheet.chip} title={c}>
                    <span className="truncate">{c}</span>
                </span>
            ))}
            {rest.length > 0 && (
                <span className={sheet.chipAccent} title={rest.join(', ')}>
                    +{rest.length}
                </span>
            )}
        </div>
    );
}

/** สวิตช์เปิด-ปิดบทเรียน */
function ActiveToggle({
    on,
    disabled,
    onChange,
    label,
}: {
    on: boolean;
    disabled: boolean;
    onChange: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            disabled={disabled}
            onClick={onChange}
            className="inline-flex items-center gap-2 disabled:opacity-50"
        >
            <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ${
                    on ? 'bg-lsn-brand' : 'bg-lsn-input-line'
                }`}
            >
                <span
                    className="lsn-knob absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(12,58,44,.2)] transition-transform duration-200 ease-[cubic-bezier(.34,1.42,.64,1)]"
                    style={{ transform: on ? 'translateX(20px)' : 'none' }}
                />
            </span>
            <span
                className={`text-sm font-medium ${on ? 'text-lsn-green-900' : 'text-lsn-muted'}`}
            >
                {on ? 'เปิด' : 'ปิด'}
            </span>
        </button>
    );
}

type Props = {
    /** บทเรียนที่ผ่านตัวกรองจากหน้าแม่แล้ว */
    lessons: Lesson[];
    /** จำนวนก่อนกรอง ใช้บอกในแถบท้ายตาราง */
    sourceTotal: number;
    filtering: boolean;
    onEdit: (lesson: Lesson) => void;
    onToggleActive: (lesson: Lesson) => void;
    onClearFilters: () => void;
    onCreate: () => void;
    /** lesson_id ที่กำลังบันทึกสถานะอยู่ — ล็อกสวิตช์ไว้กันกดซ้ำ */
    togglingId: string | null;
};

export function LessonTable({
    lessons,
    sourceTotal,
    filtering,
    onEdit,
    onToggleActive,
    onClearFilters,
    onCreate,
    togglingId,
}: Props) {
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
        key: 'lesson_id',
        dir: 'asc',
    });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    // เงื่อนไขเปลี่ยน = ผลลัพธ์ชุดใหม่ หน้าที่ค้างอยู่อาจไม่มีแล้ว
    useEffect(() => {
        setPage(1);
    }, [lessons.length, sort]);

    const rows = useMemo(() => {
        const valueOf = (l: Lesson) => {
            switch (sort.key) {
                case 'is_active':
                    return isActive(l) ? 1 : 0;
                case 'questions':
                    return l.questions?.length ?? 0;
                case 'client_name':
                    return (l.client_name ?? []).join(', ');
                case 'due_date':
                    return daysLeft(l.due_date) ?? Number.MAX_SAFE_INTEGER;
                default:
                    return l[sort.key] ?? '';
            }
        };
        return [...lessons].sort((a, b) => {
            const r = compareValues(valueOf(a), valueOf(b));
            return sort.dir === 'asc' ? r : -r;
        });
    }, [lessons, sort]);

    const maxPage = Math.max(1, Math.ceil(rows.length / perPage));
    const safePage = Math.min(page, maxPage);
    const from = (safePage - 1) * perPage;
    const pageRows = rows.slice(from, from + perPage);

    const overdueCount = useMemo(
        () => lessons.filter((l) => isActive(l) && (daysLeft(l.due_date) ?? 0) < 0).length,
        [lessons]
    );

    const rowH = ROW_HEIGHT.lesson;
    /** เน้นแถบเลขลำดับของรายการที่เลยกำหนด เฉพาะตอนเรียงตามกำหนดส่งจากน้อยไปมาก */
    const heatOn = sort.key === 'due_date' && sort.dir === 'asc';

    if (rows.length === 0) {
        return (
            <div className="p-1">
                <EmptyState
                    filtering={filtering}
                    title={filtering ? 'ไม่พบบทเรียนที่ตรงกับเงื่อนไข' : 'ยังไม่มีบทเรียนในระบบ'}
                    hint={
                        filtering
                            ? 'ลองปรับคำค้นหรือล้างตัวกรอง'
                            : 'เริ่มต้นด้วยการเพิ่มบทเรียนแรกสำหรับพนักงานขับรถ'
                    }
                    action={
                        filtering ? (
                            <button
                                type="button"
                                onClick={onClearFilters}
                                className={control.btnSecondary}
                            >
                                ล้างตัวกรอง
                            </button>
                        ) : (
                            <button type="button" onClick={onCreate} className={control.btnPrimary}>
                                เพิ่มบทเรียน
                            </button>
                        )
                    }
                />
            </div>
        );
    }

    return (
        <>
            {/* ── จอใหญ่: ตาราง ── */}
            <div className="hidden md:block">
                <div className={`${sheet.scroll} max-h-[calc(100dvh-540px)]`}>
                    <table className={sheet.table}>
                        <thead>
                            <tr>
                                <th
                                    className={`${sheet.th} ${sheet.thLine} ${sheet.rowNoHead}`}
                                    scope="col"
                                >
                                    #
                                </th>
                                <th
                                    className={`${sheet.th} ${sheet.thLine} w-24 text-center`}
                                    scope="col"
                                >
                                    โลโก้
                                </th>
                                <SortHeader
                                    label="รหัสบทเรียน"
                                    columnKey="lesson_id"
                                    sort={sort}
                                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                                    className="w-48"
                                />
                                <SortHeader
                                    label="ชื่อบทเรียน"
                                    columnKey="title"
                                    sort={sort}
                                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                                    className="min-w-[280px]"
                                />
                                <SortHeader
                                    label="ลูกค้าที่ต้องเรียน"
                                    columnKey="client_name"
                                    sort={sort}
                                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                                    className="w-56"
                                />
                                <SortHeader
                                    label="จำนวนข้อ"
                                    columnKey="questions"
                                    sort={sort}
                                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                                    align="right"
                                    className="w-24"
                                />
                                <SortHeader
                                    label="กำหนดส่ง"
                                    columnKey="due_date"
                                    sort={sort}
                                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                                    className="w-36"
                                    // หัวคอลัมน์รายงานสถานะของทั้งชุดข้อมูลเอง
                                    // ทำให้รู้ว่ามีของค้างกี่รายการโดยไม่ต้องมีแบนเนอร์เพิ่ม
                                    suffix={
                                        overdueCount > 0 ? (
                                            <span className="text-[13px] font-medium text-lsn-danger-ink">
                                                · {overdueCount} เกินกำหนด
                                            </span>
                                        ) : undefined
                                    }
                                />
                                <SortHeader
                                    label="สถานะ"
                                    columnKey="is_active"
                                    sort={sort}
                                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                                    className="w-24"
                                />
                                <th
                                    className={`${sheet.th} ${sheet.thLine} w-20 text-right`}
                                    scope="col"
                                >
                                    จัดการ
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {pageRows.map((lesson, i) => {
                                const on = isActive(lesson);
                                const overdue = (daysLeft(lesson.due_date) ?? 0) < 0;

                                return (
                                    <tr
                                        key={lesson.lesson_id}
                                        className={`lsn-row lsn-rise-row group ${rowH} hover:bg-lsn-row-hover`}
                                        style={{ animationDelay: `${Math.min(i, 11) * 18}ms` }}
                                    >
                                        <RowNumberCell
                                            index={from + i + 1}
                                            tint={heatOn && overdue}
                                        />

                                        <td className={`${sheet.td} text-center`}>
                                            {/* URL มาจากภายนอก (S3 / ลิงก์รูป) จึงไม่ใช้ next/image */}
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={lessonLogo(lesson.logo)}
                                                alt=""
                                                className={`mx-auto size-14 object-contain ${
                                                    on ? '' : 'opacity-55 grayscale'
                                                }`}
                                            />
                                        </td>

                                        <td className={sheet.td}>
                                            <span
                                                className={`lsn-mono whitespace-nowrap text-sm font-medium ${
                                                    on ? 'text-lsn-ink' : 'text-lsn-muted'
                                                }`}
                                            >
                                                {lesson.lesson_id}
                                            </span>
                                        </td>

                                        <td className={sheet.td}>
                                            <p
                                                className={`truncate ${on ? '' : 'text-lsn-muted'}`}
                                                title={lesson.title}
                                            >
                                                {lesson.title}
                                            </p>
                                            {lesson.description && (
                                                <p className="mt-1 truncate text-sm font-light leading-6 text-lsn-muted">
                                                    {lesson.description}
                                                </p>
                                            )}
                                        </td>

                                        <td className={sheet.td}>
                                            <ClientChips clients={lesson.client_name ?? []} />
                                        </td>

                                        <td className={`${sheet.td} text-right`}>
                                            <span className="tabular-nums">
                                                {lesson.questions?.length ?? 0}
                                            </span>
                                            <span className="ml-1 text-sm font-light text-lsn-muted">
                                                ข้อ
                                            </span>
                                        </td>

                                        <td className={sheet.td}>
                                            <DueCell lesson={lesson} />
                                        </td>

                                        <td className={sheet.td}>
                                            <ActiveToggle
                                                on={on}
                                                disabled={togglingId === lesson.lesson_id}
                                                onChange={() => onToggleActive(lesson)}
                                                label={`สถานะบทเรียน ${lesson.lesson_id}`}
                                            />
                                        </td>

                                        <td className={sheet.td}>
                                            <div className={sheet.rowActions}>
                                                <button
                                                    type="button"
                                                    onClick={() => onEdit(lesson)}
                                                    aria-label={`แก้ไข ${lesson.lesson_id}`}
                                                    className={sheet.rowAction}
                                                >
                                                    <Pencil className="size-[18px]" strokeWidth={1.8} />
                                                </button>
                                                {/* ทดลองเรียน — เปิดหน้าจอจริงของคนขับในแท็บใหม่
                                                    โดยไม่บันทึกผล ใช้ตรวจงานก่อนเปิดใช้จริง */}
                                                <a
                                                    href={`/lesson/${encodeURIComponent(lesson.lesson_id)}?preview=1`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label={`ทดลองเรียน ${lesson.lesson_id}`}
                                                    title="ทดลองเรียน (ไม่บันทึกผล)"
                                                    className={sheet.rowAction}
                                                >
                                                    <CirclePlay
                                                        className="size-[18px]"
                                                        strokeWidth={1.9}
                                                    />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── จอเล็ก: รายการการ์ด ── */}
            <div className="flex flex-col gap-2.5 md:hidden">
                {pageRows.map((lesson, i) => {
                    const on = isActive(lesson);
                    return (
                        <div
                            key={lesson.lesson_id}
                            className={`lsn-rise-row ${sheet.card}`}
                            style={{ animationDelay: `${Math.min(i, 11) * 18}ms` }}
                        >
                            <div className="flex gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={lessonLogo(lesson.logo)}
                                    alt=""
                                    className={`size-14 shrink-0 object-contain ${
                                        on ? '' : 'opacity-55 grayscale'
                                    }`}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(lesson)}
                                            className="min-w-0 text-left"
                                        >
                                            <span className="lsn-mono block text-sm font-medium text-lsn-muted">
                                                {lesson.lesson_id}
                                            </span>
                                            <span
                                                className={`mt-1 block text-base ${
                                                    on ? 'text-lsn-ink' : 'text-lsn-muted'
                                                }`}
                                            >
                                                {lesson.title}
                                            </span>
                                        </button>
                                        {/* เป้ากดขยายเป็น 44px ตามเกณฑ์จอสัมผัส */}
                                        <span className="-my-2 -mr-1 flex size-11 shrink-0 items-center justify-end">
                                            <ActiveToggle
                                                on={on}
                                                disabled={togglingId === lesson.lesson_id}
                                                onChange={() => onToggleActive(lesson)}
                                                label={`สถานะบทเรียน ${lesson.lesson_id}`}
                                            />
                                        </span>
                                    </div>

                                    <div className="mt-2">
                                        <ClientChips clients={lesson.client_name ?? []} />
                                    </div>

                                    <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm font-light tabular-nums text-lsn-muted">
                                        <a
                                            href={`/lesson/${encodeURIComponent(lesson.lesson_id)}?preview=1`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1.5 font-normal text-lsn-green-900"
                                        >
                                            <CirclePlay className="size-4" strokeWidth={1.9} />
                                            ทดลองเรียน
                                        </a>
                                        <span className="size-[3px] rounded-full bg-lsn-faint" />
                                        <span>{lesson.questions?.length ?? 0} ข้อ</span>
                                        <span className="size-[3px] rounded-full bg-lsn-faint" />
                                        <DueCell lesson={lesson} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* แถบท้ายชุดเดียวใช้ร่วมกันทั้งสองมุมมอง
                บนมือถือต้องมีกรอบของตัวเอง เพราะแผงของหน้าแม่ถูกทำให้โปร่งในจอเล็ก */}
            <div className="max-md:mt-2.5 max-md:overflow-hidden max-md:rounded-xl max-md:border max-md:border-lsn-line-strong max-md:bg-white">
                <TableFooter
                    total={rows.length}
                    sourceTotal={sourceTotal}
                    page={safePage}
                    perPage={perPage}
                    onPage={setPage}
                    onPerPage={(n) => {
                        setPerPage(n);
                        setPage(1);
                    }}
                />
            </div>

        </>
    );
}
