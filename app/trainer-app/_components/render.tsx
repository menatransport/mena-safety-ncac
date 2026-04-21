'use client';

// =============================================================================
// Component: FormRender + FileUploadField + TagsField
// -----------------------------------------------------------------------------
// ตัว render ฟอร์มแบบ generic อิง schema (FormField[])
// รองรับ field type:
//   text | date | textarea | dropdown | checkbox | tags | upload
// พร้อม sub-component:
//   • TagsField        — ช่องป้อนแบบติดแท็ก
//   • FileUploadField  — อัปโหลดไฟล์ S3 + drag&drop + preview/lightbox
// =============================================================================

import { User, CalendarDays, FileText, Upload, Trash2, Eye, X, Plus, XCircle, Save } from "lucide-react";
import { DateTimePicker24h } from "@/components/ui/datetime-picker";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { FormField } from "../type";

// Re-export so existing imports (`import { FormField } from "./render"`) keep working
export type { FormField };

const ICON_MAP: Record<string, React.ReactNode> = {
    user: <User size={15} className="text-teal-300" />,
    calendar: <CalendarDays size={15} className="text-teal-300" />,
    text: <FileText size={15} className="text-teal-300" />,
};

interface FormRenderProps {
    title: string;
    formData: FormField[];
    onChange?: (fieldKey: string, value: string) => void;
    onChangeArray?: (fieldKey: string, values: string[]) => void;
    isSubmit?: boolean;
    onSubmit?: () => void;
    details?: string;
    icon?: React.ReactNode;
    uploadConfig?: { apiUrl: string };
    existingUploads?: Record<string, { url: string; s3Key: string }>;
    /** Dense 2-column layout on lg+ screens (label stacked above input). Upload fields span full width. */
    dense?: boolean;
}

export const FormRender = ({ title, details, icon, formData, isSubmit, onChange, onChangeArray, onSubmit, uploadConfig, existingUploads, dense }: FormRenderProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localValues, setLocalValues] = useState<Record<string, string>>({});

    const getCurrentValue = (fieldKey: string, fallback: string) => {
        return localValues[fieldKey] ?? fallback ?? "";
    };

    const handleChange = (fieldKey: string, value: string) => {
        setIsSubmitting(true);
        setLocalValues((prev) => ({ ...prev, [fieldKey]: value }));
        onChange?.(fieldKey, value);
    }

    return (
        <div className="h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-lg shadow-black/10 overflow-hidden">
            {/* Section header */}
            <div className="px-4 py-4 sm:px-5 sm:py-5 bg-gradient-to-r from-slate-900/60 via-slate-800/40 to-teal-900/30 border-b border-white/10">
                <div className="flex justify-between gap-3">
                    <div className="flex items-start gap-3">
                        {icon && (
                            <div className="p-2 bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/30 rounded-xl shrink-0">
                                <span className="text-teal-200 [&>svg]:text-teal-200">{icon}</span>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                            {details && <p className="text-sm text-white/50 mt-0.5 hidden sm:block">{details}</p>}
                        </div>
                    </div>
                    {isSubmitting && isSubmit && (
                        <Button onClick={onSubmit} className="text-white bg-gradient-to-r from-emerald-500/40 to-teal-600/40 hover:from-emerald-500/60 hover:to-teal-600/60 border border-teal-400/40 backdrop-blur-sm shadow-md shadow-teal-500/20 font-lg p-2 rounded-xl cursor-pointer" >
                            <Save size={16} className="inline" />
                            บันทึก
                        </Button>
                    )}
                </div>
            </div>

            {/* Fields */}
            <div
                className={
                    dense
                        ? "p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-2 gap-3"
                        : "divide-y divide-white/5"
                }
            >
                {formData.map((field) => {
                    const isUpload = field.type === "upload";
                    const wrapperClass = dense
                        ? `rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-teal-400/20 transition-colors p-3 sm:p-4 flex flex-col gap-2 ${isUpload ? "lg:col-span-2" : ""}`
                        : "p-6 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8";
                    const labelClass = dense
                        ? "flex items-center gap-2"
                        : "flex items-center gap-2 sm:w-50 shrink-0 sm:pt-2";
                    const labelTextClass = dense
                        ? "text-base sm:text-lg font-semibold text-white/85"
                        : "text-lg font-bold text-white/85";
                    return (
                    <div key={field.fieldKey} className={wrapperClass}>
                        {/* Label */}
                        <div className={labelClass}>
                            {typeof field.icon === "string" ? ICON_MAP[field.icon] ?? ICON_MAP["text"] : field.icon}
                            <span className={labelTextClass}>{field.label}</span>
                        </div>

                        {/* Input */}
                        <div className="flex-1 min-w-0">
                            {field.type === "tags" ? (
                                <TagsField
                                    values={field.values ?? []}
                                    readonly={field.readonly}
                                    onChangeArray={(vals) => onChangeArray?.(field.fieldKey, vals)}
                                />
                            ) : field.type === "date" ? (
                                <DateTimePicker24h
                                    value={getCurrentValue(field.fieldKey, field.value) ? new Date(getCurrentValue(field.fieldKey, field.value)) : undefined}
                                    usedFor="date"
                                    disabled={field.readonly}
                                    variant="dark"
                                    onChange={(date) => {
                                        if (date) {
                                            const yyyy = date.getFullYear();
                                            const mm = String(date.getMonth() + 1).padStart(2, "0");
                                            const dd = String(date.getDate()).padStart(2, "0");
                                            handleChange(field.fieldKey, `${yyyy}-${mm}-${dd}`);
                                        }
                                    }}
                                />
                            ) : field.type === "textarea" ? (
                                <textarea
                                    value={getCurrentValue(field.fieldKey, field.value)}
                                    rows={3}
                                    readOnly={field.readonly}
                                    placeholder={field.readonly ? "—" : "พิมพ์ที่นี่..."}
                                    onChange={(e) => handleChange(field.fieldKey, e.target.value)}
                                    className={`w-full rounded-xl p-3 text-base placeholder:text-white/30 outline-none resize-y transition-colors ${field.readonly
                                        ? "cursor-not-allowed font-bold text-teal-200 bg-white/5 border border-white/10"
                                        : "text-white bg-white/5 border border-white/15 focus:border-teal-400/60 focus:ring-1 focus:ring-teal-400/20"
                                        }`}
                                />
                            ) : field.type === "upload" ? (
                                <FileUploadField
                                    fieldKey={field.fieldKey}
                                    readonly={field.readonly}
                                    onChange={handleChange}
                                    uploadConfig={uploadConfig}
                                    existingUpload={existingUploads?.[field.fieldKey]}
                                />
                            ) : field.type === "dropdown" ? (
                                <SearchableSelect
                                    options={field.options ?? []}
                                    value={getCurrentValue(field.fieldKey, field.value)}
                                    onChange={(val) => handleChange(field.fieldKey, String(val))}
                                    placeholder="-- เลือก --"
                                    disabled={field.readonly}
                                    variant="dark"
                                />
                            ) : field.type === "checkbox" ? (
                                <div className="space-y-2">
                                    <div className={dense ? "grid grid-cols-2 xl:grid-cols-3 gap-1.5" : "grid grid-cols-2 sm:grid-cols-4 gap-2"}>
                                        {field.options?.map((option) => {
                                            const checked = getCurrentValue(field.fieldKey, field.value) === option.value;

                                            return (
                                                <label
                                                    key={option.value}
                                                    className={`flex items-center gap-2 rounded-lg border ${dense ? "px-2 py-1.5 text-sm" : "px-3 py-2 text-lg"} transition-colors ${field.readonly
                                                        ? "cursor-not-allowed bg-white/5 border-white/10 text-teal-200 font-bold"
                                                        : checked
                                                            ? "border-teal-400/40 bg-teal-500/15 text-white hover:border-teal-400/60"
                                                            : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20 hover:bg-white/[0.06]"
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        disabled={field.readonly}
                                                        onChange={(e) => handleChange(field.fieldKey, e.target.checked ? option.value : "")}
                                                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-teal-500 focus:ring-teal-400/40"
                                                    />
                                                    <span>{option.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {getCurrentValue(field.fieldKey, field.value) === "ไม่ผ่าน" && (
                                        <input
                                            type="text"
                                            value={getCurrentValue(`${field.fieldKey}_remark`, formData.find((item) => item.fieldKey === `${field.fieldKey}_remark`)?.value ?? "")}
                                            readOnly={field.readonly}
                                            placeholder={field.readonly ? "—" : "โปรดระบุเหตุผลหากไม่ผ่าน..."}
                                            onChange={(e) => handleChange(`${field.fieldKey}_remark`, e.target.value)}
                                            className={`w-full rounded-xl h-11 px-3 text-base placeholder:text-white/30 outline-none transition-colors ${field.readonly
                                                ? "cursor-not-allowed font-bold text-teal-200 bg-white/5 border border-white/10"
                                                : "text-white bg-white/5 border border-white/15 focus:border-teal-400/60 focus:ring-1 focus:ring-teal-400/20"
                                                }`}
                                        />
                                    )}
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={getCurrentValue(field.fieldKey, field.value)}
                                    readOnly={field.readonly}
                                    placeholder={field.readonly ? "—" : "พิมพ์ที่นี่..."}
                                    onChange={(e) => handleChange(field.fieldKey, e.target.value)}
                                    className={`w-full rounded-xl h-11 px-3 text-base placeholder:text-white/30 outline-none transition-colors ${field.readonly
                                        ? "cursor-not-allowed font-bold text-teal-200 bg-white/5 border border-white/10"
                                        : "text-white bg-white/5 border border-white/15 focus:border-teal-400/60 focus:ring-1 focus:ring-teal-400/20"
                                        }`}
                                />
                            )}
                        </div>
                    </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ── Tags (Multi-value) Field ── */
function TagsField({ values, readonly, onChangeArray }: { values: string[]; readonly?: boolean; onChangeArray: (vals: string[]) => void }) {
    const [input, setInput] = useState("");

    const addTag = () => {
        const trimmed = input.trim();
        if (!trimmed || readonly) return;
        onChangeArray([...values, trimmed]);
        setInput("");
    };

    const removeTag = (idx: number) => {
        if (readonly) return;
        onChangeArray(values.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-2">
            {!readonly && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        placeholder="พิมพ์แล้วกด Enter หรือกดปุ่ม +"
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                        className="flex-1 rounded-xl h-10 px-3 text-md placeholder:text-zinc-300 outline-none text-zinc-700 bg-white border border-zinc-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 transition-colors"
                    />
                    <button
                        type="button"
                        onClick={addTag}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-500 text-white hover:bg-teal-600 active:scale-95 transition-all shrink-0"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            )}
            {values.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {values.map((tag, idx) => (
                        <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-md text-teal-700 font-medium"
                        >
                            <span className="text-[11px] text-teal-400 font-bold mr-0.5">{idx + 1}.</span>
                            {tag}
                            {!readonly && (
                                <button
                                    type="button"
                                    onClick={() => removeTag(idx)}
                                    className="ml-0.5 text-teal-400 hover:text-rose-500 transition-colors"
                                >
                                    <XCircle size={14} />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}
            {values.length === 0 && readonly && (
                <p className="text-md text-zinc-300">—</p>
            )}
        </div>
    );
}

/* ── File Upload with Drag & Drop + S3 ── */
export function FileUploadField({
    fieldKey, readonly, onChange, uploadConfig, existingUpload, onPreview, previewTitle,
}: {
    fieldKey: string;
    readonly?: boolean;
    onChange?: (fieldKey: string, value: string) => void;
    uploadConfig?: { apiUrl: string };
    existingUpload?: { url: string; s3Key: string };
    onPreview?: (p: { url: string; title: string }) => void;
    previewTitle?: string;
}) {
    const [preview, setPreview] = useState<string | null>(existingUpload?.url ?? null);
    const [s3Key, setS3Key] = useState<string | null>(existingUpload?.s3Key ?? null);
    const [isDragging, setIsDragging] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync from parent existingUpload
    useEffect(() => {
        if (existingUpload) {
            setPreview(existingUpload.url);
            setS3Key(existingUpload.s3Key);
        }
    }, [existingUpload]);

    const handleFile = useCallback(async (file: File) => {
        if (!file.type.startsWith("image/") && !file.type.startsWith("application/pdf")) return;

        if (uploadConfig) {
            // Upload to S3 immediately
            setUploading(true);
            try {
                const ext = file.name.substring(file.name.lastIndexOf('.'));
                const renamedFile = new File([file], `${fieldKey}${ext}`, { type: file.type });
                const formData = new FormData();
                formData.append('files', renamedFile);
                const res = await fetch(uploadConfig.apiUrl, { method: 'POST', body: formData });
                if (!res.ok) return;
                const { paths } = await res.json();
                // Show local preview
                const reader = new FileReader();
                reader.onload = (e) => setPreview(e.target?.result as string);
                reader.readAsDataURL(file);
                setS3Key(paths[0]);
                onChange?.(fieldKey, paths[0]);
            } catch (e) {
                console.error("Upload error:", e);
            } finally {
                setUploading(false);
            }
        } else {
            // Fallback: local preview only
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setPreview(result);
                onChange?.(fieldKey, result);
            };
            reader.readAsDataURL(file);
        }
    }, [fieldKey, onChange, uploadConfig]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (readonly) return;
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [readonly, handleFile]);

    const handleDelete = async () => {
        if (uploadConfig && s3Key) {
            try {
                await fetch(uploadConfig.apiUrl, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: s3Key }),
                });
            } catch (e) {
                console.error("Delete failed:", e);
            }
        }
        setPreview(null);
        setS3Key(null);
        onChange?.(fieldKey, "");
        if (inputRef.current) inputRef.current.value = "";
    };

    if (uploading) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-teal-300/40 bg-teal-400/10 backdrop-blur-sm py-8 px-4">
                <div className="animate-spin h-6 w-6 border-2 border-teal-300 border-t-transparent rounded-full" />
                <p className="text-sm text-teal-200 font-medium">กำลังอัปโหลด...</p>
            </div>
        );
    }

    if (preview) {
        return (
            <>
                <div className="relative group rounded-xl overflow-hidden border border-white/15 bg-slate-900/40 backdrop-blur-sm shadow-lg shadow-black/20">
                    <img
                        src={preview}
                        alt="preview"
                        className="w-full max-h-48 object-contain bg-gradient-to-br from-slate-800/60 to-slate-900/60"
                    />
                    {/* Subtle bottom gradient for action affordance */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onPreview && preview) {
                                    onPreview({ url: preview, title: previewTitle ?? fieldKey });
                                } else {
                                    setFullscreen(true);
                                }
                            }}
                            className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md shadow-md transition-all"
                            aria-label="ดูรูปเต็ม"
                        >
                            <Eye size={16} />
                        </button>
                        {!readonly && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-100 border border-rose-300/30 backdrop-blur-md shadow-md transition-all"
                                aria-label="ลบรูป"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {fullscreen && (
                    <div
                        className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setFullscreen(false)}
                    >
                        <button
                            type="button"
                            onClick={() => setFullscreen(false)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md transition-colors"
                            aria-label="ปิด"
                        >
                            <X size={20} />
                        </button>
                        <img
                            src={preview}
                            alt="fullscreen"
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </>
        );
    }

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); if (!readonly) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !readonly && inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed py-8 px-4 cursor-pointer transition-all backdrop-blur-sm ${readonly
                ? "border-white/10 bg-white/[0.03] cursor-default"
                : isDragging
                    ? "border-teal-300/60 bg-teal-400/10 ring-2 ring-teal-300/20"
                    : "border-white/15 bg-white/5 hover:border-teal-300/40 hover:bg-white/[0.08]"
                }`}
        >
            <div className={`p-2.5 rounded-full transition-colors ${isDragging
                ? "bg-teal-400/25 text-teal-100 ring-2 ring-teal-300/30"
                : "bg-white/10 text-white/70"
                }`}>
                <Upload size={20} />
            </div>
            <div className="text-center">
                <p className={`text-sm font-medium transition-colors ${isDragging ? "text-teal-100" : "text-white/90"
                    }`}>
                    {isDragging ? "วางไฟล์ที่นี่" : "อัปโหลดรูปภาพ"}
                </p>
                <p className="text-[11px] text-white/50 mt-0.5">รองรับ JPG, PNG</p>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                }}
            />
        </div>
    );
}
