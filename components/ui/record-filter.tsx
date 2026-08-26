"use client";

import React, { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { Search, RotateCcw, Filter, FileText, Truck } from "lucide-react";
import { YearMultiSelect } from "@/components/ui/year-multi-select";
import { MonthMultiSelect } from "@/components/ui/month-multi-select";

/* ----------------------------- Types ------------------------------ */
export interface RecordFilterResult {
    start_date: string;
    end_date: string;
    document_no?: string;
    vehicle_plate?: string;
}

export interface RecordFilterRef {
    triggerSearch: () => void;
    resetFilters: () => void;
}

interface RecordFilterProps {
    type: "NC" | "AC";
    onFilter: (filters: RecordFilterResult) => void;
    loading?: boolean;
    className?: string;
    autoSearch?: boolean; // auto search on mount, default true
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

    const startDate = new Date(minYear, minMonth - 1, 1);
    const endDate = new Date(maxYear, maxMonth, 0);

    return {
        start_date: formatDateToLocal(startDate),
        end_date: formatDateToLocal(endDate),
    };
};

/* ----------------------------- Component ------------------------------ */
export const RecordFilter = forwardRef<RecordFilterRef, RecordFilterProps>(
    function RecordFilter(
        {
            type,
            onFilter,
            loading = false,
            className = "",
            autoSearch = true,
        },
        ref
    ) {
        const currentYear = new Date().getFullYear();

        // Date selection states
        const [selectedYears, setSelectedYears] = useState<number[]>([currentYear]);
        const [selectedMonths, setSelectedMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

        // Other filter states
        const [documentNo, setDocumentNo] = useState("");
        const [vehiclePlate, setVehiclePlate] = useState("");

        // UI state
        const [isInitialized, setIsInitialized] = useState(false);

        // Debounce timer ref for text input
        const debounceRef = useRef<NodeJS.Timeout | null>(null);

        const buildFilterResult = useCallback((): RecordFilterResult => {
            const dateRange = getDateRangeFromSelection(selectedYears, selectedMonths);
            return {
                ...dateRange,
                ...(documentNo && { document_no: documentNo }),
                ...(vehiclePlate && { vehicle_plate: vehiclePlate }),
            };
        }, [selectedYears, selectedMonths, documentNo, vehiclePlate]);

        const handleApply = useCallback(() => {
            onFilter(buildFilterResult());
        }, [buildFilterResult, onFilter]);

        const handleReset = useCallback(() => {
            setSelectedYears([currentYear]);
            setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            setDocumentNo("");
            setVehiclePlate("");

            const dateRange = getDateRangeFromSelection([currentYear], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            onFilter({
                ...dateRange,
            });
        }, [currentYear, onFilter]);

        useImperativeHandle(ref, () => ({
            triggerSearch: handleApply,
            resetFilters: handleReset,
        }), [handleApply, handleReset]);

        useEffect(() => {
            if (!isInitialized && autoSearch) {
                handleApply();
                setIsInitialized(true);
            }
        }, [isInitialized, autoSearch, handleApply]);

        useEffect(() => {
            if (!isInitialized) return;
            handleApply();
        }, [selectedYears, selectedMonths]);

        // Text search fields share one debounce so typing in either doesn't
        // fire a request per keystroke.
        useEffect(() => {
            if (!isInitialized) return;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                handleApply();
            }, 400);
            return () => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
            };
        }, [documentNo, vehiclePlate]);


        return (
            <div className={`bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden ${className}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-800 to-slate-700">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-white/10 rounded-lg">
                            <Filter size={16} className="text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-white tracking-tight">
                            ตัวกรองข้อมูล {type}
                        </h3>
                        {loading && (
                            <div className="flex items-center gap-1.5 ml-2">
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span className="text-xs text-white/70">กำลังค้นหา...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters Content — one flat, always-visible row */}
                <div className="p-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-shrink-0">
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                ปี
                            </label>
                            <YearMultiSelect
                                value={selectedYears}
                                onChange={setSelectedYears}
                                minYear={2024}
                                maxYear={currentYear}
                            />
                        </div>

                        <div className="flex-shrink-0">
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                เดือน
                            </label>
                            <MonthMultiSelect
                                value={selectedMonths}
                                onChange={setSelectedMonths}
                            />
                        </div>

                        <div className="w-full sm:w-64">
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                เลขที่เอกสาร
                            </label>
                            <div className="relative">
                                <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 transition-all hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    type="text"
                                    value={documentNo}
                                    onChange={(e) => setDocumentNo(e.target.value)}
                                    placeholder="ค้นหาเลขที่เอกสาร เช่น AC-SB-2508..."
                                />
                            </div>
                        </div>

                        <div className="w-full sm:w-44">
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                ทะเบียนรถ
                            </label>
                            <div className="relative">
                                <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 transition-all hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    type="text"
                                    value={vehiclePlate}
                                    onChange={(e) => setVehiclePlate(e.target.value)}
                                    placeholder="ค้นหาทะเบียนรถ..."
                                />
                            </div>
                        </div>

                        <div className="flex-shrink-0 flex items-end gap-2 ml-auto">
                            <button
                                onClick={handleApply}
                                disabled={loading}
                                className="flex items-center justify-center cursor-pointer gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Search size={14} />
                                )}
                                ค้นหา
                            </button>

                            <button
                                onClick={handleReset}
                                disabled={loading}
                                className="flex items-center justify-center cursor-pointer gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium border border-slate-200 hover:bg-slate-200 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                            >
                                <RotateCcw size={13} />
                                รีเซ็ต
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    });
