'use client';
// =============================================================================
// ColumnFilter — ไอคอนกรอง/เรียงบนหัวตาราง สไตล์ Excel / Google Sheets
// -----------------------------------------------------------------------------
// • เปิดมา checkbox ว่างทั้งหมด ผู้ใช้ติ๊กเฉพาะค่าที่อยากเห็น แล้วกด "ตกลง" จึงกรอง
// • ไม่ติ๊กอะไรเลยแล้วกดตกลง = แสดงทั้งหมด (เท่ากับล้างตัวกรองคอลัมน์นั้น)
// • การเรียงมีผลทันที ไม่ต้องกดตกลง
// • เมนูวาดผ่าน portal (position: fixed) เพื่อไม่ให้โดน overflow ของตารางตัด
// =============================================================================
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownAZ, ArrowUpAZ, Check, ListFilter, Search, X } from 'lucide-react';

export type SortDir = 'asc' | 'desc';

interface ColumnFilterProps {
    label: string;
    /** ค่าทั้งหมดที่เลือกได้ของคอลัมน์นี้ */
    options: string[];
    /** ค่าที่กรองอยู่จริง — undefined = ไม่ได้กรอง (แสดงทั้งหมด) */
    selected?: string[];
    sortDir: SortDir | null;
    onSortChange: (dir: SortDir | null) => void;
    onSelectedChange: (values: string[] | undefined) => void;
    /** ป้ายกำกับปุ่มเรียง (เช่น น้อย→มาก สำหรับคอลัมน์ตัวเลข) */
    sortLabels?: { asc: string; desc: string };
}

const PANEL_WIDTH = 250;

export const ColumnFilter = ({
    label,
    options,
    selected,
    sortDir,
    onSortChange,
    onSelectedChange,
    sortLabels = { asc: 'เรียง ก → ฮ', desc: 'เรียง ฮ → ก' },
}: ColumnFilterProps) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    /** ค่าที่ติ๊กค้างไว้ในเมนู — ยังไม่มีผลจนกว่าจะกด "ตกลง" */
    const [draft, setDraft] = useState<string[]>([]);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const isFiltered = (selected?.length ?? 0) > 0;
    const active = isFiltered || sortDir !== null;

    const openPanel = () => {
        setDraft(selected ?? []);   // เปิดใหม่ = ว่าง ถ้ายังไม่เคยกรองคอลัมน์นี้
        setSearch('');
        setOpen(true);
    };

    useLayoutEffect(() => {
        if (!open || !btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        setPos({
            top: r.bottom + 6,
            left: Math.max(8, Math.min(r.left, window.innerWidth - PANEL_WIDTH - 8)),
        });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (panelRef.current?.contains(e.target as Node)) return;
            if (btnRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        // ตารางเลื่อนแนวนอนได้ — ปิดเมนูไปเลยเพื่อไม่ให้ลอยผิดตำแหน่ง
        const dismiss = (e: Event) => {
            if (panelRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', onKey);
        document.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('scroll', dismiss, true);
            window.removeEventListener('resize', dismiss);
        };
    }, [open]);

    const visible = options.filter(o => o.toLowerCase().includes(search.trim().toLowerCase()));
    const allVisibleChecked = visible.length > 0 && visible.every(o => draft.includes(o));

    const toggleValue = (value: string) =>
        setDraft(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

    const toggleAllVisible = () =>
        setDraft(prev => allVisibleChecked
            ? prev.filter(v => !visible.includes(v))
            : [...new Set([...prev, ...visible])]
        );

    const apply = () => {
        // ไม่ติ๊กเลย หรือติ๊กครบทุกค่า = ไม่ต้องกรอง
        onSelectedChange(draft.length === 0 || draft.length === options.length ? undefined : draft);
        setOpen(false);
    };

    const clearAll = () => {
        setDraft([]);
        onSelectedChange(undefined);
        onSortChange(null);
        setOpen(false);
    };

    const sortBtn = (dir: SortDir, icon: React.ReactNode, text: string) => (
        <button
            onClick={() => onSortChange(sortDir === dir ? null : dir)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${sortDir === dir
                ? 'bg-teal-500/20 text-teal-200 border border-teal-400/40'
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                }`}
        >
            {icon}{text}
        </button>
    );

    const checkbox = (checked: boolean) => (
        <span className={`w-3.5 h-3.5 shrink-0 rounded flex items-center justify-center border ${checked ? 'bg-teal-500 border-teal-400' : 'border-white/25'}`}>
            {checked && <Check size={10} className="text-slate-900" strokeWidth={3} />}
        </span>
    );

    return (
        <>
            <button
                ref={btnRef}
                onClick={() => (open ? setOpen(false) : openPanel())}
                title={`กรอง / เรียง ${label}`}
                className={`inline-flex items-center justify-center w-5 h-5 rounded transition-colors cursor-pointer align-middle ${active
                    ? 'text-teal-300 bg-teal-500/20'
                    : 'text-white/30 hover:text-white/70 hover:bg-white/10'
                    }`}
            >
                {sortDir === 'asc' ? <ArrowUpAZ size={12} />
                    : sortDir === 'desc' ? <ArrowDownAZ size={12} />
                        : <ListFilter size={12} />}
            </button>

            {open && createPortal(
                <div
                    ref={panelRef}
                    style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
                    className="fixed z-[999] rounded-xl border border-white/15 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-3 space-y-2.5"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-white/80">{label}</span>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-white/30 hover:text-white/70 cursor-pointer"
                        >
                            <X size={13} />
                        </button>
                    </div>

                    <div className="flex gap-1.5">
                        {sortBtn('asc', <ArrowUpAZ size={12} />, sortLabels.asc)}
                        {sortBtn('desc', <ArrowDownAZ size={12} />, sortLabels.desc)}
                    </div>

                    <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="ค้นหา..."
                            autoFocus
                            className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white placeholder:text-white/25 outline-none focus:border-teal-400/40"
                        />
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
                        {visible.length === 0 ? (
                            <p className="text-[11px] text-white/25 text-center py-3">ไม่พบค่าที่ค้นหา</p>
                        ) : (
                            <>
                                <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                                    {checkbox(allVisibleChecked)}
                                    <input type="checkbox" checked={allVisibleChecked} onChange={toggleAllVisible} className="sr-only" />
                                    <span className="text-[11px] font-semibold text-white/70">เลือกทั้งหมด</span>
                                </label>
                                {visible.map(o => {
                                    const checked = draft.includes(o);
                                    return (
                                        <label key={o} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                                            {checkbox(checked)}
                                            <input type="checkbox" checked={checked} onChange={() => toggleValue(o)} className="sr-only" />
                                            <span className="text-[11px] text-white/70 truncate" title={o}>{o}</span>
                                        </label>
                                    );
                                })}
                            </>
                        )}
                    </div>

                    <p className="text-[10px] text-white/30 leading-snug">
                        {draft.length > 0
                            ? `เลือกไว้ ${draft.length} จาก ${options.length} ค่า`
                            : 'ไม่ติ๊กอะไรเลย = แสดงทั้งหมด'}
                    </p>

                    <div className="flex gap-1.5">
                        <button
                            onClick={clearAll}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            ล้าง
                        </button>
                        <button
                            onClick={apply}
                            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-teal-500/25 border border-teal-400/40 text-teal-100 hover:bg-teal-500/35 transition-colors cursor-pointer"
                        >
                            ตกลง
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
