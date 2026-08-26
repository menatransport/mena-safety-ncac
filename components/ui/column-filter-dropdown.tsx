"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownAZ, ArrowUpAZ, Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ----------------------------- Types ------------------------------ */
export interface ColumnFilterOption {
  value: string;
  label: string;
}

export interface ColumnFilterDropdownProps {
  /** Column header text, e.g. "Site" */
  label: string;
  /** All possible values for this column */
  options: ColumnFilterOption[];
  /** Currently applied filter, controlled from the parent */
  selectedValues: string[];
  /** Called when the user clicks Apply with the staged selection */
  onApply: (values: string[]) => void;
  /** Is this column currently the active sort, and which direction */
  sortDirection?: "asc" | "desc" | null;
  /** Called when the user clicks "เรียง A→Z" / "เรียง Z→A" */
  onSort?: (direction: "asc" | "desc") => void;
  className?: string;
}

/* --------------------------- Constants ----------------------------- */
const SEARCH_THRESHOLD = 8; // only show the search box if there are more options than this
const PANEL_WIDTH = 264;
const PANEL_MAX_HEIGHT = 420;

/* ----------------------------- Component ------------------------------ */
export function ColumnFilterDropdown({
  label,
  options,
  selectedValues,
  onApply,
  sortDirection = null,
  onSort,
  className = "",
}: ColumnFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stagedValues, setStagedValues] = useState<string[]>(selectedValues);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isFilterActive = selectedValues.length > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Recompute panel position so it escapes the table's overflow-x-auto clipping */
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom;
    const showAbove = spaceBelow < PANEL_MAX_HEIGHT && rect.top > spaceBelow;

    // Keep the panel from overflowing the right edge of the viewport
    let left = rect.left;
    if (left + PANEL_WIDTH > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - PANEL_WIDTH - 8);
    }

    setPosition({
      top: showAbove ? rect.top - PANEL_MAX_HEIGHT - 8 : rect.bottom + 6,
      left,
    });
  };

  /* Open: seed staged selection from the controlled prop */
  const handleToggle = () => {
    if (!isOpen) {
      setStagedValues(selectedValues);
      setSearchTerm("");
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleApply = () => {
    onApply(stagedValues);
    handleClose();
  };

  const handleCancel = () => {
    setStagedValues(selectedValues);
    handleClose();
  };

  /* Click-outside + Escape to close */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        handleCancel();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCancel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stagedValues, selectedValues]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const needle = searchTerm.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, searchTerm]);

  const showSearch = options.length > SEARCH_THRESHOLD;

  const toggleValue = (value: string) => {
    setStagedValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleValues = filteredOptions.map((option) => option.value);
    setStagedValues((prev) => Array.from(new Set([...prev, ...visibleValues])));
  };

  const handleClearAll = () => {
    setStagedValues([]);
  };

  const panel = isOpen && mounted ? (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: PANEL_WIDTH,
        maxHeight: PANEL_MAX_HEIGHT,
        zIndex: 99999,
      }}
      className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Sort actions */}
      {onSort && (
        <div className="flex flex-col gap-1 p-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => onSort("asc")}
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
              sortDirection === "asc"
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <ArrowDownAZ size={15} />
            เรียง A→Z
          </button>
          <button
            type="button"
            onClick={() => onSort("desc")}
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
              sortDirection === "desc"
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <ArrowUpAZ size={15} />
            เรียง Z→A
          </button>
        </div>
      )}

      {/* Search box (only when the option list is long) */}
      {showSearch && (
        <div className="p-2 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหา..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-slate-100 text-xs">
        <button
          type="button"
          onClick={handleSelectAllVisible}
          className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          เลือกทั้งหมด
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          className="font-medium text-slate-400 hover:text-slate-600 hover:underline"
        >
          ล้าง
        </button>
      </div>

      {/* Checkbox list */}
      <div className="flex-1 overflow-y-auto py-1 min-h-0">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-slate-400">ไม่พบข้อมูล</div>
        ) : (
          filteredOptions.map((option) => {
            const checked = stagedValues.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleValue(option.value)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30 focus:ring-2"
                />
                <span className="truncate">{option.label}</span>
              </label>
            );
          })
        )}
      </div>

      {/* Apply / Cancel */}
      <div className="flex items-center gap-2 p-2 border-t border-slate-100 bg-slate-50">
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all"
        >
          ยืนยัน
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100 active:scale-[0.98] transition-all"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="truncate">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-label={`Filter ${label}`}
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded transition-colors cursor-pointer shrink-0",
          isFilterActive
            ? "text-emerald-600 hover:text-emerald-700"
            : "text-slate-400 hover:text-slate-600",
          isOpen && "bg-slate-100"
        )}
      >
        <Filter size={13} className={isFilterActive ? "fill-emerald-100" : ""} />
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

export default ColumnFilterDropdown;
