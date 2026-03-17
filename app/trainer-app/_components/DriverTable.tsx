"use client";

import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    Eye,
    ChevronRight,
    Truck,
    Users,
} from "lucide-react";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import type { Driver } from "../type";

// ─── Status Config ─────────────────────────────────────────
const DRIVER_STATUS_CFG: Record<string, { label: string; bg: string; text: string; ring: string; icon: React.ReactNode }> = {
    Open: { label: "เปิดงาน", bg: "bg-cyan-500/10", text: "text-cyan-700", ring: "ring-cyan-500/20", icon: <Eye size={11} /> },
    Pending: { label: "รอดำเนินการ", bg: "bg-amber-500/10", text: "text-amber-700", ring: "ring-amber-500/20", icon: <Clock size={11} /> },
    Cancel: { label: "ยกเลิก", bg: "bg-rose-500/10", text: "text-rose-600", ring: "ring-rose-500/20", icon: <XCircle size={11} /> },
    Absent: { label: "ขาด", bg: "bg-stone-500/10", text: "text-stone-500", ring: "ring-stone-500/20", icon: <AlertTriangle size={11} /> },
    "Inspection Done": { label: "เสร็จสิ้น", bg: "bg-emerald-500/10", text: "text-emerald-700", ring: "ring-emerald-500/20", icon: <CheckCircle2 size={11} /> },
};

function StatusPill({ status }: { status: string | null }) {
    const cfg = DRIVER_STATUS_CFG[status ?? ""] ?? {
        label: status ?? "—",
        bg: "bg-stone-500/10",
        text: "text-stone-500",
        ring: "ring-stone-500/20",
        icon: <Clock size={11} />,
    };
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
            {cfg.icon}
            {cfg.label}
        </span>
    );
}

interface DriverTableProps {
    drivers: Driver[];
}

export function DriverTable({ drivers }: DriverTableProps) {
    const router = useRouter();

    const handleRowClick = (inspectionTaskDriverId: string) => {
        router.push(`/trainer-app/${inspectionTaskDriverId}?step=1`);
    };

    return (
        <div className="rounded-2xl bg-white border border-indigo-100 overflow-hidden">
            {/* Header */}
            <div className="border-b border-indigo-50 bg-gradient-to-r from-indigo-50/80 to-white px-4 sm:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600">
                        <Truck size={16} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-stone-800">ตารางพนักงานขับรถ</h2>
                        <p className="text-[11px] text-stone-400 hidden sm:block">ข้อมูลคนขับและสถานะการตรวจ</p>
                    </div>
                </div>
                {drivers.length > 0 && (
                    <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-500">
                        <Users size={12} />
                        {drivers.length}
                    </span>
                )}
            </div>

            {/* Content */}
            {drivers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-stone-400">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                        <Truck size={24} className="text-indigo-300" />
                    </div>
                    <p className="text-sm font-medium text-stone-400">ไม่มีข้อมูลคนขับ</p>
                    <p className="text-xs text-stone-300 mt-0.5">ยังไม่มีพนักงานขับรถในรายการนี้</p>
                </div>
            ) : (
                <>
                    {/* ── Mobile: Card List ── */}
                    <div className="md:hidden divide-y divide-stone-100">
                        {drivers.map((driver, idx) => (
                            <div
                                key={driver.inspection_task_driver_id}
                                onClick={() => handleRowClick(driver.inspection_task_driver_id)}
                                className="px-4 py-3.5 active:bg-indigo-50/60 transition-colors cursor-pointer"
                            >
                                {/* Top row: index + ID + status */}
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100/70 text-indigo-600 text-[10px] font-bold shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="text-sm font-semibold text-indigo-700 truncate">
                                            {driver.inspection_task_driver_id}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <StatusPill status={driver.inspection_task_driver_status} />
                                        <ChevronRight size={14} className="text-stone-300" />
                                    </div>
                                </div>

                                {/* Detail grid */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-stone-400">คนขับ</span>
                                        <span className="font-medium text-stone-700 truncate">{driver.driver_id}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-stone-400">ทะเบียน</span>
                                        <span className="font-medium text-stone-600 font-mono">{driver.truck_number ?? "—"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-stone-400">ประเภท</span>
                                        <span className="font-medium text-stone-600">{driver.truck_type ?? "—"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-stone-400">Drug</span>
                                        <span className="font-medium text-stone-600">{driver.drug_test_id != null ? `#${driver.drug_test_id}` : "—"}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Desktop: Table ── */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-indigo-50/40 hover:bg-indigo-50/40">
                                    <TableHead className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest pl-6">
                                        #
                                    </TableHead>
                                    <TableHead className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest">
                                        คนขับ
                                    </TableHead>
                                    <TableHead className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest">
                                        ทะเบียนรถ
                                    </TableHead>
                                    <TableHead className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest">
                                        ประเภทรถ
                                    </TableHead>
                                    <TableHead className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest">
                                        Drug Test
                                    </TableHead>
                                    <TableHead className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest">
                                        PPE Test
                                    </TableHead>
                                    <TableHead className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest text-right pr-6">
                                        สถานะ
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {drivers.map((driver, idx) => (
                                    <TableRow
                                        key={driver.inspection_task_driver_id}
                                        onClick={() => handleRowClick(driver.inspection_task_driver_id)}
                                        className="cursor-pointer hover:bg-indigo-50/50 transition-colors group"
                                    >
                                        <TableCell className="pl-6 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100/70 text-indigo-600 text-[10px] font-bold">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-sm font-semibold text-indigo-700 truncate max-w-[130px]">
                                                    {driver.inspection_task_driver_id}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            <span className="text-sm font-medium text-stone-700">
                                                {driver.driver_id}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            <span className="text-sm text-stone-600 font-mono tracking-tight">
                                                {driver.truck_number ?? "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            {driver.truck_type ? (
                                                <span className="inline-flex rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                                                    {driver.truck_type}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-stone-300">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            <span className="text-sm text-stone-600">
                                                {driver.drug_test_id != null ? `#${driver.drug_test_id}` : "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            <span className="text-sm text-stone-600">
                                                {driver.ppe_test_id != null ? `#${driver.ppe_test_id}` : "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="pr-6 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <StatusPill status={driver.inspection_task_driver_status} />
                                                <ChevronRight
                                                    size={14}
                                                    className="text-stone-200 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-200"
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </div>
    );
}
