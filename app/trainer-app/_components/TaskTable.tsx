"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    FileSpreadsheet,
    Search,
    X,
    ChevronLeft,
    ChevronRight,
    Inbox,
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    Eye,
    Trash2,
    SlidersHorizontal,
    CalendarDays,
    Building2,
    User,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import type { Task, TaskStatus } from "../type";

// ─── Status Config ─────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; bg: string; text: string; ring: string; icon: React.ReactNode }> = {
    Open: { label: "เปิดงาน", bg: "bg-cyan-500/10", text: "text-cyan-700", ring: "ring-cyan-500/20", icon: <Eye size={11} /> },
    Pending: { label: "รอดำเนินการ", bg: "bg-amber-500/10", text: "text-amber-700", ring: "ring-amber-500/20", icon: <Clock size={11} /> },
    Cancel: { label: "ยกเลิก", bg: "bg-rose-500/10", text: "text-rose-600", ring: "ring-rose-500/20", icon: <XCircle size={11} /> },
    Abesnt: { label: "ขาด", bg: "bg-stone-500/10", text: "text-stone-500", ring: "ring-stone-500/20", icon: <AlertTriangle size={11} /> },
    "Inspection Done": { label: "เสร็จสิ้น", bg: "bg-emerald-500/10", text: "text-emerald-700", ring: "ring-emerald-500/20", icon: <CheckCircle2 size={11} /> },
};

function StatusPill({ status }: { status: string | null }) {
    const cfg = STATUS_CFG[status ?? ""] ?? STATUS_CFG["Pending"];
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
            {cfg.icon}
            {cfg.label}
        </span>
    );
}

type SortField = "plan_date" | "client_name" | "plant_code" | "trainer_id" | "inspection_task_status" | "inspection_task_id";
type SortDir = "asc" | "desc";
type TabKey = "pending" | "completed";

const ROWS_PER_PAGE = 10;

interface TaskTableProps {
    tasks: Task[];
    onViewTask?: (taskId: string) => void;
}

export function TaskTable({ tasks, onViewTask }: TaskTableProps) {
    const [tab, setTab] = useState<TabKey>("pending");
    const [search, setSearch] = useState("");
    const [sortField, setSortField] = useState<SortField>("plan_date");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
    const [showFilter, setShowFilter] = useState(false);
    const [page, setPage] = useState(1);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ─── Derived data ───────────────────────────────────────
    const pendingStatuses: (TaskStatus | null)[] = ["Open", "Pending"];
    const completedStatuses: (TaskStatus | null)[] = ["Inspection Done", "Cancel", "Abesnt"];

    const tabTasks = useMemo(() => {
        return tasks.filter((t) => {
            const s = t.inspection_task_status;
            if (tab === "pending") return pendingStatuses.includes(s) || s === null;
            return completedStatuses.includes(s);
        });
    }, [tasks, tab]);

    const filteredTasks = useMemo(() => {
        let result = tabTasks;
        if (filterStatus !== "all") {
            result = result.filter((t) => t.inspection_task_status === filterStatus);
        }
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
        result = [...result].sort((a, b) => {
            const aVal = (a[sortField] ?? "") as string;
            const bVal = (b[sortField] ?? "") as string;
            const cmp = aVal.localeCompare(bVal, "th");
            return sortDir === "asc" ? cmp : -cmp;
        });
        return result;
    }, [tabTasks, filterStatus, search, sortField, sortDir]);

    // ─── Pagination ─────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filteredTasks.length / ROWS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const paginated = filteredTasks.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

    const changeTab = (t: TabKey) => { setTab(t); setPage(1); setFilterStatus("all"); setSearch(""); };
    const changeFilter = (s: TaskStatus | "all") => { setFilterStatus(s); setPage(1); };

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortField(field); setSortDir("asc"); }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown size={12} className="text-stone-300" />;
        return sortDir === "asc"
            ? <ArrowUp size={12} className="text-emerald-600" />
            : <ArrowDown size={12} className="text-emerald-600" />;
    };

    // ─── Excel export ───────────────────────────────────────
    const exportExcel = () => {
        const rows = filteredTasks.map((t) => ({
            "Task ID": t.inspection_task_id,
            "Trainer": t.trainer_id,
            "ลูกค้า": t.client_name,
            "Plant": t.plant_code,
            "ลงแผน": t.plan_date,
            "วันดำเนินการ": t.action_date ?? "-",
            "สถานะ": STATUS_CFG[t.inspection_task_status ?? ""]?.label ?? t.inspection_task_status ?? "-",
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, tab === "pending" ? "รอดำเนินการ" : "เสร็จสิ้น");
        XLSX.writeFile(wb, `inspection_tasks_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const statusOptions: TaskStatus[] = tab === "pending" ? ["Open", "Pending"] : ["Inspection Done", "Cancel", "Abesnt"];
    const pendingCount = tasks.filter((t) => pendingStatuses.includes(t.inspection_task_status) || t.inspection_task_status === null).length;
    const completedCount = tasks.filter((t) => completedStatuses.includes(t.inspection_task_status)).length;

    const columns: { field: SortField; label: string }[] = [
        { field: "inspection_task_id", label: "Task ID" },
        { field: "plan_date", label: "ลงแผน" },
        { field: "plant_code", label: "Plant" },
        { field: "client_name", label: "ลูกค้า" },
        { field: "trainer_id", label: "Trainer" },
        { field: "inspection_task_status", label: "สถานะ" },
    ];

    return (
        <div className="w-full space-y-5">


            {/* ── Toolbar ──────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {/* ── Tabs ─────────────────────────────────────── */}
                <div className="inline-flex items-center gap-1 rounded-xl bg-stone-100 p-1">
                    <button
                        onClick={() => changeTab("pending")}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200
                        ${tab === "pending"
                                ? "bg-white text-amber-700"
                                : "text-stone-400 hover:text-stone-600"}`}
                    >
                        <Clock size={14} />
                        รอดำเนินการ
                        <span className={`ml-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums
                        ${tab === "pending" ? "bg-amber-100 text-amber-700" : "bg-stone-200/60 text-stone-400"}`}>
                            {pendingCount}
                        </span>
                    </button>
                    <button
                        onClick={() => changeTab("completed")}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200
                        ${tab === "completed"
                                ? "bg-white text-emerald-700"
                                : "text-stone-400 hover:text-stone-600"}`}
                    >
                        <CheckCircle2 size={14} />
                        เสร็จสิ้น
                        <span className={`ml-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums
                        ${tab === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-stone-200/60 text-stone-400"}`}>
                            {completedCount}
                        </span>
                    </button>
                </div>
                {/* Search */}
                <div className="relative w-full sm:w-80">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        type="text"
                        placeholder="ค้นหา ลูกค้า, plant, trainer..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full rounded-xl border border-stone-200 bg-white/80 py-2.5 pl-10 pr-9 text-sm text-stone-700 placeholder:text-stone-350 focus:border-pink-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 backdrop-blur-sm transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Actions */}
                <div className="hidden sm:flex items-center gap-2">
                    {/* Filter */}
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setShowFilter(!showFilter)}
                            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all
                                ${filterStatus !== "all"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : "border-stone-200 bg-white/80 text-stone-500 hover:border-stone-300 hover:text-stone-700 backdrop-blur-sm"}`}
                        >
                            <SlidersHorizontal size={14} />
                            <span className="hidden sm:inline">กรองสถานะ</span>
                            {filterStatus !== "all" && (
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">1</span>
                            )}
                        </button>
                        {showFilter && (
                            <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl border border-stone-200 bg-white p-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">สถานะ</p>
                                <button
                                    onClick={() => { changeFilter("all"); setShowFilter(false); }}
                                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-all
                                        ${filterStatus === "all" ? "bg-stone-100 font-semibold text-stone-800" : "text-stone-500 hover:bg-stone-50"}`}
                                >
                                    ทั้งหมด
                                </button>
                                {statusOptions.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => { changeFilter(s); setShowFilter(false); }}
                                        className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-all flex items-center gap-2
                                            ${filterStatus === s ? "bg-stone-100 font-semibold text-stone-800" : "text-stone-500 hover:bg-stone-50"}`}
                                    >
                                        <StatusPill status={s} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Excel */}
                    <button
                        onClick={exportExcel}
                        className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white/80 px-3.5 py-2.5 text-sm font-medium text-stone-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 backdrop-blur-sm transition-all"
                    >
                        <FileSpreadsheet size={14} />
                        <span className="hidden sm:inline">Excel</span>
                    </button>
                </div>
            </div>

            {/* ── Table (desktop) ──────────────────────────── */}
            <div className="hidden md:block p-5 rounded-2xl border border-stone-200/80 bg-white overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-pink-200 bg-stone-50/60 hover:bg-stone-50/60">
                            {columns.map(({ field, label }) => (
                                <TableHead
                                    key={field}
                                    onClick={() => toggleSort(field)}
                                    className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-stone-600 select-none transition-colors px-5 h-11"
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        {label}
                                        <SortIcon field={field} />
                                    </span>
                                </TableHead>
                            ))}
                            <TableHead className="w-24 px-5" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={7} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3 text-stone-300">
                                        <div className="rounded-2xl bg-stone-100 p-4">
                                            <Inbox size={28} strokeWidth={1.5} />
                                        </div>
                                        <p className="text-sm font-medium text-stone-400">ไม่พบรายการ</p>
                                        <p className="text-xs text-stone-300">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((task) => (
                                <TableRow
                                    key={task.inspection_task_id}
                                    className="group border-b border-stone-50 transition-colors hover:bg-red-200/10 cursor-pointer"
                                >
                                    <TableCell className="px-5 py-3.5">
                                        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-stone-400">
                                            {task.inspection_task_id?.slice(-8)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5">
                                        <span className="inline-flex items-center gap-1.5 text-sm text-stone-600 tabular-nums">
                                            <CalendarDays size={12} className="text-stone-300" />
                                            {task.plan_date}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5">
                                        <span className="inline-flex items-center gap-1.5 text-sm text-stone-500">
                                            <Building2 size={12} className="text-stone-300" />
                                            {task.plant_code}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5">
                                        <span className="font-medium text-sm text-stone-800">{task.client_name}</span>
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5">
                                        <span className="inline-flex items-center gap-1.5 text-sm text-stone-500">
                                            <User size={12} className="text-stone-300" />
                                            {task.trainer_id}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5">
                                        <StatusPill status={task.inspection_task_status} />
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5">
                                        <div className="flex gap-0.5">
                                            {onViewTask && (
                                                <button
                                                    onClick={() => onViewTask(task.inspection_task_id)}
                                                    className="rounded-lg p-2 text-stone-400 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                                                    title="ดูรายละเอียด"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                            )}
                                            <button
                                                className="rounded-lg p-2 text-stone-400 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                                                title="ลบ"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Cards (mobile) ───────────────────────────── */}
            <div className="md:hidden space-y-3">
                {paginated.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-20 text-stone-300">
                        <div className="rounded-2xl bg-stone-100 p-4">
                            <Inbox size={28} strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-medium text-stone-400">ไม่พบรายการ</p>
                    </div>
                ) : (
                    paginated.map((task) => (
                        <div
                            key={task.inspection_task_id}
                            onClick={() => onViewTask?.(task.inspection_task_id)}
                            className="group cursor-pointer rounded-2xl border border-stone-200/70 bg-white p-4 transition-all duration-200 hover:border-emerald-200 active:scale-[0.99]"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-stone-800 truncate">{task.client_name}</p>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-stone-400">
                                        <span className="inline-flex items-center gap-1">
                                            <Building2 size={10} />
                                            {task.plant_code}
                                        </span>
                                        <span className="text-stone-200">|</span>
                                        <span className="inline-flex items-center gap-1">
                                            <User size={10} />
                                            {task.trainer_id}
                                        </span>
                                    </div>
                                </div>
                                <StatusPill status={task.inspection_task_status} />
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
                                <div className="flex items-center gap-3 text-xs text-stone-400">
                                    <span className="inline-flex items-center gap-1 tabular-nums">
                                        <CalendarDays size={11} />
                                        {task.plan_date}
                                    </span>
                                    {task.action_date && (
                                        <span className="inline-flex items-center gap-1 text-emerald-600">
                                            <CheckCircle2 size={11} />
                                            {task.action_date}
                                        </span>
                                    )}
                                </div>
                                <span className="font-mono text-[10px] text-stone-300 bg-stone-100 rounded-md px-2 py-0.5">
                                    {task.inspection_task_id?.slice(-6)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ── Pagination ───────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-stone-400 tabular-nums">
                        แสดง <span className="font-semibold text-stone-600">{(safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, filteredTasks.length)}</span> จาก {filteredTasks.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={safePage <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="rounded-xl border border-stone-200 p-2 text-stone-400 hover:bg-stone-50 hover:text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                            .map((p, idx, arr) => (
                                <span key={p}>
                                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                                        <span className="px-1 text-stone-300">...</span>
                                    )}
                                    <button
                                        onClick={() => setPage(p)}
                                        className={`min-w-[34px] rounded-xl border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-all
                                            ${p === safePage
                                                ? "border-emerald-300 bg-emerald-600 text-white"
                                                : "border-stone-200 text-stone-400 hover:bg-stone-50 hover:text-stone-600"}`}
                                    >
                                        {p}
                                    </button>
                                </span>
                            ))}
                        <button
                            disabled={safePage >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="rounded-xl border border-stone-200 p-2 text-stone-400 hover:bg-stone-50 hover:text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
