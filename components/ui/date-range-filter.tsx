"use client";

import React, { useEffect, useState } from "react";
import { Search, RotateCcw, Calendar } from "lucide-react";
import { YearMultiSelect } from "@/components/ui/year-multi-select";
import { MonthMultiSelect } from "@/components/ui/month-multi-select";

/* ----------------------------- Types ------------------------------ */
export interface DateFilterResult {
    years: number[];
    months: number[];
    start_date: string;
    end_date: string;
}

interface DateRangeFilterProps {
    onFilter: (filters: DateFilterResult) => void;
    loading?: boolean;
    className?: string;
}

/* ----------------------------- Helper Functions ------------------------------ */
const formatDateToLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getDateRangeFromSelection = (years: number[], months: number[]): { start_date: string; end_date: string } => {
    if (years.length === 0 || months.length === 0) {
        const now = new Date();
        return {
            start_date: formatDateToLocal(new Date(now.getFullYear(), now.getMonth(), 1)),
            end_date: formatDateToLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
        };
    }

    const sortedYears = [...years].sort((a, b) => a - b);
    const sortedMonths = [...months].sort((a, b) => a - b);

    const minYear = sortedYears[0];
    const maxYear = sortedYears[sortedYears.length - 1];
    const minMonth = sortedMonths[0];
    const maxMonth = sortedMonths[sortedMonths.length - 1];

    // Start date: first day of earliest selected month in earliest year
    const startDate = new Date(minYear, minMonth - 1, 1);

    // End date: last day of latest selected month in latest year
    const endDate = new Date(maxYear, maxMonth, 0);

    return {
        start_date: formatDateToLocal(startDate),
        end_date: formatDateToLocal(endDate),
    };
};

/* ----------------------------- Component ------------------------------ */
export function DateRangeFilter({
    onFilter,
    loading = false,
    className = "",
}: DateRangeFilterProps) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [selectedYears, setSelectedYears] = useState<number[]>([currentYear]);
    const [selectedMonths, setSelectedMonths] = useState<number[]>([currentMonth]);
    const [isInitialized, setIsInitialized] = useState(false);

    const handleApply = () => {
        const dateRange = getDateRangeFromSelection(selectedYears, selectedMonths);
        onFilter({
            years: selectedYears,
            months: selectedMonths,
            ...dateRange,
        });
    };

    const handleReset = () => {
        setSelectedYears([currentYear]);
        setSelectedMonths([currentMonth]);

        const dateRange = getDateRangeFromSelection([currentYear], [currentMonth]);
        onFilter({
            years: [currentYear],
            months: [currentMonth],
            ...dateRange,
        });
    };

    // Auto-apply on first load
    useEffect(() => {
        if (!isInitialized) {
            handleApply();
            setIsInitialized(true);
        }
    }, [isInitialized]);

    return (
        <div className={`bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-premium overflow-hidden ${className}`}>
            {/* Header Section */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-800 to-slate-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                        <Calendar size={18} className="text-white" />
                    </div>
                    <h3 className="text-md font-semibold text-white tracking-tight">ช่วงเวลา / Date Range</h3>
                </div>
            </div>

            {/* Filters Content */}
            <div className="p-6">
                <div className="flex flex-wrap items-end gap-4">
                    {/* Year Selection */}
                    <div className="flex-shrink-0">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            เลือกปี
                        </label>
                        <YearMultiSelect
                            value={selectedYears}
                            onChange={setSelectedYears}
                            minYear={2024}
                            maxYear={currentYear}
                        />
                    </div>

                    {/* Month Selection */}
                    <div className="flex-shrink-0">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            เลือกเดือน
                        </label>
                        <MonthMultiSelect
                            value={selectedMonths}
                            onChange={setSelectedMonths}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 ml-auto">
                        <button
                            onClick={handleApply}
                            disabled={loading}
                            className="
                flex items-center gap-2 px-6 py-2.5 rounded-xl
                bg-gradient-to-r from-emerald-600 to-teal-600
                text-white text-sm font-semibold
                shadow-lg shadow-emerald-500/25
                hover:from-emerald-700 hover:to-teal-700
                hover:shadow-xl hover:shadow-emerald-500/30
                active:scale-[0.98]
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                btn-premium
              "
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Search size={16} />
                            )}
                            {loading ? "กำลังค้นหา..." : "ค้นหา"}
                        </button>

                        <button
                            onClick={handleReset}
                            disabled={loading}
                            className="
                flex items-center gap-2 px-5 py-2.5 rounded-xl
                bg-white text-slate-600 text-sm font-semibold
                border border-slate-200
                hover:bg-slate-50 hover:border-slate-300
                active:scale-[0.98]
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              "
                        >
                            <RotateCcw size={16} />
                            รีเซ็ต
                        </button>
                    </div>
                </div>

                {/* Selected Range Display */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span className="font-medium">ช่วงที่เลือก:</span>
                        <div className="flex flex-wrap gap-2">
                            {selectedYears.length > 0 && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                                    {selectedYears.length === 1
                                        ? `ปี ${selectedYears[0] + 543}`
                                        : `${selectedYears.length} ปี`}
                                </span>
                            )}
                            {selectedMonths.length > 0 && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">
                                    {selectedMonths.length === 12
                                        ? "ทุกเดือน"
                                        : selectedMonths.length === 1
                                            ? getMonthName(selectedMonths[0])
                                            : `${selectedMonths.length} เดือน`}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper function to get Thai month name
function getMonthName(month: number): string {
    const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
        "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
        "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return months[month - 1] || "";
}
