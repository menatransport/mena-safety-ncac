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
    FileSpreadsheet, Inbox, Eye, Trash2, Loader2,
} from "lucide-react";
import type { Task } from "../type";
import { TASK_TABLE_STATUS, TASK_TABLE_ROWS_PER_PAGE, CALENDAR_MONTHS_TH_SHORT } from "../constant";

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
type SortField = "plan_date" | "client_name" | "plant_name" | "trainer_id" | "inspection_task_status" | "inspection_task_id" | "created_at" | "updated_at" | "action_date";
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
    const [isExporting, setIsExporting] = useState(false);

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
        { field: "plant_name", label: "แพล้นท์" },
        { field: "client_name", label: "ลูกค้า" },
        { field: "trainer_id", label: "เทรนเนอร์" },
        { field: "inspection_task_status", label: "สถานะ" },
        { field: "updated_at", label: "อัปเดตเมื่อ" },
    ];

    const DATE_FIELDS: SortField[] = ["plan_date", "action_date", "created_at", "updated_at"];

    /* แปลงสตริงวันที่ → Date object (local midnight) เพื่อให้ Excel เป็น type วันที่
       คำนวณได้ (เช่น =B2-A2) และไม่มีเวลาติดมาเพราะ timezone shift */
    const toExcelDate = (value: unknown): Date | null => {
        if (value == null || value === "") return null;
        const s = String(value).slice(0, 10);
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
        if (!m) return null;
        const date = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
        return isNaN(date.getTime()) ? null : date;
    };

    const exportExcel = async () => {
        setIsExporting(true);
        try {
        const XLSX = await import("xlsx");

        /* ── Sheet 1: Inspection Tasks (เดิม) ── */
        const rows = sorted.map((row) => {
            const newRow: Record<string, unknown> = { ...row };
            DATE_FIELDS.forEach((field) => {
                if (newRow[field]) {
                    const d = toExcelDate(newRow[field]);
                    newRow[field] = d ?? newRow[field];
                }
            });
            return newRow;
        });

        const ws1 = XLSX.utils.json_to_sheet(rows, { cellDates: true });

        const headerKeys1 = Object.keys(rows[0] || {});
        const dateColIdx1 = DATE_FIELDS
            .map((f) => headerKeys1.indexOf(f))
            .filter((i) => i >= 0);
        const range1 = XLSX.utils.decode_range(ws1["!ref"] || "A1");
        for (let R = range1.s.r + 1; R <= range1.e.r; R++) {
            for (const C of dateColIdx1) {
                const cell = ws1[XLSX.utils.encode_cell({ r: R, c: C })];
                if (cell && cell.v instanceof Date) {
                    cell.t = "d";
                    cell.z = "dd/mm/yyyy";
                }
            }
        }
        ws1["!cols"] = headerKeys1.map(() => ({ wch: 18 }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws1, "Inspection Tasks");

        /* ── Sheet 2: สรุปผลการตรวจ (ใหม่) ── */
        const taskIds = [...new Set(sorted.map((t) => t.inspection_task_id))];

        if (taskIds.length > 0) {
            try {
                const params = new URLSearchParams();
                taskIds.forEach((id) => params.append("task_ids", id));
                const res = await fetch(`/api/task/report?${params.toString()}`);

                if (res.ok) {
                    type DriverSummaryRow = {
                        inspection_task_id: string;
                        plan_date: string | null;
                        action_date: string | null;
                        plant_name: string | null;
                        client_name: string | null;
                        trainer_id: string | null;
                        driver_status: string | null;
                        driver_id: string | null;
                        first_name: string | null;
                        last_name: string | null;
                        number_plate: string | null;
                        truck_number: string | null;
                        truck_type: string | null;
                        alcohol: number | null;
                        amfetamin: string | null;
                        kra: string | null;
                        thc: string | null;
                        drug_test_status: string | null;
                        helmet_check: string | null;
                        glasses_check: string | null;
                        mask_check: string | null;
                        vest_check: string | null;
                        glove_check: string | null;
                        safety_shoes_check: string | null;
                        ppe_status: string | null;
                        vehicle_status: string | null;
                        vehicle_front_result: string | null;
                        vehicle_front_fail_items: string | null;
                        vehicle_left_result: string | null;
                        vehicle_left_fail_items: string | null;
                        vehicle_rear_result: string | null;
                        vehicle_rear_fail_items: string | null;
                        vehicle_right_result: string | null;
                        vehicle_right_fail_items: string | null;
                        vehicle_inside_result: string | null;
                        vehicle_inside_fail_items: string | null;
                    };

                    const summary: DriverSummaryRow[] = await res.json();

                    const summaryRows = summary.map((d) => ({
                        "Task ID": d.inspection_task_id,
                        "Driver ID": d.inspection_task_id + "-" + d.driver_id,
                        "วันที่ลงแผน": toExcelDate(d.plan_date) ?? d.plan_date ?? "—",
                        "วันที่ดำเนินการ": toExcelDate(d.action_date) ?? d.action_date ?? "—",
                        "แพล้นท์": d.plant_name ?? "—",
                        "ลูกค้า": d.client_name ?? "—",
                        "เทรนเนอร์": sorted.find(t => t.inspection_task_id === d.inspection_task_id)?.trainer_id ?? d.trainer_id ?? "—",
                        "สถานะคนขับ": d.driver_status ?? "—",
                        "รหัสคนขับ": d.driver_id ?? "—",
                        "ชื่อ": d.first_name ?? "—",
                        "นามสกุล": d.last_name ?? "—",
                        "ทะเบียน": d.number_plate ?? "—",
                        "เลขรถ": d.truck_number ?? "—",
                        "ประเภทรถ": d.truck_type ?? "—",
                        "แอลกอฮอล์": d.alcohol ?? "—",
                        "แอมเฟตามีน": d.amfetamin ?? "—",
                        "KRA": d.kra ?? "—",
                        "THC": d.thc ?? "—",
                        "ผล Drug/Alc": d.drug_test_status ?? "—",
                        "หมวก Safety": d.helmet_check ?? "—",
                        "แว่นตา Safety": d.glasses_check ?? "—",
                        "ผ้าปิดจมูก": d.mask_check ?? "—",
                        "เสื้อสะท้อนแสง": d.vest_check ?? "—",
                        "ถุงมือ Safety": d.glove_check ?? "—",
                        "รองเท้า Safety": d.safety_shoes_check ?? "—",
                        "ผล PPE": d.ppe_status ?? "—",
                        "ผลตรวจรถ (รวม)": d.vehicle_status ?? "—",
                        "ด้านหน้า ผล": d.vehicle_front_result ?? "—",
                        "ด้านหน้า เหตุผล": d.vehicle_front_fail_items ?? "—",
                        "ด้านซ้าย ผล": d.vehicle_left_result ?? "—",
                        "ด้านซ้าย เหตุผล": d.vehicle_left_fail_items ?? "—",
                        "ด้านหลัง ผล": d.vehicle_rear_result ?? "—",
                        "ด้านหลัง เหตุผล": d.vehicle_rear_fail_items ?? "—",
                        "ด้านขวา ผล": d.vehicle_right_result ?? "—",
                        "ด้านขวา เหตุผล": d.vehicle_right_fail_items ?? "—",
                        "ภายในรถ ผล": d.vehicle_inside_result ?? "—",
                        "ภายในรถ เหตุผล": d.vehicle_inside_fail_items ?? "—",
                    }));

                    const ws2 = XLSX.utils.json_to_sheet(summaryRows, { cellDates: true });

                    // กำหนด format วันที่ใน sheet 2
                    const dateHeaders = ["วันที่ลงแผน", "วันที่ดำเนินการ"];
                    const headerKeys2 = Object.keys(summaryRows[0] || {});
                    const dateColIdx2 = dateHeaders
                        .map((h) => headerKeys2.indexOf(h))
                        .filter((i) => i >= 0);
                    const range2 = XLSX.utils.decode_range(ws2["!ref"] || "A1");
                    for (let R = range2.s.r + 1; R <= range2.e.r; R++) {
                        for (const C of dateColIdx2) {
                            const cell = ws2[XLSX.utils.encode_cell({ r: R, c: C })];
                            if (cell && cell.v instanceof Date) {
                                cell.t = "d";
                                cell.z = "dd/mm/yyyy";
                            }
                        }
                    }
                    ws2["!cols"] = headerKeys2.map(() => ({ wch: 18 }));

                    XLSX.utils.book_append_sheet(wb, ws2, "สรุปผลการตรวจ");
                }
            } catch {
                // ถ้า fetch summary ล้มเหลว ยังคง export sheet 1 ได้ปกติ
            }
        }

        XLSX.writeFile(wb, `inspection_tasks_${new Date().toISOString().slice(0, 10)}.xlsx`, { cellDates: true });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 lg:backdrop-blur-sm shadow-lg shadow-black/10 overflow-hidden relative">
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
                        disabled={isExporting}
                        className="bg-gradient-to-r from-emerald-500/30 to-teal-600/30 border border-teal-400/40 hover:from-emerald-500/50 hover:to-teal-600/50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md shadow-teal-500/10 backdrop-blur-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isExporting
                            ? <Loader2 size={20} className="animate-spin" />
                            : <FileSpreadsheet size={20} />}
                        <span className="hidden sm:inline">{isExporting ? "กำลังโหลด..." : "Excel"}</span>
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
                                                className="bg-gradient-to-r from-teal-500/30 to-emerald-600/30 border border-teal-400/40 cursor-pointer hover:from-teal-500/50 hover:to-emerald-600/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md shadow-teal-500/10 flex items-center"
                                            >
                                                <Eye size={18} className="mr-1" />
                                                เปิด
                                            </button>
                                            <button
                                                className="bg-rose-500/20 border border-rose-400/40 cursor-pointer hover:bg-rose-500/35 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center"
                                                onClick={onDeleteTask ? (e) => { e.stopPropagation(); onDeleteTask(task.inspection_task_id); } : undefined}
                                            >
                                                <Trash2 size={18} className="mr-1" />
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
                            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.04] to-transparent shadow-md shadow-black/20 hover:border-teal-400/40 hover:shadow-teal-500/10 active:scale-[0.99] transition-all duration-200 cursor-pointer"
                        >
                            {/* Decorative blur (desktop only) */}
                            <div className="hidden lg:block pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br from-teal-500/15 to-emerald-600/10 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

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
                                    className="flex items-center gap-1 bg-rose-500/15 border border-rose-400/30 hover:bg-rose-500/30 active:scale-[0.97] text-rose-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                >
                                    <Trash2 size={16} />
                                    ลบ
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewTask?.(task.inspection_task_id); }}
                                    className="flex items-center gap-1 bg-gradient-to-r from-teal-500/30 to-emerald-600/30 border border-teal-400/40 hover:from-teal-500/50 hover:to-emerald-600/50 active:scale-[0.97] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md shadow-teal-500/10 cursor-pointer"
                                >
                                    <Eye size={16} />
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
