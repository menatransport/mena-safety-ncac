// ============================
// Trainer App - Constants & Mock Data
// ============================

import type { ProjectInfo, TeamMember } from "./type";

export const TEAM_MEMBERS: TeamMember[] = [
  { id: "1", name: "สมชาย ใจดี", initials: "สช", role: "Lead Inspector", avatar: "" },
  { id: "2", name: "สมหญิง แก้วใส", initials: "สญ", role: "QA Auditor", avatar: "" },
  { id: "3", name: "วิชัย พลศรี", initials: "วช", role: "Trainer", avatar: "" },
];



export const STATUS_CONFIG = {
  completed: {
    label: "เสร็จแล้ว",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500",
    ringColor: "ring-emerald-200",
  },
  open: {
    label: "เปิดงาน",
    color: "text-blue-600",
    bgColor: "bg-blue-500",
    ringColor: "ring-blue-200",
  },
  pending: {
    label: "รอดำเนินการ",
    color: "text-slate-400",
    bgColor: "bg-slate-300",
    ringColor: "ring-slate-200",
  },
} as const;

