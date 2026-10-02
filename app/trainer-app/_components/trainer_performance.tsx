'use client';

// =============================================================================
// Component: TrainerPerformance
// -----------------------------------------------------------------------------
// Wrapper แสดง ListUsers พร้อม header summary (จำนวนเทรนเนอร์, ตัวกรองที่เลือก)
//   • แบ่งกลุ่ม "ปัจจุบัน" / "ลาออกแล้ว" — คนลาออกแสดงเฉพาะที่เคยมีงานหรือเป็นตำแหน่งเทรนเนอร์
// =============================================================================

import { useState } from "react";
import { GraduationCap, UserMinus, Users as UsersIcon, X } from "lucide-react";
import type { Task, Users } from "../type";
import { ROLE_SAFETY_TRAINER, isActiveEmployee } from "../constant";
import { ListUsers } from "./ListUser";

interface TrainerPerformanceProps {
    user: Users[];
    /** employee_id ทุกคนที่เคยมีงาน (ไม่ขึ้นกับตัวกรอง) */
    taskTrainerIds?: Set<string>;
    tasks: Task[];
    selectedTrainer?: string;
    filterYears?: number[];
    filterMonths?: number[];
    onViewTask?: (taskId: string) => void;
    onDeleteTask?: (taskId: string) => void;
    onSelectTrainer?: (trainerDisplayName: string) => void;
    lockRole?: boolean;
}

type TrainerGroup = "active" | "resigned";

const isTrainerPosition = (u: Users) =>
    u.position === ROLE_SAFETY_TRAINER || !!u.position?.includes("trainer") || !!u.position?.includes("Trainer");

export const TrainerPerformance = ({ user, taskTrainerIds, tasks, selectedTrainer = "", filterYears = [], filterMonths = [], onViewTask, onDeleteTask, onSelectTrainer, lockRole }: TrainerPerformanceProps) => {
    const [group, setGroup] = useState<TrainerGroup>("active");

    const activeTrainers = user.filter(u => isActiveEmployee(u) && isTrainerPosition(u));
    // ตำแหน่งของคนลาออกอาจถูกเปลี่ยนไปแล้ว จึงนับคนที่เคยมีงานด้วย
    const resignedTrainers = user.filter(u => !isActiveEmployee(u) && (isTrainerPosition(u) || !!taskTrainerIds?.has(u.employee_id)));
    const groupTrainers = group === "resigned" ? resignedTrainers : activeTrainers;

    // กรองรายคนแล้วให้หาจากทั้งสองกลุ่ม — เลือกคนลาออกจาก TaskFilter ก็ยังเห็นการ์ด
    const trainers = selectedTrainer
        ? [...activeTrainers, ...resignedTrainers].filter(t => `${t.firstname} ${t.lastname}` === selectedTrainer)
        : groupTrainers;
    const trainerCount = trainers.length;
    const totalTrainerCount = groupTrainers.length;

    const groupTabs: { value: TrainerGroup; label: string; count: number }[] = [
        { value: "active", label: "ปัจจุบัน", count: activeTrainers.length },
        { value: "resigned", label: "ลาออกแล้ว", count: resignedTrainers.length },
    ];

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-lg shadow-black/10 overflow-hidden">
            {/* ━━━ Header ━━━ */}
            <div className="px-4 py-4 sm:px-5 sm:py-5 bg-gradient-to-r from-slate-900/60 via-slate-800/40 to-teal-900/30 border-b border-white/10">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/30 rounded-xl">
                        <GraduationCap size={22} className="text-teal-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                            ประสิทธิภาพเทรนเนอร์
                        </h2>
                        <p className="text-xs text-white/50 mt-0.5">กดที่ชื่อเทรนเนอร์เพื่อกรองข้อมูล</p>
                    </div>
                </div>

                {/* Summary chips + active filter */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                    {!selectedTrainer && (
                        <div className="flex items-center gap-1 p-0.5 bg-white/5 rounded-lg border border-white/10">
                            {groupTabs.map(tab => {
                                const isCurrent = group === tab.value;
                                return (
                                    <button
                                        key={tab.value}
                                        onClick={() => setGroup(tab.value)}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${isCurrent
                                            ? tab.value === "resigned"
                                                ? "bg-rose-500/20 text-rose-100 border border-rose-400/30"
                                                : "bg-teal-500/20 text-teal-100 border border-teal-400/30"
                                            : "text-white/60 border border-transparent hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        {tab.value === "resigned" && <UserMinus size={12} />}
                                        {tab.label}
                                        <span className="tabular-nums text-[11px] opacity-70">{tab.count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                        <UsersIcon size={13} className="text-teal-300" />
                        <span className="text-xs font-semibold text-white">
                            {trainerCount}{selectedTrainer ? ` / ${totalTrainerCount}` : ""}
                        </span>
                        <span className="text-[11px] text-white/50">เทรนเนอร์</span>
                    </div>
                    {selectedTrainer && !lockRole && (
                        <button
                            onClick={() => onSelectTrainer?.(selectedTrainer)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 rounded-lg border border-teal-400/30 text-teal-100 hover:bg-teal-500/30 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-teal-500/10 disabled:text-teal-100/70 disabled:hover:bg-teal-500/20"
                            disabled={lockRole}
                            title="กรองได้เฉพาะหัวหน้า/ผู้จัดการ"
                        >
                            <span className="text-xs font-semibold">กรอง: {selectedTrainer}</span>
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* ━━━ Content ━━━ */}
            <div className="p-3 sm:p-4">
                <ListUsers users={trainers} tasks={tasks} selectedTrainer={selectedTrainer} filterYears={filterYears} filterMonths={filterMonths} onViewTask={onViewTask} onDeleteTask={onDeleteTask} onSelectTrainer={onSelectTrainer} lockRole={lockRole} />
            </div>
        </div>
    );
}

