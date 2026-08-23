"use client";
import { ReactNode } from "react";
import { Loader2, Save, RefreshCw } from "lucide-react";

export type FormActionMode = "create" | "update";

interface FormActionBarProps {
  /** create = ยังไม่มีข้อมูลในระบบ (บันทึกข้อมูล), update = มีแล้ว (อัปเดตข้อมูล) */
  mode: FormActionMode;
  /** ใช้เมื่อกดปุ่มหลักแบบ button ปกติ */
  onSave?: () => void;
  /** ถ้าส่ง id ของ <form> มา ปุ่มหลักจะเป็น type="submit" ของฟอร์มนั้น (วางนอกฟอร์มได้) */
  submitFormId?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  /** ซ่อนปุ่มหลัก เช่น เอกสารถูกยกเลิก หรืออยู่ในโหมดดูอย่างเดียว */
  hidePrimary?: boolean;
  /** ทับข้อความปุ่มหลักได้ทั้ง 2 โหมด */
  labels?: { create?: string; update?: string };
  /** ข้อความฝั่งซ้าย เช่น Form created by: ... */
  note?: string;
  /** ปุ่มเสริมฝั่งขวา เช่น คัดลอกข้อมูล */
  children?: ReactNode;
}

const baseButton =
  "py-2 px-4 rounded-lg text-sm font-semibold leading-loose transition duration-200 inline-flex items-center gap-2";

export const FormActionBar = ({
  mode,
  onSave,
  submitFormId,
  isSubmitting = false,
  disabled = false,
  hidePrimary = false,
  labels,
  note,
  children,
}: FormActionBarProps) => {
  const isCreate = mode === "create";
  const label = isCreate
    ? labels?.create ?? "บันทึกข้อมูล"
    : labels?.update ?? "อัปเดตข้อมูล";
  const Icon = isCreate ? Save : RefreshCw;
  const isLocked = disabled || isSubmitting;

  return (
    <div className="flex flex-col gap-3 pt-6 mt-2 border-t border-gray-200 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-600">{note}</p>

      <div className="flex flex-wrap justify-end gap-3">
        {children}

        {!hidePrimary && (
          <button
            type={submitFormId ? "submit" : "button"}
            form={submitFormId}
            onClick={submitFormId ? undefined : onSave}
            disabled={isLocked}
            className={`${baseButton} text-white ${isLocked
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gray-600 hover:bg-gray-700 cursor-pointer"
              }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Icon className="w-4 h-4" />
            )}
            {isSubmitting ? "กำลังบันทึก..." : label}
          </button>
        )}
      </div>
    </div>
  );
};

/** ปุ่มเสริมสำหรับวางใน FormActionBar ให้หน้าตาเข้าชุดกัน */
export const FormActionButton = ({
  onClick,
  children,
  disabled = false,
  icon,
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`${baseButton} text-white ${disabled
      ? "bg-gray-300 cursor-not-allowed"
      : "bg-gray-400 hover:bg-gray-500 cursor-pointer"
      }`}
  >
    {icon}
    {children}
  </button>
);
