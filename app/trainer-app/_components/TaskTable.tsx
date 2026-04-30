"use client";

// =============================================================================
// Component: TaskTable
// -----------------------------------------------------------------------------
// ตาราง/การ์ดแสดงรายการ inspection task
//   • จัดเรียงตามคอลัมน์ (toggle asc/desc)
//   • แบ่งหน้า (TASK_TABLE_ROWS_PER_PAGE)
//   • Export ข้อมูลเป็น Excel (xlsx)
//   • Action → เปิดงาน / ลบงาน (ซ่อนปุ่มลบเมื่อ lockRole = true)
// =============================================================================

import { useState, useMemo } from "react";
import {
    ArrowUpDown, ArrowUp, ArrowDown,
    FileSpreadsheet, ChevronLeft, ChevronRight, Inbox,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { Task } from "../type";
import { TASK_TABLE_STATUS, TASK_TABLE_ROWS_PER_PAGE, CALENDAR_MONTHS_TH_SHORT } from "../constant";
import { LordIcon } from "@/components/LordIcon";

/* -------------------------------------------------------------------------- */
/*  Date formatter – "d ม.ค. yyyy" (Thai short month, ค.ศ.)                   */
/* -------------------------------------------------------------------------- */
function fmtThaiDate(value: string | null | undefined): string {
    if (!value) return "—";
    const raw = String(value).slice(0, 10);
    const parts = raw.split("-");
    if (parts.length !== 3) return value as string;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12) return value as string;
    return `${d} ${CALENDAR_MONTHS_TH_SHORT[m - 1]} ${y}`;
}

/* -------------------------------------------------------------------------- */
/*  Status badge                                                              */
/* -------------------------------------------------------------------------- */
function StatusBadge({ status }: { status: string | null }) {
    const cfg = TASK_TABLE_STATUS[status ?? ""]
        ?? { label: status ?? "—", className: "bg-white/10 text-white/70 border-white/15" };
    return (
        <span className={`inline-flex justify-center px-3 py-1 rounded-full text-xs font-medium text-center backdrop-blur-sm border ${cfg.className}`}>
            {cfg.label}
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/*  Types & Props                                                             */
/* -------------------------------------------------------------------------- */
type SortField = "plan_date" | "client_name" | "plant_code" | "trainer_id" | "inspection_task_status" | "inspection_task_id" | "created_at" | "updated_at" | "action_date";
type SortDir = "asc" | "desc";

interface TaskTableProps {
    tasks: Task[];
    onViewTask?: (taskId: string) => void;
    onDeleteTask?: (taskId: string) => void;
    lockRole?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function TaskTable({ tasks, onViewTask, onDeleteTask, lockRole }: TaskTableProps) {
    const [sortField, setSortField] = useState<SortField>("plan_date");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [page, setPage] = useState(1);
    console.log('tasks: ', tasks);
    /* ──── Sorting ──── */
    const sorted = useMemo(() => {
        return [...tasks].sort((a, b) => {
            const aVal = (a[sortField] ?? "") as string;
            const bVal = (b[sortField] ?? "") as string;
            const cmp = aVal.localeCompare(bVal, "th");
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [tasks, sortField, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / TASK_TABLE_ROWS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const paginated = sorted.slice((safePage - 1) * TASK_TABLE_ROWS_PER_PAGE, safePage * TASK_TABLE_ROWS_PER_PAGE);

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortField(field); setSortDir("asc"); }
    };

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown size={14} className="text-white/30" />;
        return sortDir === "asc"
            ? <ArrowUp size={14} className="text-teal-300" />
            : <ArrowDown size={14} className="text-teal-300" />;
    };

    

    const columns: { field: SortField; label: string }[] = [
        { field: "inspection_task_id", label: "Task ID" },
        { field: "created_at", label: "สร้างเมื่อ" },
        { field: "plan_date", label: "วันที่ลงแผน" },
        { field: "action_date", label: "วันที่ดำเนินการ" },
        { field: "plant_code", label: "Plant" },
        { field: "client_name", label: "ลูกค้า" },
        { field: "trainer_id", label: "Trainer" },
        { field: "inspection_task_status", label: "สถานะ" },
        { field: "updated_at", label: "อัปเดตเมื่อ" },
    ];

    const DATE_FIELDS: SortField[] = ["plan_date", "action_date", "created_at", "updated_at"];
    const exportExcel = () => {
        const rows = sorted.map((t) => (columns.reduce((acc, col) => ({
            ...acc,
            [col.label]: DATE_FIELDS.includes(col.field) ? fmtThaiDate(t[col.field] as string) : (t[col.field] ?? ""),
        }), {})));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inspection Tasks");
        XLSX.writeFile(wb, `inspection_tasks_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-lg shadow-black/10 overflow-hidden relative">
            {/* Header bar */}
            <div className="p-4 bg-gradient-to-r from-slate-900/60 via-slate-800/40 to-teal-900/30 border-b border-white/10">
                <h2 className="text-xl text-white font-semibold">
                    ข้อมูล Inspection Tasks
                </h2>
                <div className="text-white/70 mt-1 space-y-1">
                    <p>พบข้อมูล {sorted.length} รายการ</p>
                </div>

                {/* Top-right controls */}
                <div className="absolute top-4 right-4 flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={exportExcel}
                        className="bg-gradient-to-r from-emerald-500/30 to-teal-600/30 border border-teal-400/40 hover:from-emerald-500/50 hover:to-teal-600/50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md shadow-teal-500/10 backdrop-blur-sm"
                    >
                        <FileSpreadsheet size={20} />
                        <span className="hidden sm:inline">Excel</span>
                    </button>
                </div>

                {/* Pagination in header */}
                <div className="flex justify-end items-center gap-2 text-sm mt-3">
                    <button
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1 border border-white/15 text-white/80 rounded hover:bg-white/10 hover:text-white disabled:opacity-40 transition-colors"
                    >
                        ก่อนหน้า
                    </button>
                    <span className="text-white/60">
                        หน้า {safePage} จาก {totalPages}
                    </span>
                    <button
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3 py-1 border border-white/15 text-white/80 rounded hover:bg-white/10 hover:text-white disabled:opacity-40 transition-colors"
                    >
                        ถัดไป
                    </button>
                </div>
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-white/[0.03] border-b border-white/10">
                        <tr>
                            {columns.map(({ field, label }) => (
                                <th
                                    key={field}
                                    onClick={() => toggleSort(field)}
                                    className="px-2 py-3 text-left text-sm font-semibold text-white/70 cursor-pointer hover:text-teal-200 transition-colors whitespace-nowrap"
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{label}</span>
                                        {getSortIcon(field)}
                                    </div>
                                </th>
                            ))}
                            <th className="px-2 py-3 text-center text-sm font-semibold text-white/70 w-[180px]">
                                <span></span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-2 text-white/40">
                                        <Inbox size={32} strokeWidth={1.2} />
                                        <p className="text-sm font-medium">ไม่พบรายการ</p>
                                        <p className="text-xs text-white/30">ลองเปลี่ยนตัวกรอง</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginated.map((task) => (
                                <tr
                                    key={task.inspection_task_id}
                                    className="hover:bg-white/[0.05] transition-colors"
                                >
                                    <td className="px-2 py-3 text-xs font-medium text-white/90 whitespace-nowrap">
                                        <span className="font-medium">{task.inspection_task_id}</span>
                                    </td>
                                    <td className="px-2 py-3 text-xs text-white/70 whitespace-nowrap">
                                        {fmtThaiDate(task.created_at)}
                                    </td>
                                    <td className="px-2 py-3 text-xs text-white/70 whitespace-nowrap">
                                        {fmtThaiDate(task.plan_date)}
                                    </td>
                                    <td className="px-2 py-3 text-xs text-white/70 whitespace-nowrap">
                                        {fmtThaiDate(task.action_date)}
                                    </td>
                                    <td className="px-2 py-3 text-xs text-white/70 whitespace-nowrap">
                                        {task.plant_name || task.plant_code || "—"}
                                    </td>
                                    <td className="px-2 py-3 text-xs text-white/70 max-w-[140px] truncate" title={task.client_name || "—"}>
                                        {task.client_name || "—"}
                                    </td>
                                    <td className="px-2 py-3 text-xs text-white/70 whitespace-nowrap">
                                        {task.trainer_id || "—"}
                                    </td>
                                    <td className="px-2 py-3">
                                        <StatusBadge status={task.inspection_task_status} />
                                    </td>
                                    <td className="px-2 py-3 text-xs text-white/70 whitespace-nowrap">
                                        {fmtThaiDate(task.updated_at)}
                                    </td>
                                    <td className="px-2 py-3">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onViewTask?.(task.inspection_task_id); }}
                                                className="bg-gradient-to-r from-teal-500/30 to-emerald-600/30 border border-teal-400/40 cursor-pointer hover:from-teal-500/50 hover:to-emerald-600/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm shadow-md shadow-teal-500/10 flex items-center"
                                            >
                                                <LordIcon
                                                    src="https://cdn.lordicon.com/nocovwne.json"
                                                    trigger="hover"
                                                    colors="primary:#ffffff"
                                                    style={{ width: "20px", height: "20px" }}
                                                    className="mr-1"
                                                />
                                                เปิด
                                            </button>
                                                <button
                                                    className="bg-rose-500/20 border border-rose-400/40 cursor-pointer hover:bg-rose-500/35 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm flex items-center"
                                                    onClick={onDeleteTask ? (e) => { e.stopPropagation(); onDeleteTask(task.inspection_task_id); } : undefined}
                                                >
                                                    <LordIcon
                                                        src="https://cdn.lordicon.com/skkahier.json"
                                                        trigger="hover"
                                                        colors="primary:#ffffff"
                                                        style={{ width: "20px", height: "20px" }}
                                                        className="mr-1"
                                                    />
                                                    ลบ
                                                </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-3 p-3 sm:p-4">
                {paginated.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-white/40">
                        <Inbox size={32} strokeWidth={1.2} />
                        <p className="text-sm font-medium">ไม่พบรายการ</p>
                        <p className="text-xs text-white/30">ลองเปลี่ยนตัวกรอง</p>
                    </div>
                ) : (
                    paginated.map((task) => (
                        <div
                            key={task.inspection_task_id}
                            onClick={() => onViewTask?.(task.inspection_task_id)}
                            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.04] to-transparent backdrop-blur-sm shadow-md shadow-black/20 hover:border-teal-400/40 hover:shadow-teal-500/10 active:scale-[0.99] transition-all duration-200 cursor-pointer"
                        >
                            {/* Decorative blur */}
                            <div className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br from-teal-500/15 to-emerald-600/10 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* Header */}
                            <div className="relative flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-semibold text-teal-300/80 uppercase tracking-wider mb-0.5">Task ID</p>
                                    <h3 className="text-base font-bold text-white tracking-tight truncate">{task.inspection_task_id}</h3>
                                    <p className="text-[11px] text-white/50 mt-1 flex items-center gap-1.5">
                                        <span className="inline-block w-1 h-1 rounded-full bg-white/40" />
                                        วันที่ลงแผน {fmtThaiDate(task.plan_date)}
                                    </p>
                                </div>
                                <StatusBadge status={task.inspection_task_status} />
                            </div>

                            {/* Divider */}
                            <div className="relative mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            {/* Details grid */}
                            <div className="relative grid grid-cols-2 gap-2 px-4 py-3">
                                <div className="rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-2">
                                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">ลูกค้า</p>
                                    <p className="text-xs text-white/90 font-medium mt-0.5 truncate" title={task.client_name || "—"}>
                                        {task.client_name || "—"}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-2">
                                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Plant</p>
                                    <p className="text-xs text-white/90 font-medium mt-0.5 truncate" title={task.plant_name || task.plant_code || "—"}>
                                        {task.plant_name || task.plant_code || "—"}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-2">
                                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Trainer</p>
                                    <p className="text-xs text-white/90 font-medium mt-0.5 truncate" title={task.trainer_id || "—"}>
                                        {task.trainer_id || "—"}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-2">
                                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">วันดำเนินการ</p>
                                    <p className="text-xs text-white/90 font-medium mt-0.5 truncate">
                                        {fmtThaiDate(task.action_date)}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="relative flex justify-end gap-2 px-4 py-3 border-t border-white/10 bg-white/[0.02]">    
                                    <button
                                        onClick={onDeleteTask ? (e) => { e.stopPropagation(); onDeleteTask(task.inspection_task_id); } : (e) => e.stopPropagation()}
                                        className="flex items-center gap-1 bg-rose-500/15 border border-rose-400/30 hover:bg-rose-500/30 active:scale-[0.97] text-rose-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all backdrop-blur-sm cursor-pointer"
                                    >
                                        <LordIcon
                                            src="https://cdn.lordicon.com/skkahier.json"
                                            trigger="hover"
                                            colors="primary:#fecaca"
                                            style={{ width: "18px", height: "18px" }}
                                        />
                                        ลบ
                                    </button>                            
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewTask?.(task.inspection_task_id); }}
                                    className="flex items-center gap-1 bg-gradient-to-r from-teal-500/30 to-emerald-600/30 border border-teal-400/40 hover:from-teal-500/50 hover:to-emerald-600/50 active:scale-[0.97] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all backdrop-blur-sm shadow-md shadow-teal-500/10 cursor-pointer"
                                >
                                    <LordIcon
                                        src="https://cdn.lordicon.com/nocovwne.json"
                                        trigger="hover"
                                        colors="primary:#ffffff"
                                        style={{ width: "18px", height: "18px" }}
                                    />
                                    เปิด
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
