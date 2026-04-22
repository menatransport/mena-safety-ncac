'use client';

// =============================================================================
// Component: CalendarTask
// -----------------------------------------------------------------------------
// ปฏิทินรายเดือนสำหรับดู / เพิ่ม / ย้าย / ลบ inspection task
//   • Drag & drop ย้ายงานข้ามวัน (desktop)
//   • Swipe ซ้าย/ขวา เปลี่ยนเดือน (mobile)
//   • Bottom-sheet dialog สำหรับ view / add / day-list
//   • ปิดปุ่มเพิ่มงานเมื่อ lockRole = true
// =============================================================================

import { useState, useMemo, useCallback, DragEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Clock, MapPin, User, CalendarDays, Eye } from "lucide-react";
import type { Task, TaskStatus, Users, DialogMode } from "../type";
import {
    TASK_STATUS_CONFIG,
    CALENDAR_WEEKDAYS_TH,
    CALENDAR_MONTHS_TH,
    CALENDAR_MONTHS_TH_SHORT,
    CALENDAR_MAX_VISIBLE_DESKTOP,
} from "../constant";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DateTimePicker24h } from "@/components/ui/datetime-picker";

/* -------------------------------------------------------------------------- */
/*  Local helpers                                                             */
/* -------------------------------------------------------------------------- */
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function fmtDate(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function isTodayDate(y: number, m: number, d: number) {
    const t = new Date();
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
}
function getColors(status: string | null) {
    return TASK_STATUS_CONFIG[status ?? "open"] ?? TASK_STATUS_CONFIG.open;
}

// Glass-dark variants สำหรับ chip/dot บน dark background
const GLASS_STATUS: Record<string, { bg: string; text: string; border: string; dot: string; glow: string }> = {
    open: { bg: "bg-blue-500/20", text: "text-blue-200", border: "border-blue-400/30", dot: "bg-blue-400", glow: "shadow-blue-500/25" },
    pending: { bg: "bg-amber-500/20", text: "text-amber-200", border: "border-amber-400/30", dot: "bg-amber-400", glow: "shadow-amber-500/25" },
    completed: { bg: "bg-emerald-500/20", text: "text-emerald-200", border: "border-emerald-400/30", dot: "bg-emerald-400", glow: "shadow-emerald-500/25" },
};
function getGlass(status: string | null) {
    return GLASS_STATUS[status ?? "open"] ?? GLASS_STATUS.open;
}
function fmtDisplayDate(dateStr: string | null) {
    if (!dateStr) return "—";
    const d = dateStr.slice(0, 10);
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
}

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */
interface CalendarProps {
    tasks: Task[];
    createform?: { clients: string[]; trainer: Users[]; locations: { client_name: string; plant_code: string; plant_name: string }[] };
    lockRole?: boolean;
    myUserId?: string;
    onMoveTask?: (taskId: string, newDate: string) => void;
    onAddTask?: (task: Partial<Task>) => void;
    onDeleteTask?: (taskId: string) => void;
    onViewTask?: (taskId: string) => void;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function CalendarTask({ tasks, createform, lockRole, myUserId, onMoveTask, onAddTask, onDeleteTask, onViewTask }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);

    // Dialog state
    const [dialogMode, setDialogMode] = useState<DialogMode>("closed");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [newTask, setNewTask] = useState<Partial<Task>>({});

    /* ── Available years from tasks ── */
    const availableYears = useMemo(() => {
        const thisYear = new Date().getFullYear();
        const years = new Set<number>([thisYear]);
        for (const t of tasks) {
            const raw = t.action_date ?? t.plan_date;
            if (!raw) continue;
            const y = parseInt(raw.slice(0, 4), 10);
            if (!isNaN(y)) years.add(y);
        }
        return Array.from(years).sort((a, b) => a - b);
    }, [tasks]);

    /* ── Group tasks by date ── */
    const tasksByDate = useMemo(() => {
        const map: Record<string, Task[]> = {};
        for (const t of tasks) {
            const raw = t.action_date ?? t.plan_date;
            if (!raw) continue;
            const date = raw.slice(0, 10);
            (map[date] ??= []).push(t);
        }
        return map;
    }, [tasks]);

    /* ── Build calendar grid ── */
    const calendarDays = useMemo(() => {
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
        const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
        const days: { day: number; inMonth: boolean; date: string }[] = [];

        const prevDays = getDaysInMonth(currentYear, currentMonth - 1);
        for (let i = firstDay - 1; i >= 0; i--) {
            const d = prevDays - i;
            const m = currentMonth === 0 ? 11 : currentMonth - 1;
            const y = currentMonth === 0 ? currentYear - 1 : currentYear;
            days.push({ day: d, inMonth: false, date: fmtDate(y, m, d) });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            days.push({ day: d, inMonth: true, date: fmtDate(currentYear, currentMonth, d) });
        }
        const remaining = totalCells - days.length;
        for (let d = 1; d <= remaining; d++) {
            const m = currentMonth === 11 ? 0 : currentMonth + 1;
            const y = currentMonth === 11 ? currentYear + 1 : currentYear;
            days.push({ day: d, inMonth: false, date: fmtDate(y, m, d) });
        }
        return days;
    }, [currentYear, currentMonth]);

    /* ── Navigation ── */
    const goToday = useCallback(() => { const t = new Date(); setCurrentMonth(t.getMonth()); setCurrentYear(t.getFullYear()); }, []);
    const goPrev = useCallback(() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); }, [currentMonth]);
    const goNext = useCallback(() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); }, [currentMonth]);

    /* ── Drag & Drop (desktop) ── */
    const handleDragStart = (e: DragEvent, taskId: string) => {
        e.dataTransfer.setData("text/plain", taskId);
        e.dataTransfer.effectAllowed = "move";
        setDraggedTaskId(taskId);
    };
    const handleDragOver = (e: DragEvent, date: string) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setHoveredDate(date); };
    const handleDragLeave = () => setHoveredDate(null);
    const handleDrop = (e: DragEvent, date: string) => {
        e.preventDefault();
        setHoveredDate(null);
        const taskId = e.dataTransfer.getData("text/plain");
        if (taskId) onMoveTask?.(taskId, date);
        setDraggedTaskId(null);
    };
    const handleDragEnd = () => { setDraggedTaskId(null); setHoveredDate(null); };

    /* ── Dialog helpers ── */
    const openAdd = useCallback((date: string) => {
        setNewTask({
            plan_date: date,
            inspection_task_status: "open" as TaskStatus,
            ...(lockRole && myUserId ? { trainer_id: myUserId } : {}),
        });
        setDialogMode("add");
    }, [lockRole, myUserId]);
    const openView = useCallback((e: React.MouseEvent, task: Task) => {
        e.stopPropagation();
        setSelectedTask(task);
        setDialogMode("view");
    }, []);
    const openDayList = useCallback((date: string) => {
        setSelectedDate(date);
        setDialogMode("day-list");
    }, []);
    const closeDialog = useCallback(() => {
        setDialogMode("closed");
        setSelectedTask(null);
        setSelectedDate(null);
        setNewTask({});
    }, []);

    const handleAddSubmit = () => {
        if (newTask.plan_date && newTask.trainer_id && newTask.client_name) {
            onAddTask?.(newTask);
        }
        closeDialog();
    };

    const handleDelete = (taskId: string) => {
        onDeleteTask?.(taskId);
        closeDialog();
    };

    /* ── Swipe support for mobile ── */
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX === null) return;
        const diff = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(diff) > 60) { diff > 0 ? goPrev() : goNext(); }
        setTouchStartX(null);
    };

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-lg shadow-black/10 overflow-hidden">
            {/* ━━━ Header ━━━ */}
            <div className="px-4 py-4 sm:px-5 sm:py-4 bg-gradient-to-r from-slate-900/60 via-slate-800/40 to-teal-900/30 border-b border-white/10 flex flex-col gap-3">
                {/* Title */}
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/30 rounded-xl">
                        <CalendarDays size={22} className="text-teal-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                            ปฏิทินงาน
                        </h2>
                        <p className="text-xs text-white/50 mt-0.5">ตรวจดูตารางงานตาม วันที่/เดือน/ปี</p>
                    </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Nav arrows + Month/Year selects */}
                    <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={goPrev}
                                className="p-2.5 sm:p-2 rounded-xl hover:bg-white/15 active:bg-white/25 text-white transition-colors"
                                aria-label="เดือนก่อนหน้า"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={goNext}
                                className="p-2.5 sm:p-2 rounded-xl hover:bg-white/15 active:bg-white/25 text-white transition-colors"
                                aria-label="เดือนถัดไป"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={currentMonth}
                                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                                className="bg-white/15 text-white text-sm sm:text-base font-semibold rounded-xl h-10 px-3 border border-white/20 outline-none cursor-pointer hover:bg-white/25 active:bg-white/30 transition-colors"
                            >
                                {CALENDAR_MONTHS_TH.map((m, i) => (
                                    <option key={i} value={i} className="text-slate-900 bg-white">{m}</option>
                                ))}
                            </select>
                            <select
                                value={currentYear}
                                onChange={(e) => setCurrentYear(Number(e.target.value))}
                                className="bg-white/15 text-white text-sm sm:text-base font-semibold rounded-xl h-10 px-3 border border-white/20 outline-none cursor-pointer hover:bg-white/25 active:bg-white/30 transition-colors"
                            >
                                {availableYears.map((y) => (
                                    <option key={y} value={y} className="text-slate-900 bg-white">{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            onClick={goToday}
                            className="h-10 px-4 text-sm cursor-pointer font-medium text-white bg-white/15 border border-white/20 rounded-xl hover:bg-white/25 active:bg-white/30 transition-colors flex items-center gap-1.5"
                        >
                            <CalendarDays size={15} />
                            <span>วันนี้</span>
                        </button>
                        <button
                            title="เพิ่มแผนได้เฉพาะหัวหน้า/ผู้จัดการ"
                            onClick={() => openAdd(fmtDate(currentYear, currentMonth, new Date().getDate()))}
                            className="h-10 px-4 cursor-pointer text-sm font-medium bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 active:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:cursor-not-allowed disabled:bg-emerald-500/10 disabled:text-white/70 disabled:hover:bg-emerald-500/30"
                        >
                            <Plus size={16} />
                            <span className="hidden sm:inline">เพิ่มงาน</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ━━━ Weekday header ━━━ */}
            <div className="grid grid-cols-7 bg-white/[0.03] border-b border-white/10">
                {CALENDAR_WEEKDAYS_TH.map((day, i) => (
                    <div
                        key={day}
                        className={`py-2.5 sm:py-2 text-center text-xs font-semibold tracking-wide
                            ${i === 0 ? "text-rose-300" : i === 6 ? "text-teal-300" : "text-white/60"}`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* ━━━ Calendar grid ━━━ */}
            <div
                className="grid grid-cols-7"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {calendarDays.map(({ day, inMonth, date }, idx) => {
                    const dayTasks = tasksByDate[date] || [];
                    const isDropTarget = hoveredDate === date;
                    const today = inMonth && isTodayDate(currentYear, currentMonth, day);
                    const isSun = idx % 7 === 0;
                    const isSat = idx % 7 === 6;
                    const hasTasks = dayTasks.length > 0;

                    return (
                        <div
                            key={`${date}-${idx}`}
                            onClick={() => {
                                if (!inMonth) return;
                                if (hasTasks) openDayList(date);
                                else openAdd(date);
                            }}
                            onDragOver={(e) => handleDragOver(e, date)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, date)}
                            className={`
                                relative min-h-[56px] sm:min-h-[110px] border-b border-r border-white/5 p-1 sm:p-1.5
                                cursor-pointer transition-all duration-150 touch-manipulation
                                ${!inMonth ? "bg-white/[0.01]" : "bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08]"}
                                ${isDropTarget ? "!bg-teal-500/15 ring-2 ring-inset ring-teal-400/60" : ""}
                                ${idx % 7 === 0 ? "border-l-0" : ""}
                            `}
                        >
                            {/* Date number */}
                            <div className="flex justify-center sm:justify-start mb-0 sm:mb-0.5">
                                <span className={`
                                    inline-flex items-center justify-center w-7 h-7 sm:w-7 sm:h-7 rounded-full text-xs sm:text-sm font-medium transition-colors
                                    ${today ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/30" : ""}
                                    ${!today && !inMonth ? "text-white/25" : ""}
                                    ${!today && inMonth && isSun ? "text-rose-300" : ""}
                                    ${!today && inMonth && isSat ? "text-teal-300" : ""}
                                    ${!today && inMonth && !isSun && !isSat ? "text-white/80" : ""}
                                `}>
                                    {day}
                                </span>
                            </div>

                            {/* Mobile: task dots */}
                            {hasTasks && inMonth && (
                                <div className="flex justify-center items-center gap-1 sm:hidden mt-1">
                                    {dayTasks.slice(0, 3).map((task) => {
                                        const g = getGlass(task.inspection_task_status);
                                        return (
                                            <span
                                                key={task.inspection_task_id}
                                                className={`w-2 h-2 rounded-full ${g.dot} shadow-sm`}
                                            />
                                        );
                                    })}
                                    {dayTasks.length > 3 && (
                                        <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-white/15 text-[9px] text-white/70 font-bold leading-none">
                                            +{dayTasks.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Desktop: task chips */}
                            <div className="hidden sm:block space-y-[3px] mt-0.5">
                                {dayTasks.slice(0, CALENDAR_MAX_VISIBLE_DESKTOP).map((task) => {
                                    const g = getGlass(task.inspection_task_status);
                                    return (
                                        <div
                                            key={task.inspection_task_id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.inspection_task_id)}
                                            onDragEnd={handleDragEnd}
                                            onClick={(e) => openView(e, task)}
                                            className={`
                                                group flex items-center gap-1.5 px-2 py-[3px] rounded-lg text-[11px] font-medium
                                                cursor-grab active:cursor-grabbing
                                                ${g.bg} ${g.text} border ${g.border}
                                                shadow-sm ${g.glow}
                                                hover:brightness-110 hover:shadow-md active:scale-[0.97]
                                                transition-all duration-150 backdrop-blur-sm
                                                ${draggedTaskId === task.inspection_task_id ? "opacity-25 scale-95" : ""}
                                            `}
                                            title={`${task.inspection_task_id} — ${task.client_name}${task.plant_name ? ` · ${task.plant_name}` : ""}`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${g.dot} flex-shrink-0 shadow-sm`} />
                                            <span className="truncate leading-tight">{task.client_name || task.inspection_task_id}</span>
                                        </div>
                                    );
                                })}
                                {dayTasks.length > CALENDAR_MAX_VISIBLE_DESKTOP && (
                                    <div className="flex items-center gap-1 pl-0.5">
                                        <span className="inline-flex items-center justify-center min-w-[20px] h-4 px-1.5 rounded-full bg-white/10 border border-white/15 text-[10px] text-white/60 font-semibold">
                                            +{dayTasks.length - CALENDAR_MAX_VISIBLE_DESKTOP}
                                        </span>
                                        <span className="text-[10px] text-white/40">เพิ่มเติม</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ━━━ Legend ━━━ */}
            <div className="px-3 py-2.5 sm:px-5 bg-white/[0.03] border-t border-white/10 flex flex-wrap justify-center sm:justify-start gap-3 sm:gap-5">
                {Object.entries(TASK_STATUS_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1.5 text-[11px] sm:text-xs text-white/60">
                        <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                    </div>
                ))}
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                 Dialog / Bottom Sheet
               ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {dialogMode !== "closed" && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={closeDialog}
                >
                    <div
                        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden
                                   animate-in slide-in-from-bottom-4 sm:fade-in sm:zoom-in-95 duration-200 max-h-[90dvh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag handle (mobile) */}
                        <div className="flex justify-center pt-2 pb-1 sm:hidden">
                            <div className="w-10 h-1 rounded-full bg-slate-300" />
                        </div>

                        {/* ── Day List (mobile tap on date with tasks) ── */}
                        {dialogMode === "day-list" && selectedDate && (() => {
                            const dayTasks = tasksByDate[selectedDate] || [];
                            const [, m, d] = selectedDate.split("-");
                            const monthIdx = parseInt(m, 10) - 1;
                            return (
                                <>
                                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-base font-semibold text-slate-900">
                                                {parseInt(d, 10)} {CALENDAR_MONTHS_TH_SHORT[monthIdx]} {selectedDate.slice(0, 4)}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5">{dayTasks.length} งาน</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); closeDialog(); openAdd(selectedDate); }}
                                                className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:bg-emerald-200 transition-colors"
                                                aria-label="เพิ่มงาน"
                                            >
                                                <Plus size={18} />
                                            </button>
                                            <button onClick={closeDialog} className="p-2.5 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-slate-400 transition-colors" aria-label="ปิด">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {dayTasks.map((task) => {
                                            const c = getColors(task.inspection_task_status);
                                            return (
                                                <button
                                                    key={task.inspection_task_id}
                                                    onClick={() => { setSelectedTask(task); setDialogMode("view"); }}
                                                    className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
                                                >
                                                    <span className={`w-3 h-3 rounded-full ${c.dot} flex-shrink-0`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{task.client_name || task.inspection_task_id}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{task.trainer_id} · {task.plant_name || task.plant_code}</p>
                                                    </div>
                                                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text} border ${c.border}`}>
                                                        {TASK_STATUS_CONFIG[task.inspection_task_status ?? "open"]?.label ?? task.inspection_task_status}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {dayTasks.length === 0 && (
                                        <div className="px-5 py-10 text-center text-slate-400 text-sm">ไม่มีงานในวันนี้</div>
                                    )}
                                </>
                            );
                        })()}

                        {/* ── View Task ── */}
                        {dialogMode === "view" && selectedTask && (() => {
                            const c = getColors(selectedTask.inspection_task_status);
                            return (
                                <>
                                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-base font-semibold text-slate-900">รายละเอียดงาน</h3>
                                        <button onClick={closeDialog} className="p-2.5 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-slate-400 transition-colors" aria-label="ปิด">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        {/* ID + Status */}
                                        <div className="flex items-center gap-3">
                                            <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                                            <span className="text-sm font-semibold text-slate-900 truncate">{selectedTask.inspection_task_id}</span>
                                            <span className={`ml-auto flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
                                                {TASK_STATUS_CONFIG[selectedTask.inspection_task_status ?? "open"]?.label ?? selectedTask.inspection_task_status}
                                            </span>
                                        </div>
                                        {/* Detail grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                                <Clock size={16} className="text-slate-400 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-slate-400 font-medium">วันที่ลงแผน</p>
                                                    <p className="text-sm text-slate-900 font-medium">{fmtDisplayDate(selectedTask.plan_date)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                                <Clock size={16} className="text-slate-400 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-slate-400 font-medium">วันที่ดำเนินการ</p>
                                                    <p className="text-sm text-slate-900 font-medium">{fmtDisplayDate(selectedTask.action_date)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                                <User size={16} className="text-slate-400 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-slate-400 font-medium">เทรนเนอร์</p>
                                                    <p className="text-sm text-slate-900 font-medium">{selectedTask.trainer_id || "—"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                                <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-slate-400 font-medium">แพล้นท์</p>
                                                    <p className="text-sm text-slate-900 font-medium">{selectedTask.plant_name || selectedTask.plant_code || "—"}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                            <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[11px] text-slate-400 font-medium">ลูกค้า</p>
                                                <p className="text-sm text-slate-900 font-medium">{selectedTask.client_name || "—"}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Footer */}
                                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between gap-2">
                                        <button
                                            // disabled={lockRole}
                                            // title="ลบได้เฉพาะหัวหน้า/ผู้จัดการ"
                                            onClick={() => handleDelete(selectedTask.inspection_task_id)}
                                            className="h-11 px-4 text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors flex items-center gap-1.5 disabled:cursor-not-allowed disabled:bg-red-500/10 disabled:text-red-500/70 disabled:hover:bg-red-500/30"
                                        >
                                            <Trash2 size={15} /> ลบ
                                        </button>
                                        <div className="flex gap-2">
                                            <button onClick={closeDialog} className="h-11 px-4 text-sm font-medium text-slate-500 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors">ปิด</button>
                                            {onViewTask && (
                                                <button
                                                    onClick={() => { closeDialog(); onViewTask(selectedTask.inspection_task_id); }}
                                                    className="h-11 px-4 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm flex items-center gap-1.5"
                                                >
                                                    <Eye size={15} /> ดูรายละเอียด
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            );
                        })()}

                        {/* ── Add Task ── */}
                        {dialogMode === "add" && (
                            <>
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-slate-900">เพิ่มงานใหม่</h3>
                                    <button onClick={closeDialog} className="p-2.5 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-slate-400 transition-colors" aria-label="ปิด">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่ลงแผน</label>
                                        <DateTimePicker24h
                                            value={newTask.plan_date ? new Date(newTask.plan_date) : undefined}
                                            usedFor="date"
                                            onChange={(date) => {
                                                if (date) {
                                                    const yyyy = date.getFullYear();
                                                    const mm = String(date.getMonth() + 1).padStart(2, "0");
                                                    const dd = String(date.getDate()).padStart(2, "0");
                                                    setNewTask(p => ({ ...p, plan_date: `${yyyy}-${mm}-${dd}` }));
                                                } else {
                                                    setNewTask(p => ({ ...p, plan_date: undefined }));
                                                }
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">เทรนเนอร์</label>
                                        <SearchableSelect
                                            options={(createform?.trainer ?? [])
                                                .filter(u => u.position === "Safety Trainer")
                                                .map(u => ({
                                                    value: u.employee_id,
                                                    label: `${u.firstname} ${u.lastname}`,
                                                }))}
                                            value={newTask.trainer_id || ""}
                                            onChange={(val) => {
                                                if (lockRole) return;
                                                setNewTask(p => ({ ...p, trainer_id: String(val) }));
                                            }}
                                            placeholder="เลือกเทรนเนอร์"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">ลูกค้า</label>
                                        <SearchableSelect
                                            options={(createform?.clients ?? []).map(c => ({
                                                value: c,
                                                label: c,
                                            }))}
                                            value={newTask.client_name || ""}
                                            onChange={(val) => setNewTask(p => ({ ...p, client_name: String(val), plant_code: undefined, plant_name: undefined }))}
                                            placeholder="เลือกลูกค้า"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">แพล้นท์</label>
                                        <SearchableSelect
                                            options={(createform?.locations ?? []).filter(loc => !newTask.client_name || loc.client_name === newTask.client_name).map(loc => ({
                                                value: loc.plant_code,
                                                label: `${loc.plant_code} - ${loc.plant_name}`,
                                            }))}
                                            value={newTask.plant_code || ""}
                                            onChange={(val) => {
                                                const selected = createform?.locations?.find(l => l.plant_code === String(val));
                                                setNewTask(p => ({ ...p, plant_code: String(val), plant_name: selected?.plant_name || "" }));
                                            }}
                                            placeholder="เลือกแพล้นท์"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">สถานะ</label>
                                        <SearchableSelect
                                            options={[{value:"open", label: "เปิดงาน"}]}
                                            value={newTask.inspection_task_status || "open"}
                                            onChange={(val) => setNewTask(p => ({ ...p, inspection_task_status: String(val) as TaskStatus }))}
                                            placeholder="เลือกสถานะ"
                                        />
                                    </div>
                                </div>
                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                                    <button onClick={closeDialog} className="h-11 px-5 text-sm font-medium text-slate-500 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors">ยกเลิก</button>
                                    <button
                                        onClick={handleAddSubmit}
                                        disabled={!newTask.plan_date || !newTask.trainer_id || !newTask.client_name || !newTask.plant_code}
                                        className="h-11 px-5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        บันทึก
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}