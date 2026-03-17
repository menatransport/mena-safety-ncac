"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { NavComponent } from "@/components/Navbar";
import { ProjectHeader } from "./_components/ProjectHeader";
import { TaskTable } from "./_components/TaskTable";
import { ViewSelector } from "@/components/ui/dashboard";
import {
    FileSpreadsheet, CalendarDays, PieChart, Truck
} from "lucide-react";
import type { Task } from "./type";

const menu = [
    { value: 'task', name: 'งาน', icon: FileSpreadsheet },
    { value: 'calendar', name: 'ปฏิทิน', icon: CalendarDays },
    { value: 'in-cab', name: 'Incab', icon: Truck },
    { value: 'analytics', name: 'วิเคราะห์', icon: PieChart },
];

export default function TrainerApp() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activeView, setActiveView] = useState("task");
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('./api/task', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.ok) {
                    console.log(`API responded with status: ${response.status}`);
                    return;
                }
                const data = await response.json();
                setTasks(data);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleViewTask = (taskId: string) => {
        router.push(`/trainer-app/${taskId}`);
    };
    return (
        <NavComponent>
            <div className="min-h-screen bg-[#f4efff]"> 
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                    {/* Header */}
                    <ProjectHeader
                      title="Trainer App System"
                      date={new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                    />
                    {/* ActiveTab */}
                    <ViewSelector
                        activeView={activeView}
                        setActiveView={setActiveView}
                        menu={menu}
                    />

                    {/* Task Table */}
                    {activeView === 'task' && (
                        <div className="rounded-2xl bg-white/1 p-4 sm:p-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-500" />
                                        <p className="text-sm text-indigo-400">กำลังโหลดรายการ...</p>
                                    </div>
                                </div>
                            ) : (
                                <TaskTable tasks={tasks} onViewTask={handleViewTask} />
                            )}
                        </div>
                    )}
                    {/* Calendar */}
                    {activeView === 'calendar' && (
                        <div className="rounded-2xl border border-indigo-100 bg-white p-4 sm:p-6 ">
                            <p className="text-center text-indigo-300 py-20">ปฏิทินยังไม่พร้อมใช้งาน</p>
                        </div>
                    )}
                    {/* Analytics */}
                    {activeView === 'analytics' && (
                        <div className="rounded-2xl border border-indigo-100 bg-white p-4 sm:p-6 ">
                            <p className="text-center text-indigo-300 py-20">วิเคราะห์ยังไม่พร้อมใช้งาน</p>
                        </div>
                    )}
                </div>
            </div>
        </NavComponent>
    );
}
