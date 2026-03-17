'use client';

import { User, CalendarDays, FileText } from "lucide-react";
import { DateTimePicker24h } from "@/components/ui/datetime-picker";

export interface FormField {
    label: string;
    type: "text" | "date" | "textarea";
    icon: string;
    fieldKey: string;
    value: string;
    readonly?: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
    user: <User size={15} className="text-stone-400" />,
    calendar: <CalendarDays size={15} className="text-stone-400" />,
    text: <FileText size={15} className="text-stone-400" />,
};

interface FormRenderProps {
    title: string;
    formData: FormField[];
    onChange?: (fieldKey: string, value: string) => void;
}

export const FormRender = ({ title, formData, onChange }: FormRenderProps) => {
    return (
        <div className="rounded-xl bg-white border border-stone-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="border-b border-stone-100 bg-stone-50/50 px-6 py-4">
                <h2 className="text-lg font-bold text-stone-700">{title}</h2>
            </div>

            {/* Fields */}
            <div className="divide-y divide-stone-100">
                {formData.map((field) => (
                    <div key={field.fieldKey} className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
                        {/* Label */}
                        <div className="flex items-center gap-2 sm:w-40 shrink-0 pt-1.5">
                            {ICON_MAP[field.icon] ?? ICON_MAP["text"]}
                            <span className="text-sm text-stone-500">
                                {field.label} :
                            </span>
                        </div>

                        {/* Input */}
                        <div className="flex-1 min-w-0">
                            {field.type === "date" ? (
                                <DateTimePicker24h
                                    value={field.value ? new Date(field.value + "T00:00:00") : undefined}
                                    usedFor="date"
                                    disabled={field.readonly}
                                    onChange={(date) => {
                                        if (date && onChange) {
                                            const yyyy = date.getFullYear();
                                            const mm = String(date.getMonth() + 1).padStart(2, "0");
                                            const dd = String(date.getDate()).padStart(2, "0");
                                            onChange(field.fieldKey, `${yyyy}-${mm}-${dd}`);
                                        }
                                    }}
                                />
                            ) : field.type === "textarea" ? (
                                <textarea
                                    value={field.value}
                                    rows={3}
                                    readOnly={field.readonly}
                                    placeholder={field.readonly ? "—" : "พิมพ์ที่นี่..."}
                                    onChange={(e) => onChange?.(field.fieldKey, e.target.value)}
                                    className={`w-full rounded-lg p-2 text-sm text-stone-800 placeholder:text-stone-300 outline-none resize-y transition-colors
                                        ${field.readonly
                                            ? "bg-stone-50 border border-transparent cursor-default text-stone-500"
                                            : "bg-white border border-stone-200 hover:border-stone-300 focus:bg-white focus:border-stone-300"
                                        }`}
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={field.value}
                                    readOnly={field.readonly}
                                    placeholder={field.readonly ? "—" : "พิมพ์ที่นี่..."}
                                    onChange={(e) => onChange?.(field.fieldKey, e.target.value)}
                                    className={`w-full rounded-lg h-9 px-3 text-sm text-stone-800 placeholder:text-stone-300 outline-none transition-colors
                                        ${field.readonly
                                            ? "bg-stone-50 border border-transparent cursor-default text-stone-500"
                                            : "bg-stone-50 border border-stone-200 hover:border-stone-300 focus:bg-white focus:border-stone-300"
                                        }`}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};