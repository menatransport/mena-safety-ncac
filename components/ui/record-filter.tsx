"use client";

import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Search, RotateCcw, Calendar, Filter, ChevronDown } from "lucide-react";
import { YearMultiSelect } from "@/components/ui/year-multi-select";
import { MonthMultiSelect } from "@/components/ui/month-multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";

/* ----------------------------- Types ------------------------------ */
export interface RecordFilterResult {
    start_date: string;
    end_date: string;
    document_no?: string;
    site_id?: string;
    driver_id?: string;
    casestatus?: string;
    priority?: string;
}

export interface DropdownData {
    sites: Array<{ site_id: string | number; site_name: string; site_name_th?: string }>;
    drivers: Array<{ driver_id: string | number; first_name: string; last_name: string }>;
}

export interface RecordFilterRef {
    triggerSearch: () => void;
    resetFilters: () => void;
}

interface RecordFilterProps {
    type: "NC" | "AC";
    onFilter: (filters: RecordFilterResult) => void;
    loading?: boolean;
    dropdownData: DropdownData;
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
export const RecordFilter = forwardRef<RecordFilterRef, RecordFilterProps>(
    function RecordFilter(
        {
            type,
            onFilter,
            loading = false,
            dropdownData,
            className = "",
            autoSearch = true,
        },
        ref
    ) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // Date selection states
        const [selectedYears, setSelectedYears] = useState<number[]>([currentYear]);
        const [selectedMonths, setSelectedMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

        // Other filter states
        const [documentNo, setDocumentNo] = useState("");
        const [siteId, setSiteId] = useState("");
        const [driverId, setDriverId] = useState("");
        const [caseStatus, setCaseStatus] = useState("");
        const [priority, setPriority] = useState("");

        // UI state
        const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
        const [isInitialized, setIsInitialized] = useState(false);

        const buildFilterResult = useCallback((): RecordFilterResult => {
            const dateRange = getDateRangeFromSelection(selectedYears, selectedMonths);
            return {
                ...dateRange,
                ...(documentNo && { document_no: documentNo }),
                ...(siteId && { site_id: siteId }),
                ...(driverId && { driver_id: driverId }),
                ...(caseStatus && { casestatus: caseStatus }),
                ...(priority && { priority: priority }),
            };
        }, [selectedYears, selectedMonths, documentNo, siteId, driverId, caseStatus, priority]);

        const handleApply = useCallback(() => {
            onFilter(buildFilterResult());
        }, [buildFilterResult, onFilter]);

        const handleReset = useCallback(() => {
            setSelectedYears([currentYear]);
            setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            setDocumentNo("");
            setSiteId("");
            setDriverId("");
            setCaseStatus("");
            setPriority("");

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

        // Get month name helper
        const getMonthName = (month: number): string => {
            const months = [
                "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
                "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
                "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
            ];
            return months[month - 1] || "";
        };

        const activeFilterCount = [documentNo, siteId, driverId, caseStatus, priority].filter(Boolean).length;

        return (
            <div className={`bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-premium overflow-hidden ${className}`}>
                {/* Header Section */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-800 to-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <Filter size={18} className="text-white" />
                        </div>
                        <h3 className="text-md font-semibold text-white tracking-tight">
                            ตัวกรองข้อมูล {type}
                        </h3>
                    </div>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="md:hidden p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <ChevronDown
                            size={18}
                            className={`text-white transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`}
                        />
                    </button>
                </div>

                {/* Filters Content */}
                <div className="p-6 space-y-6">
                    {/* Date Range Section */}
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

                        {/* Action Buttons - Inline with date selectors */}
                        <div className="flex-shrink-0 flex items-end gap-2">
                            <button
                                onClick={handleApply}
                                disabled={loading}
                                className="flex items-center justify-center cursor-pointer gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                className="flex items-center justify-center cursor-pointer gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium border border-slate-200 hover:bg-slate-200 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                            >
                                <RotateCcw size={14} />
                                รีเซ็ต
                            </button>
                        </div>
                    </div>

                    {/* Advanced Filters Section - Compact Inline Style */}
                    <div className={`${showAdvancedFilters ? 'block' : 'hidden md:block'}`}>
                        {/* Toggle Header */}
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className="flex items-center cursor-pointer gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 hover:text-emerald-600 transition-colors group"
                        >
                            <ChevronDown
                                size={14}
                                className={`transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`}
                            />
                            <span>ตัวกรองเพิ่มเติม</span>
                            {activeFilterCount > 0 && (
                                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {/* Compact Filter Grid */}
                        {showAdvancedFilters && (
                            <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                                {/* Document Number - Compact */}
                                <div className="flex items-center gap-2 min-w-[180px]">
                                    <span className="text-xs text-slate-500 whitespace-nowrap">เลขที่:</span>
                                    <input
                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 transition-all hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                        type="text"
                                        value={documentNo}
                                        onChange={(e) => setDocumentNo(e.target.value)}
                                        placeholder="เลขที่เอกสาร..."
                                    />
                                </div>

                                {/* Site Selection - Compact */}
                                <div className="flex items-center gap-2 min-w-[200px] flex-1 max-w-[280px]">
                                    <span className="text-xs text-slate-500 whitespace-nowrap">สำนักงาน:</span>
                                    <div className="flex-1">
                                        <SearchableSelect
                                            options={
                                                dropdownData.sites?.map((site) => ({
                                                    value: site.site_id?.toString() || "",
                                                    label: site.site_name_th || site.site_name || "ไม่ระบุชื่อ",
                                                })) || []
                                            }
                                            value={siteId}
                                            onChange={(value) => setSiteId(value.toString())}
                                            placeholder="เลือก..."
                                        />
                                    </div>
                                </div>

                                {/* Driver Selection - Compact */}
                                <div className="flex items-center gap-2 min-w-[200px] flex-1 max-w-[280px]">
                                    <span className="text-xs text-slate-500 whitespace-nowrap">พนักงาน:</span>
                                    <div className="flex-1">
                                        <SearchableSelect
                                            options={
                                                dropdownData.drivers?.map((driver) => ({
                                                    value: driver.driver_id?.toString() || "",
                                                    label: `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "ไม่ระบุชื่อ",
                                                })) || []
                                            }
                                            value={driverId}
                                            onChange={(value) => setDriverId(value.toString())}
                                            placeholder="เลือก..."
                                        />
                                    </div>
                                </div>

                                {/* Status - Compact */}
                                <div className="flex items-center gap-2 min-w-[150px]">
                                    <span className="text-xs text-slate-500 whitespace-nowrap">สถานะ:</span>
                                    <div className="flex-1">
                                        <SearchableSelect
                                            options={[
                                                { value: "Pending", label: "Pending" },
                                                { value: "Completed Investigate", label: "Completed" },
                                                { value: "Voided", label: "Voided" },
                                            ]}
                                            value={caseStatus}
                                            onChange={(value) => setCaseStatus(value.toString())}
                                            placeholder="เลือก..."
                                        />
                                    </div>
                                </div>

                                {/* Priority - Compact */}
                                <div className="flex items-center gap-2 min-w-[140px]">
                                    <span className="text-xs text-slate-500 whitespace-nowrap">ระดับ:</span>
                                    <div className="flex-1">
                                        <SearchableSelect
                                            options={[
                                                { value: "Minor", label: "🟡 Minor" },
                                                { value: "Major", label: "🟠 Major" },
                                                { value: "Crisis", label: "🔴 Crisis" },
                                            ]}
                                            value={priority}
                                            onChange={(value) => setPriority(value.toString())}
                                            placeholder="เลือก..."
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    });
