'use client';

// =============================================================================
// Component: ListUsers
// -----------------------------------------------------------------------------
// รายชื่อ Safety Trainer พร้อมสถิติผลงานรายคน (expandable card)
//   • คำนวณอัตราสำเร็จ / จำนวนงาน / แพล้นท์ที่ดูแล
//   • RateRing = วงกลมแสดง % งานสำเร็จ
//   • ปุ่ม กรอง จะส่งชื่อเทรนเนอร์ไปยัง parent เพื่อกรอง task list
//   • ปุ่ม ดูผลงาน จะดึงข้อมูล performance จาก API แสดงเป็น card + modal navigate
// =============================================================================

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    ChevronDown,
    ClipboardList, MapPin, BarChart3, Eye,
    ExternalLink, CalendarDays, Building2, Filter, X,
    Loader2, ArrowRight, TrendingUp, Users as UsersIcon,
} from "lucide-react";
import type { Task, Users, PerformanceData } from "../type";
import { LIST_USER_STATUS } from "../constant";

/* -------------------------------------------------------------------------- */
/*  Stats helpers                                                             */
/* -------------------------------------------------------------------------- */
interface TrainerStats {
    total: number;
    done: number;
    pending: number;
    cancel: number;
    completionRate: number;
    plants: string[];
}

function getTrainerStats(tasks: Task[], displayName: string): TrainerStats {
    const tt = tasks.filter(t => t.trainer_id === displayName);
    const done = tt.filter(t => t.inspection_task_status === "completed").length;
    const pending = tt.filter(t => t.inspection_task_status === "open" || t.inspection_task_status === "pending" || t.inspection_task_status === null).length;
    const cancel = tt.filter(t => t.inspection_task_status === "cancel").length;
    const total = tt.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const plants = [...new Set(tt.map(t => t.plant_name || t.plant_code).filter(Boolean))];
    return { total, done, pending, cancel, completionRate, plants };
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */
function RateRing({ rate, size = 48 }: { rate: number; size?: number }) {
    const r = (size - 6) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (rate / 100) * c;
    const color = rate >= 80 ? "text-emerald-500" : rate >= 50 ? "text-amber-500" : "text-rose-500";
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
                    strokeWidth={4} className="text-white/10" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
                    strokeWidth={4} strokeLinecap="round" className={color}
                    strokeDasharray={c} strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 0.6s ease" }} />
            </svg>
            <span className={`absolute text-[11px] font-bold tabular-nums ${color}`}>{rate}%</span>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Driver card config                                                        */
/* -------------------------------------------------------------------------- */
function getDriverCards(d: PerformanceData) {
    return [
        {
            key: "total",
            label: "ยอดพนักงานทั้งหมด",
            sublabel: "(คน)",
            count: d.summary.total_count,
            color: "text-white",
            iconColor: "text-slate-300",
            bg: "bg-white/[0.07] border-white/10 hover:bg-white/[0.12]",
            dotColor: "bg-slate-400",
            items: [...d.open, ...d.pending, ...d.completed],
        },
        {
            key: "completed",
            label: "ยอดตรวจเสร็จ",
            sublabel: "(คน)",
            count: d.summary.completed_count,
            color: "text-emerald-400",
            iconColor: "text-emerald-400",
            bg: "bg-emerald-500/10 border-emerald-400/20 hover:bg-emerald-500/20",
            dotColor: "bg-emerald-400",
            items: d.completed,
        },
        {
            key: "remaining",
            label: "ยอดตรวจคงเหลือ",
            sublabel: "(คน)",
            count: d.summary.open_count + d.summary.pending_count,
            color: "text-amber-400",
            iconColor: "text-amber-400",
            bg: "bg-amber-500/10 border-amber-400/20 hover:bg-amber-500/20",
            dotColor: "bg-amber-400",
            items: [...d.open, ...d.pending],
        },
    ] as const;
}

type ModalState = {
    trainerName: string;
    label: string;
    color: string;
    dotColor: string;
    items: string[];
};

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */
export const ListUsers = ({
    users, tasks, selectedTrainer = "",
    onViewTask, onDeleteTask: _onDeleteTask, onSelectTrainer, lockRole,
}: {
    users: Users[];
    tasks: Task[];
    selectedTrainer?: string;
    onViewTask?: (taskId: string) => void;
    onDeleteTask?: (taskId: string) => void;
    onSelectTrainer?: (trainerDisplayName: string) => void;
    lockRole?: boolean;
}) => {
    const router = useRouter();
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [perfMap, setPerfMap] = useState<Map<string, PerformanceData>>(new Map());
    const [perfLoading, setPerfLoading] = useState<Set<number>>(new Set());
    const [modal, setModal] = useState<ModalState | null>(null);

    const statsMap = useMemo(() => {
        const map = new Map<string, TrainerStats>();
        for (const u of users) {
            const displayName = `${u.firstname} ${u.lastname}`;
            map.set(displayName, getTrainerStats(tasks, displayName));
        }
        return map;
    }, [users, tasks]);

    const fetchPerformance = async (person: Users) => {
        if (perfMap.has(person.employee_id)) return;
        setPerfLoading(prev => { const s = new Set(prev); s.add(person.id); return s; });
        try {
            const res = await fetch(`/api/task/performance?trainer_id=${person.employee_id}`);
            if (res.ok) {
                const data: PerformanceData = await res.json();
                setPerfMap(prev => new Map(prev).set(person.employee_id, data));
            }
        } finally {
            setPerfLoading(prev => { const s = new Set(prev); s.delete(person.id); return s; });
        }
    };

    const handleToggle = (person: Users) => {
        const isCurrentlyOpen = expandedId === person.id;
        setExpandedId(isCurrentlyOpen ? null : person.id);
        if (!isCurrentlyOpen) fetchPerformance(person);
    };

    // Navigate to driver detail page
    // inspection_task_driver_id format: YYYYMMDD-CODE-DRIVERNUM
    // → task_id = first two dash-segments, subid = full string
    const handleNavigate = (itemId: string) => {
        const parts = itemId.split('-');
        const taskId = parts.slice(0, 2).join('-');
        router.push(`/trainer-app/${taskId}/${itemId}`);
        setModal(null);
    };

    if (users.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-14 text-white/40">
                <ClipboardList size={30} strokeWidth={1.4} />
                <p className="text-sm mt-2 font-medium">ไม่พบข้อมูลเทรนเนอร์</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {users.map((person) => {
                    const displayName = `${person.firstname} ${person.lastname}`;
                    const stats = statsMap.get(displayName) ?? { total: 0, done: 0, pending: 0, cancel: 0, completionRate: 0, plants: [] };
                    const isOpen = expandedId === person.id;
                    const isActive = selectedTrainer === displayName;
                    const perfData = perfMap.get(person.employee_id);
                    const isLoadingPerf = perfLoading.has(person.id);
                    const driverCards = perfData ? getDriverCards(perfData) : null;

                    return (
                        <div
                            key={person.id}
                            className={`rounded-2xl border bg-white/5 backdrop-blur-sm overflow-hidden transition-all duration-200 ${isActive
                                ? "border-teal-400/40 ring-2 ring-teal-400/20 shadow-lg shadow-teal-500/10"
                                : isOpen
                                    ? "border-white/20 shadow-lg shadow-black/20 bg-white/[0.07]"
                                    : "border-white/10 hover:border-teal-400/30 hover:bg-white/[0.07]"
                                }`}
                        >
                            {/* ── Trainer row ── */}
                            <div className="flex items-center gap-3 p-3 sm:p-4">
                                <Avatar className="w-11 h-11 ring-2 ring-offset-1 ring-offset-slate-900 ring-teal-400/30">
                                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-xs font-bold">
                                        {person.username?.charAt(0).toUpperCase()}{person.username?.charAt(person.username.indexOf(" ") + 1)?.toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] text-white/50 truncate">{person.position}</span>
                                        {stats.total > 0 && (
                                            <span className="text-[10px] text-white/60 bg-white/10 border border-white/10 px-1.5 py-0.5 rounded-md font-medium">
                                                {stats.done}/{stats.total} งาน
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="hidden sm:block mr-1">
                                    <RateRing rate={stats.completionRate} size={42} />
                                </div>

                                {onSelectTrainer && !lockRole && (
                                    <button
                                        onClick={() => onSelectTrainer(displayName)}
                                        className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
                                            ? "bg-gradient-to-br from-teal-500/40 to-emerald-600/40 border border-teal-400/40 text-white hover:from-teal-500/60 hover:to-emerald-600/60"
                                            : "bg-teal-500/15 text-teal-200 border border-teal-400/20 hover:bg-teal-500/25 active:bg-teal-500/30"
                                            }`}
                                        title={isActive ? `ล้างกรอง ${displayName}` : `กรองงานของ ${displayName}`}
                                    >
                                        {isActive ? <X size={13} /> : <Filter size={13} />}
                                        <span className="hidden sm:inline">{isActive ? "ล้างกรอง" : "กรอง"}</span>
                                    </button>
                                )}

                                {/* Toggle detail */}
                                <button
                                    onClick={() => handleToggle(person)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${isOpen
                                        ? "bg-white/15 text-white border border-white/20 shadow-sm"
                                        : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white active:bg-white/15"
                                        }`}
                                >
                                    {isLoadingPerf
                                        ? <Loader2 size={13} className="animate-spin" />
                                        : isOpen ? <Eye size={13} /> : <BarChart3 size={13} />
                                    }
                                    <span className="hidden sm:inline">{isOpen ? "ซ่อน" : "ดูผลงาน"}</span>
                                    <ChevronDown size={13} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                                </button>
                            </div>

                            {/* ── Expanded performance panel ── */}
                            {isOpen && (
                                <div className="border-t border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent">

                                    {/* Driver performance cards */}
                                    <div className="px-4 pt-4 pb-3">
                                        <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <TrendingUp size={11} /> ผลการตรวจพนักงาน
                                        </p>

                                        {isLoadingPerf && (
                                            <div className="flex items-center justify-center py-8 gap-2 text-white/40">
                                                <Loader2 size={18} className="animate-spin" />
                                                <span className="text-xs">กำลังโหลด...</span>
                                            </div>
                                        )}

                                        {!isLoadingPerf && driverCards && (
                                            <div className="grid grid-cols-3 gap-2.5">
                                                {driverCards.map(card => (
                                                    <button
                                                        key={card.key}
                                                        onClick={() => card.count > 0 && setModal({
                                                            trainerName: displayName,
                                                            label: `${card.label} ${card.sublabel}`,
                                                            color: card.color,
                                                            dotColor: card.dotColor,
                                                            items: [...card.items],
                                                        })}
                                                        disabled={card.count === 0}
                                                        className={`group flex flex-col items-center justify-center gap-2 px-2 py-4 rounded-2xl border transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-default ${card.bg}`}
                                                    >
                                                        {/* Icon */}
                                                        <div className={`p-2 rounded-xl bg-white/5 border border-white/10 transition-colors group-hover:bg-white/10 ${card.count === 0 ? "" : "group-active:scale-95"}`}>
                                                            <UsersIcon size={20} className={card.iconColor} strokeWidth={1.6} />
                                                        </div>
                                                        {/* Count */}
                                                        <span className={`text-2xl font-black tabular-nums leading-none ${card.color}`}>
                                                            {card.count}
                                                        </span>
                                                        {/* Label */}
                                                        <div className="text-center leading-tight">
                                                            <p className="text-[10px] font-semibold text-white/60">{card.label}</p>
                                                            <p className="text-[10px] text-white/40">{card.sublabel}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {!isLoadingPerf && !perfData && (
                                            <p className="text-center py-6 text-white/30 text-xs">ไม่พบข้อมูลผลงาน</p>
                                        )}
                                    </div>

                                    {/* Plants */}
                                    {stats.plants.length > 0 && (
                                        <div className="px-4 pb-3">
                                            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <MapPin size={11} /> แพล้นท์ที่ดูแล ({stats.plants.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {stats.plants.map(c => (
                                                    <span key={c} className="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-medium text-white/80 border border-white/10 backdrop-blur-sm">
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Task list */}
                                    {(() => {
                                        const trainerTasks = tasks.filter(t => t.trainer_id === displayName);
                                        if (trainerTasks.length === 0) return (
                                            <div className="px-4 pb-4">
                                                <p className="text-xs text-white/40 text-center py-3 bg-white/[0.03] rounded-xl border border-dashed border-white/15">
                                                    ยังไม่มีงานที่ได้รับมอบหมาย
                                                </p>
                                            </div>
                                        );
                                        return (
                                            <div className="px-4 pb-4">
                                                <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <ClipboardList size={11} /> รายการงาน ({trainerTasks.length})
                                                </p>
                                                <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                                                    {trainerTasks.map(task => {
                                                        const st = LIST_USER_STATUS[task.inspection_task_status ?? "open"] ?? LIST_USER_STATUS.open;
                                                        const dateStr = (task.action_date ?? task.plan_date)?.slice(0, 10) ?? "";
                                                        return (
                                                            <div key={task.inspection_task_id}
                                                                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-teal-400/30 hover:bg-white/[0.08] transition-all duration-200"
                                                            >
                                                                <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-semibold text-white truncate">
                                                                        {task.inspection_task_id}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="flex items-center gap-0.5 text-[10px] text-white/50">
                                                                            <Building2 size={9} /> {task.client_name || "-"}
                                                                        </span>
                                                                        <span className="flex items-center gap-0.5 text-[10px] text-white/50">
                                                                            <CalendarDays size={9} /> {dateStr || "-"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${st.text}`}>
                                                                    สถานะ: {st.label}
                                                                </span>
                                                                <button
                                                                    onClick={() => onViewTask?.(task.inspection_task_id)}
                                                                    className="p-1.5 rounded-lg text-white/40 hover:text-teal-200 hover:bg-teal-500/15 transition-colors cursor-pointer"
                                                                    title="เปิดงาน"
                                                                >
                                                                    <ExternalLink size={13} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Performance Detail Modal ── */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setModal(null)}
                    />
                    <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden">

                        {/* Modal header */}
                        <div className="px-5 py-4 flex items-center gap-3 border-b border-white/10 bg-white/[0.03]">
                            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                                <UsersIcon size={16} className={modal.color} strokeWidth={1.6} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold ${modal.color}`}>
                                    {modal.label}
                                    <span className="ml-2 text-white/40 font-normal text-xs">
                                        {modal.items.length} รายการ
                                    </span>
                                </p>
                                <p className="text-[11px] text-white/50 mt-0.5 truncate">{modal.trainerName}</p>
                            </div>
                            <button
                                onClick={() => setModal(null)}
                                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Modal list */}
                        <div className="max-h-[360px] overflow-y-auto p-3 space-y-1.5">
                            {modal.items.length === 0 ? (
                                <p className="text-center text-xs text-white/30 py-10">ไม่มีรายการ</p>
                            ) : (
                                modal.items.map(itemId => (
                                    <div
                                        key={itemId}
                                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${modal.dotColor}`} />
                                        <span className="flex-1 text-xs font-mono text-white/80 truncate">{itemId}</span>
                                        <button
                                            onClick={() => handleNavigate(itemId)}
                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-500/15 border border-teal-400/20 text-teal-300 text-[11px] font-semibold hover:bg-teal-500/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                        >
                                            Driver <ArrowRight size={11} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
