"use client";

// =============================================================================
// Component: RepairPhotoPicker
// -----------------------------------------------------------------------------
// ปุ่ม "ถ่ายรูป" / "เลือกจากคลังรูป" สำหรับแนบรูปตอนแจ้งซ่อม (ใช้ในหน้า
// trainer-app/[id]/[subid] ตอนเปิด dialog แจ้งซ่อม) — เลือกแล้วอัปโหลดผ่าน
// Media API (presign → PUT S3 → complete) ทันที ได้ media_id กลับมาเก็บไว้แนบ
// ตอนกด "ส่งซ่อม" (image_urls ของ repair-request item รับเป็น media_id string)
// =============================================================================

import { useRef } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";

export type RepairPhoto = {
    clientId: string;
    localPreview: string;
    mediaId: string | null;
    status: "uploading" | "uploaded" | "failed";
    error?: string | null;
};

export function RepairPhotoPicker({
    photos,
    onPick,
    onRemove,
    maxImages = 5,
    disabled = false,
}: {
    photos: RepairPhoto[];
    onPick: (file: File) => void;
    onRemove: (clientId: string) => void;
    maxImages?: number;
    disabled?: boolean;
}) {
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const slotsLeft = maxImages - photos.length;
    const pickersDisabled = disabled || slotsLeft <= 0;
    const hasPendingUpload = photos.some((p) => p.status === "uploading");

    const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = ""; // allow picking the same file again
        if (files.length === 0) return;
        files.slice(0, slotsLeft).forEach((file) => onPick(file));
    };

    return (
        <div className="space-y-2">
            <div className="text-[11px] text-white/50">
                สูงสุด {maxImages} รูป ({photos.length}/{maxImages})
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {photos.map((photo) => (
                    <div key={photo.clientId} className="relative">
                        <img
                            src={photo.localPreview}
                            alt=""
                            className="h-20 w-20 object-cover rounded-lg border-2 border-orange-400/30"
                        />
                        {photo.status === "uploading" && (
                            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                            </div>
                        )}
                        {photo.status === "failed" && (
                            <div className="absolute inset-0 bg-rose-500/30 rounded-lg flex items-center justify-center px-1">
                                <span className="text-[10px] text-rose-100 font-medium text-center leading-tight">ล้มเหลว</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => onRemove(photo.clientId)}
                            disabled={photo.status === "uploading"}
                            className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 disabled:opacity-40 shadow"
                            aria-label="ลบรูป"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}

                {slotsLeft > 0 && (
                    <div className="flex items-center gap-2">
                        <label
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition ${pickersDisabled
                                ? "opacity-50 pointer-events-none border-white/10 bg-white/5 text-white/40"
                                : "cursor-pointer border-orange-400/40 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20"
                                }`}
                        >
                            <Camera className="w-4 h-4" />
                            ถ่ายรูป
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                disabled={pickersDisabled}
                                onChange={handleFileChosen}
                                className="hidden"
                            />
                        </label>
                        <label
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition ${pickersDisabled
                                ? "opacity-50 pointer-events-none border-white/10 bg-white/5 text-white/40"
                                : "cursor-pointer border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                                }`}
                        >
                            <ImagePlus className="w-4 h-4" />
                            เลือกจากคลังรูป
                            <input
                                ref={galleryInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={pickersDisabled}
                                onChange={handleFileChosen}
                                className="hidden"
                            />
                        </label>
                    </div>
                )}
            </div>

            {hasPendingUpload && (
                <p className="text-xs text-amber-300">กำลังอัปโหลดรูป...</p>
            )}
        </div>
    );
}
