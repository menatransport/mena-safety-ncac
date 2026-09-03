"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import type { PrintParts } from "@/lib/printDocument";

type PrintOptionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** เรียกเมื่อกดยืนยันพิมพ์ พร้อมส่วนของเอกสารที่เลือก */
  onConfirm: (parts: PrintParts) => void;
  /** ชื่อฟอร์มที่พิมพ์ ใช้แสดงหัวข้อ (NC / AC) */
  caseType: "nc" | "ac";
  /** เลขที่เอกสารที่กำลังจะพิมพ์ */
  documentNo?: string;
  /** กำลังเตรียมข้อมูล (เช่น ดึงข้อมูลสอบสวนมาพิมพ์) */
  isPreparing?: boolean;
};

const OPTIONS: { value: PrintParts; title: string; subtitle: string }[] = [
  { value: "part1", title: "Part 1 : Initial Report", subtitle: "รายงานเบื้องต้น" },
  { value: "part2", title: "Part 2 : Investigate Report", subtitle: "รายงานผลการสอบสวน" },
  { value: "both", title: "ทั้งหมด", subtitle: "Part 1 + Part 2" },
];

export default function PrintOptionsDialog({
  open,
  onOpenChange,
  onConfirm,
  caseType,
  documentNo,
  isPreparing = false,
}: PrintOptionsDialogProps) {
  const [selected, setSelected] = useState<PrintParts>("both");

  // เปิดใหม่ทุกครั้งให้กลับไปตั้งต้นที่ "ทั้งหมด" ไม่ค้างค่าจากการพิมพ์ครั้งก่อน
  useEffect(() => {
    if (open) setSelected("both");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-sm gap-0 overflow-hidden rounded-md border border-slate-300 bg-white p-0 shadow-2xl"
      >
        <DialogHeader className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-800">
            <Printer className="h-4 w-4 text-slate-500" />
            พิมพ์เอกสาร
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {documentNo || (caseType === "nc" ? "แบบรายงาน NC" : "แบบรายงาน AC")}
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-slate-200">
          {OPTIONS.map((option) => {
            const isActive = selected === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelected(option.value)}
                className={`flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors ${
                  isActive ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    isActive ? "border-slate-800" : "border-slate-300"
                  }`}
                >
                  {isActive && <span className="h-2 w-2 rounded-full bg-slate-800" />}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-slate-800">{option.title}</span>
                  <span className="block text-xs text-slate-500">{option.subtitle}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-[11px] text-slate-500">แนบหน้ารูปภาพให้อัตโนมัติ</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPreparing}
              className="cursor-pointer rounded border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selected)}
              disabled={isPreparing}
              className="cursor-pointer rounded bg-slate-800 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-900 disabled:opacity-50"
            >
              {isPreparing ? "กำลังเตรียม..." : "พิมพ์"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
