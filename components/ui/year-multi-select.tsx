"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

interface YearMultiSelectProps {
    value: number[];
    onChange: (years: number[]) => void;
    minYear?: number;
    maxYear?: number;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const YearMultiSelect: React.FC<YearMultiSelectProps> = ({
    value = [],
    onChange,
    minYear = 2025,
    maxYear = new Date().getFullYear(),
    placeholder = "เลือกปี",
    className = "",
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const years = Array.from(
        { length: maxYear - minYear + 1 },
        (_, i) => maxYear - i
    );

    const updateDropdownPosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const dropdownHeight = 280; // Approximate max height

            // Decide whether to show above or below
            const showAbove = spaceBelow < dropdownHeight && rect.top > spaceBelow;

            setDropdownPosition({
                top: showAbove ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
                left: rect.left,
                width: Math.max(rect.width, 200),
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

    // Update position when opening
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

    const handleYearToggle = (year: number) => {
        if (value.includes(year)) {
            if (value.length > 1) {
                onChange(value.filter((y) => y !== year));
            }
        } else {
            onChange([...value, year].sort((a, b) => b - a));
        }
    };

    const handleSelectAll = () => {
        onChange([...years]);
    };

    const handleClearAll = () => {
        onChange([new Date().getFullYear()]);
    };

    const getDisplayText = () => {
        if (value.length === 0) return placeholder;
        if (value.length === years.length) return "ทุกปี";
        if (value.length === 1) return `ปี ${value[0]}`;
        return `${value.length} ปีที่เลือก`;
    };

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

                {/* Year options */}
                <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                    {years.map((year) => (
                        <button
                            key={year}
                            type="button"
                            onClick={() => handleYearToggle(year)}
                            className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg
                text-sm font-medium transition-all duration-150
              `}
                        >
                            <span>{year}</span>
                            {value.includes(year) && (
                                <Check size={16} className="text-emerald-600" />
                            )}
                        </button>
                    ))}
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
          flex items-center justify-between w-full min-w-[160px] px-4 py-2.5
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
