'use client';

// =============================================================================
// TableChrome — ชิ้นส่วนที่ตารางบทเรียนและตารางผลการเรียนใช้ร่วมกัน
//   หัวคอลัมน์เรียงลำดับ / ช่องเลือกแถว / แถบแบ่งหน้า / สถานะว่าง / โครงร่างตอนโหลด
// แยกออกมาไฟล์เดียวเพื่อให้สองตารางเปลี่ยนหน้าตาพร้อมกันเสมอ
// =============================================================================

import { BookOpen, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';

import { sheet, type SortDir } from './sheet';

/* ────────────────────────────────────────────────────────────────────────────
 * หัวคอลัมน์
 * ------------------------------------------------------------------------- */

/**
 * สามเหลี่ยมคู่บน-ล่างแทนลูกศรตัวเดียว — บอกได้ครบทั้งสามสถานะ
 * (พัก / เรียงน้อยไปมาก / เรียงมากไปน้อย) ด้วยรูปเดียว ไม่ต้องสลับไอคอน
 */
function SortGlyph({ state }: { state: 'idle' | 'asc' | 'desc' }) {
    const up = state === 'asc' ? '#0B9E6E' : state === 'desc' ? '#D9E8E0' : '#A9C2B6';
    const down = state === 'desc' ? '#0B9E6E' : state === 'asc' ? '#D9E8E0' : '#A9C2B6';
    return (
        <svg width="11" height="15" viewBox="0 0 10 14" className="shrink-0" aria-hidden="true">
            <path d="M5 1 8.5 5.2h-7z" fill={up} />
            <path d="M5 13 1.5 8.8h7z" fill={down} />
        </svg>
    );
}

export type ColumnAlign = 'left' | 'right' | 'center';

export function SortHeader<K extends string>({
    label,
    columnKey,
    sort,
    onSort,
    align = 'left',
    className,
    suffix,
}: {
    label: string;
    columnKey: K;
    sort: { key: K; dir: SortDir };
    onSort: (key: K) => void;
    align?: ColumnAlign;
    className?: string;
    /** ข้อความเสริมท้ายชื่อคอลัมน์ เช่น "· 3 เกินกำหนด" */
    suffix?: React.ReactNode;
}) {
    const active = sort.key === columnKey;
    const state = active ? sort.dir : 'idle';

    return (
        <th
            scope="col"
            aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={`${sheet.th} ${active ? sheet.thSorted : sheet.thLine} ${className ?? ''}`}
        >
            <button
                type="button"
                onClick={() => onSort(columnKey)}
                className={`${sheet.sortBtn} ${
                    align === 'right'
                        ? 'justify-end'
                        : align === 'center'
                          ? 'justify-center'
                          : 'justify-start'
                }`}
            >
                {label}
                {suffix}
                <SortGlyph state={state} />
            </button>
        </th>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * เลขลำดับแถว
 * ------------------------------------------------------------------------- */

/**
 * เลขเป็นลำดับ "สัมบูรณ์" รวมหน้าที่ผ่านมาแล้ว — หน้า 2 แถวแรกต้องอ่านว่า 11 ไม่ใช่ 1
 * เพราะผู้ดูแลใช้เลขแถวอ้างอิงกันจริง
 */
export function RowNumberCell({ index, tint }: { index: number; tint?: boolean }) {
    return (
        <td className={`${sheet.rowNo} ${tint ? 'bg-lsn-danger/[.08]' : ''}`}>{index}</td>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * แบ่งหน้า
 * ------------------------------------------------------------------------- */

/** หน้าต่างเลขหน้า: หน้าแรก หน้าสุดท้าย และหน้าปัจจุบัน ±1 */
function pageWindow(page: number, max: number): (number | 'gap')[] {
    if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1);
    const out: (number | 'gap')[] = [1];
    const from = Math.max(2, page - 1);
    const to = Math.min(max - 1, page + 1);
    if (from > 2) out.push('gap');
    for (let p = from; p <= to; p++) out.push(p);
    if (to < max - 1) out.push('gap');
    out.push(max);
    return out;
}

export function TableFooter({
    total,
    sourceTotal,
    page,
    perPage,
    onPage,
    onPerPage,
}: {
    total: number;
    /** จำนวนก่อนกรอง — ถ้าต่างจาก total จะบอกว่ากรองมาจากเท่าไร */
    sourceTotal: number;
    page: number;
    perPage: number;
    onPage: (p: number) => void;
    onPerPage: (n: number) => void;
}) {
    const maxPage = Math.max(1, Math.ceil(total / perPage));
    const from = total === 0 ? 0 : (page - 1) * perPage + 1;
    const to = Math.min(page * perPage, total);
    const filtered = total !== sourceTotal;

    return (
        <div className={sheet.foot}>
            <span className="text-sm font-light text-lsn-muted">
                {total === 0
                    ? 'ไม่มีรายการ'
                    : `แสดง ${from}–${to} จาก ${total} รายการ${filtered ? ` (กรองจาก ${sourceTotal})` : ''}`}
            </span>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <select
                        value={perPage}
                        onChange={(e) => onPerPage(Number(e.target.value))}
                        aria-label="จำนวนรายการต่อหน้า"
                        className="h-9 rounded-lg border border-lsn-input-line bg-white px-2.5 text-sm text-lsn-ink outline-none transition focus:border-lsn-forest"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                    <span className="text-sm font-light text-lsn-muted">ต่อหน้า</span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onPage(page - 1)}
                        disabled={page <= 1}
                        aria-label="หน้าก่อนหน้า"
                        className="flex size-9 items-center justify-center rounded-lg text-lsn-muted transition-colors hover:bg-lsn-tile hover:text-lsn-ink disabled:pointer-events-none disabled:opacity-35"
                    >
                        <ChevronLeft className="size-4" strokeWidth={2} />
                    </button>

                    {pageWindow(page, maxPage).map((p, i) =>
                        p === 'gap' ? (
                            <span
                                key={`gap-${i}`}
                                className="flex size-9 items-center justify-center text-sm text-lsn-faint"
                            >
                                …
                            </span>
                        ) : (
                            <button
                                key={p}
                                type="button"
                                onClick={() => onPage(p)}
                                aria-current={p === page ? 'page' : undefined}
                                className={`flex size-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors ${
                                    p === page
                                        ? 'bg-lsn-green-tint font-medium text-lsn-green-900'
                                        : 'text-lsn-muted hover:bg-lsn-tile hover:text-lsn-ink'
                                }`}
                            >
                                {p}
                            </button>
                        )
                    )}

                    <button
                        type="button"
                        onClick={() => onPage(page + 1)}
                        disabled={page >= maxPage}
                        aria-label="หน้าถัดไป"
                        className="flex size-9 items-center justify-center rounded-lg text-lsn-muted transition-colors hover:bg-lsn-tile hover:text-lsn-ink disabled:pointer-events-none disabled:opacity-35"
                    >
                        <ChevronRight className="size-4" strokeWidth={2} />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * สถานะว่าง และโครงร่างตอนโหลด
 * ------------------------------------------------------------------------- */

/**
 * แยก "ค้นไม่เจอ" กับ "ยังไม่มีข้อมูล" เพราะทางออกของผู้ใช้ต่างกัน
 * ค้นไม่เจอ → ปุ่มรองล้างตัวกรอง (การสร้างรายการใหม่ไม่ใช่คำตอบของการค้นไม่เจอ)
 */
export function EmptyState({
    filtering,
    title,
    hint,
    action,
}: {
    filtering: boolean;
    title: string;
    hint: string;
    action?: React.ReactNode;
}) {
    const Icon = filtering ? SearchX : BookOpen;
    return (
        <div className="px-6 py-20 text-center">
            <span className="lsn-pop mx-auto flex size-16 items-center justify-center rounded-2xl bg-lsn-tile text-lsn-dim">
                <Icon className="size-7" strokeWidth={1.7} />
            </span>
            <p
                className="lsn-rise-row mt-5 text-lg font-medium leading-7 text-lsn-ink"
                style={{ animationDelay: '60ms' }}
            >
                {title}
            </p>
            <p
                className="lsn-rise-row mt-1.5 text-sm font-light leading-6 text-lsn-muted"
                style={{ animationDelay: '100ms' }}
            >
                {hint}
            </p>
            {action && (
                <div className="lsn-rise-row mt-6" style={{ animationDelay: '140ms' }}>
                    {action}
                </div>
            )}
        </div>
    );
}

/** โครงร่างระหว่างโหลด — ไม่วาดกรอบเอง เพราะอยู่ในแผงของหน้าแม่แล้ว */
export function TableSkeleton({ columns, rows = 6 }: { columns: number; rows?: number }) {
    return (
        <div>
            {Array.from({ length: rows }).map((_, r) => (
                <div
                    key={r}
                    className="flex h-19 items-center gap-5 border-b border-lsn-line px-5 last:border-b-0"
                >
                    {Array.from({ length: columns }).map((_, c) => (
                        <span
                            key={c}
                            className="lsn-skel h-3.5 rounded"
                            style={{
                                animationDelay: `${Math.min(r, 7) * 70}ms`,
                                width: c === 1 ? '28%' : c === 0 ? '56px' : '11%',
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
