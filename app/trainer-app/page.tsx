"use client";

// =============================================================================
// Page: /trainer-app
// -----------------------------------------------------------------------------
// หน้าหลักของ Safety Trainer Dashboard
//   • โหลดงาน inspection ทั้งหมด (GET /api/task)
//   • โหลดรายชื่อทีม Safety (GET /api/organization?department_id=8)
//   • โหลด Plant options (GET /api/task/option-plant)
//   • รวมตัวกรอง + ปฏิทิน + ประสิทธิภาพเทรนเนอร์ + ตารางงาน
//   • Lock บางการกระทำเมื่อ user เป็น Safety Trainer (lockRole)
// =============================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
    ListChecks, TrendingUp,
    ClipboardList, Clock, CheckCircle2, XCircle,
    Sparkles,
    BookAIcon,
    BookIcon,
} from "lucide-react";

import { NavComponent } from "@/components/Navbar";
import { mapTasksWithDropdowns } from "@/lib/trainerMapper";

import { TaskTable } from "./_components/TaskTable";
import { TaskFilter } from "./_components/TaskFilter";
import type { Task, TaskFilterRef, TaskFilterResult, Users } from "./type";
import { ROLE_SAFETY_TRAINER,ANALYTICS_TABS } from "./constant";
import { AnalyticsTabs } from "./_components/analytics/main";

const CalendarTask = dynamic(
    () => import("./_components/Calendar").then(m => m.CalendarTask),
    { ssr: false, loading: () => <div className="rounded-2xl border border-white/10 bg-white/5 h-[600px] animate-pulse" /> }
);
const TrainerPerformance = dynamic(
    () => import("./_components/trainer_performance").then(m => m.TrainerPerformance),
    { ssr: false, loading: () => <div className="rounded-2xl border border-white/10 bg-white/5 h-[600px] animate-pulse" /> }
);

/* ── Tabs ── */
const tabs = [
    { value: "manual", label: "คู่มือ", icon: BookAIcon, href: "https://canva.link/xplgm8mmms98mtu" },
    { value: "task", label: "งานทั้งหมด", icon: ListChecks },
    { value: "analytics", label: "วิเคราะห์", icon: TrendingUp },
];

export default function TrainerApp() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [rawFiltered, setRawFiltered] = useState<Task[]>([]);
    const [activeView, setActiveView] = useState("task");
    const [UserSafety, setUserSafety] = useState<Users[]>([]);
    const [lockRole, setlockRole] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const filterRef = useRef<TaskFilterRef>(null);
    const [plantOptions, setPlantOptions] = useState<{ client_name: string; plant_code: string; plant_name: string }[]>([]);
    const [myuser, setMyUser] = useState<any | null>(null);
    const [selectedTrainer, setSelectedTrainer] = useState<string>("");
    const [calendarNav, setCalendarNav] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
    const [activeAnalyticsTab, setActiveAnalyticsTab] = useState(ANALYTICS_TABS[0]) as [typeof ANALYTICS_TABS[number], React.Dispatch<React.SetStateAction<typeof ANALYTICS_TABS[number]>>];
    const [analyticsFilters, setAnalyticsFilters] = useState<TaskFilterResult>({
        search: "",
        status: "all",
        selectedYears: [new Date().getFullYear()],
        selectedMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        trainerId: "",
        clientName: "",
    });

    /* ── Bootstrap: load current user from localStorage or redirect to /login ── */
    useEffect(() => {
        const localstorage_user = localStorage.getItem("userData");
        if (!localstorage_user) {
            router.push("/login");
        } else {
            setMyUser(JSON.parse(localstorage_user));
        }
    }, [router]);

    /* ── Data: fetch task list ── */
    const fetchData = useCallback(async () => {
        try {
            const response = await fetch("./api/task", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) return;
            const data = await response.json();
            setTasks(data);
        } finally {
            setLoading(false);
        }
    }, []);

    /* ── Data: fetch safety team + plant options + tasks (ยิงครั้งเดียวตอน mount) ── */
    useEffect(() => {
        const fetchSafetyTeam = async () => {
            const res = await fetch(`/api/organization?department_id=8&employee_status=Active`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) return;
            const data = await res.json();
            setUserSafety(data);
        };

        const fetchPlantOptions = async () => {
            try {
                const res = await fetch("/api/task/option-plant");
                if (!res.ok) return;
                const data: { client_name: string; plant_code: string; plant_name: string }[] = await res.json();
                setPlantOptions(data);
            } catch (e) {
                console.error("Failed to fetch plant options:", e);
            }
        };

        fetchSafetyTeam();
        fetchData();
        fetchPlantOptions();
    }, [fetchData]);

    /* ── Role lock (อิงจากตำแหน่งของ user) ── */
    useEffect(() => {
        if (myuser?.position === ROLE_SAFETY_TRAINER) {
            setlockRole(true);
        }
    }, [myuser]);

    /* ── Handlers ── */
    const handleViewTask = (taskId: string) => {
        router.push(`/trainer-app/${taskId}`);
    };

    const handleFilterChange = useCallback((filtered: Task[]) => {
        setRawFiltered(filtered);
    }, []);

    const mappedTasksForFilter = useMemo(
        () => mapTasksWithDropdowns(tasks, plantOptions ?? [], UserSafety),
        [tasks, plantOptions, UserSafety]
    );

    const filteredTasks = rawFiltered;

    const handleMoveTask = useCallback((taskId: string, newDate: string) => {
        setTasks(prev => prev.map(t =>
            t.inspection_task_id === taskId ? { ...t, plan_date: newDate } : t
        ));
    }, []);

    const handleAddTask = useCallback(async (task: Partial<Task>) => {
        if (!task.client_name || !task.plant_code || !task.plant_name || !task.plan_date) {
            Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
            return;
        }
        const result = await Swal.fire({
            title: 'ยืนยันเพิ่มงาน?',
            text: "คุณต้องการเพิ่มงานนี้หรือไม่",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            allowOutsideClick: false,
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch('/api/task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trainer_id: task.trainer_id || null,
                    client_name: task.client_name || null,
                    plant_code: task.plant_code || null,
                    plant_name: task.plant_name || null,
                    plan_date: task.plan_date || null,
                    action_date: task.action_date || null,
                    inspection_task_status: task.inspection_task_status || 'open',
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                Swal.fire('ผิดพลาด', err.error || 'ไม่สามารถเพิ่มงานได้', 'error');
                return;
            }

            const created = await res.json();
            setTasks(prev => [...prev, created]);
            fetchData();
            Swal.fire('สำเร็จ!', 'เพิ่มงานเรียบร้อยแล้ว', 'success');
        } catch {
            Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        }
    }, []);

    const handleDeleteTask = useCallback((taskId: string) => {
        Swal.fire({
            title: 'คุณแน่ใจหรือไม่?',
            text: "คุณจะไม่สามารถกู้คืนงานนี้ได้!",
            icon: 'warning',
            input: 'text',
            inputLabel: 'หมายเหตุ (ถ้ามี)',
            inputPlaceholder: 'เหตุผลในการลบ...',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, ลบเลย!',
            cancelButtonText: 'ยกเลิก',
            allowOutsideClick: false,
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await fetch(`/api/task/${encodeURIComponent(taskId)}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            deleted_by: myuser.employee_id,
                            remark: result.value || null,
                        }),
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        Swal.fire('ผิดพลาด', err.error || 'ไม่สามารถลบงานได้', 'error');
                        return;
                    }
                    setTasks(prev => prev.filter(t => t.inspection_task_id !== taskId));
                    fetchData();
                    Swal.fire('ลบแล้ว!', 'งานถูกลบเรียบร้อย', 'success');
                } catch {
                    Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
                }
            }
        });

    }, [myuser]);

    const pendingCount = filteredTasks.filter(
        (t) => t.inspection_task_status === "pending"
    ).length;
    const doneCount = filteredTasks.filter(
        (t) => t.inspection_task_status === "completed"
    ).length;
    const openCount = filteredTasks.filter(
        (t) => t.inspection_task_status === "open"
    ).length;

    const statCards = [
        {
            label: "ทั้งหมด",
            value: filteredTasks.length,
            icon: ClipboardList,
            iconBg: "from-stone-500/30 to-gray-600/30",
            iconBorder: "border-stone-400/30",
            iconText: "text-stone-200",
            valueAccent: "text-white",
        },
        {
            label: "เปิด",
            value: openCount,
            icon: BookIcon,
            iconBg: "from-indigo-500/30 to-blue-600/30",
            iconBorder: "border-indigo-400/30",
            iconText: "text-indigo-200",
            valueAccent: "text-white",
        },
        {
            label: "รอดำเนินการ",
            value: pendingCount,
            icon: Clock,
            iconBg: "from-amber-500/30 to-orange-600/30",
            iconBorder: "border-amber-400/30",
            iconText: "text-amber-200",
            valueAccent: "text-white",
        },
        {
            label: "เสร็จสิ้น",
            value: doneCount,
            icon: CheckCircle2,
            iconBg: "from-emerald-500/30 to-teal-600/30",
            iconBorder: "border-teal-400/30",
            iconText: "text-teal-200",
            valueAccent: "text-white",
        },
    ];



    return (
        <NavComponent>
            <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-[#3d5578] relative overflow-hidden">

                <div className="hidden lg:block absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-50/40 via-teal-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

                <div className="relative w-full mt-5 sm:mt-2  px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                    {/* Header row */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div className="flex-1 space-y-1">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                                <span className="text-teal-300">TRAINER</span> APP
                            </h1>
                            <p className="text-xs sm:text-sm text-white/50">จัดวางแผนตรวจเทรนเนอร์</p>
                        </div>
                        {/* Tab navigation — glass pill */}
                        <div className="flex items-center gap-1 bg-white/5 backdrop-blur-sm border border-white/10 p-1 rounded-xl w-fit">
                            {tabs.map((t) => {
                                const Icon = t.icon;
                                const isActive = activeView === t.value;
                                return (
                                    <button
                                        key={t.value}
                                        onClick={() => {
                                            if (t.href) {
                                                window.open(t.href, "_blank", "noopener,noreferrer");
                                            } else {
                                                setActiveView(t.value);
                                            }
                                        }}
                                        className={`relative flex items-center gap-1.5 px-4 sm:px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${isActive
                                            ? "bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/30 text-white shadow-md shadow-teal-500/10"
                                            : "text-white/60 hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        <Icon size={15} />
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Filter */}
                    <TaskFilter
                        ref={filterRef}
                        tasks={mappedTasksForFilter}
                        loading={loading}
                        myuser={myuser}
                        syncMonth={calendarNav}
                        onFilter={handleFilterChange}
                        onSearch={fetchData}
                        onFilterStateChange={(state) => {
                            const trainer = UserSafety.find(
                                u => `${u.firstname} ${u.lastname}` === state.trainerId
                            );
                            setAnalyticsFilters({
                                ...state,
                                trainerId: trainer?.employee_id ?? state.trainerId,
                            });
                        }}
                        onTrainerChange={(name) => setSelectedTrainer(name)}
                        className="z-[10] relative"
                    />

                    {/* Quick stats — glass cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        {statCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div
                                    key={card.label}
                                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 lg:backdrop-blur-sm p-4 sm:p-5 transition-all duration-300 hover:border-teal-400/30 hover:bg-white/[0.08] hover:-translate-y-0.5"
                                >
                                    {/* Decorative blur (desktop only) */}
                                    <div className={`hidden lg:block absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${card.iconBg} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500`} />

                                    <div className="relative flex items-start justify-between mb-3">
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${card.iconBg} border ${card.iconBorder} ${card.iconText} lg:backdrop-blur-sm transition-transform duration-300 group-hover:scale-110`}>
                                            <Icon size={20} />
                                        </div>
                                    </div>
                                    <p className={`relative text-3xl sm:text-4xl font-bold tabular-nums tracking-tight ${card.valueAccent}`}>
                                        {card.value}
                                    </p>
                                    <p className="relative text-xs sm:text-sm font-medium text-white/60 mt-1">
                                        {card.label}
                                    </p>
                                </div>
                            );
                        })}
                    </div>



                    {/* Content */}
                    {activeView === "task" && (
                        <div className="space-y-6">
                            {loading ? (
                                /* Skeleton loading */
                                <div className="space-y-6">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 animate-pulse">
                                        <div className="h-10 bg-white/10 rounded-xl w-1/3 mb-4" />
                                        <div className="grid grid-cols-7 gap-2">
                                            {Array.from({ length: 35 }).map((_, i) => (
                                                <div key={i} className="h-16 bg-white/5 rounded-lg" />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 animate-pulse">
                                        <div className="h-6 bg-white/10 rounded w-1/4 mb-4" />
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="h-12 bg-white/5 rounded-lg mb-2" />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                        <CalendarTask
                                            tasks={filteredTasks}
                                            onMonthChange={(y, m) => setCalendarNav({ year: y, month: m })}
                                            createform={{
                                                clients: [...new Map(plantOptions.map(p => [p.client_name, p.client_name])).values()],
                                                trainer: UserSafety,
                                                locations: plantOptions,
                                            }}
                                            lockRole={lockRole}
                                            myUserId={myuser?.employee_id}
                                            onMoveTask={handleMoveTask}
                                            onAddTask={handleAddTask}
                                            onDeleteTask={handleDeleteTask}
                                            onViewTask={handleViewTask}
                                        />

                                        {/* ประสิทธิภาพเทรนเนอร์ */}

                                        <TrainerPerformance
                                            user={UserSafety}
                                            tasks={filteredTasks}
                                            selectedTrainer={selectedTrainer}
                                            filterYears={analyticsFilters.selectedYears}
                                            filterMonths={analyticsFilters.selectedMonths}
                                            lockRole={lockRole}
                                            onViewTask={handleViewTask}
                                            onDeleteTask={handleDeleteTask}
                                            onSelectTrainer={(name) => {
                                                if (selectedTrainer === name) {
                                                    setSelectedTrainer("");
                                                    filterRef.current?.setTrainerFilter("");
                                                } else {
                                                    setSelectedTrainer(name);
                                                    filterRef.current?.setTrainerFilter(name);
                                                }
                                            }}
                                        />

                                    </div>
                                    <TaskTable tasks={filteredTasks} onViewTask={handleViewTask} onDeleteTask={handleDeleteTask} lockRole={lockRole} />
                                </>
                            )}
                        </div>
                    )}

                    {activeView === "analytics" && (
                        // TAB SELECTION
                        <>
                        <div className="flex flex-wrap gap-4 mb-6">
                            {ANALYTICS_TABS.map((tab) => (
                                <button
                                    key={tab}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        activeAnalyticsTab === tab
                                            ? "bg-gradient-to-br from-teal-500/30 to-emerald-600/30 text-white"
                                            : "bg-white/10 text-white/70 hover:bg-white/20 cursor-pointer"
                                    }`}
                                    onClick={() => setActiveAnalyticsTab(tab)}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <AnalyticsTabs activeTab={activeAnalyticsTab} filters={analyticsFilters} />
                        </>
                    )}
                </div>
            </div>
        </NavComponent>
    );
}
