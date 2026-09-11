'use client';

// =============================================================================
// UserTable — สรุปผลการเรียนราย "พนักงาน × บทเรียน"
//   หนึ่งคู่เหลือหนึ่งแถว ใช้ผลของครั้งล่าสุด พร้อมบอกว่าทำไปกี่ครั้ง
//   เรียงคอลัมน์ / แบ่งหน้า / แถบคะแนนย่อยพร้อมเส้นเกณฑ์ผ่าน
//
// ตารางนี้เป็นบันทึกผล อ่านอย่างเดียว จึงไม่มีช่องเลือกแถวและไม่มีคำสั่งกลุ่ม
// =============================================================================

import { useEffect, useMemo, useState } from 'react';

import { formatThaiDate, formatThaiDateTime } from '@/app/lesson/constant';
import { PASS_RATIO } from '@/app/lesson/type';

import type { LessonUserSummary } from '../type';
import { compareValues, control, ROW_HEIGHT, sheet, toggleSort, type SortDir } from './sheet';
import { EmptyState, SortHeader, TableFooter } from './TableChrome';

type SortKey =
    | 'driver_id'
    | 'lesson_id'
    | 'lesson_title'
    | 'status'
    | 'score'
    | 'attempts'
    | 'created_at';

const BAR_WIDTH = 68;

/** เวลาอย่างเดียว (HH:mm) — แยกบรรทัดจากวันที่เพื่อให้กวาดสายตาลงคอลัมน์ได้เร็ว */
const formatTime = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

/**
 * คะแนน + แถบย่อย โดยมีเส้นเกณฑ์ผ่านตำแหน่งเดียวกันทุกแถว
 *
 * เพราะทุกแถบเริ่มจากขอบซ้ายเดียวกันและใช้เส้นเกณฑ์ตำแหน่งเดียวกัน
 * อ่านลงมาทั้งคอลัมน์แล้วจะเห็นการกระจายของคะแนนทันที — อะไรที่สั้นกว่าเส้นคือไม่ผ่าน
 * ส่วนที่กระจุกอยู่เหนือเส้นนิดเดียวคือกลุ่มเสี่ยงที่ควรตามดู
 */
function ScoreCell({ score, total, pass }: { score: number; total: number; pass: boolean }) {
    const ratio = total > 0 ? Math.min(1, score / total) : 0;
    return (
        <>
            <div className="flex items-baseline gap-0.5">
                <span className="font-medium tabular-nums">{score}</span>
                <span className="text-sm font-light text-lsn-muted">/{total}</span>
            </div>
            <div
                className="relative mt-1.5 h-1.5 rounded-full bg-lsn-line"
                style={{ width: BAR_WIDTH }}
            >
                <span
                    className={`lsn-bar-fill absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ${
                        pass ? 'bg-lsn-brand' : 'bg-lsn-danger'
                    }`}
                    style={{ width: `${ratio * 100}%` }}
                />
                {/* เส้นเกณฑ์ผ่าน — ตำแหน่งเดียวกันทุกแถว จึงเทียบกันในแนวตั้งได้ */}
                <span
                    className="absolute -top-1 -bottom-1 w-px bg-lsn-line-strong"
                    style={{ left: BAR_WIDTH * PASS_RATIO }}
                />
            </div>
        </>
    );
}

function StatusPill({ status }: { status: string }) {
    const pass = status === 'ผ่าน';
    return (
        <span className={pass ? sheet.pillPass : sheet.pillFail}>
            <span
                className={`size-2 shrink-0 rounded-full ${pass ? 'bg-lsn-brand' : 'bg-lsn-danger'}`}
            />
            {status}
        </span>
    );
}

/** จำนวนครั้งที่ทำ — ทำซ้ำหลายรอบคือสัญญาณว่าบทเรียนนั้นยาก จึงเน้นให้เห็น */
function AttemptsCell({ attempts }: { attempts: number }) {
    return (
        <span className={attempts > 1 ? 'font-medium text-lsn-ink' : 'text-lsn-muted'}>
            <span className="tabular-nums">{attempts}</span>
            <span className="ml-1 text-sm font-light text-lsn-muted">ครั้ง</span>
        </span>
    );
}

type Props = {
    /** สรุปที่ผ่านตัวกรองจากหน้าแม่แล้ว (หนึ่งแถว = หนึ่งคู่ พนักงาน × บทเรียน) */
    records: LessonUserSummary[];
    sourceTotal: number;
    filtering: boolean;
    onClearFilters: () => void;
};

export function UserTable({ records, sourceTotal, filtering, onClearFilters }: Props) {
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
        key: 'created_at',
        dir: 'desc',
    });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    useEffect(() => {
        setPage(1);
    }, [records.length, sort]);

    const rows = useMemo(() => {
        const valueOf = (r: LessonUserSummary) => {
            if (sort.key === 'score') return r.total > 0 ? r.score / r.total : 0;
            return r[sort.key] ?? '';
        };
        return [...records].sort((a, b) => {
            const res = compareValues(valueOf(a), valueOf(b));
            return sort.dir === 'asc' ? res : -res;
        });
    }, [records, sort]);

    const maxPage = Math.max(1, Math.ceil(rows.length / perPage));
    const safePage = Math.min(page, maxPage);
    const from = (safePage - 1) * perPage;
    const pageRows = rows.slice(from, from + perPage);

    const rowH = ROW_HEIGHT.user;
    const onSort = (k: SortKey) => setSort((s) => toggleSort(s, k));

    if (rows.length === 0) {
        return (
            <div className="p-1">
                <EmptyState
                    filtering={filtering}
                    title={filtering ? 'ไม่พบข้อมูลที่ตรงกับเงื่อนไข' : 'ยังไม่มีผู้เรียนส่งคำตอบ'}
                    hint={
                        filtering
                            ? 'ลองเลือกเดือนอื่น ล้างตัวกรองสถานะ หรือใช้คำค้นที่สั้นลง'
                            : 'ผลการเรียนจะขึ้นที่นี่ทันทีที่พนักงานขับรถส่งแบบทดสอบ'
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
                        ) : undefined
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
                                <SortHeader
                                    label="รหัสพนักงาน"
                                    columnKey="driver_id"
                                    sort={sort}
                                    onSort={onSort}
                                    className="w-40"
                                />
                                <SortHeader
                                    label="รหัสบทเรียน"
                                    columnKey="lesson_id"
                                    sort={sort}
                                    onSort={onSort}
                                    className="w-48"
                                />
                                <SortHeader
                                    label="ชื่อบทเรียน"
                                    columnKey="lesson_title"
                                    sort={sort}
                                    onSort={onSort}
                                    className="min-w-[260px]"
                                />
                                <SortHeader
                                    label="คะแนนล่าสุด"
                                    columnKey="score"
                                    sort={sort}
                                    onSort={onSort}
                                    className="w-36"
                                />
                                <SortHeader
                                    label="ครั้งที่ทำ"
                                    columnKey="attempts"
                                    sort={sort}
                                    onSort={onSort}
                                    align="right"
                                    className="w-32"
                                />
                                <SortHeader
                                    label="สถานะล่าสุด"
                                    columnKey="status"
                                    sort={sort}
                                    onSort={onSort}
                                    align="center"
                                    className="w-32"
                                />
                                <SortHeader
                                    label="ส่งล่าสุด"
                                    columnKey="created_at"
                                    sort={sort}
                                    onSort={onSort}
                                    className="w-40"
                                />
                            </tr>
                        </thead>

                        <tbody>
                            {pageRows.map((r, i) => (
                                <tr
                                    key={r.key}
                                    className={`lsn-row lsn-rise-row group ${rowH} hover:bg-lsn-row-hover`}
                                    style={{ animationDelay: `${Math.min(i, 11) * 18}ms` }}
                                >
                                    <td className={sheet.rowNo}>{from + i + 1}</td>

                                    <td className={sheet.td}>
                                        <span className="lsn-mono whitespace-nowrap text-sm font-medium">
                                            {r.driver_id}
                                        </span>
                                    </td>

                                    {/* รหัสบทเรียนเป็นคีย์อ้างอิง ไม่ใช่ประเด็นหลักของแถว จึงจางกว่าโดยตั้งใจ */}
                                    <td className={sheet.td}>
                                        <span className="lsn-mono whitespace-nowrap text-sm font-medium text-lsn-ink-70">
                                            {r.lesson_id}
                                        </span>
                                    </td>

                                    <td className={sheet.td}>
                                        <p className="truncate" title={r.lesson_title}>
                                            {r.lesson_title}
                                        </p>
                                    </td>

                                    <td className={sheet.td}>
                                        <ScoreCell
                                            score={r.score}
                                            total={r.total}
                                            pass={r.status === 'ผ่าน'}
                                        />
                                    </td>

                                    <td className={`${sheet.td} text-right`}>
                                        <AttemptsCell attempts={r.attempts} />
                                    </td>

                                    <td className={`${sheet.td} text-center`}>
                                        <StatusPill status={r.status} />
                                    </td>

                                    <td className={sheet.td}>
                                        <div className="whitespace-nowrap tabular-nums">
                                            {formatThaiDate(r.created_at)}
                                        </div>
                                        <div className="text-sm font-light leading-6 tabular-nums text-lsn-muted">
                                            {formatTime(r.created_at)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── จอเล็ก: รายการการ์ด ── */}
            <div className="flex flex-col gap-2.5 md:hidden">
                {pageRows.map((r, i) => (
                    <div
                        key={r.key}
                        className={`lsn-rise-row ${sheet.card}`}
                        style={{ animationDelay: `${Math.min(i, 11) * 18}ms` }}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <span className="lsn-mono block text-sm font-medium">
                                    {r.driver_id}
                                </span>
                                <span className="mt-1 block text-base">{r.lesson_title}</span>
                            </div>
                            <StatusPill status={r.status} />
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <ScoreCell score={r.score} total={r.total} pass={r.status === 'ผ่าน'} />
                            <AttemptsCell attempts={r.attempts} />
                            <span className="text-sm font-light tabular-nums text-lsn-muted">
                                {formatThaiDateTime(r.created_at)}
                            </span>
                        </div>
                    </div>
                ))}
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
