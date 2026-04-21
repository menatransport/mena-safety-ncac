"use client";

// =============================================================================
// Component: PageHeader
// -----------------------------------------------------------------------------
// Breadcrumb / header รองรับ item ที่คลิกได้ + slot ขวาสำหรับ action พิเศษ
// =============================================================================

import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface HeaderItem {
    label: ReactNode;
    onClick?: () => void;
}

interface PageHeaderProps {
    items: HeaderItem[];
    rightSlot?: ReactNode;
}

export function PageHeader({ items, rightSlot }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-center self-center gap-3">
                <div className="space-y-1">
                    <nav className="flex items-center gap-1.5 text-sm text-white/50">
                        {items.map((item, index) => {
                            const isLast = index === items.length - 1;

                            return (
                                <div key={index} className="flex items-center gap-1.5">
                                    {item.onClick && !isLast ? (
                                        <button
                                            onClick={item.onClick}
                                            className="hover:text-white/80 sm:text-xl cursor-pointer transition-colors"
                                        >
                                            {item.label}
                                        </button>
                                    ) : (
                                        <h1 className="text-white/90 sm:text-xl font-medium">{item.label}</h1>
                                    )}

                                    {!isLast && <ChevronRight size={12} />}
                                </div>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {rightSlot}
        </div>
    );
}
