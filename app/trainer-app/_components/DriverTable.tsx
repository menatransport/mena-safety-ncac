"use client";

// =============================================================================
// Component: DriverTable
// -----------------------------------------------------------------------------
// รายการพนักงานขับรถของ inspection task หนึ่งงาน
//   • เพิ่มพนักงานขับ (เลือกจาก master หรือกรอกรหัสเอง)  POST /api/task/[id]/driver
//   • ลบพนักงานขับ (DELETE เดียวกัน)
//   • ค้นหา / กรองสถานะ
//   • แสดงสถานะตรวจ PPE / Drug / Vehicle
// =============================================================================

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
    ChevronRight, Truck, Users, CircleCheck, CircleX, Clock,
    UserPlus, Trash2, Search, X, ExternalLink,
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Driver } from "../type";
import {
    DRIVER_STATUS_CONFIG,
    MANUAL_DRIVER_ID_MAX_LENGTH,
    TRUCK_TYPES,
} from "../constant";
import { useDropdownStore } from "@/lib/dropdownlist";

/* -------------------------------------------------------------------------- */
/*  Inline sub-components                                                     */
/* -------------------------------------------------------------------------- */
function StatusBadge({ status }: { status: string | null }) {
    const cfg = DRIVER_STATUS_CONFIG[status?.toLowerCase() ?? ""]
        ?? { label: status ?? "—", bg: "bg-white/5", text: "text-white/60", ring: "ring-white/15", dot: "bg-white/40" };
    return (
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${cfg.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${cfg.dot}`} ></span>  {cfg.label}
        </span>
    );
}

function InspectPill({ value, label }: { value: string | null; label: string }) {
    const isPending = value == null || value === "pending" || value === "open";
    const pass = value === "pass";
    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors backdrop-blur-sm border ${isPending
            ? "bg-white/5 text-white/40 border-white/10"
            : pass
                ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
                : "bg-rose-500/15 text-rose-200 border-rose-400/30"
            }`}>
            {isPending
                ? <span className="w-3.5 h-3.5 rounded-full border border-white/20 inline-block" />
                : pass
                    ? <CircleCheck size={14} />
                    : <CircleX size={14} />
            }
            {label}
        </div>
    );
}

/* ── Props ── */
interface DriverTableProps {
    title: string;
    details: string;
    icon: React.ReactNode;
    drivers: Driver[];
    taskId: string;
    onDriversChange?: (drivers: Driver[]) => void;
}

export function DriverTable({ title, details, icon, drivers, taskId, onDriversChange }: DriverTableProps) {
    const router = useRouter();
    const { fetchSingleDropdown } = useDropdownStore();
    const [masterDrivers, setMasterDrivers] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [addingDriver, setAddingDriver] = useState(false);
    const [selectedDriverId, setSelectedDriverId] = useState<string>("");
    const [manualMode, setManualMode] = useState(false);
    const [manualDriverId, setManualDriverId] = useState<string>("");
    const [newNumberPlate, setNewNumberPlate] = useState<string>("");
    const [newTruckNumber, setNewTruckNumber] = useState<string>("");
    const [newTruckType, setNewTruckType] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState<"all" | "open" | "pending" | "inspection_done">("all");

    useEffect(() => {
        fetchSingleDropdown("masterdrivers").then((list) => setMasterDrivers(list ?? []));
    }, [fetchSingleDropdown]);

    const masterDriverMap = useMemo(() => {
        const map = new Map<string, string>();
        masterDrivers.forEach((d) => {
            const key = String(d.driver_id ?? d.id ?? "");
            const fullName = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim();
            if (key) map.set(key, fullName);
        });
        return map;
    }, [masterDrivers]);

    const driverOptions = useMemo(() => {
        const existingIds = new Set(drivers.map((d) => String(d.driver_id)));
        return masterDrivers
            .filter((d) => !existingIds.has(String(d.driver_id ?? d.id ?? "")))
            .map((d) => ({
                value: String(d.driver_id ?? d.id ?? ""),
                label: `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || String(d.driver_id ?? d.id),
            }));
    }, [masterDrivers, drivers]);

    const getDriverDisplayName = (driver: Driver) => {
        const mappedName = masterDriverMap.get(String(driver.driver_id));
        const apiName = `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim();
        return mappedName || apiName || driver.driver_id;
    };

    /* ── Filtered drivers ── */
    const filteredDrivers = useMemo(() => {
        const sorted = [...drivers].sort((a, b) =>
            (a.first_name ?? "").localeCompare(b.first_name ?? "")
        );
        const byStatus = statusFilter === "all"
            ? sorted
            : sorted.filter((d) => (d.status ?? "open").toLowerCase() === statusFilter);
        if (!search.trim()) return byStatus;
        const q = search.toLowerCase();
        return byStatus.filter((d) => {
            const name = getDriverDisplayName(d).toLowerCase();
            return name.includes(q) || d.driver_id.toLowerCase().includes(q) || (d.truck_number ?? "").toLowerCase().includes(q);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drivers, search, statusFilter, masterDriverMap]);

    /* ── API: Add driver ── */
    const handleAddDriver = async () => {
        const driverId = manualMode ? manualDriverId.trim() : selectedDriverId;
        if (!driverId || submitting) return;

        // Validate manual driver ID: must be ≤ limit chars, no spaces (code only)
        if (manualMode) {
            if (driverId.length > MANUAL_DRIVER_ID_MAX_LENGTH) {
                Swal.fire("รหัสไม่ถูกต้อง", `รหัสพนักงานต้องไม่เกิน ${MANUAL_DRIVER_ID_MAX_LENGTH} ตัวอักษร`, "warning");
                return;
            }
            if (/\s/.test(driverId)) {
                Swal.fire("รหัสไม่ถูกต้อง", "กรุณากรอกรหัสพนักงาน ไม่ใช่ชื่อ (ห้ามมีช่องว่าง)", "warning");
                return;
            }
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/task/${encodeURIComponent(taskId)}/driver`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    driver_id: driverId,
                    number_plate: newNumberPlate.trim() || null,
                    truck_number: newTruckNumber.trim() || null,
                    truck_type: newTruckType.trim() || null,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                Swal.fire("ผิดพลาด", err.error || "ไม่สามารถเพิ่มคนขับได้", "error");
                return;
            }
            const newDriver = await res.json();
            onDriversChange?.([...drivers, newDriver]);
            setSelectedDriverId("");
            setManualDriverId("");
            setNewNumberPlate("");
            setNewTruckNumber("");
            setNewTruckType("");
            setAddingDriver(false);
            Swal.fire({ icon: "success", title: "เพิ่มคนขับสำเร็จ", timer: 1500, showConfirmButton: false });
        } catch {
            Swal.fire("ผิดพลาด", "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
        } finally {
            setSubmitting(false);
        }
    };

    /* ── API: Delete driver ── */
    const handleDeleteDriver = async (inspectionTaskDriverId: string, driverId: string, driverName: string) => {
        const confirm = await Swal.fire({
            title: "ยืนยันลบคนขับ?",
            html: `<p class="text-zinc-500">ต้องการลบ <b>${driverName}</b> ออกจากรายการนี้</p>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#a1a1aa",
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก",
        });
        if (!confirm.isConfirmed) return;
        try {
            const res = await fetch(`/api/task/${encodeURIComponent(taskId)}/driver`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inspection_task_driver_id: inspectionTaskDriverId }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                Swal.fire("ผิดพลาด", err.error || "ไม่สามารถลบคนขับได้", "error");
                return;
            }
            onDriversChange?.(drivers.filter((d) => d.driver_id !== driverId));
            Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1500, showConfirmButton: false });
        } catch {
            Swal.fire("ผิดพลาด", "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
        }
    };

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-lg shadow-black/10 overflow-hidden">
            {/* ── Header ── */}
            <div className="px-4 py-5 sm:px-6 sm:py-5 bg-gradient-to-r from-slate-900/60 via-slate-800/40 to-teal-900/30 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/30 rounded-xl shrink-0">
                            <span className="text-teal-200 [&>svg]:text-teal-200">{icon}</span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{title}</h2>
                            <p className="text-xs sm:text-sm text-white/50 mt-0.5">{details}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setAddingDriver(!addingDriver)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500/40 to-emerald-600/40 hover:from-teal-500/60 hover:to-emerald-600/60 border border-teal-400/40 text-white text-sm font-semibold transition-all active:scale-[0.97] shadow-md shadow-teal-500/20 backdrop-blur-sm w-full sm:w-auto"
                    >
                        <UserPlus size={16} />
                        <span>{addingDriver ? "ปิดแผง" : "เพิ่มคนขับ"}</span>
                    </button>
                </div>

                {/* ── Add driver panel ── */}
                {addingDriver && (
                    <div className="mt-4 p-4 rounded-xl bg-white/5 border border-teal-400/20 backdrop-blur-sm">
                        <p className="text-sm text-white/70 mb-3 flex items-center gap-1.5">
                            <UserPlus size={14} className="text-teal-300" />
                            เลือกพนักงานขับรถที่ต้องการเพิ่ม
                        </p>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-xs text-white/50">พนักงานขับรถ <span className="text-rose-400">*</span></label>
                                        <button
                                            type="button"
                                            onClick={() => { setManualMode(!manualMode); setSelectedDriverId(""); setManualDriverId(""); }}
                                            className="cursor-pointer text-[11px] font-medium text-teal-300 hover:text-teal-200 transition-colors"
                                        >
                                            {manualMode ? "เลือกจากรายชื่อ" : "ต้องการระบุชื่อเอง?"}
                                        </button>
                                    </div>
                                    {manualMode ? (
                                        <input
                                            type="text"
                                            value={manualDriverId}
                                            onChange={(e) => setManualDriverId(e.target.value)}
                                            placeholder="รหัสพนักงาน เช่น DRV001"
                                            className="w-full h-11 px-3 rounded-lg text-sm text-white placeholder:text-white/30 bg-white/5 border border-white/15 backdrop-blur-sm focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all font-mono tracking-wide"
                                        />
                                    ) : (
                                        <SearchableSelect
                                            options={driverOptions}
                                            value={selectedDriverId}
                                            onChange={(val) => setSelectedDriverId(String(val))}
                                            placeholder="ค้นหาพนักงานขับรถ..."
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs text-white/50 mb-1.5">ทะเบียนรถ <span className="text-white/30">(ไม่บังคับ)</span></label>
                                    <input
                                        type="text"
                                        value={newNumberPlate}
                                        onChange={(e) => setNewNumberPlate(e.target.value)}
                                        placeholder="เช่น กข 1234"
                                        className="w-full h-11 px-3 rounded-lg text-sm text-white placeholder:text-white/30 bg-white/5 border border-white/15 backdrop-blur-sm focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-white/50 mb-1.5">หมายเลขรถ <span className="text-white/30">(ไม่บังคับ)</span></label>
                                    <input
                                        type="text"
                                        value={newTruckNumber}
                                        onChange={(e) => setNewTruckNumber(e.target.value)}
                                        placeholder="เช่น TK-001"
                                        className="w-full h-11 px-3 rounded-lg text-sm text-white placeholder:text-white/30 bg-white/5 border border-white/15 backdrop-blur-sm focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-white/50 mb-1.5">ประเภทรถ <span className="text-white/30">(ไม่บังคับ)</span></label>
                                    <select
                                        value={newTruckType}
                                        onChange={(e) => setNewTruckType(e.target.value)}
                                        className="w-full h-11 px-3 rounded-lg text-sm text-white bg-white/5 border border-white/15 backdrop-blur-sm focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all"
                                    >
                                        <option value="" className="bg-slate-800 text-white">— เลือกประเภทรถ —</option>
                                        {TRUCK_TYPES.map((t) => (
                                            <option key={t} value={t} className="bg-slate-800 text-white">{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2 sm:justify-end">
                                <button
                                    onClick={handleAddDriver}
                                    disabled={!(manualMode ? manualDriverId.trim() : selectedDriverId) || submitting}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500/40 to-teal-600/40 hover:from-emerald-500/60 hover:to-teal-600/60 border border-emerald-400/40 text-white text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all backdrop-blur-sm shadow-md shadow-emerald-500/20"
                                >
                                    <UserPlus size={16} />
                                    {submitting ? "กำลังเพิ่ม..." : "เพิ่ม"}
                                </button>
                                <button
                                    onClick={() => { setAddingDriver(false); setSelectedDriverId(""); setManualDriverId(""); setNewNumberPlate(""); setNewTruckNumber(""); setNewTruckType(""); }}
                                    className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/15 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white transition-all"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Search + filter chips ── */}
            {drivers.length > 0 && (
                <div className="px-4 sm:px-6 py-4 border-b border-white/10 bg-white/[0.02] flex flex-col gap-3">
                    <div className="relative w-full">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ค้นหาชื่อ, ID, ทะเบียนรถ..."
                            className="w-full h-11 pl-10 pr-10 rounded-xl text-sm text-white placeholder:text-white/40 bg-white/5 border border-white/15 backdrop-blur-sm focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Empty state ── */}
            {drivers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/40">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                        <Truck size={36} strokeWidth={1.2} className="text-white/30" />
                    </div>
                    <p className="text-base font-medium text-white/70">ยังไม่มีข้อมูลคนขับ</p>
                    <p className="text-sm text-white/40 mt-1">กดปุ่ม &quot;เพิ่มคนขับ&quot; เพื่อเริ่มต้น</p>
                </div>
            ) : filteredDrivers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/40">
                    <Search size={28} className="text-white/30 mb-3" />
                    <p className="text-base text-white/60">ไม่พบผลการค้นหา</p>
                </div>
            ) : (
                /* ── Driver Grid ── */
                <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredDrivers.map((driver, idx) => {
                            const name = getDriverDisplayName(driver);
                            const statusKey = (driver.status ?? "open").toLowerCase();
                            const statusCfg = DRIVER_STATUS_CONFIG[statusKey] ?? DRIVER_STATUS_CONFIG.open;
                            return (
                                <div
                                    key={driver.driver_id}
                                    className="group relative rounded-2xl border border-white/10 bg-white/0.03 backdrop-blur-sm hover:border-teal-400/30 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-teal-500/10 transition-all duration-200 overflow-hidden flex flex-col"
                                >
                                    {/* Status accent stripe */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusCfg.dot}`} />

                                    {/* ── Top: Driver info ── */}
                                    <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-500/50 to-blue-600/50 border border-blue-400/30 text-white text-sm font-bold shrink-0 backdrop-blur-sm">
                                                    {idx + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-base font-semibold text-white truncate">{name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                                                        <span className="font-mono">{driver.driver_id}</span>
                                                        {driver.inspection_date && (
                                                            <>
                                                                <span className="text-white/20">•</span>
                                                                <Clock size={12} className="shrink-0" />
                                                                <span>{new Date(driver.inspection_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <StatusBadge status={driver.inspection_task_driver_status} />
                                        </div>

                                        {/* Truck info */}
                                        {(driver.truck_number || driver.number_plate) && (
                                            <div className="flex items-center gap-2 text-xs sm:text-sm text-white/60 ml-[52px] sm:ml-[56px]">
                                                <Truck size={13} className="shrink-0 text-white/40" />
                                                <span className="font-mono">{driver.truck_number ?? "—"}</span>
                                                {driver.number_plate && (
                                                    <>
                                                        <span className="text-white/20">•</span>
                                                        <span>{driver.number_plate}</span>
                                                    </>
                                                )}
                                                {driver.truck_type && (
                                                    <>
                                                        <span className="text-white/20">•</span>
                                                        <span>{driver.truck_type}</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Middle: Inspection pills ── */}
                                    <div className="px-4 pb-4 sm:px-5 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <InspectPill value={driver.drug_test_status} label="แอลกอฮอล์/สารเสพติด" />
                                            <InspectPill value={driver.ppe_status} label="อุปกรณ์ป้องกัน" />
                                            <InspectPill value={driver.vehicle_status} label="ยานพาหนะ" />
                                        </div>
                                    </div>

                                    {/* ── Bottom: buttons ── */}
                                    <div className="px-4 py-3 sm:px-5 bg-white/[0.03] border-t border-white/10 flex items-center justify-end gap-2.5">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteDriver(driver.inspection_task_driver_id, driver.driver_id, name); }}
                                            className="flex items-center cursor-pointer justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-rose-500/15 hover:border-rose-400/30 text-white/40 hover:text-rose-300 transition-colors backdrop-blur-sm"
                                            title="ลบคนขับ"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => router.push(`/trainer-app/${taskId}/${driver.driver_id}`)}
                                            className="flex items-center cursor-pointer gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500/40 to-emerald-600/40 hover:from-teal-500/60 hover:to-emerald-600/60 border border-teal-400/40 text-white text-sm font-semibold active:scale-[0.97] transition-all shadow-md shadow-teal-500/20 backdrop-blur-sm"
                                        >
                                            <ExternalLink size={14} />
                                            ตรวจสอบ
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
