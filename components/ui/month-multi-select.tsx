"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

const MONTHS = [
    { value: 1, label: "มกราคม", short: "ม.ค." },
    { value: 2, label: "กุมภาพันธ์", short: "ก.พ." },
    { value: 3, label: "มีนาคม", short: "มี.ค." },
    { value: 4, label: "เมษายน", short: "เม.ย." },
    { value: 5, label: "พฤษภาคม", short: "พ.ค." },
    { value: 6, label: "มิถุนายน", short: "มิ.ย." },
    { value: 7, label: "กรกฎาคม", short: "ก.ค." },
    { value: 8, label: "สิงหาคม", short: "ส.ค." },
    { value: 9, label: "กันยายน", short: "ก.ย." },
    { value: 10, label: "ตุลาคม", short: "ต.ค." },
    { value: 11, label: "พฤศจิกายน", short: "พ.ย." },
    { value: 12, label: "ธันวาคม", short: "ธ.ค." },
];

interface MonthMultiSelectProps {
    value: number[];
    onChange: (months: number[]) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const MonthMultiSelect: React.FC<MonthMultiSelectProps> = ({
    value = [],
    onChange,
    placeholder = "เลือกเดือน",
    className = "",
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const updateDropdownPosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const dropdownHeight = 320; 

            const showAbove = spaceBelow < dropdownHeight && rect.top > spaceBelow;

            setDropdownPosition({
                top: showAbove ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
                left: rect.left,
                width: Math.max(rect.width, 280),
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current && !containerRef.current.contains(event.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            updateDropdownPosition();
            window.addEventListener("scroll", updateDropdownPosition, true);
            window.addEventListener("resize", updateDropdownPosition);
        }
        return () => {
            window.removeEventListener("scroll", updateDropdownPosition, true);
            window.removeEventListener("resize", updateDropdownPosition);
        };
    }, [isOpen]);

    const handleMonthToggle = (month: number) => {
        if (value.includes(month)) {
            if (value.length > 1) {
                onChange(value.filter((m) => m !== month));
            }
        } else {
            onChange([...value, month].sort((a, b) => a - b));
        }
    };

    const handleSelectAll = () => {
        onChange(MONTHS.map((m) => m.value));
    };

    const handleClearAll = () => {
        onChange([new Date().getMonth() + 1]);
    };

    const getDisplayText = () => {
        if (value.length === 0) return placeholder;
        if (value.length === 12) return "ทุกเดือน";
        if (value.length === 1) {
            const month = MONTHS.find((m) => m.value === value[0]);
            return month ? month.label : placeholder;
        }
        if (value.length <= 3) {
            return value
                .map((v) => MONTHS.find((m) => m.value === v)?.short)
                .filter(Boolean)
                .join(", ");
        }
        return `${value.length} เดือนที่เลือก`;
    };

    // Dropdown content component
    const dropdownContent = isOpen && typeof window !== "undefined" ? (
        createPortal(
            <div
                ref={dropdownRef}
                style={{
                    position: "absolute",
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                    zIndex: 99999,
                }}
                className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-scale-in"
            >
                {/* Quick actions */}
                <div className="flex gap-2 p-2 border-b border-slate-100 bg-slate-50">
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        All
                    </button>
                    <button
                        type="button"
                        onClick={handleClearAll}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        clear
                    </button>
                </div>

                {/* Month grid */}
                <div className="p-3">
                    <div className="grid grid-cols-3 gap-2">
                        {MONTHS.map((month) => (
                            <button
                                key={month.value}
                                type="button"
                                onClick={() => handleMonthToggle(month.value)}
                                className={`
                    flex items-center justify-center gap-1 px-2 py-2.5 rounded-lg
                    text-sm font-medium transition-all duration-150
                  `}
                            >
                                <span>{month.short}</span>
                                {value.includes(month.value) && (
                                    <Check size={14} className="text-emerald-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>,
            document.body
        )
    ) : null;

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center justify-between w-full min-w-[180px] px-4 py-2.5
          bg-white border border-slate-200 rounded-xl
          text-sm font-medium text-slate-700
          transition-all duration-200
          hover:border-emerald-400 hover:shadow-sm
          focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/30' : ''}
        `}
            >
                <span className={value.length === 0 ? 'text-slate-400' : ''}>
                    {getDisplayText()}
                </span>
                <ChevronDown
                    size={18}
                    className={`ml-2 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {dropdownContent}
        </div>
    );
};
