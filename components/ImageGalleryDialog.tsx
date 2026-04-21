"use client";

import { useEffect, useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Images, Pill, Shield, Truck, ImageIcon, X, Loader2, Search } from "lucide-react";

type Category = "overview" | "drug" | "ppe" | "vehicle";

type VehicleSide = "front" | "left" | "rear" | "right" | "inside";

const VEHICLE_SIDE_LABEL: Record<VehicleSide, { label: string; color: string }> = {
    front: { label: "ด้านหน้า", color: "bg-blue-500/30 text-blue-100 border-blue-400/40" },
    left: { label: "ด้านซ้าย", color: "bg-emerald-500/30 text-emerald-100 border-emerald-400/40" },
    rear: { label: "ด้านหลัง", color: "bg-amber-500/30 text-amber-100 border-amber-400/40" },
    right: { label: "ด้านขวา", color: "bg-rose-500/30 text-rose-100 border-rose-400/40" },
    inside: { label: "ภายในรถ", color: "bg-violet-500/30 text-violet-100 border-violet-400/40" },
};

function parseVehicleSide(fileName: string): VehicleSide | null {
    const lower = fileName.toLowerCase();
    if (lower.startsWith("vehicle_front")) return "front";
    if (lower.startsWith("vehicle_left")) return "left";
    if (lower.startsWith("vehicle_rear")) return "rear";
    if (lower.startsWith("vehicle_right")) return "right";
    if (lower.startsWith("vehicle_inside")) return "inside";
    return null;
}

type GalleryItem = {
    key: string;
    fileName: string;
    url: string;
    driverName?: string;
};

type GalleryData = Record<Category, GalleryItem[]>;

const CATEGORY_TABS: { key: Category; label: string; shortLabel: string; icon: React.ElementType; accent: string }[] = [
    { key: "overview", label: "ภาพรวม", shortLabel: "ภาพรวม", icon: Images, accent: "from-teal-500/30 to-emerald-600/30 border-teal-400/40 text-teal-100" },
    { key: "drug", label: "สารเสพติด & แอลกอฮอล", shortLabel: "สารเสพติด", icon: Pill, accent: "from-rose-500/30 to-pink-600/30 border-rose-400/40 text-rose-100" },
    { key: "ppe", label: "อุปกรณ์ป้องกันส่วนบุคคล", shortLabel: "PPE", icon: Shield, accent: "from-amber-500/30 to-orange-600/30 border-amber-400/40 text-amber-100" },
    { key: "vehicle", label: "ยานพาหนะ", shortLabel: "ยานพาหนะ", icon: Truck, accent: "from-indigo-500/30 to-blue-600/30 border-indigo-400/40 text-indigo-100" },
];

interface ImageGalleryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskId: string;
    title?: string;
}

export function ImageGalleryDialog({ open, onOpenChange, taskId, title }: ImageGalleryDialogProps) {
    const [data, setData] = useState<GalleryData | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<Category>("overview");
    const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (!open || !taskId) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const res = await fetch(`/api/task/${encodeURIComponent(taskId)}/gallery`);
                if (!res.ok) return;
                const json = (await res.json()) as GalleryData;
                if (!cancelled) setData(json);
            } catch (e) {
                console.error("Gallery fetch failed", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open, taskId]);

    const counts = useMemo(() => {
        if (!data) return { overview: 0, drug: 0, ppe: 0, vehicle: 0 } as Record<Category, number>;
        return {
            overview: data.overview.length,
            drug: data.drug.length,
            ppe: data.ppe.length,
            vehicle: data.vehicle.length,
        };
    }, [data]);

    const items = useMemo(() => {
        const list = data?.[activeTab] ?? [];
        const q = search.trim().toLowerCase();
        if (!q) return list;
        return list.filter((it) =>
            (it.driverName?.toLowerCase().includes(q)) ||
            it.fileName.toLowerCase().includes(q)
        );
    }, [data, activeTab, search]);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="!max-w-7xl w-[98vw] sm:w-[95vw] h-[95vh] p-0 overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col"
                    showCloseButton={false}
                >
                    {/* Header */}
                    <DialogHeader className="shrink-0 px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-teal-900/30">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/30 shrink-0">
                                    <ImageIcon size={20} className="text-teal-200" />
                                </div>
                                <div className="min-w-0">
                                    <DialogTitle className="text-base sm:text-xl font-bold text-white tracking-tight truncate">
                                        คลังรูปภาพทั้งหมด
                                    </DialogTitle>
                                    <DialogDescription className="text-xs sm:text-sm text-white/60 truncate">
                                        {title ?? `Task ID: ${taskId}`}
                                    </DialogDescription>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/70 hover:text-rose-200 border border-white/10 hover:border-rose-400/30 transition-all"
                                aria-label="ปิด"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </DialogHeader>

                    {/* Tabs */}
                    <div className="shrink-0 px-2 sm:px-4 pt-3 border-b border-white/10 overflow-x-auto">
                        <div className="flex gap-1.5 sm:gap-2 min-w-max pb-3">
                            {CATEGORY_TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border backdrop-blur-sm text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${isActive
                                            ? `bg-gradient-to-br ${tab.accent} shadow-lg`
                                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/90"
                                            }`}
                                    >
                                        <Icon size={14} className="sm:hidden" />
                                        <Icon size={16} className="hidden sm:block" />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                        <span className="sm:hidden">{tab.shortLabel}</span>
                                        <span className={`tabular-nums px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs ${isActive ? "bg-white/20" : "bg-white/10"}`}>
                                            {counts[tab.key]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Search bar */}
                    <div className="shrink-0 px-3 sm:px-6 py-3 border-b border-white/10 bg-white/[0.02]">
                        <div className="relative max-w-md">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ค้นหาชื่อพนักงานขับรถ หรือรหัสพนักงาน..."
                                className="w-full pl-9 pr-9 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20 transition-all"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                    aria-label="ล้างค้นหา"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Gallery body */}
                    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3 text-white/60">
                                <Loader2 size={32} className="animate-spin text-teal-300" />
                                <span className="text-sm">กำลังโหลดรูปภาพ...</span>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3 text-white/40">
                                <ImageIcon size={48} strokeWidth={1.2} />
                                <span className="text-sm">{search ? "ไม่พบรูปภาพที่ตรงกับคำค้นหา" : "ไม่มีรูปภาพในหมวดนี้"}</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                                {items.map((item) => {
                                    const vehicleSide = activeTab === "vehicle" ? parseVehicleSide(item.fileName) : null;
                                    const sideCfg = vehicleSide ? VEHICLE_SIDE_LABEL[vehicleSide] : null;
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => setLightbox(item)}
                                            className="group relative aspect-square overflow-hidden rounded-lg sm:rounded-xl border border-white/10 bg-white/5 hover:border-teal-400/40 hover:ring-2 hover:ring-teal-400/20 transition-all"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={item.url}
                                                alt={item.fileName}
                                                loading="lazy"
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                            {sideCfg && (
                                                <div className={`absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold border backdrop-blur-md ${sideCfg.color}`}>
                                                    {sideCfg.label}
                                                </div>
                                            )}
                                            {item.driverName && (
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 sm:p-2">
                                                    <p className="text-[10px] sm:text-xs font-medium text-white truncate">{item.driverName}</p>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Lightbox */}
            {lightbox && (
                <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
                    <DialogContent
                        className="!max-w-5xl w-[95vw] p-0 overflow-hidden border border-white/10 bg-black/95"
                        showCloseButton={false}
                    >
                        <DialogTitle className="sr-only">{lightbox.fileName}</DialogTitle>
                        <button
                            type="button"
                            onClick={() => setLightbox(null)}
                            className="absolute top-3 right-3 z-10 inline-flex items-center justify-center h-10 w-10 rounded-full bg-black/60 hover:bg-rose-500/40 text-white border border-white/20 transition-all"
                            aria-label="ปิด"
                        >
                            <X size={20} />
                        </button>
                        <div className="flex items-center justify-center w-full max-h-[90vh]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={lightbox.url}
                                alt={lightbox.fileName}
                                className="max-w-full max-h-[90vh] object-contain"
                            />
                        </div>
                        {lightbox.driverName && (
                            <div className="absolute bottom-0 inset-x-0 px-4 py-3 bg-gradient-to-t from-black/90 to-transparent">
                                <p className="text-sm text-white/90 font-medium">{lightbox.driverName}</p>
                                <p className="text-xs text-white/50 truncate">{lightbox.fileName}</p>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
