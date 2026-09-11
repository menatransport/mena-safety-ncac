'use client';

// =============================================================================
// MonthFilter — ตัวกรองผลการเรียนตามปี-เดือน (เลือกได้หลายเดือน)
// -----------------------------------------------------------------------------
// ทำแยกจาก MultiSelect เดิม เพราะตัวนั้นเป็นทรงฟอร์ม (ชิปที่เลือกห้อยอยู่ใต้ปุ่ม
// และมีบรรทัดคำอธิบายต่อท้าย) ถ้าเอามาวางในแถบเครื่องมือ ความสูงจะเปลี่ยนไปมา
// ทุกครั้งที่เลือกเดือน แล้วปุ่มข้าง ๆ จะขยับตาม
//
// ตัวนี้ความสูงคงที่เสมอ ตัวปุ่มสรุปให้เป็นข้อความสั้น ๆ แล้วไปเลือกจริงในเมนู
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { CalendarRange, Check, ChevronDown } from 'lucide-react';

export type MonthOption = {
    /** คีย์รูปแบบ YYYY-MM ตามปฏิทินสากล */
    value: string;
    /** ป้ายแบบไทย เช่น "ก.ย. 2569" */
    label: string;
    /** พ.ศ. ใช้จัดกลุ่มในเมนู */
    year: string;
    /** จำนวนรายการของเดือนนั้น — บอกไปเลยว่าเดือนไหนมีของ จะได้ไม่ต้องกดลองทีละเดือน */
    count: number;
};

const TH_MONTHS = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/** 'YYYY-MM' ของวันที่ที่กำหนด (ค่าเริ่มต้นคือเดือนปัจจุบัน) */
export const monthKeyOf = (d: Date = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** 'YYYY-MM' → 'ก.ย. 2569' (แปลงเป็น พ.ศ. ให้ตรงกับที่แสดงในตาราง) */
export const monthLabelOf = (key: string) => {
    const [y, m] = key.split('-');
    const idx = Number(m) - 1;
    if (!y || Number.isNaN(idx) || idx < 0 || idx > 11) return key;
    return `${TH_MONTHS[idx]} ${Number(y) + 543}`;
};

/** 'YYYY-MM' → '2569' */
export const yearLabelOf = (key: string) => String(Number(key.split('-')[0]) + 543);

export function MonthFilter({
    options,
    value,
    onChange,
    currentKey,
}: {
    options: MonthOption[];
    /** ว่าง = ไม่จำกัดเดือน */
    value: string[];
    onChange: (next: string[]) => void;
    /** คีย์ของเดือนปัจจุบัน ใช้กับปุ่มลัด */
    currentKey: string;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const toggle = (key: string) =>
        onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]);

    const summary =
        value.length === 0
            ? 'ทุกเดือน'
            : value.length === 1
              ? monthLabelOf(value[0])
              : `${value.length} เดือน`;

    // จัดกลุ่มตามปีเพื่อให้เห็นขอบเขตปีชัด เวลาข้อมูลข้ามปี
    const years: { year: string; items: MonthOption[] }[] = [];
    for (const o of options) {
        const bucket = years.find((y) => y.year === o.year);
        if (bucket) bucket.items.push(o);
        else years.push({ year: o.year, items: [o] });
    }

    return (
        <div ref={rootRef} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm transition-colors ${
                    value.length > 0
                        ? 'border-lsn-brand/50 text-lsn-ink'
                        : 'border-lsn-input-line text-lsn-ink hover:border-lsn-line-strong'
                }`}
            >
                <CalendarRange className="size-[18px] shrink-0 text-lsn-muted" strokeWidth={1.9} />
                <span className="whitespace-nowrap">{summary}</span>
                <ChevronDown
                    className={`size-4 shrink-0 text-lsn-muted transition-transform duration-200 ${
                        open ? 'rotate-180' : ''
                    }`}
                    strokeWidth={2}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    aria-multiselectable="true"
                    className="lsn-pop lsn-e3 absolute left-0 top-12 z-40 w-64 overflow-hidden rounded-2xl border border-lsn-line-strong bg-white"
                >
                    <div className="flex items-center gap-2 border-b border-lsn-line px-3 py-2.5">
                        <button
                            type="button"
                            onClick={() => onChange([currentKey])}
                            className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-lsn-green-900 transition-colors hover:bg-lsn-green-tint"
                        >
                            เดือนนี้
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="rounded-lg px-2.5 py-1.5 text-[13px] text-lsn-muted transition-colors hover:bg-lsn-tile hover:text-lsn-ink"
                        >
                            ทุกเดือน
                        </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto py-1">
                        {years.map((group) => (
                            <div key={group.year}>
                                <p className="px-3 pb-1 pt-2 text-[11px] font-medium tracking-wide text-lsn-dim">
                                    พ.ศ. {group.year}
                                </p>
                                {group.items.map((o) => {
                                    const on = value.includes(o.value);
                                    return (
                                        <button
                                            key={o.value}
                                            type="button"
                                            role="option"
                                            aria-selected={on}
                                            onClick={() => toggle(o.value)}
                                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-lsn-tile"
                                        >
                                            <span
                                                className={`flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors ${
                                                    on
                                                        ? 'border-lsn-deep bg-lsn-deep'
                                                        : 'border-lsn-input-line bg-white'
                                                }`}
                                            >
                                                {on && (
                                                    <Check
                                                        className="size-3.5 text-white"
                                                        strokeWidth={3}
                                                    />
                                                )}
                                            </span>
                                            <span className="flex-1 text-lsn-ink">{o.label}</span>
                                            <span
                                                className={`text-[13px] tabular-nums ${
                                                    o.count === 0
                                                        ? 'text-lsn-faint'
                                                        : 'text-lsn-muted'
                                                }`}
                                            >
                                                {o.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
