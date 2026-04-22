"use client";

// =============================================================================
// Page: /trainer-app/[id]
// -----------------------------------------------------------------------------
// หน้ารายละเอียด inspection task 1 งาน
//   • ฟอร์มข้อมูลงาน (FormRender + taskFields)
//   • Safety Talk (SafetyTalkCard)
//   • รายชื่อพนักงานขับ (DriverTable)
//   • ช่องอัปโหลดรูปประกอบ (UPLOAD_SLOTS_COUNT ช่อง)  → S3 ผ่าน /api/attachment
// =============================================================================

import { useState, useEffect, useRef, use } from "react";
import Swal from "sweetalert2";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { NavComponent } from "@/components/Navbar";
import type { TaskDetail, SafetyTalkFields, Users as UsersType } from "../type";
import { UPLOAD_SLOTS_COUNT, TASK_TABLE_STATUS } from "../constant";
import { mapSingleTask } from "@/lib/trainerMapper";
import { FormRender } from "../_components/render";
import { SafetyTalkCard } from "../_components/SafetyTalkCard";
import { DriverTable } from "../_components/DriverTable";
import { PageHeader } from "../_components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { LordIcon } from "@/components/LordIcon";
import { ImageGalleryDialog } from "@/components/ImageGalleryDialog";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft, Presentation, Truck, User,
    CalendarDays, ClipboardList, Users, ImagePlus, X, Eye,
} from "lucide-react";


export default function TrainerApp_ID() {
    const { id: taskId } = useParams();
    const searchParams = useSearchParams();
    const step = searchParams.get("step") ?? "0";
    const [data, setData] = useState<TaskDetail | null>(null);
    const [safetyTalk, setSafetyTalk] = useState<SafetyTalkFields>({
        topics: [],
        noted: "",
        upload_url: "",
    });
    const [safetyTalkId, setSafetyTalkId] = useState<string | null>(null);
    const [safetyTalkSaving, setSafetyTalkSaving] = useState(false);
    const [uploadPreviews, setUploadPreviews] = useState<Record<string, { url: string; s3Key: string }>>({});
    const [draggingMap, setDraggingMap] = useState<Record<string, boolean>>({});
    const [UserSafety, setUserSafety] = useState<UsersType[]>([]);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const router = useRouter();

    const uploadSlots = Array.from({ length: UPLOAD_SLOTS_COUNT }, (_, index) => ({
        id: `slot-${index + 1}`,
    }));

    useEffect(() => {
        const fetchUserSafety = async () => {
            try {
                const res = await fetch(`/api/organization?department_id=8&employee_status=Active`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (res.ok) {
                    const data: UsersType[] = await res.json();
                    setUserSafety(data);
                }
            } catch (e) {
                console.error("Failed to fetch UserSafety:", e);
            }
        };
        fetchUserSafety();
    }, []);

    useEffect(() => {
        if (!taskId || step !== "0") return;

        const fetchAll = async () => {
            try {
                const [taskRes, safetyTalkRes] = await Promise.all([
                    fetch(`/api/task/${taskId}`, {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    }),
                    fetch(`/api/task/${taskId}/safety-talk`),
                ]);

                if (!taskRes.ok) {
                    console.error("Failed to fetch task details:", await taskRes.text());
                    return;
                }

                const result: TaskDetail = await taskRes.json();
                // console.log("Fetched task detail:", result);
                setData(result);
                // Load existing safety talk
                if (safetyTalkRes.ok) {
                    const stData = await safetyTalkRes.json();
                    if (stData && stData.safety_talk_id) {
                        setSafetyTalkId(stData.safety_talk_id);
                        setSafetyTalk({
                            topics: stData.topics ?? [],
                            noted: stData.noted ?? "",
                            upload_url: stData.upload_url ?? "",
                        });
                    }
                }
            } catch (error) {
                if (500 <= (error as any)?.status && (error as any)?.status < 600) {
                    console.error("Error fetching task details:", error);
                    Swal.fire("ผิดพลาด", "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง", "error");
                }
            }
        };

        fetchAll();
    }, [taskId, step]);

    // Load existing uploaded files from S3
    useEffect(() => {
        if (!taskId) return;
        const loadUploadedFiles = async () => {
            try {
                const res = await fetch(
                    `/api/task/${encodeURIComponent(taskId as string)}/upload?task_id=${encodeURIComponent(taskId as string)}`
                );
                if (!res.ok) return;
                const { files } = await res.json();
                if (!files || files.length === 0) return;
                const previews: Record<string, { url: string; s3Key: string }> = {};
                files.forEach((file: { url: string; key: string }, index: number) => {
                    if (index < UPLOAD_SLOTS_COUNT) {
                        previews[`slot-${index + 1}`] = { url: file.url, s3Key: file.key };
                    }
                });
                setUploadPreviews(previews);
            } catch (e) {
                console.error("Failed to load uploaded files:", e);
            }
        };
        loadUploadedFiles();
    }, [taskId]);

    // check update status if status driver task all completed and action date have value then update status to done 
    // else if action date doest not have value or status driver task not all completed then update status to pending 
    // else do nothing
    useEffect(() => {
        // api update status is /api/task/{task_id} method PUT body { inspection_task_status: "done" or "pending" }
        if (!data || !taskId) return;
        const allCompleted = data.drivers?.every(d => d.inspection_task_driver_status === "completed");
        const hasActionDate = !!data.task.action_date;
        const newStatus = allCompleted && hasActionDate ? "completed" : (hasActionDate ? "pending" : "open");
        if (data.task.inspection_task_status === newStatus) return;
        const updateStatus = async () => {
            try {
              const res  = await fetch(`/api/task/${encodeURIComponent(taskId as string)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ inspection_task_status: newStatus }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    console.error("Failed to update task status:", err.error || "Unknown error");
                    return;
                }
                setData((prev) => prev ? { ...prev, task: { ...prev.task, inspection_task_status: newStatus } } : prev);
            } catch (e) {
                console.error("Failed to update task status:", e);
            }
            };

        updateStatus();

    }, [data?.task.inspection_task_status, data?.drivers, data?.task.action_date]);


    const taskFields = [
        {
            label: "เทรนเนอร์",
            type: "dropdown" as const,
            icon: "user",
            fieldKey: "trainer_id",
            readonly: false,
            value: data?.task.trainer_id ?? "",
            options: [
                ...UserSafety.map((u) => ({
                    value: String(u.employee_id),
                    label: `${u.firstname} ${u.lastname}`,
                })),
            ],
        },
        {
            label: "ลูกค้า",
            type: "text" as const,
            icon: "user",
            fieldKey: "client_name",
            readonly: true,
            value: data?.task.client_name ?? "",
        },
        {
            label: "แพล้นท์",
            type: "text" as const,
            icon: "user",
            fieldKey: "plant_name",
            readonly: true,
            value: data?.task.plant_name || data?.task.plant_code || "",
        },
        {
            label: "วันที่วางแผน",
            type: "date" as const,
            icon: "calendar",
            fieldKey: "plan_date",
            readonly: true,
            value: data?.task.plan_date ?? "",
        },
        {
            label: "วันที่ดำเนินการจริง",
            type: "date" as const,
            icon: "calendar",
            fieldKey: "action_date",
            readonly: false,
            value: data?.task.action_date ?? "",
        },
    ];

    const handleSaveSafetyTalk = async () => {
        if (!taskId) return;
        setSafetyTalkSaving(true);
        try {
            const method = safetyTalkId ? "PUT" : "POST";
            const res = await fetch(`/api/task/${encodeURIComponent(taskId as string)}/safety-talk`, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topics: safetyTalk.topics,
                    noted: safetyTalk.noted || null,
                    upload_url: safetyTalk.upload_url || null,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                Swal.fire("ผิดพลาด", err.error || "ไม่สามารถบันทึก Safety Talk ได้", "error");
                return;
            }
            const saved = await res.json();
            if (saved.safety_talk_id) setSafetyTalkId(saved.safety_talk_id);
            Swal.fire("สำเร็จ!", "บันทึก Safety Talk เรียบร้อยแล้ว", "success");
        } catch {
            Swal.fire("ผิดพลาด", "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
        } finally {
            setSafetyTalkSaving(false);
        }
    };

    const handleFieldChange = (fieldKey: string, value: string) => {
        setData((prev) => {
            if (!prev) return prev;
            return { ...prev, task: { ...prev.task, [fieldKey]: value } };
        });
    };

    const handleSubmit = async () => {
        if (!data || !taskId) return;

        const task = data.task;
        const hasActionDate = !!task.action_date;
        const status = hasActionDate ? "pending" : "open";

        const result = await Swal.fire({
            title: 'ยืนยันบันทึก?',
            text: "คุณต้องการบันทึกข้อมูลนี้หรือไม่",
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
            const res = await fetch(`/api/task/${encodeURIComponent(taskId as string)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trainer_id: task.trainer_id || null,
                    client_name: task.client_name || null,
                    action_date: task.action_date || null,
                    inspection_task_status: status,
                    drug_test_attachment: `https://mena-safety-ncac.vercel.app/trainer-app/images/${encodeURIComponent(taskId as string)}`,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                Swal.fire('ผิดพลาด', err.error || 'ไม่สามารถอัปเดตงานได้', 'error');
                return;
            }

            const updated = await res.json();
            setData((prev) => prev ? { ...prev, task: { ...prev.task, ...updated } } : prev);
            Swal.fire('สำเร็จ!', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
        } catch {
            Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        }
    };

    const uploadFileToS3 = async (key: string, file: File) => {
        if (!taskId) return;
        const ext = file.name.substring(file.name.lastIndexOf('.'));
        const filename = file.name.substring(0, file.name.lastIndexOf('.'));
        const renamedFile = new File([file], `${taskId}_${filename}_ALL${ext}`, { type: file.type });
        const formData = new FormData();
        formData.append('files', renamedFile);
        formData.append('task_id', taskId as string);
        try {
            const res = await fetch(`/api/task/${encodeURIComponent(taskId as string)}/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                Swal.fire("ผิดพลาด", "ไม่สามารถอัปโหลดรูปภาพได้", "error");
                return;
            }
            const { paths } = await res.json();
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result;
                if (typeof result === "string") {
                    setUploadPreviews((prev) => ({
                        ...prev,
                        [key]: { url: result, s3Key: paths[0] },
                    }));
                }
            };
            reader.readAsDataURL(file);
        } catch {
            Swal.fire("ผิดพลาด", "เกิดข้อผิดพลาดในการอัปโหลด", "error");
        }
    };

    const updatePreviewFromFile = (key: string, file: File | undefined) => {
        if (!file || !file.type.startsWith("image/")) return;
        uploadFileToS3(key, file);
    };

    const handleDropUpload = (key: string, event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDraggingMap((prev) => ({ ...prev, [key]: false }));
        updatePreviewFromFile(key, event.dataTransfer.files?.[0]);
    };

    const clearUpload = async (key: string) => {
        const s3Key = uploadPreviews[key]?.s3Key;
        const confirm = await Swal.fire({
            title: 'ยืนยันลบรูปภาพ?',
            text: 'รูปภาพนี้จะถูกลบออกจากระบบ',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก',
        });
        if (!confirm.isConfirmed) return;

        if (s3Key) {
            try {
                await fetch(`/api/task/${encodeURIComponent(taskId as string)}/upload`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: s3Key }),
                });
            } catch (e) {
                console.error("Failed to delete file:", e);
            }
        }
        setUploadPreviews((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const driverCount = data?.drivers?.length ?? 0;
    const doneCount = data?.drivers?.filter(d => d.inspection_task_driver_status === "completed").length ?? 0;

    const statCards = [
        { label: "คนขับทั้งหมด", value: driverCount, icon: Users, iconBg: "from-indigo-500/30 to-blue-600/30", iconBorder: "border-indigo-400/30", iconText: "text-indigo-200" },
        { label: "ตรวจเสร็จ", value: doneCount, icon: ClipboardList, iconBg: "from-emerald-500/30 to-teal-600/30", iconBorder: "border-teal-400/30", iconText: "text-teal-200" },
    ];

    return (
        <NavComponent>
            <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-[#3d5578] relative overflow-hidden">

                <div className="relative w-full mt-5 sm:mt-2 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                    {/* ── Header row ── */}
                    <PageHeader
                        items={[
                            { label: "Home", onClick: () => router.push("/trainer-app") },
                            { label: `${data?.task.plant_name || data?.task.plant_code} (${data?.task.inspection_task_id ?? "..."})` },
                        ]}
                        rightSlot={data ? (() => {
                            const statusKey = data.task.inspection_task_status === "completed" ? "completed" : (data.task.inspection_task_status ?? "open");
                            const cfg = TASK_TABLE_STATUS[statusKey] ?? TASK_TABLE_STATUS.open;
                            const dotColor = statusKey === "open" ? "bg-blue-400" : statusKey === "pending" ? "bg-amber-400" : "bg-emerald-400";
                            return (
                                <div className="flex items-center justify-center gap-10 mr-5 mt-2">
                                    
                                    <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl border backdrop-blur-sm shadow-lg text-base font-bold tracking-wide ${cfg.className}`}>
                                        <span className="relative flex h-3 w-3">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${dotColor}`} />
                                            <span className={`relative inline-flex rounded-full h-3 w-3 ${dotColor}`} />
                                        </span>
                                        {cfg.label}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setGalleryOpen(true)}
                                        className="flex flex-col items-center gap-1 group rounded-2xl px-3 py-2 hover:bg-white/5 transition-all"
                                        aria-label="เปิดคลังรูปภาพ"
                                    >
                                        <LordIcon
                                            src="https://cdn.lordicon.com/rhrmfnhf.json"
                                            trigger="loop"
                                            delay={3000}
                                            colors="primary:#848484,secondary:#9cf4df,tertiary:#ffc738,quaternary:#e4e4e4,quinary:#b4b4b4,senary:#f24c00"
                                            style={{ width: 100, height: 100, transform: "scale(2.5)", cursor: "pointer" }}
                                        />
                                        <span className="text-xs font-semibold text-white/60 group-hover:text-teal-200 tracking-widest uppercase mt-1 transition-colors">คลังภาพ</span>
                                    </button>
                                </div>
                            );
                        })() : null}
                    />

                    
                    {/* ── Stat cards ── */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {statCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div
                                    key={card.label}
                                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 sm:p-5 transition-all duration-300 hover:border-teal-400/30 hover:bg-white/[0.08] hover:-translate-y-0.5"
                                >
                                    <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${card.iconBg} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500`} />
                                    <div className="relative flex items-start justify-between mb-3">
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${card.iconBg} border ${card.iconBorder} ${card.iconText} backdrop-blur-sm transition-transform duration-300 group-hover:scale-110`}>
                                            <Icon size={20} />
                                        </div>
                                    </div>
                                    <p className="relative text-2xl sm:text-3xl text-white font-bold tabular-nums tracking-tight">
                                        {card.value}
                                    </p>
                                    <p className="relative text-xs sm:text-sm font-medium text-white/60 mt-1">
                                        {card.label}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    <Separator className="bg-white/10" />

                    {/* ── Form: basic info ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                        <div>
                            <FormRender
                                title="ข้อมูลเบื้องต้น"
                                details="ข้อมูล Trainer และวันที่"
                                icon={<User size={16} strokeWidth={2} />}
                                isSubmit={true}
                                formData={taskFields}
                                onChange={handleFieldChange}
                                onSubmit={handleSubmit}
                            />
                        </div>

                        {/* ── Safety talk ── */}
                        <div>
                            <SafetyTalkCard
                                value={safetyTalk}
                                safetyTalkId={safetyTalkId}
                                onChange={setSafetyTalk}
                                onSave={handleSaveSafetyTalk}
                                saving={safetyTalkSaving}
                            />
                        </div>

                        {/* UploadImage */}
                        <div className="md:col-span-2">
                            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-lg shadow-black/10 overflow-hidden">
                                <div className="px-4 py-4 sm:px-5 sm:py-5 bg-gradient-to-r from-slate-900/60 via-slate-800/40 to-teal-900/30 border-b border-white/10 flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/30 rounded-xl shrink-0">
                                        <ImagePlus size={16} className="text-teal-200" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-xl font-bold text-white tracking-tight">รูปภาพประกอบ</h2>
                                        <p className="text-sm text-white/50 mt-0.5 hidden sm:block">รองรับสูงสุด 6 รูป — JPG / PNG</p>
                                    </div>
                                </div>
                                <div className="p-4 md:p-5 flex gap-4 overflow-x-auto cursor-grab active:cursor-grabbing select-none">
                                    {uploadSlots.map((slot, index) => {
                                        const key = slot.id;
                                        const inputId = `upload-${index}`;
                                        const preview = uploadPreviews[key]?.url;
                                        const isDragging = draggingMap[key];

                                        return (
                                            <div key={slot.id} className="w-[240px] shrink-0">
                                                <div
                                                    onDragOver={(event) => {
                                                        event.preventDefault();
                                                        setDraggingMap((prev) => ({ ...prev, [key]: true }));
                                                    }}
                                                    onDragLeave={() => setDraggingMap((prev) => ({ ...prev, [key]: false }))}
                                                    onDrop={(event) => handleDropUpload(key, event)}
                                                    className={`relative rounded-xl border-2 border-dashed transition-all backdrop-blur-sm ${isDragging
                                                        ? "border-teal-400/60 bg-teal-500/10 ring-2 ring-teal-400/20"
                                                        : "border-white/15 bg-white/5 hover:border-teal-400/40 hover:bg-white/[0.08]"
                                                        }`}
                                                >
                                                    {preview ? (
                                                        <div className="relative">
                                                            <img
                                                                src={preview}
                                                                alt="uploaded preview"
                                                                className="h-50 w-full rounded-lg object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewImage(preview)}
                                                                className="absolute right-12 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/30 text-white border border-sky-300/40 backdrop-blur-md hover:bg-sky-500/50 transition-colors"
                                                                aria-label="ขยายรูปภาพ"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => clearUpload(key)}
                                                                className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/30 text-white border border-rose-300/40 backdrop-blur-md hover:bg-rose-500/50 transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <label
                                                            htmlFor={inputId}
                                                            className="flex h-50 cursor-pointer flex-col items-center justify-center gap-1 text-center"
                                                        >
                                                            <div className={`p-2.5 rounded-full transition-colors ${isDragging ? "bg-teal-400/25 text-teal-100" : "bg-white/10 text-white/70"}`}>
                                                                <ImagePlus size={22} />
                                                            </div>
                                                            <p className="text-xs font-medium text-white/90 mt-1">อัปโหลดรูปภาพ</p>
                                                            <p className="text-[11px] text-white/40">รองรับ JPG / PNG </p>
                                                        </label>
                                                    )}

                                                    <input
                                                        id={inputId}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(event) => updatePreviewFromFile(key, event.target.files?.[0])}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ── Driver Table ── */}
                        <div className="md:col-span-2">
                            <DriverTable
                                title="พนักงานขับรถ"
                                details="รายการคนขับและสถานะการตรวจ"
                                icon={<Truck size={16} strokeWidth={2} />}
                                drivers={data?.drivers ?? []}
                                taskId={taskId as string}
                                onDriversChange={(updatedDrivers) => {
                                    setData((prev) => prev ? { ...prev, drivers: updatedDrivers } : prev);
                                }}
                            />
                        </div>

                    </div>
                </div>
            </div>
            <ImageGalleryDialog
                open={galleryOpen}
                onOpenChange={setGalleryOpen}
                taskId={taskId as string}
                title={data ? `${data.task.plant_name || data.task.plant_code} (${data.task.inspection_task_id})` : undefined}
            />
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        type="button"
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-md hover:bg-white/20 transition-colors"
                        aria-label="ปิด"
                    >
                        <X size={20} />
                    </button>
                    <img
                        src={previewImage}
                        alt="preview"
                        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </NavComponent>
    );
}