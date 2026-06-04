"use client";

// =============================================================================
// Component: TaskFilter
// -----------------------------------------------------------------------------
// แผงตัวกรอง inspection task
//   • ช่วงปี/เดือน (multi-select), สถานะ, เทรนเนอร์, ลูกค้า
//   • ค้นหา (debounce 300ms)
//   • expose imperative ref (resetFilters / setTrainerFilter) ผ่าน forwardRef
//   • ปิดล็อคตัวเลือกเทรนเนอร์เมื่อ login เป็น Safety Trainer
// =============================================================================

import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Search, RotateCcw, Filter, ChevronDown, SlidersHorizontal } from "lucide-react";
import { YearMultiSelect } from "@/components/ui/year-multi-select";
import { MonthMultiSelect } from "@/components/ui/month-multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Task, Users, TaskFilterRef, TaskFilterResult } from "../type";
import { STATUS_FILTER_OPTIONS, ROLE_SAFETY_TRAINER } from "../constant";

// Re-export for backward compatibility (page.tsx imports TaskFilterRef from ./type now)
export type { TaskFilterRef, TaskFilterResult };

interface TaskFilterProps {
    tasks: Task[];
    loading?: boolean;
    className?: string;
    onFilter: (filtered: Task[]) => void;
    onFilterStateChange?: (state: TaskFilterResult) => void;
    onSearch?: () => void;
    onTrainerChange?: (trainerId: string) => void;
    myuser?: Users;
    syncMonth?: { year: number; month: number } | null;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
const getUniqueValues = (tasks: Task[], key: keyof Task): string[] => {
    const set = new Set<string>();
    tasks.forEach((t) => {
        const v = t[key];
        if (v) set.add(v as string);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
};

const matchesDateRange = (planDate: string, years: number[], months: number[]): boolean => {
    if (!planDate) return false;
    const date = new Date(planDate);
    if (isNaN(date.getTime())) return false;
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    return years.includes(y) && months.includes(m);
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export const TaskFilter = forwardRef<TaskFilterRef, TaskFilterProps>(
    function TaskFilter({ tasks, loading = false, className = "", myuser, onFilter, onFilterStateChange, onSearch, onTrainerChange, syncMonth }, ref) {
        const currentYear = new Date().getFullYear();

        const [selectedYears, setSelectedYears] = useState<number[]>([currentYear]);
        const [selectedMonths, setSelectedMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        const [search, setSearch] = useState("");
        const [status, setStatus] = useState("");
        const [lockRole, setlockRole] = useState(false);
        const [trainerId, setTrainerId] = useState("");
        const [clientName, setClientName] = useState("");
        const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

        const debounceRef = useRef<NodeJS.Timeout | null>(null);
        const isInitialized = useRef(false);

        const trainerOptions = React.useMemo(() =>
            getUniqueValues(tasks, "trainer_id").map((v) => ({ value: v, label: v })),
            [tasks]
        );

        const clientOptions = React.useMemo(() =>
            getUniqueValues(tasks, "client_name").map((v) => ({ value: v, label: v })),
            [tasks]
        );

        const statusOptions = STATUS_FILTER_OPTIONS;

        const applyFilter = useCallback(() => {
            let result = [...tasks];

            // Date range filter
            if (selectedYears.length > 0 && selectedMonths.length > 0) {
                result = result.filter((t) => matchesDateRange(t.plan_date, selectedYears, selectedMonths));
            }

            // Status filter
            if (status) {
                result = result.filter((t) => t.inspection_task_status === status);
            }

            // Trainer filter
            if (trainerId) {
                result = result.filter((t) => t.trainer_id === trainerId);
            }

            // Client filter
            if (clientName) {
                result = result.filter((t) => t.client_name === clientName);
            }

            // Search filter
            if (search.trim()) {
                const q = search.toLowerCase();
                result = result.filter(
                    (t) =>
                        t.client_name?.toLowerCase().includes(q) ||
                        t.plant_code?.toLowerCase().includes(q) ||
                        t.trainer_id?.toLowerCase().includes(q) ||
                        t.inspection_task_id?.toLowerCase().includes(q)
                );
            }

            onFilter(result);
            onFilterStateChange?.({ search, status: (status || "all") as TaskFilterResult["status"], selectedYears, selectedMonths, trainerId, clientName });
        }, [tasks, selectedYears, selectedMonths, status, trainerId, clientName, search, onFilter, onFilterStateChange]);

        const handleReset = useCallback(() => {
            setSelectedYears([currentYear]);
            setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            setSearch("");
            setStatus("");
            setTrainerId("");
            setClientName("");
        }, [currentYear]);

        useImperativeHandle(ref, () => ({
            resetFilters: handleReset,
            setTrainerFilter: (name: string) => {
                setTrainerId(name);
            },
        }), [handleReset]);

        // Apply on dropdown/date changes (and initial mount)
        useEffect(() => {
            isInitialized.current = true;
            applyFilter();
        }, [selectedYears, selectedMonths, status, trainerId, clientName, tasks]);

        // Sync month/year from Calendar navigation
        useEffect(() => {
            if (!syncMonth) return;
            setSelectedYears([syncMonth.year]);
            setSelectedMonths([syncMonth.month]);
        }, [syncMonth?.year, syncMonth?.month]);

        // myuser
        useEffect(() => {
            if (myuser && myuser.position === ROLE_SAFETY_TRAINER) {
                setTrainerId(`${myuser.firstname} ${myuser.lastname}`);
                setlockRole(true);
            }
        }, [myuser]);

        // Notify parent when trainer filter changes (skip initial mount)
        const trainerNotifyMounted = useRef(false);
        useEffect(() => {
            if (!trainerNotifyMounted.current) {
                trainerNotifyMounted.current = true;
                return;
            }
            onTrainerChange?.(trainerId);
        }, [trainerId]);

        // Debounce search
        useEffect(() => {
            if (!isInitialized.current) return;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                applyFilter();
            }, 300);
            return () => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
            };
        }, [search]);

        return (
            <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-lg shadow-black/10 overflow-hidden ${className}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-gradient-to-r from-slate-900/60 via-slate-800/40 to-teal-900/30">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/30 rounded-xl">
                                <Filter size={22} className="text-teal-200" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                                    ตัวกรองข้อมูล TRAINER
                                </h2>
                                <p className="text-xs text-white/50 mt-0.5">กรองข้อมูลตามเงื่อนไขที่กำหนด</p>
                            </div>
                        </div>
                        {loading && (
                            <div className="flex items-center gap-1.5 ml-2">
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span className="text-xs text-white/70">กำลังค้นหา...</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="md:hidden p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <ChevronDown
                            size={16}
                            className={`text-white transition-transform duration-200 ${showAdvancedFilters ? "rotate-180" : ""}`}
                        />
                    </button>
                </div>

                {/* Filters Content */}
                <div className="p-4 space-y-4">
                    {/* Row 1: Date Range + Search + Actions */}
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-shrink-0">
                            <label className="block text-[11px] font-semibold text-[#90b3ff] uppercase tracking-wider mb-1.5">
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
                            <label className="block text-[11px] font-semibold text-[#90b3ff] uppercase tracking-wider mb-1.5">
                                เดือน
                            </label>
                            <MonthMultiSelect
                                value={selectedMonths}
                                onChange={setSelectedMonths}
                            />
                        </div>

                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-[11px] font-semibold text-[#90b3ff] uppercase tracking-wider mb-1.5">
                                ค้นหา
                            </label>
                            <input
                                className="w-1/2 px-3 py-2 bg-white/5 border border-white/15 backdrop-blur-sm rounded-lg text-sm text-white placeholder:text-white/40 transition-all hover:border-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400/60"
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Task ID, ลูกค้า, Plant..."
                            />
                        </div>

                        <div className="flex-shrink-0 flex items-end gap-2">
                            <button
                                onClick={() => { onSearch?.(); applyFilter(); }}
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
                                className="flex items-center justify-center cursor-pointer gap-1 px-3 py-2 rounded-lg bg-white/5 text-white/70 text-sm font-medium border border-white/15 backdrop-blur-sm hover:bg-white/10 hover:text-white active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                            >
                                <RotateCcw size={13} />
                                รีเซ็ต
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Advanced Filters */}
                    <div className={`${showAdvancedFilters ? "block" : "hidden md:block"}`}>
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className="flex items-center cursor-pointer gap-1.5 text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2.5 hover:text-teal-300 transition-colors"
                        >
                            <ChevronDown
                                size={12}
                                className={`transition-transform duration-200 ${showAdvancedFilters ? "rotate-180" : ""}`}
                            />
                            <span>ตัวกรองเพิ่มเติม</span>
                        </button>

                        {showAdvancedFilters && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
                                {/* Status */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-[#90b3ff] uppercase tracking-wider mb-1.5">
                                        สถานะ
                                    </label>
                                    <SearchableSelect
                                        options={statusOptions}
                                        value={status}
                                        onChange={(value) => setStatus(value.toString())}
                                        placeholder="เลือกสถานะ..."
                                    />
                                </div>

                                {/* Trainer */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-[#90b3ff] uppercase tracking-wider mb-1.5">
                                        Trainer
                                    </label>
                                    <SearchableSelect
                                        options={trainerOptions}
                                        disabled={lockRole}
                                        value={trainerId}
                                        onChange={(value) => setTrainerId(value.toString())}
                                        placeholder="เลือก Trainer..."
                                    />
                                </div>

                                {/* Client */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-[#90b3ff] uppercase tracking-wider mb-1.5">
                                        ลูกค้า
                                    </label>
                                    <SearchableSelect
                                        options={clientOptions}
                                        value={clientName}
                                        onChange={(value) => setClientName(value.toString())}
                                        placeholder="เลือกลูกค้า..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
);
