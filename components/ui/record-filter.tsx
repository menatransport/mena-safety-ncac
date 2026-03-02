"use client";

import React, { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { Search, RotateCcw, Filter, ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { YearMultiSelect } from "@/components/ui/year-multi-select";
import { MonthMultiSelect } from "@/components/ui/month-multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";

/* ----------------------------- Types ------------------------------ */
export interface RecordFilterResult {
    start_date: string;
    end_date: string;
    document_no?: string;
    department_id?: string;
    site_id?: string;
    client_id?: string;
    driver_id?: string;
    casestatus?: string;
    priority?: string;
}

export interface DropdownData {
    sites: Array<{ site_id: string | number; site_name: string; site_name_th?: string }>;
    drivers: Array<{ driver_id: string | number; first_name: string; last_name: string }>;
    departments: Array<{ department_id: string | number; department_name: string; department_name_th?: string }>;
    clients: Array<{ client_id: string | number; client_name: string }>;
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
    onLoadDrivers?: () => void;
    onLoadClients?: () => void;
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

/* ----------------------------- Filter Label Helper ------------------------------ */
interface ActiveFilter {
    key: string;
    label: string;
    value: string;
    onClear: () => void;
}

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
            onLoadDrivers,
            onLoadClients,
        },
        ref
    ) {
        const currentYear = new Date().getFullYear();

        // Date selection states
        const [selectedYears, setSelectedYears] = useState<number[]>([currentYear]);
        const [selectedMonths, setSelectedMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

        // Other filter states
        const [documentNo, setDocumentNo] = useState("");
        const [departmentId, setDepartmentId] = useState("");
        const [siteId, setSiteId] = useState("");
        const [clientId, setClientId] = useState("");
        const [driverId, setDriverId] = useState("");
        const [caseStatus, setCaseStatus] = useState("");
        const [priority, setPriority] = useState("");

        // UI state
        const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
        const [isInitialized, setIsInitialized] = useState(false);

        // Debounce timer ref for text input
        const debounceRef = useRef<NodeJS.Timeout | null>(null);

        const buildFilterResult = useCallback((): RecordFilterResult => {
            const dateRange = getDateRangeFromSelection(selectedYears, selectedMonths);
            return {
                ...dateRange,
                ...(documentNo && { document_no: documentNo }),
                ...(departmentId && { department_id: departmentId }),
                ...(clientId && { client_id: clientId }),
                ...(siteId && { site_id: siteId }),
                ...(driverId && { driver_id: driverId }),
                ...(caseStatus && { casestatus: caseStatus }),
                ...(priority && { priority: priority }),
            };
        }, [selectedYears, selectedMonths, documentNo, departmentId, siteId, clientId, driverId, caseStatus, priority]);

        const handleApply = useCallback(() => {
            onFilter(buildFilterResult());
        }, [buildFilterResult, onFilter]);

        const handleReset = useCallback(() => {
            setSelectedYears([currentYear]);
            setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            setDocumentNo("");
            setDepartmentId("");
            setSiteId("");
            setClientId("");
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

        useEffect(() => {
            if (!isInitialized) return;
            handleApply();
        }, [selectedYears, selectedMonths, departmentId, siteId, clientId, driverId, caseStatus, priority]);

        useEffect(() => {
            if (!isInitialized) return;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                handleApply();
            }, 400);
            return () => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
            };

        }, [documentNo]);


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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className="md:hidden p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <ChevronDown
                                size={16}
                                className={`text-white transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`}
                            />
                        </button>
                    </div>
                </div>

                {/* Filters Content */}
                <div className="p-4 space-y-4">
                    {/* Row 1: Date Range + Actions */}
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

                        <div className="flex-shrink-0 flex items-end gap-2">
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

                    {/* Row 2: Advanced Filters */}
                    <div className={`${showAdvancedFilters ? 'block' : 'hidden md:block'}`}>
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className="flex items-center cursor-pointer gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 hover:text-emerald-600 transition-colors"
                        >
                            <ChevronDown
                                size={12}
                                className={`transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`}
                            />
                            <span>ตัวกรองเพิ่มเติม</span>
                        </button>

                        {showAdvancedFilters && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                                {/* Document Number */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        เลขที่เอกสาร
                                    </label>
                                    <input
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 transition-all hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        type="text"
                                        value={documentNo}
                                        onChange={(e) => setDocumentNo(e.target.value)}
                                        placeholder="พิมพ์เลขที่เอกสาร..."
                                    />
                                </div>

                                {/* Department */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        ฝ่าย
                                    </label>
                                    <SearchableSelect
                                        options={
                                            dropdownData.departments?.map((department) => ({
                                                value: department.department_id?.toString() || "",
                                                label: department.department_name_th || department.department_name || "ไม่ระบุชื่อ",
                                            })) || []
                                        }
                                        value={departmentId}
                                        onChange={(value) => setDepartmentId(value.toString())}
                                        placeholder="เลือกฝ่าย..."
                                    />
                                </div>

                                {/* Site */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        สำนักงาน / ศูนย์ปฏิบัติการ
                                    </label>
                                    <SearchableSelect
                                        options={
                                            dropdownData.sites?.map((site) => ({
                                                value: site.site_id?.toString() || "",
                                                label: site.site_name_th || site.site_name || "ไม่ระบุชื่อ",
                                            })) || []
                                        }
                                        value={siteId}
                                        onChange={(value) => setSiteId(value.toString())}
                                        placeholder="เลือกศูนย์..."
                                    />
                                </div>

                                {/* Client */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        ลูกค้า
                                    </label>
                                    <SearchableSelect
                                        options={
                                            dropdownData.clients?.map((client) => ({
                                                value: client.client_id?.toString() || "",
                                                label: client.client_name || "ไม่ระบุชื่อ",
                                            })) || []
                                        }
                                        value={clientId}
                                        onChange={(value) => setClientId(value.toString())}
                                        onOpen={onLoadClients}
                                        placeholder="เลือกลูกค้า..."
                                    />
                                </div>

                                {/* Driver */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        พนักงานขับรถ
                                    </label>
                                    <SearchableSelect
                                        options={
                                            dropdownData.drivers?.map((driver) => ({
                                                value: driver.driver_id?.toString() || "",
                                                label: `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "ไม่ระบุชื่อ",
                                            })) || []
                                        }
                                        value={driverId}
                                        onChange={(value) => setDriverId(value.toString())}
                                        onOpen={onLoadDrivers}
                                        placeholder="เลือกพนักงาน..."
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        สถานะ
                                    </label>
                                    <SearchableSelect
                                        options={[
                                            { value: "Pending", label: "🟡 Pending" },
                                            { value: "Completed Investigate", label: "🟢 Completed" },
                                            { value: "Voided", label: "🔴 Voided" },
                                        ]}
                                        value={caseStatus}
                                        onChange={(value) => setCaseStatus(value.toString())}
                                        placeholder="เลือกสถานะ..."
                                    />
                                </div>

                                {/* Priority */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        ระดับความรุนแรง
                                    </label>
                                    <SearchableSelect
                                        options={[
                                            { value: "Minor", label: "🟡 Minor" },
                                            { value: "Major", label: "🟠 Major" },
                                            { value: "Crisis", label: "🔴 Crisis" },
                                        ]}
                                        value={priority}
                                        onChange={(value) => setPriority(value.toString())}
                                        placeholder="เลือกระดับ..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        );
    });
