'use client';

// =============================================================================
// Component: TrainerPerformance
// -----------------------------------------------------------------------------
// Wrapper แสดง ListUsers พร้อม header summary (จำนวนเทรนเนอร์, ตัวกรองที่เลือก)
// =============================================================================

import { GraduationCap, Users as UsersIcon, X } from "lucide-react";
import type { Task, Users } from "../type";
import { ROLE_SAFETY_TRAINER } from "../constant";
import { ListUsers } from "./ListUser";

interface TrainerPerformanceProps {
    user: Users[];
    tasks: Task[];
    selectedTrainer?: string;
    onViewTask?: (taskId: string) => void;
    onDeleteTask?: (taskId: string) => void;
    onSelectTrainer?: (trainerDisplayName: string) => void;
    lockRole?: boolean;
}

export const TrainerPerformance = ({ user, tasks, selectedTrainer = "", onViewTask, onDeleteTask, onSelectTrainer, lockRole }: TrainerPerformanceProps) => {
    const allTrainers = user.filter(u => u.position === ROLE_SAFETY_TRAINER);
    const trainers = selectedTrainer
        ? allTrainers.filter(t => `${t.firstname} ${t.lastname}` === selectedTrainer)
        : allTrainers;
    const trainerCount = trainers.length;
    const totalTrainerCount = allTrainers.length;

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
                <div className="flex flex-wrap gap-2 mt-3">
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
                <ListUsers users={trainers} tasks={tasks} selectedTrainer={selectedTrainer} onViewTask={onViewTask} onDeleteTask={onDeleteTask} onSelectTrainer={onSelectTrainer} lockRole={lockRole} />
            </div>
        </div>
    );
}

