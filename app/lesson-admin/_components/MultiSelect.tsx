"use client";

// =============================================================================
// MultiSelect — dropdown เลือกได้หลายค่า พร้อมช่องค้นหา
//   ใช้กับรายชื่อลูกค้าที่ยาวเกินกว่าจะโชว์เป็นชิปทั้งหมด
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

type Props = {
    options: string[];
    value: string[];
    onChange: (next: string[]) => void;
    placeholder: string;
    /** ข้อความเมื่อยังไม่เลือกอะไรเลย */
    emptyLabel: string;
    searchPlaceholder?: string;
    disabled?: boolean;
};

export function MultiSelect({
    options,
    value,
    onChange,
    placeholder,
    emptyLabel,
    searchPlaceholder = "ค้นหา...",
    disabled = false,
}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    /* ปิด dropdown เมื่อคลิกนอกกรอบหรือกด Escape */
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        searchRef.current?.focus();

        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    }, [options, query]);

    const toggle = (option: string) =>
        onChange(
            value.includes(option) ? value.filter((v) => v !== option) : [...value, option]
        );

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[18px] border-[1.5px] border-lsn-line bg-lsn-surface px-4 py-2 text-left text-sm text-lsn-ink transition hover:border-lsn-green/40 focus:border-lsn-green focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
                <span className="min-w-0 flex-1">
                    {value.length === 0 ? (
                        <span className="text-lsn-faint">{emptyLabel}</span>
                    ) : (
                        <span className="font-medium text-lsn-ink">
                            เลือกแล้ว {value.length} รายการ
                        </span>
                    )}
                </span>
                <ChevronDown
                    className={`size-4 shrink-0 text-lsn-mute2 transition ${open ? "rotate-180" : ""}`}
                />
            </button>

            {/* ชิปของค่าที่เลือก — กดเพื่อเอาออกได้ทันที */}
            {value.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {value.map((v) => (
                        <span
                            key={v}
                            className="inline-flex max-w-full items-center gap-1 rounded-full bg-lsn-green-tint py-1 pl-3 pr-1.5 text-xs font-medium text-lsn-green-deep"
                        >
                            <span className="truncate">{v}</span>
                            <button
                                type="button"
                                onClick={() => toggle(v)}
                                aria-label={`เอา ${v} ออก`}
                                className="rounded-full p-0.5 transition hover:bg-lsn-green-soft"
                            >
                                <X className="size-3" strokeWidth={2.2} />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="px-1.5 text-xs text-lsn-mute2 transition hover:text-lsn-danger-ink"
                    >
                        ล้างทั้งหมด
                    </button>
                </div>
            )}

            {open && (
                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[20px] border-[1.5px] border-lsn-line bg-white shadow-[0_18px_40px_-24px_rgba(11,35,26,0.45)]">
                    <div className="flex items-center gap-2 border-b border-lsn-line px-4">
                        <Search className="size-4 shrink-0 text-lsn-faint" />
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="h-11 w-full bg-transparent text-sm text-lsn-ink outline-none placeholder:text-lsn-faint"
                        />
                    </div>

                    <ul role="listbox" aria-multiselectable className="max-h-56 overflow-y-auto py-1.5">
                        {filtered.length === 0 ? (
                            <li className="px-3 py-6 text-center text-xs text-lsn-mute2">
                                ไม่พบรายการที่ตรงกับคำค้นหา
                            </li>
                        ) : (
                            filtered.map((option) => {
                                const active = value.includes(option);
                                return (
                                    <li key={option} className="px-1.5">
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={active}
                                            onClick={() => toggle(option)}
                                            className="flex w-full items-start gap-2.5 rounded-[14px] px-2.5 py-2 text-left text-sm transition hover:bg-lsn-surface"
                                        >
                                            <span
                                                className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition ${
                                                    active
                                                        ? "border-lsn-green bg-lsn-green text-lsn-ink"
                                                        : "border-lsn-line bg-white"
                                                }`}
                                            >
                                                {active && <Check className="size-3" strokeWidth={3} />}
                                            </span>
                                            <span className={active ? "text-lsn-ink" : "text-lsn-muted"}>
                                                {option}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>

                    <div className="flex items-center justify-between border-t border-lsn-line bg-lsn-surface px-4 py-2.5 text-xs text-lsn-mute2">
                        <span>
                            {filtered.length} / {options.length} รายการ
                        </span>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="font-medium text-lsn-green-deep transition hover:underline"
                        >
                            เสร็จสิ้น
                        </button>
                    </div>
                </div>
            )}

            <p className="mt-2 text-xs text-lsn-muted">{placeholder}</p>
        </div>
    );
}
