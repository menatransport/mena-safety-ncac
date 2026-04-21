"use client";

// =============================================================================
// Component: SafetyTalkCard
// -----------------------------------------------------------------------------
// การ์ดบันทึกหัวข้อ Safety Talk ของงาน inspection
//   • เพิ่ม / ลบ / แก้ไข / จัดลำดับหัวข้อ (drag, ปุ่ม ↑/↓)
//   • บันทึกข้อมูลเพิ่มเติม (noted)
//   • ปุ่มบันทึกจะโชว์เมื่อมีการเปลี่ยนแปลง (hasChanged)
// =============================================================================

import { useState } from "react";
import {
    Presentation, Plus, X, Save, FileText, MessageSquare, ListOrdered, GripVertical, ChevronUp, ChevronDown, Pencil, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SafetyTalkFields } from "../type";

interface SafetyTalkCardProps {
    value: SafetyTalkFields;
    safetyTalkId: string | null;
    onChange: (updated: SafetyTalkFields) => void;
    onSave: () => void;
    saving?: boolean;
}

export function SafetyTalkCard({ value, safetyTalkId, onChange, onSave, saving }: SafetyTalkCardProps) {
    const [topicInput, setTopicInput] = useState("");
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [overIdx, setOverIdx] = useState<number | null>(null);
    const [editIdx, setEditIdx] = useState<number | null>(null);
    const [editText, setEditText] = useState("");
    const [hasChanged, setHasChanged] = useState(false);

    const emitChange = (updated: SafetyTalkFields) => { setHasChanged(true); onChange(updated); };
    const handleSave = () => { onSave(); setHasChanged(false); };

    const startEdit = (idx: number) => { setEditIdx(idx); setEditText(value.topics[idx]); };
    const confirmEdit = () => {
        if (editIdx === null) return;
        const trimmed = editText.trim();
        if (trimmed) {
            const updated = [...value.topics];
            updated[editIdx] = trimmed;
            emitChange({ ...value, topics: updated });
        }
        setEditIdx(null);
        setEditText("");
    };

    const handleDragStart = (idx: number) => setDragIdx(idx);
    const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx); };
    const handleDragEnd = () => {
        if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
            const reordered = [...value.topics];
            const [moved] = reordered.splice(dragIdx, 1);
            reordered.splice(overIdx, 0, moved);
            emitChange({ ...value, topics: reordered });
        }
        setDragIdx(null);
        setOverIdx(null);
    };

    const moveUp = (idx: number) => {
        if (idx === 0) return;
        const reordered = [...value.topics];
        [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
        emitChange({ ...value, topics: reordered });
    };
    const moveDown = (idx: number) => {
        if (idx === value.topics.length - 1) return;
        const reordered = [...value.topics];
        [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
        emitChange({ ...value, topics: reordered });
    };

    const addTopic = () => {
        const trimmed = topicInput.trim();
        if (!trimmed) return;
        emitChange({ ...value, topics: [...value.topics, trimmed] });
        setTopicInput("");
    };

    const removeTopic = (idx: number) => {
        emitChange({ ...value, topics: value.topics.filter((_, i) => i !== idx) });
    };

    return (
        <div className="h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-lg shadow-black/10 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-4 sm:px-5 sm:py-5 bg-gradient-to-r from-slate-900/60 via-slate-800/40 to-teal-900/30 border-b border-white/10">
                <div className="flex justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/30 rounded-xl shrink-0">
                            <Presentation size={16} className="text-teal-200" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-white tracking-tight">Safety Talk</h2>
                            <p className="text-sm text-white/50 mt-0.5 hidden sm:block">บันทึกการพูดคุยด้านความปลอดภัย</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {safetyTalkId && (
                            <span className="text-[11px] text-white/50 bg-white/5 border border-white/10 px-2 py-1 rounded-lg font-mono">
                                #{safetyTalkId}
                            </span>
                        )}
                        {hasChanged && (
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="text-white bg-gradient-to-r from-emerald-500/40 to-teal-600/40 hover:from-emerald-500/60 hover:to-teal-600/60 border border-teal-400/40 backdrop-blur-sm shadow-md shadow-teal-500/20 font-lg p-2 rounded-xl cursor-pointer disabled:opacity-50"
                            >
                                <Save size={16} className="inline" />
                                {saving ? "กำลังบันทึก..." : "บันทึก"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-5 space-y-6">

                {/* ── Section: หัวข้อ ── */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-400/20">
                            <ListOrdered size={14} className="text-teal-300" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-white leading-tight">หัวข้อที่พูดคุย</p>
                        </div>
                    </div>

                    {/* Topic list — numbered, formal */}
                    {value.topics.length > 0 && (
                        <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
                            {value.topics.map((topic, idx) => (
                                <div
                                    key={idx}
                                    draggable
                                    onDragStart={() => handleDragStart(idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors group select-none ${dragIdx === idx ? "opacity-40" : ""
                                        } ${overIdx === idx && dragIdx !== idx ? "border-t-2 !border-t-teal-400" : ""}`}
                                >
                                    <GripVertical size={14} className="text-white/30 shrink-0 cursor-grab active:cursor-grabbing" />
                                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-[11px] font-bold shrink-0">
                                        {idx + 1}
                                    </span>
                                    {editIdx === idx ? (
                                        <div className="flex-1 flex gap-1.5">
                                            <input
                                                type="text"
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmEdit(); } if (e.key === "Escape") { setEditIdx(null); setEditText(""); } }}
                                                autoFocus
                                                className="flex-1 rounded-md h-7 px-2 text-sm text-white bg-white/10 border border-white/20 focus:border-teal-400/60 focus:ring-1 focus:ring-teal-400/20 outline-none transition-all"
                                            />
                                            <button type="button" onClick={confirmEdit} className="p-1 rounded-md bg-teal-500/40 border border-teal-400/40 text-white hover:bg-teal-500/60 transition-all">
                                                <Check size={13} />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="flex-1 text-sm text-white/85">{topic}</span>
                                    )}
                                    <div className={`flex items-center gap-0.5 transition-all ${editIdx === idx ? "hidden" : ""}`}>
                                        <button
                                            type="button"
                                            onClick={() => moveUp(idx)}
                                            disabled={idx === 0}
                                            className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                            title="เลื่อนขึ้น"
                                        >
                                            <ChevronUp size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveDown(idx)}
                                            disabled={idx === value.topics.length - 1}
                                            className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                            title="เลื่อนลง"
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => startEdit(idx)}
                                            className="p-1 rounded-md hover:bg-amber-500/15 text-white/30 hover:text-amber-300 transition-all"
                                            title="แก้ไข"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeTopic(idx)}
                                            className="p-1 rounded-md hover:bg-rose-500/15 text-white/40 hover:text-rose-300 transition-all"
                                            title="ลบ"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {value.topics.length === 0 && (
                        <div className="mb-3 rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center">
                            <FileText size={20} className="text-white/30 mx-auto mb-1.5" />
                            <p className="text-xs text-white/40">ยังไม่มีหัวข้อ — เพิ่มหัวข้อด้านล่าง</p>
                        </div>
                    )}

                    {/* Add topic input */}
                    <div className="flex gap-2 flex-col sm:flex-row">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={topicInput}
                                placeholder="พิมพ์หัวข้อใหม่..."
                                onChange={(e) => setTopicInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") { e.preventDefault(); addTopic(); }
                                }}
                                className="w-full rounded-lg h-10 pl-3 pr-3 text-sm placeholder:text-white/30 outline-none text-white bg-white/5 border border-white/15 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 transition-all"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addTopic}
                            disabled={!topicInput.trim()}
                            className="flex items-center justify-center gap-1.5 px-4 h-10 rounded-lg bg-gradient-to-r from-teal-500/40 to-emerald-600/40 border border-teal-400/40 text-white text-sm font-medium hover:from-teal-500/60 hover:to-emerald-600/60 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-md shadow-teal-500/10"
                        >
                            <Plus size={14} />
                            เพิ่ม
                        </button>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10" />

                {/* ── Section: หมายเหตุ ── */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-400/20">
                            <MessageSquare size={14} className="text-teal-300" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-white leading-tight">บันทึกเพิ่มเติม</p>
                        </div>
                    </div>
                    <textarea
                        value={value.noted}
                        rows={4}
                        placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น ข้อสังเกตพิเศษ, ข้อเสนอแนะ, สิ่งที่ต้องติดตาม..."
                        onChange={(e) => emitChange({ ...value, noted: e.target.value })}
                        className="w-full rounded-lg p-3.5 text-sm leading-relaxed placeholder:text-white/30 outline-none resize-y text-white bg-white/5 border border-white/15 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 transition-all min-h-[100px]"
                    />
                    {value.noted.trim() && (
                        <p className="text-[11px] text-white/40 mt-1.5 text-right">
                            {value.noted.length} ตัวอักษร
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
