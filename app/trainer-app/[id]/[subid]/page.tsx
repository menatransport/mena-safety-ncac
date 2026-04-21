"use client";

// =============================================================================
// Page: /trainer-app/[id]/[subid]
// -----------------------------------------------------------------------------
// หน้าตรวจสิ่งต่าง ๆ ของพนักงานขับ (driver) รายหนึ่ง
//   • ตรวจแอลกอฮอล์์       (alchol_tested)
//   • ตรวจสารเสพติด         (drug_tested)
//   • ตรวจ PPE             (ppe_checked)
//   • ตรวจรถ 5 ด้าน         (vehicle_front/left/rear/right/inside)
//
// ˂ ข้อมูลติดตั้ง (constants ของ field schema) ถูกเก็บไว้ inline ในไฟล์นี้เพราะถูกใช้ที่เดียว
// =============================================================================

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useParams, useRouter } from "next/navigation";
import { FileUploadField } from "@/app/trainer-app/_components/render";
import { PageHeader } from "@/app/trainer-app/_components/PageHeader";
import { NavComponent } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { TaskDetail } from "../../type";
import { useDropdownStore } from "@/lib/dropdownlist";
import { mapSingleTask } from "@/lib/trainerMapper";
import {
    ArrowLeft, Beer, Pill, ShieldCheck, Truck,
    RotateCcw, Save, User, Sparkles,
    Shield,
    ArrowBigDown,
    ArrowBigRight,
    ArrowBigLeft,
    ArrowBigUp,
    ClipboardCheck,
    CheckCircle2,
    XCircle,
    MinusCircle,
    Image as ImageIcon,
    AlertTriangle,
    ZoomIn,
    X,
    CheckCheck,
} from "lucide-react";

/* ── Status helpers (module-level so identity is stable across renders) ── */
const STATUS_PASS = ["ผ่าน", "มี", "ไม่พบสาร"];
const STATUS_FAIL = ["ไม่ผ่าน", "ไม่มี", "ชำรุด", "พบสาร"];
const STATUS_NA = ["ไม่มีให้ตรวจ", "ไม่เกี่ยวข้อง", "ไม่ได้ตรวจ"];
const statusTone = (v: string, fieldType?: string) => {
    if (!v) return "empty";
    // Numeric text fields (e.g. alcohol mg%): >0 = fail, 0 = pass
    if (fieldType === "text") {
        const num = parseFloat(v);
        if (!isNaN(num)) return num > 0 ? "fail" : "pass";
    }
    if (STATUS_PASS.includes(v)) return "pass";
    if (STATUS_FAIL.includes(v)) return "fail";
    if (STATUS_NA.includes(v)) return "na";
    if (v) return "pass";
    return "info";
};
const countSection = (
    fields: { fieldKey: string; type: string; value?: string }[],
    completionMode?: boolean,
) => {
    const c = { pass: 0, fail: 0, na: 0, empty: 0, total: 0 };
    fields.filter(f => f.type !== "upload").forEach(f => {
        c.total++;
        const v = String(f.value ?? "");
        const t = statusTone(v, f.type);
        if (t === "pass") c.pass++;
        else if (t === "fail") c.fail++;
        else if (t === "na") c.na++;
        else c.empty++;
    });
    return c;
};

type EditableField = {
    label: string;
    fieldKey: string;
    type: string;
    value?: string;
    remark?: string | null;
    options?: { value: string; label: string }[];
};

/* ── Editable section card (defined at module scope to avoid re-mount on every parent render) ── */
function EditableSectionCard({
    title, subtitle, icon, accent, fields, photoKey, completionMode,
    onChange, getRemark, existingUploads, uploadConfig, onPreview,
    onQuickPass, onQuickReset,
}: {
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    accent: string;
    fields: EditableField[];
    photoKey?: string;
    completionMode?: boolean;
    onChange: (fieldKey: string, value: string) => void;
    getRemark: (fieldKey: string) => string;
    existingUploads: Record<string, { url: string; s3Key: string }>;
    uploadConfig?: { apiUrl: string };
    onPreview: (p: { url: string; title: string }) => void;
    onQuickPass?: () => void;
    onQuickReset?: () => void;
}) {
    const stats = countSection(fields, completionMode);
    const photoUrl = photoKey ? existingUploads[photoKey]?.url : undefined;
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className={`flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r ${accent}`}>
                <div className="p-2 rounded-lg bg-white/15 text-white">{icon}</div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">{title}</h3>
                    {subtitle && <p className="text-sm text-white/70 truncate">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                    {onQuickPass && (
                        <button
                            type="button"
                            onClick={onQuickPass}
                            title="ผ่านทั้งหมด (Quick Pass)"
                            aria-label="ผ่านทั้งหมด"
                            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-100 border border-emerald-300/30 backdrop-blur transition-all active:scale-95"
                        >
                            <CheckCheck size={18} />
                        </button>
                    )}
                    {onQuickReset && (
                        <button
                            type="button"
                            onClick={onQuickReset}
                            title="ล้างข้อมูลหัวข้อนี้"
                            aria-label="ล้างข้อมูลหัวข้อนี้"
                            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10 hover:bg-rose-500/30 text-white/80 hover:text-rose-100 border border-white/15 hover:border-rose-300/30 backdrop-blur transition-all active:scale-95"
                        >
                            <RotateCcw size={17} />
                        </button>
                    )}
                </div>
            </div>

            {/* Stats strip */}
            {/* <div className={`px-4 py-3 grid ${completionMode ? "grid-cols-2" : "grid-cols-4"} gap-2 border-b border-white/5`}>
                <div className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={16} /><span className="font-mono font-semibold">{stats.pass}</span><span className="text-white/60 hidden sm:inline">{completionMode ? "กรอกแล้ว" : "ผ่าน"}</span></div>
                {!completionMode && (
                    <div className="flex items-center gap-2 text-sm text-rose-300"><XCircle size={16} /><span className="font-mono font-semibold">{stats.fail}</span><span className="text-white/60 hidden sm:inline">ไม่ผ่าน</span></div>
                )}
                {!completionMode && (
                    <div className="flex items-center gap-2 text-sm text-zinc-300"><MinusCircle size={16} /><span className="font-mono font-semibold">{stats.na}</span><span className="text-white/60 hidden sm:inline">ไม่มีให้ตรวจ</span></div>
                )}
                <div className="flex items-center gap-2 text-sm text-amber-300"><AlertTriangle size={16} /><span className="font-mono font-semibold">{stats.empty}</span><span className="text-white/60 hidden sm:inline">{completionMode ? "ยังไม่กรอก" : "ค้าง"}</span></div>
            </div> */}

            {/* line */}
            <div className="border-t border-white/10" />

            <div className="p-4 grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-4">
                {/* Photo column */}
                {photoKey && (
                    <div className="relative">
                        <FileUploadField
                            fieldKey={photoKey}
                            onChange={onChange}
                            uploadConfig={uploadConfig}
                            existingUpload={existingUploads[photoKey]}
                            onPreview={onPreview}
                            previewTitle={title}
                        />
                        {photoUrl && (
                            <button
                                type="button"
                                onClick={() => onPreview({ url: photoUrl, title })}
                                className="absolute top-1.5 right-1.5 z-10 rounded-md bg-black/60 hover:bg-black/80 text-white p-1 backdrop-blur transition"
                                aria-label={`ขยายรูป ${title}`}
                                title="ขยายรูป"
                            >
                                <ZoomIn size={14} />
                            </button>
                        )}
                    </div>
                )}

                {/* Editable items list */}
                <ul className="divide-y divide-white/5">
                    {fields.filter(f => f.type !== "upload").map(f => {
                        // console.log('f : ', f);
                        const value = String(f.value ?? "");
                        const remark = getRemark(`${f.fieldKey}_remark`);
                        const showRemark = value === "ไม่ผ่าน";
                        const selectTone = !value
                            ? "bg-white/5 border-white/15 text-white/60"
                            : STATUS_PASS.includes(value) ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-100"
                                : STATUS_FAIL.includes(value) ? "bg-rose-500/15 border-rose-400/40 text-rose-100"
                                    : STATUS_NA.includes(value) ? "bg-zinc-500/15 border-zinc-400/40 text-zinc-100"
                                        : "bg-white/10 border-white/20 text-white";
                        return (
                            <li key={f.fieldKey} className="py-3 flex items-start justify-between gap-3">
                                <span className="flex-1 text-base sm:text-lg text-white/85 leading-snug pt-2">{f.label}</span>
                                <div className="shrink-0 w-[160px] sm:w-[190px] flex flex-col gap-1.5">
                                    {f.type === "text" ? (
                                        <input
                                            type="text"
                                            value={value}
                                            onChange={(e) => onChange(f.fieldKey, e.target.value)}
                                            placeholder="—"
                                            className="w-full rounded-md border border-white/15 bg-white/5 backdrop-blur px-3 py-2 text-base text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400/40"
                                        />
                                    ) : (
                                        <select
                                            value={value}
                                            onChange={(e) => onChange(f.fieldKey, e.target.value)}
                                            className={`w-full rounded-md border px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-teal-400/40 transition-colors ${selectTone}`}
                                        >
                                            <option value="" className="bg-slate-800 text-white">— เลือก —</option>
                                            {f.options?.filter(o => o.value !== "").map(o => (
                                                <option key={o.value} value={o.value} className="bg-slate-800 text-white">{o.label}</option>
                                            ))}
                                        </select>
                                    )}
                                    {showRemark && (
                                        <div className="flex flex-col gap-1">
                                            <input
                                                type="text"
                                                value={remark}
                                                onChange={(e) => onChange(`${f.fieldKey}_remark`, e.target.value)}
                                                placeholder="เหตุผลที่ไม่ผ่าน *"
                                                aria-required="true"
                                                aria-invalid={!remark.trim()}
                                                className={`w-full rounded-md border px-3 py-1.5 text-sm text-rose-100 placeholder:text-rose-200/50 focus:outline-none focus:ring-2 ${!remark.trim()
                                                    ? "border-rose-400/70 bg-rose-500/15 ring-1 ring-rose-400/40 focus:ring-rose-400/60"
                                                    : "border-rose-400/30 bg-rose-500/5 focus:ring-rose-400/40"
                                                    }`}
                                            />
                                            {!remark.trim() && (
                                                <span className="text-xs text-rose-300/90 font-medium">* จำเป็นต้องระบุเหตุผล</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

export default function TrainerApp_SUBID() {
    const { id: taskId, subid } = useParams();
    const [taskPlantCode, setTaskPlantCode] = useState<string>("");
    const [taskPlantName, setTaskPlantName] = useState<string>("");
    const [masterDriverLabel, setMasterDriverLabel] = useState<string>("");
    const [inspectionTaskDriverId, setInspectionTaskDriverId] = useState<string | null>(null);
    const [drugAlcohol, setDrugAlcohol] = useState<any>(null);
    const [drugTestId, setDrugTestId] = useState<string | null>(null);
    const [dbPPE, setdbPPE] = useState<any>(null);
    const [ppeTestId, setPpeTestId] = useState<string | null>(null);
    const [dbVehicle, setdbVehicle] = useState<any>(null);
    const [vehicleInspectId, setVehicleInspectId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [existingUploads, setExistingUploads] = useState<Record<string, { url: string; s3Key: string }>>({});
    // Dirty flags — only PUT/POST sections that the user actually modified
    const [drugDirty, setDrugDirty] = useState(false);
    const [ppeDirty, setPpeDirty] = useState(false);
    const [vehicleDirty, setVehicleDirty] = useState(false);
    // Breakdown modal: when user clicks a Grand stat card
    const [breakdownTone, setBreakdownTone] = useState<null | "pass" | "fail" | "na" | "empty">(null);
    const { fetchSingleDropdown } = useDropdownStore();
    const router = useRouter();

    const uploadApiUrl = taskId && subid && masterDriverLabel
        ? `/api/task/${encodeURIComponent(taskId as string)}/${encodeURIComponent(subid as string)}/upload?folder=${encodeURIComponent(masterDriverLabel)}`
        : "";
    const uploadConfig = uploadApiUrl ? { apiUrl: uploadApiUrl } : undefined;

    useEffect(() => {
        const resolveMasterDriverLabel = async () => {
            if (!subid || Array.isArray(subid)) return;

            const list = await fetchSingleDropdown("masterdrivers");
            const matched = list.find((item: any) => String(item.driver_id ?? item.id ?? "") === String(subid));

            if (matched) {
                const fullName = `${matched.first_name ?? ""} ${matched.last_name ?? ""}`.trim();
                setMasterDriverLabel(fullName || String(subid));
                return;
            }

            setMasterDriverLabel(String(subid));
        };

        resolveMasterDriverLabel();
    }, [subid, fetchSingleDropdown]);

    useEffect(() => {
        const fetchTaskMeta = async () => {
            if (!taskId || Array.isArray(taskId)) return;

            try {
                const res = await fetch(`/api/task/${taskId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) return;
                const result: TaskDetail = await res.json();
                setTaskPlantCode(result.task.plant_code ?? "");
                setTaskPlantName(result.task.plant_name ?? "");

                // Find inspection_task_driver_id for this driver
                const matchedDriver = result.drivers?.find(
                    (d) => String(d.driver_id) === String(subid)
                );
                if (matchedDriver?.inspection_task_driver_id) {
                    setInspectionTaskDriverId(matchedDriver.inspection_task_driver_id);
                }
            } catch (error) {
                console.error("Error fetching task meta:", error);
            }
        };

        fetchTaskMeta();
    }, [taskId, subid]);

    // Load existing uploaded files from S3
    useEffect(() => {
        if (!uploadApiUrl) return;
        const loadFiles = async () => {
            try {
                const res = await fetch(uploadApiUrl);
                if (!res.ok) return;
                const { files } = await res.json();
                if (!files || files.length === 0) return;
                const map: Record<string, { url: string; s3Key: string }> = {};
                files.forEach((f: { url: string; key: string; fileName: string }) => {
                    const baseName = f.fileName?.replace(/\.[^.]+$/, '');
                    if (baseName) {
                        map[baseName] = { url: f.url, s3Key: f.key };
                    }
                });
                setExistingUploads(map);
            } catch (e) {
                console.error("Failed to load uploaded files:", e);
            }
        };
        loadFiles();
    }, [uploadApiUrl]);

    const handleDrugAlcoholChange = (fieldKey: string, value: string) => {
        setDrugDirty(true);
        setDrugAlcohol((prev: any) => {
            const next = { ...(prev ?? {}), [fieldKey]: value };
            // console.log("[DrugAlcohol:onChange]", fieldKey, value, next);
            return next;
        });
    };

    const handlePPEChange = (fieldKey: string, value: string) => {
        setPpeDirty(true);
        setdbPPE((prev: any) => {
            const next = { ...(prev ?? {}), [fieldKey]: value };
            return next;
        });
    };

    const handleVehicleChange = (fieldKey: string, value: string) => {
        setVehicleDirty(true);
        setdbVehicle((prev: any) => {
            const next = { ...(prev ?? {}), [fieldKey]: value };
            // console.log("[Vehicle:onChange]", fieldKey, value, next);
            return next;
        });
    };

    /* ── Fetch existing data when inspectionTaskDriverId is resolved ── */
    useEffect(() => {
        if (!inspectionTaskDriverId) return;
        const driverId = encodeURIComponent(inspectionTaskDriverId);

        const fetchExisting = async () => {
            const [drugRes, ppeRes, vehicleRes] = await Promise.allSettled([
                fetch(`/api/task/driver/${driverId}/drug-test`),
                fetch(`/api/task/driver/${driverId}/ppe`),
                fetch(`/api/task/driver/${driverId}/vehicle-inspect`),
            ]);

            // Drug Test
            if (drugRes.status === "fulfilled" && drugRes.value.ok) {
                const data = await drugRes.value.json();
                if (data && (data.drug_test_id || data.alcohol !== undefined)) {
                    setDrugTestId(data.drug_test_id ?? null);
                    setDrugAlcohol({
                        alcohol_breathalyzer_value: data.alcohol ?? "",
                        amfetamin: data.amfetamin ?? "",
                        kra: data.kra ?? "",
                        thc: data.thc ?? "",
                    });
                }
            }

            // PPE
            if (ppeRes.status === "fulfilled" && ppeRes.value.ok) {
                const data = await ppeRes.value.json();
                if (data && (data.ppe_test_id || data.helmet_check !== undefined)) {
                    setPpeTestId(data.ppe_test_id ?? null);
                    setdbPPE({
                        helmet_check: data.helmet_check ?? "",
                        glasses_check: data.glasses_check ?? "",
                        mask_check: data.mask_check ?? "",
                        gloves_check: data.glove_check ?? "",
                        vest_check: data.vest_check ?? "",
                        vest_size: data.vest_size ?? "",
                        safety_shoes_check: data.safety_shoes_check ?? "",
                        safety_shoes_size: data.safety_shoes_size ?? "",
                    });
                }
            }

            // Vehicle Inspect
            if (vehicleRes.status === "fulfilled" && vehicleRes.value.ok) {
                const data = await vehicleRes.value.json();
                // console.log("Fetched vehicle inspect data:", data);
                if (data && (data.vehicle_inspect_id || data.checklist)) {
                    setVehicleInspectId(data.vehicle_inspect_id ?? null);
                    // Flatten checklist back to form fields
                    if (data.checklist) {
                        const flat: Record<string, string> = {};
                        for (const [, items] of Object.entries(data.checklist)) {
                            if (Array.isArray(items)) {
                                for (const item of items as { item: string; status: string; fieldKey?: string; remark?: string | null }[]) {
                                    if (item.fieldKey) {
                                        flat[item.fieldKey] = item.status ?? "";
                                        if (item.remark != null && String(item.remark).trim() !== "") {
                                            flat[`${item.fieldKey}_remark`] = String(item.remark);
                                        }
                                    }
                                }
                            }
                        }
                        if (Object.keys(flat).length > 0) setdbVehicle(flat);
                    }
                }
            }
        };

        fetchExisting().catch(console.error);
    }, [inspectionTaskDriverId]);

    /* ── Unified Save: only call endpoints for sections the user has modified ── */
    const handleSave = async () => {
        if (!inspectionTaskDriverId) {
            Swal.fire("ผิดพลาด", "ไม่พบ ID คนขับในระบบ กรุณาลองใหม่", "error");
            return;
        }

        if (!drugDirty && !ppeDirty && !vehicleDirty) {
            Swal.fire({ icon: "info", title: "ไม่มีข้อมูลที่แก้ไข", text: "ยังไม่มีการเปลี่ยนแปลงในหน้านี้", timer: 1800, showConfirmButton: false });
            return;
        }

        // Validation: vehicle items marked "ไม่ผ่าน" must have a remark
        if (vehicleDirty) {
            const sides: { title: string; data: any[] }[] = [
                { title: "ด้านหน้า", data: vehicle_front as any },
                { title: "ด้านซ้าย", data: vehicle_left as any },
                { title: "ด้านหลัง", data: vehicle_rear as any },
                { title: "ด้านขวา", data: vehicle_right as any },
                { title: "ภายในรถ", data: vehicle_inside as any },
            ];
            const missing: string[] = [];
            sides.forEach((s) => {
                s.data
                    .filter((f) => f.type !== "upload")
                    .forEach((f) => {
                        const status = String(dbVehicle?.[f.fieldKey] ?? "");
                        const remark = String(dbVehicle?.[`${f.fieldKey}_remark`] ?? "").trim();
                        if (status === "ไม่ผ่าน" && !remark) {
                            missing.push(`• ${s.title} — ${f.label.replace(/^\d+\.\s*/, "")}`);
                        }
                    });
            });
            if (missing.length > 0) {
                Swal.fire({
                    icon: "warning",
                    title: "กรุณากรอกเหตุผลที่ไม่ผ่าน",
                    html: `<div style="text-align:left;font-size:14px;line-height:1.6;max-height:280px;overflow:auto">${missing.join("<br/>")}</div>`,
                    confirmButtonText: "ตกลง",
                });
                return;
            }
        }

        setSaving(true);
        const driverId = encodeURIComponent(inspectionTaskDriverId);

        // Build bodies (only used if dirty)
        const drugBody = {
            alcohol: drugAlcohol?.alcohol_breathalyzer_value ? parseFloat(drugAlcohol.alcohol_breathalyzer_value) : null,
            amfetamin: drugAlcohol?.amfetamin || null,
            kra: drugAlcohol?.kra || null,
            thc: drugAlcohol?.thc || null,
        };
        const ppeBody = {
            helmet_check: dbPPE?.helmet_check || null,
            glasses_check: dbPPE?.glasses_check || null,
            mask_check: dbPPE?.mask_check || null,
            glove_check: dbPPE?.gloves_check || null,
            vest_check: dbPPE?.vest_check || null,
            vest_size: dbPPE?.vest_size || null,
            safety_shoes_check: dbPPE?.safety_shoes_check || null,
            safety_shoes_size: dbPPE?.safety_shoes_size || null,
        };
        const buildSection = (fields: { label: string; fieldKey: string; type: string }[]) =>
            fields
                .filter((f) => f.type !== "upload")
                .map((f) => ({
                    item: f.label.replace(/^\d+\.\s*/, ""),
                    status: dbVehicle?.[f.fieldKey] || null,
                    fieldKey: f.fieldKey,
                    remark: dbVehicle?.[`${f.fieldKey}_remark`] || null,
                }));
        const vehicleBody = {
            checklist: {
                front: buildSection(vehicle_front as any),
                left: buildSection(vehicle_left as any),
                rear: buildSection(vehicle_rear as any),
                right: buildSection(vehicle_right as any),
                inside: buildSection(vehicle_inside as any),
            },
        };

        const callApi = async (path: string, hasId: boolean, body: any) =>
            fetch(`/api/task/driver/${driverId}/${path}`, {
                method: hasId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

        // Build the call list dynamically based on dirty flags
        type Job = { name: string; promise: Promise<Response>; onSuccess?: (data: any) => void };
        const jobs: Job[] = [];

        if (drugDirty) {
            jobs.push({
                name: "Drug Test",
                promise: callApi("drug-test", !!drugTestId, drugBody),
                onSuccess: (d) => { if (d?.drug_test_id) setDrugTestId(d.drug_test_id); },
            });
        }
        if (ppeDirty) {
            jobs.push({
                name: "PPE",
                promise: callApi("ppe", !!ppeTestId, ppeBody),
                onSuccess: (d) => { if (d?.ppe_test_id) setPpeTestId(d.ppe_test_id); },
            });
        }
        if (vehicleDirty) {
            jobs.push({
                name: "Vehicle Inspect",
                promise: callApi("vehicle-inspect", !!vehicleInspectId, vehicleBody),
                onSuccess: (d) => { if (d?.vehicle_inspect_id) setVehicleInspectId(d.vehicle_inspect_id); },
            });
        }

        try {
            const responses = await Promise.all(jobs.map((j) => j.promise));
            const datas = await Promise.all(
                responses.map((r) => (r.ok ? r.json().catch(() => ({})) : null))
            );

            const failed: string[] = [];
            const succeeded: string[] = [];
            jobs.forEach((j, i) => {
                if (responses[i].ok) {
                    j.onSuccess?.(datas[i]);
                    succeeded.push(j.name);
                } else {
                    failed.push(j.name);
                }
            });

            // Reset dirty flags only for sections that succeeded
            if (succeeded.includes("Drug Test")) setDrugDirty(false);
            if (succeeded.includes("PPE")) setPpeDirty(false);
            if (succeeded.includes("Vehicle Inspect")) setVehicleDirty(false);

            if (failed.length === 0) {
                Swal.fire({
                    icon: "success",
                    title: "บันทึกข้อมูลสำเร็จ",
                    text: `อัปเดต: ${succeeded.join(", ")}`,
                    timer: 1500,
                    showConfirmButton: false,
                });
            } else if (failed.length === jobs.length) {
                Swal.fire("ผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้", "error");
            } else {
                Swal.fire("บันทึกบางส่วนล้มเหลว", `ไม่สามารถบันทึก: ${failed.join(", ")}`, "warning");
            }
        } catch {
            Swal.fire("ผิดพลาด", "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
        } finally {
            setSaving(false);
        }
    };

    /* ── Reset all ── */
    const handleReset = async () => {
        const result = await Swal.fire({
            icon: "warning",
            title: "ล้างข้อมูลทั้งหมด?",
            text: "ข้อมูลที่กรอกในหน้านี้จะถูกล้างออก (ยังไม่ลบจากฐานข้อมูลจนกว่าจะกดบันทึก)",
            showCancelButton: true,
            confirmButtonText: "ล้าง",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#e11d48",
        });
        if (!result.isConfirmed) return;
        setDrugAlcohol(null);
        setdbPPE(null);
        setdbVehicle(null);
        setDrugDirty(true);
        setPpeDirty(true);
        setVehicleDirty(true);
    };

    const alchol_tested = [
        {
            label: "0. ถ่ายภาพผลตรวจแอลกอฮอล์",
            type: "upload" as const,
            icon: null,
            fieldKey: "alcohol_breathalyzer_result",
            readonly: false,
            value: drugAlcohol?.alcohol_breathalyzer_result ?? "",
        },
        {
            label: "1. ผลตรวจ (mg%)",
            type: "text" as const,
            icon: null,
            fieldKey: "alcohol_breathalyzer_value",
            readonly: false,
            value: drugAlcohol?.alcohol_breathalyzer_value ?? "",
        },
    ];

    const drug_tested = [
        {
            label: "0. ถ่ายภาพผลตรวจสารเสพติด",
            type: "upload" as const,
            icon: null,
            fieldKey: "drug_test_result",
            readonly: false,
            value: drugAlcohol?.drug_test_result ?? "",
        },
        {
            label: "1. ผลตรวจแอมเฟตามีน",
            type: "dropdown" as const,
            options: [
                { value: "", label: "" },
                { value: "ไม่พบสาร", label: "ไม่พบสาร" },
                { value: "พบสาร", label: "พบสาร" },
                { value: "ไม่ได้ตรวจ", label: "ไม่ได้ตรวจ" },
            ],
            icon: null,
            fieldKey: "amfetamin",
            readonly: false,
            value: drugAlcohol?.amfetamin ?? "",
        },
        {
            label: "2. ผลตรวจกระท่อม",
            type: "dropdown" as const,
            options: [
                { value: "", label: "" },
                { value: "ไม่พบสาร", label: "ไม่พบสาร" },
                { value: "พบสาร", label: "พบสาร" },
                { value: "ไม่ได้ตรวจ", label: "ไม่ได้ตรวจ" },
            ],
            icon: null,
            fieldKey: "kra",
            readonly: false,
            value: drugAlcohol?.kra ?? "",
        },
        {
            label: "3. ผลตรวจกัญชา", // thc
            type: "dropdown" as const,
            options: [
                { value: "", label: "" },
                { value: "ไม่พบสาร", label: "ไม่พบสาร" },
                { value: "พบสาร", label: "พบสาร" },
                { value: "ไม่ได้ตรวจ", label: "ไม่ได้ตรวจ" },
            ],
            icon: null,
            fieldKey: "thc",
            readonly: false,
            value: drugAlcohol?.thc ?? "",
        }
    ];

    const ppe_checked = [
        // Multiselect checkbox for PPE items
        {
            label: "1. สวมหมวกนิรภัย",
            type: "checkbox" as const,
            options: [
                { value: "มี", label: "มี" },
                { value: "ไม่มี", label: "ไม่มี" },
                { value: "ชำรุด", label: "ชำรุด" },
                { value: "ไม่เกี่ยวข้อง", label: "ไม่เกี่ยวข้อง" },
            ],
            icon: null,
            fieldKey: "helmet_check",
            readonly: false,
            value: dbPPE?.helmet_check ?? "",
        },
        {
            label: "2. แว่นตานิรภัย",
            type: "checkbox" as const,
            options: [
                { value: "มี", label: "มี" },
                { value: "ไม่มี", label: "ไม่มี" },
                { value: "ชำรุด", label: "ชำรุด" },
                { value: "ไม่เกี่ยวข้อง", label: "ไม่เกี่ยวข้อง" },
            ],
            icon: null,
            fieldKey: "glasses_check",
            readonly: false,
            value: dbPPE?.glasses_check ?? "",
        },
        {
            label: "3. ผ้าปิดจมูก",
            type: "checkbox" as const,
            options: [
                { value: "มี", label: "มี" },
                { value: "ไม่มี", label: "ไม่มี" },
                { value: "ชำรุด", label: "ชำรุด" },
                { value: "ไม่เกี่ยวข้อง", label: "ไม่เกี่ยวข้อง" },
            ],
            icon: null,
            fieldKey: "mask_check",
            readonly: false,
            value: dbPPE?.mask_check ?? "",
        },
        {
            label: "4. ถุงมือ",
            type: "checkbox" as const,
            options: [
                { value: "มี", label: "มี" },
                { value: "ไม่มี", label: "ไม่มี" },
                { value: "ชำรุด", label: "ชำรุด" },
                { value: "ไม่เกี่ยวข้อง", label: "ไม่เกี่ยวข้อง" },
            ],
            icon: null,
            fieldKey: "gloves_check",
            readonly: false,
            value: dbPPE?.gloves_check ?? "",
        },
        {
            label: "5. เสื้อสะท้อนแสง",
            type: "checkbox" as const,
            options: [
                { value: "มี", label: "มี" },
                { value: "ไม่มี", label: "ไม่มี" },
                { value: "ชำรุด", label: "ชำรุด" },
                { value: "ไม่เกี่ยวข้อง", label: "ไม่เกี่ยวข้อง" },
            ],
            icon: null,
            fieldKey: "vest_check",
            readonly: false,
            value: dbPPE?.vest_check ?? "",
        },
        {
            label: "5-1 ไซส์เสื้อสะท้อนแสง",
            type: "dropdown" as const,
            options: [
                { value: "", label: "" },
                { value: "s", label: "S" },
                { value: "m", label: "M" },
                { value: "l", label: "L" },
                { value: "xl", label: "XL" },
                { value: "2xl", label: "2XL" },
                { value: "3xl", label: "3XL" },
            ],
            icon: null,
            fieldKey: "vest_size",
            readonly: false,
            value: dbPPE?.vest_size ?? "",
        },
        {
            label: "6. รองเท้านิรภัย",
            type: "checkbox" as const,
            options: [
                { value: "มี", label: "มี" },
                { value: "ไม่มี", label: "ไม่มี" },
                { value: "ชำรุด", label: "ชำรุด" },
                { value: "ไม่เกี่ยวข้อง", label: "ไม่เกี่ยวข้อง" },
            ],
            icon: null,
            fieldKey: "safety_shoes_check",
            readonly: false,
            value: dbPPE?.safety_shoes_check ?? "",
        },
        {
            label: "6-1 ไซส์รองเท้านิรภัย",
            type: "dropdown" as const,
            options: [
                { value: "", label: "" },
                { value: "35", label: "35" },
                { value: "36", label: "36" },
                { value: "37", label: "37" },
                { value: "38", label: "38" },
                { value: "39", label: "39" },
                { value: "40", label: "40" },
                { value: "41", label: "41" },
                { value: "42", label: "42" },
                { value: "43", label: "43" },
                { value: "44", label: "44" },
                { value: "45", label: "45" },
                { value: "46", label: "46" },
                { value: "47", label: "47" },
                { value: "48", label: "48" },
            ],
            icon: null,
            fieldKey: "safety_shoes_size",
            readonly: false,
            value: dbPPE?.safety_shoes_size ?? "",
        },
        {
            label: "7. แนบรูปถ่าย PPE",
            type: "upload" as const,
            icon: null,
            fieldKey: "ppe_photo",
            readonly: false,
            value: dbPPE?.ppe_photo ?? "",
        }
    ];

    const vehicle_front = [
        {
            label: "0. แนบรูปถ่ายหน้ารถ",
            type: "upload" as const,
            icon: null,
            fieldKey: "vehicle_front_photo",
            readonly: false,
            value: dbVehicle?.vehicle_front_photo ?? "",
        },
        {
            label: "1. กระจกหน้ารถ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_front_glass",
            readonly: false,
            value: dbVehicle?.vehicle_front_glass ?? "",
        },
        {
            label: "2. กระจกมองข้าง",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_front_sidemirror",
            readonly: false,
            value: dbVehicle?.vehicle_front_sidemirror ?? "",
        },
        {
            label: "3. ไฟบนหัวเก๋ง",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_front_headlight",
            readonly: false,
            value: dbVehicle?.vehicle_front_headlight ?? "",
        },
        {
            label: "4. ไฟหน้า ไฟสูง/ต่ำ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_front_light",
            readonly: false,
            value: dbVehicle?.vehicle_front_light ?? "",
        },
        {
            label: "5. ไฟเลี้ยวขวา/ ซ้าย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_front_turnsignal",
            readonly: false,
            value: dbVehicle?.vehicle_front_turnsignal ?? "",
        },
        {
            label: "6. ป้ายภาษี",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_front_tax",
            readonly: false,
            value: dbVehicle?.vehicle_front_tax ?? "",
        },
        {
            label: "7. ป้ายทะเบียน",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_license_plate",
            readonly: false,
            value: dbVehicle?.vehicle_license_plate ?? "",
        },
        {
            label: "8. แถบสะท้อนแสงด้านหน้ารถ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_front_tape",
            readonly: false,
            value: dbVehicle?.vehicle_front_tape ?? "",
        },
        {
            label: "9. เบอร์รถ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_number",
            readonly: false,
            value: dbVehicle?.vehicle_number ?? "",
        },
        {
            label: "10. ความสะอาดด้านหน้ารถ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" }
            ],
            icon: null,
            fieldKey: "vehicle_front_cleanliness",
            readonly: false,
            value: dbVehicle?.vehicle_front_cleanliness ?? "",
        }
    ]

    const vehicle_left = [
        {
            label: "0. แนบรูปถ่ายด้านซ้ายรถ",
            type: "upload" as const,
            icon: null,
            fieldKey: "vehicle_left_photo",
            readonly: false,
            value: dbVehicle?.vehicle_left_photo ?? "",
        },
        {
            label: "1. กระจกประตูด้านซ้าย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_left_doorglass",
            readonly: false,
            value: dbVehicle?.vehicle_left_doorglass ?? "",
        },
        {
            label: "2. บันไดขึ้นหัวเก๋งด้านซ้าย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_left_sidestep",
            readonly: false,
            value: dbVehicle?.vehicle_left_sidestep ?? "",
        },
        {
            label: "3. สติกเกอร์บริษัท มีนาฯ พร้อมเบอร์โทร ที่ประตูด้านซ้าย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_left_doorsticker",
            readonly: false,
            value: dbVehicle?.vehicle_left_doorsticker ?? "",
        },
        {
            label: "4. แถบสะท้อนแสงหัวเก๋งด้านซ้าย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_left_tape",
            readonly: false,
            value: dbVehicle?.vehicle_left_tape ?? "",
        },
        {
            label: "5. แถบสะท้อนแสงด้านซ้ายรถ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_left_sidetape",
            readonly: false,
            value: dbVehicle?.vehicle_left_sidetape ?? "",
        },
        {
            label: "6. ไฟราวด้านซ้าย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_left_rooflight",
            readonly: false,
            value: dbVehicle?.vehicle_left_rooflight ?? "",
        },
        {
            label: "7. ล้อหัวเก๋งด้านซ้าย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_left_frontwheel",
            readonly: false,
            value: dbVehicle?.vehicle_left_frontwheel ?? "",
        },
        {
            label: "8. ล้อบรรทุก/หาง ด้านซ้าย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_left_rearwheel",
            readonly: false,
            value: dbVehicle?.vehicle_left_rearwheel ?? "",
        },
        {
            label: "9. จุดจัดเก็บรางด้านซ้าย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_left_storage",
            readonly: false,
            value: dbVehicle?.vehicle_left_storage ?? "",
        },
        {
            label: "10. ความสะอาดด้านซ้ายรถ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" }
            ],
            icon: null,
            fieldKey: "vehicle_left_cleanliness",
            readonly: false,
            value: dbVehicle?.vehicle_left_cleanliness ?? "",
        }
    ]

    const vehicle_rear = [
        {
            label: "0. แนบรูปถ่ายหลังรถ",
            type: "upload" as const,
            icon: null,
            fieldKey: "vehicle_rear_photo",
            readonly: false,
            value: dbVehicle?.vehicle_rear_photo ?? "",
        },
        {
            label: "1. ไฟเบรค",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_rear_glass",
            readonly: false,
            value: dbVehicle?.vehicle_rear_glass ?? "",
        },
        {
            label: "2. ไฟถอย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_rear_reverselight",
            readonly: false,
            value: dbVehicle?.vehicle_rear_reverselight ?? "",
        },
        {
            label: "3. สัญญาณถอย (เสียง/ไฟ)",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_rear_signal",
            readonly: false,
            value: dbVehicle?.vehicle_rear_signal ?? "",
        },
        {
            label: "4. ตัวล็อครางตัวที่1",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_rear_pini",
            readonly: false,
            value: dbVehicle?.vehicle_rear_pini ?? "",
        },
        {
            label: "5. ตัวล็อครางตัวที่2",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_rear_pinii",
            readonly: false,
            value: dbVehicle?.vehicle_rear_pinii ?? "",
        },
        {
            label: "6. ผ้าใบปิดปลายราง",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_rear_tarpaulin",
            readonly: false,
            value: dbVehicle?.vehicle_rear_tarpaulin ?? "",
        },
        {
            label: "7. ป้ายทะเบียนด้านท้าย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_rear_plate",
            readonly: false,
            value: dbVehicle?.vehicle_rear_plate ?? "",
        },
        {
            label: "8. แถบสะท้อนแสงด้านท้าย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_rear_tape",
            readonly: false,
            value: dbVehicle?.vehicle_rear_tape ?? "",
        },
        {
            label: "9. เบอร์รถปากกรวยโม่",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_rear_number",
            readonly: false,
            value: dbVehicle?.vehicle_rear_number ?? "",
        },
        {
            label: "10. บันไดขึ้นท้ายโม่",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_rear_ladder",
            readonly: false,
            value: dbVehicle?.vehicle_rear_ladder ?? "",
        },
        {
            label: "11. ราวกันตก",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_rear_guardrail",
            readonly: false,
            value: dbVehicle?.vehicle_rear_guardrail ?? "",
        },
        {
            label: "12. ความสะอาดด้านหลังรถ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" }
            ],
            icon: null,
            fieldKey: "vehicle_rear_cleanliness",
            readonly: false,
            value: dbVehicle?.vehicle_rear_cleanliness ?? "",
        }
    ]

    const vehicle_right = [
        {
            label: "0. แนบรูปถ่ายด้านขวารถ",
            type: "upload" as const,
            icon: null,
            fieldKey: "vehicle_right_photo",
            readonly: false,
            value: dbVehicle?.vehicle_right_photo ?? "",
        },
        {
            label: "1. กระจกประตูด้านขวา",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_doorglass",
            readonly: false,
            value: dbVehicle?.vehicle_right_doorglass ?? "",
        },
        {
            label: "2. บันไดขึ้นหัวเก๋งด้านขวา",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_sidestep",
            readonly: false,
            value: dbVehicle?.vehicle_right_sidestep ?? "",
        },
        {
            label: "3. สติกเกอร์บริษัท มีนาฯ พร้อมเบอร์โทร ที่ประตูด้านขวา",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_doorsticker",
            readonly: false,
            value: dbVehicle?.vehicle_right_doorsticker ?? "",
        },
        {
            label: "4. แถบสะท้อนแสงหัวเก๋งด้านขวา",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_tape",
            readonly: false,
            value: dbVehicle?.vehicle_right_tape ?? "",
        },
        {
            label: "5. แถบสะท้อนแสงด้านขวารถ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_sidetape",
            readonly: false,
            value: dbVehicle?.vehicle_right_sidetape ?? "",
        },
        {
            label: "6. ไฟราวด้านขวา",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_rooflight",
            readonly: false,
            value: dbVehicle?.vehicle_right_rooflight ?? "",
        },
        {
            label: "7. ล้อหัวเก๋งด้านขวา",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_frontwheel",
            readonly: false,
            value: dbVehicle?.vehicle_right_frontwheel ?? "",
        },
        {
            label: "8. ล้อบรรทุก/หาง ด้านขวา",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_rearwheel",
            readonly: false,
            value: dbVehicle?.vehicle_right_rearwheel ?? "",
        },
        {
            label: "9. จุดจัดเก็บรางด้านขวา",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_storage",
            readonly: false,
            value: dbVehicle?.vehicle_right_storage ?? "",
        },
        {
            label: "10. ฝาครอบแบตเตอรี่",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_battery",
            readonly: false,
            value: dbVehicle?.vehicle_right_battery ?? "",
        },
        {
            label: "11. ถังดับเพลิง",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_fire",
            readonly: false,
            value: dbVehicle?.vehicle_right_fire ?? "",
        },
        {
            label: "12. ขอนหนุนล้อ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_wheelchock",
            readonly: false,
            value: dbVehicle?.vehicle_right_wheelchock ?? "",
        },
        {
            label: "13. กรวยจราจร",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_right_cone",
            readonly: false,
            value: dbVehicle?.vehicle_right_cone ?? "",
        },
        {
            label: "14. ความสะอาดด้านขวารถ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" }
            ],
            icon: null,
            fieldKey: "vehicle_right_cleanliness",
            readonly: false,
            value: dbVehicle?.vehicle_right_cleanliness ?? "",
        }
    ]

    const vehicle_inside = [
        {
            label: "0. แนบรูปถ่ายด้านขวารถ",
            type: "upload" as const,
            icon: null,
            fieldKey: "vehicle_inside_photo",
            readonly: false,
            value: dbVehicle?.vehicle_inside_photo ?? "",
        },
        {
            label: "1. ยาสารมัญ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_inside_medicine",
            readonly: false,
            value: dbVehicle?.vehicle_inside_medicine ?? "",
        },
        {
            label: "2. สมุดเล่มเหลือง",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_inside_yellowbook",
            readonly: false,
            value: dbVehicle?.vehicle_inside_yellowbook ?? "",
        },
        {
            label: "3. กล้องติดรถ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },

            ],
            icon: null,
            fieldKey: "vehicle_inside_camera",
            readonly: false,
            value: dbVehicle?.vehicle_inside_camera ?? "",
        },
        {
            label: "4. เครื่องรูดบัตร",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_inside_cardreader",
            readonly: false,
            value: dbVehicle?.vehicle_inside_cardreader ?? "",
        },
        {
            label: "5. เข็มขัดนิรภัย",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_inside_seatbelt",
            readonly: false,
            value: dbVehicle?.vehicle_inside_seatbelt ?? "",
        },
        {
            label: "6. ไฟแสงสว่างในห้องโดยสาร",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_inside_cabinlight",
            readonly: false,
            value: dbVehicle?.vehicle_inside_cabinlight ?? "",
        },
        {
            label: "7. มีการตรวจรถประจำวัน",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_inside_dailycheck",
            readonly: false,
            value: dbVehicle?.vehicle_inside_dailycheck ?? "",
        },
        {
            label: "8. เสียงแตรดัง",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_inside_horn",
            readonly: false,
            value: dbVehicle?.vehicle_inside_horn ?? "",
        },
        {
            label: "9. เบรคมือและเบรคเท้า",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
                { value: "ไม่มีให้ตรวจ", label: "ไม่มีให้ตรวจ" },
            ],
            icon: null,
            fieldKey: "vehicle_inside_brake",
            readonly: false,
            value: dbVehicle?.vehicle_inside_brake ?? "",
        },
        {
            label: "10. ไม่มีอาวุธ สารเสพติด และเเอลกอฮอล์",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" },
            ],
            icon: null,
            fieldKey: "vehicle_inside_noillegal",
            readonly: false,
            value: dbVehicle?.vehicle_inside_noillegal ?? "",
        },
        {
            label: "11. ความสะอาดภายในรถ",
            type: "checkbox" as const,
            options: [
                { value: "ผ่าน", label: "ผ่าน" },
                { value: "ไม่ผ่าน", label: "ไม่ผ่าน" }
            ],
            icon: null,
            fieldKey: "vehicle_inside_cleanliness",
            readonly: false,
            value: dbVehicle?.vehicle_inside_cleanliness ?? "",
        }
    ]

    /* ── Image lightbox (preview) ── */
    const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
    useEffect(() => {
        if (!previewImage) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPreviewImage(null); };
        document.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [previewImage]);

    const vehicleSections = [
        { key: "front" as const, title: "ด้านหน้า", short: "หน้า", icon: <ArrowBigUp size={18} />, color: "from-rose-500 to-pink-600", data: vehicle_front },
        { key: "left" as const, title: "ด้านซ้าย", short: "ซ้าย", icon: <ArrowBigLeft size={18} />, color: "from-sky-500 to-sky-600", data: vehicle_left },
        { key: "rear" as const, title: "ด้านหลัง", short: "หลัง", icon: <ArrowBigDown size={18} />, color: "from-amber-500 to-orange-500", data: vehicle_rear },
        { key: "right" as const, title: "ด้านขวา", short: "ขวา", icon: <ArrowBigRight size={18} />, color: "from-emerald-500 to-teal-600", data: vehicle_right },
        { key: "inside" as const, title: "ภายในรถ", short: "ภายใน", icon: <Truck size={18} />, color: "from-violet-500 to-fuchsia-600", data: vehicle_inside },
    ];
    // Aggregate grand totals
    const completionStats = countSection(
        [...alchol_tested, ...drug_tested, ...ppe_checked] as any,
        true,
    );
    const vehicleStats = countSection(
        [...vehicle_front, ...vehicle_left, ...vehicle_rear, ...vehicle_right, ...vehicle_inside] as any,
    );
    const grand = {
        pass: completionStats.pass + vehicleStats.pass,
        fail: completionStats.fail + vehicleStats.fail,
        na: completionStats.na + vehicleStats.na,
        empty: completionStats.empty + vehicleStats.empty,
        total: completionStats.total + vehicleStats.total,
    };
    const grandPct = grand.total ? Math.round(((grand.pass + grand.fail + grand.na) / grand.total) * 100) : 0;

    const getDrugRemark = (k: string) => String(drugAlcohol?.[k] ?? "");
    const getPpeRemark = (k: string) => String(dbPPE?.[k] ?? "");
    const getVehicleRemark = (k: string) => String(dbVehicle?.[k] ?? "");

    // Aggregate every editable field with its section + change handler so the breakdown modal can edit any of them
    type AggField = {
        section: string;
        label: string;
        fieldKey: string;
        type: string;
        value: string;
        options?: { value: string; label: string }[];
        onChange: (k: string, v: string) => void;
        getRemark: (k: string) => string;
    };
    const buildAgg = (
        section: string,
        list: any[],
        onChange: (k: string, v: string) => void,
        getRemark: (k: string) => string,
    ): AggField[] =>
        list
            .filter((f) => f.type !== "upload")
            .map((f) => ({
                section,
                label: f.label,
                fieldKey: f.fieldKey,
                type: f.type,
                value: String(f.value ?? ""),
                options: f.options,
                onChange,
                getRemark,
            }));
    const allFields: AggField[] = [
        ...buildAgg("ตรวจแอลกอฮอล์", alchol_tested as any, handleDrugAlcoholChange, getDrugRemark),
        ...buildAgg("ตรวจสารเสพติด", drug_tested as any, handleDrugAlcoholChange, getDrugRemark),
        ...buildAgg("PPE", ppe_checked as any, handlePPEChange, getPpeRemark),
        ...buildAgg("ตรวจสภาพรถ — ด้านหน้า", vehicle_front as any, handleVehicleChange, getVehicleRemark),
        ...buildAgg("ตรวจสภาพรถ — ด้านซ้าย", vehicle_left as any, handleVehicleChange, getVehicleRemark),
        ...buildAgg("ตรวจสภาพรถ — ด้านหลัง", vehicle_rear as any, handleVehicleChange, getVehicleRemark),
        ...buildAgg("ตรวจสภาพรถ — ด้านขวา", vehicle_right as any, handleVehicleChange, getVehicleRemark),
        ...buildAgg("ตรวจสภาพรถ — ภายในรถ", vehicle_inside as any, handleVehicleChange, getVehicleRemark),
    ];
    const breakdownFields = breakdownTone
        ? allFields.filter((f) => statusTone(f.value, f.type) === breakdownTone)
        : [];
    const breakdownGroups = breakdownFields.reduce<Record<string, AggField[]>>((acc, f) => {
        (acc[f.section] ??= []).push(f);
        return acc;
    }, {});
    const toneMeta: Record<string, { title: string; color: string; ring: string }> = {
        pass: { title: "รายการที่ผ่าน", color: "text-emerald-300", ring: "ring-emerald-400/30" },
        fail: { title: "รายการที่ไม่ผ่าน", color: "text-rose-300", ring: "ring-rose-400/30" },
        na: { title: "รายการ N/A", color: "text-zinc-300", ring: "ring-zinc-400/30" },
        empty: { title: "รายการที่ยังไม่ได้กรอก", color: "text-amber-300", ring: "ring-amber-400/30" },
    };

    return (
        <NavComponent>
            <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-[#3d5578] relative overflow-hidden">

                <div className="relative w-full mt-5 sm:mt-2 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                    {/* ── Header row ── */}
                    <PageHeader
                        items={[
                            { label: "Home", onClick: () => router.push("/trainer-app") },
                            { label: `${taskPlantName || taskPlantCode || "..."} (${String(taskId)})`, onClick: () => router.push(`/trainer-app/${taskId}`) },
                            { label: masterDriverLabel || String(subid ?? "") },
                        ]}
                        rightSlot={
                            <Badge className="bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 px-3 py-1.5 text-xs font-medium rounded-lg w-fit flex items-center gap-1.5">
                                <User size={12} />
                                ตรวจสอบคนขับ
                            </Badge>
                        }
                    />

                    {/* ── Hero summary (live grand totals) ── */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-teal-900/30 backdrop-blur-md p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-200 border border-teal-400/30">
                                    <ClipboardCheck size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">บันทึกผลการตรวจสอบคนขับ</h2>
                                    <p className="text-sm sm:text-base text-white/60">{masterDriverLabel || String(subid ?? "")} · {taskPlantName || taskPlantCode}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2 sm:gap-3 sm:w-auto w-full">
                                <button type="button" onClick={() => setBreakdownTone("pass")} className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-center hover:bg-emerald-500/20 hover:border-emerald-400/40 transition-all active:scale-[0.97] cursor-pointer">
                                    <div className="text-xl sm:text-2xl font-bold text-emerald-300 font-mono">{grand.pass}</div>
                                    <div className="text-xs sm:text-sm text-emerald-200/70">ผ่าน</div>
                                </button>
                                <button type="button" onClick={() => setBreakdownTone("fail")} className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-center hover:bg-rose-500/20 hover:border-rose-400/40 transition-all active:scale-[0.97] cursor-pointer">
                                    <div className="text-xl sm:text-2xl font-bold text-rose-300 font-mono">{grand.fail}</div>
                                    <div className="text-xs sm:text-sm text-rose-200/70">ไม่ผ่าน</div>
                                </button>
                                <button type="button" onClick={() => setBreakdownTone("na")} className="rounded-xl border border-zinc-400/20 bg-zinc-500/10 px-3 py-2.5 text-center hover:bg-zinc-500/20 hover:border-zinc-400/40 transition-all active:scale-[0.97] cursor-pointer">
                                    <div className="text-xl sm:text-2xl font-bold text-zinc-300 font-mono">{grand.na}</div>
                                    <div className="text-xs sm:text-sm text-zinc-200/70">N/A</div>
                                </button>
                                <button type="button" onClick={() => setBreakdownTone("empty")} className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-center hover:bg-amber-500/20 hover:border-amber-400/40 transition-all active:scale-[0.97] cursor-pointer">
                                    <div className="text-xl sm:text-2xl font-bold text-amber-300 font-mono">{grand.empty}</div>
                                    <div className="text-xs sm:text-sm text-amber-200/70">ค้าง</div>
                                </button>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-sm text-white/70 mb-2">
                                <span className="font-medium">ความคืบหน้ารวม</span>
                                <span className="font-mono text-teal-300 font-semibold text-base">{grandPct}%  ({grand.pass + grand.fail + grand.na}/{grand.total})</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all" style={{ width: `${grandPct}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* ── Alcohol & Drug ── */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 px-1">
                            <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-500/30 to-fuchsia-600/30 border border-amber-400/30 text-amber-200">
                                <Pill size={20} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">การตรวจแอลกอฮอล์ &amp; สารเสพติด</h2>
                                <p className="text-sm text-white/60">Alcohol &amp; Drug Test</p>
                            </div>
                            <span className="hidden sm:inline-flex items-center rounded-md bg-white/10 border border-white/15 px-3 py-1 text-sm text-white/70 font-mono">2 รายการ</span>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <EditableSectionCard
                                title="ตรวจแอลกอฮอล์"
                                subtitle=""
                                icon={<Beer size={16} />}
                                accent=""
                                fields={alchol_tested as any}
                                photoKey="alcohol_breathalyzer_result"
                                completionMode
                                onChange={handleDrugAlcoholChange}
                                getRemark={getDrugRemark}
                                existingUploads={existingUploads}
                                uploadConfig={uploadConfig}
                                onPreview={setPreviewImage}
                            />
                            <EditableSectionCard
                                title="ตรวจสารเสพติด"
                                subtitle=""
                                icon={<Pill size={16} />}
                                accent=""
                                fields={drug_tested as any}
                                photoKey="drug_test_result"
                                completionMode
                                onChange={handleDrugAlcoholChange}
                                getRemark={getDrugRemark}
                                existingUploads={existingUploads}
                                uploadConfig={uploadConfig}
                                onPreview={setPreviewImage}
                            />
                        </div>
                    </div>

                    {/* ── PPE ── */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 px-1">
                            <div className="p-2.5 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-400/30 text-cyan-200">
                                <Shield size={20} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">การตรวจอุปกรณ์ป้องกันส่วนบุคคล</h2>
                                <p className="text-sm text-white/60">Personal Protective Equipment (PPE)</p>
                            </div>
                            <span className="hidden sm:inline-flex items-center rounded-md bg-white/10 border border-white/15 px-3 py-1 text-sm text-white/70 font-mono">PPE</span>
                        </div>
                        <EditableSectionCard
                            title=""
                            subtitle=""
                            icon={null}
                            accent=""
                            fields={ppe_checked as any}
                            photoKey="ppe_photo"
                            completionMode
                            onChange={handlePPEChange}
                            getRemark={getPpeRemark}
                            existingUploads={existingUploads}
                            uploadConfig={uploadConfig}
                            onPreview={setPreviewImage}
                        />
                    </div>

                    {/* ── Vehicle Inspection — 5 sides ── */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 px-1">
                            <div className="p-2.5 rounded-lg bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/30 text-teal-200">
                                <Truck size={20} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">การตรวจสภาพรอบรถ</h2>
                                <p className="text-sm text-white/60">Vehicle Inspection — 5 sides</p>
                            </div>
                            <span className="hidden sm:inline-flex items-center rounded-md bg-white/10 border border-white/15 px-3 py-1 text-sm text-white/70 font-mono">5 ด้าน</span>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {vehicleSections.map((s) => {
                                const checkFields = s.data.filter((f: any) => f.type === "checkbox");
                                const handleQuickPass = () => {
                                    setVehicleDirty(true);
                                    setdbVehicle((prev: any) => {
                                        const next = { ...(prev ?? {}) };
                                        checkFields.forEach((f: any) => {
                                            next[f.fieldKey] = "ผ่าน";
                                            // Clear any remark since item now passes
                                            delete next[`${f.fieldKey}_remark`];
                                        });
                                        return next;
                                    });
                                };
                                const handleQuickReset = async () => {
                                    const r = await Swal.fire({
                                        icon: "warning",
                                        title: `ล้างข้อมูล ${s.title}?`,
                                        text: "ค่าที่กรอกในด้านนี้จะถูกล้างทั้งหมด",
                                        showCancelButton: true,
                                        confirmButtonText: "ล้าง",
                                        cancelButtonText: "ยกเลิก",
                                        confirmButtonColor: "#e11d48",
                                    });
                                    if (!r.isConfirmed) return;
                                    setVehicleDirty(true);
                                    setdbVehicle((prev: any) => {
                                        const next = { ...(prev ?? {}) };
                                        checkFields.forEach((f: any) => {
                                            delete next[f.fieldKey];
                                            delete next[`${f.fieldKey}_remark`];
                                        });
                                        return next;
                                    });
                                };
                                return (
                                    <EditableSectionCard
                                        key={s.key}
                                        title={`ตรวจสภาพรถ ${s.title}`}
                                        subtitle={`Truck Inspection — ${s.short}`}
                                        icon={s.icon}
                                        accent={`${s.color.replace(/from-(\S+)/, 'from-$1/70').replace(/to-(\S+)/, 'to-$1/70')}`}
                                        fields={s.data as any}
                                        photoKey={`vehicle_${s.key}_photo`}
                                        onChange={handleVehicleChange}
                                        getRemark={getVehicleRemark}
                                        existingUploads={existingUploads}
                                        uploadConfig={uploadConfig}
                                        onPreview={setPreviewImage}
                                        onQuickPass={handleQuickPass}
                                        onQuickReset={handleQuickReset}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Spacer for sticky bottom bar */}
                    <div className="h-20" aria-hidden />
                </div>

                {/* ── Sticky Save bar (single bottom button) ── */}
                <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-900/80 backdrop-blur-lg shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
                    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
                        <div className="hidden sm:flex flex-col text-xs text-white/60 mr-auto">
                            <span className="font-semibold text-white/80">ความคืบหน้า {grandPct}%</span>
                            <span className="font-mono">กรอกแล้ว {grand.pass + grand.fail + grand.na}/{grand.total} · ค้าง {grand.empty}</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={saving}
                            className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <RotateCcw size={14} />
                            ล้างทั้งหมด
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || !inspectionTaskDriverId}
                            className="flex-1 sm:flex-none sm:min-w-[240px] flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-teal-500/25 hover:bg-teal-600 hover:shadow-teal-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={16} />
                            {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลทั้งหมด"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Breakdown modal: edit fields by Grand category ── */}
            {breakdownTone && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={toneMeta[breakdownTone].title}
                    onClick={() => setBreakdownTone(null)}
                    className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-150"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`relative w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-slate-900 border border-white/10 sm:rounded-2xl shadow-2xl ring-1 ${toneMeta[breakdownTone].ring}`}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-base sm:text-lg font-bold ${toneMeta[breakdownTone].color} truncate`}>{toneMeta[breakdownTone].title}</h3>
                                <p className="text-xs sm:text-sm text-white/60">{breakdownFields.length} รายการ · แก้ไขแล้วกด “บันทึก”</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setBreakdownTone(null)}
                                aria-label="ปิด"
                                className="rounded-lg bg-white/10 hover:bg-white/20 text-white p-2 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                            {breakdownFields.length === 0 && (
                                <div className="text-center text-white/60 py-12 text-sm">ไม่มีรายการในหมวดนี้</div>
                            )}
                            {Object.entries(breakdownGroups).map(([section, items]) => (
                                <div key={section} className="space-y-2">
                                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wider px-1">{section} <span className="text-white/30 font-mono">({items.length})</span></div>
                                    <ul className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/5">
                                        {items.map((f) => {
                                            const value = f.value;
                                            const remark = f.getRemark(`${f.fieldKey}_remark`);
                                            const showRemark = value === "ไม่ผ่าน";
                                            const selectTone = !value
                                                ? "bg-white/5 border-white/15 text-white/60"
                                                : STATUS_PASS.includes(value) ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-100"
                                                    : STATUS_FAIL.includes(value) ? "bg-rose-500/15 border-rose-400/40 text-rose-100"
                                                        : STATUS_NA.includes(value) ? "bg-zinc-500/15 border-zinc-400/40 text-zinc-100"
                                                            : "bg-white/10 border-white/20 text-white";
                                            return (
                                                <li key={`${section}-${f.fieldKey}`} className="px-3 py-3 flex items-start justify-between gap-3">
                                                    <span className="flex-1 text-sm sm:text-base text-white/85 leading-snug pt-2">{f.label}</span>
                                                    <div className="shrink-0 w-[160px] sm:w-[200px] flex flex-col gap-1.5">
                                                        {f.type === "text" ? (
                                                            <input
                                                                type="text"
                                                                value={value}
                                                                onChange={(e) => f.onChange(f.fieldKey, e.target.value)}
                                                                placeholder="—"
                                                                className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-base text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400/40"
                                                            />
                                                        ) : (
                                                            <select
                                                                value={value}
                                                                onChange={(e) => f.onChange(f.fieldKey, e.target.value)}
                                                                className={`w-full rounded-md border px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-teal-400/40 transition-colors ${selectTone}`}
                                                            >
                                                                <option value="" className="bg-slate-800 text-white">— เลือก —</option>
                                                                {f.options?.filter((o) => o.value !== "").map((o) => (
                                                                    <option key={o.value} value={o.value} className="bg-slate-800 text-white">{o.label}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        {showRemark && (
                                                            <input
                                                                type="text"
                                                                value={remark}
                                                                onChange={(e) => f.onChange(`${f.fieldKey}_remark`, e.target.value)}
                                                                placeholder="เหตุผลที่ไม่ผ่าน *"
                                                                className={`w-full rounded-md border px-3 py-1.5 text-sm text-rose-100 placeholder:text-rose-200/50 focus:outline-none focus:ring-2 ${!remark.trim()
                                                                    ? "border-rose-400/70 bg-rose-500/15 ring-1 ring-rose-400/40 focus:ring-rose-400/60"
                                                                    : "border-rose-400/30 bg-rose-500/5 focus:ring-rose-400/40"
                                                                    }`}
                                                            />
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-3 px-5 py-3 border-t border-white/10 bg-slate-900/80">
                            <span className="text-xs text-white/50 mr-auto">รายการจะอัปเดตทันที กด “บันทึก” เพื่อส่งไปยังเซิร์ฟเวอร์</span>
                            <button
                                type="button"
                                onClick={() => setBreakdownTone(null)}
                                className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 text-white/80 px-4 py-2 text-sm font-medium transition"
                            >
                                ปิด
                            </button>
                            <button
                                type="button"
                                disabled={saving || !inspectionTaskDriverId}
                                onClick={async () => { await handleSave(); }}
                                className="flex items-center gap-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-teal-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={14} />
                                {saving ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Image lightbox ── */}
            {previewImage && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={previewImage.title}
                    onClick={() => setPreviewImage(null)}
                    className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150"
                >
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
                        aria-label="ปิด"
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 rounded-full bg-white/10 hover:bg-white/20 text-white p-2 backdrop-blur transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                    >
                        <X size={22} />
                    </button>
                    <div className="absolute top-4 left-4 sm:top-6 sm:left-6 max-w-[60%] truncate rounded-lg bg-white/10 backdrop-blur px-3 py-1.5 text-sm text-white/90 font-medium">
                        {previewImage.title}
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={previewImage.url}
                        alt={previewImage.title}
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl select-none"
                    />
                </div>
            )}
        </NavComponent>
    );
}