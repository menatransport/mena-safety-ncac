// =============================================================================
// Trainer App – Shared Constants
// -----------------------------------------------------------------------------
// ค่าคงที่ทั้งหมดที่ใช้ร่วมกันใน trainer-app (status maps, ปฏิทิน, pagination,
// ตัวเลือก dropdown) เพื่อให้ทุก component อ้างอิงจากแหล่งเดียว ไม่ต้องประกาศซ้ำ
// =============================================================================

import type { TaskStatus } from "./type";

/* -------------------------------------------------------------------------- */
/*  STATUS – ปฏิทิน / Card (โทนสว่าง)                                          */
/* -------------------------------------------------------------------------- */
/** ใช้ใน Calendar.tsx (chip บนวัน, dialog) */
export const TASK_STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; text: string; border: string; dot: string }
> = {
    open: {
        label: "เปิดงาน",
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        dot: "bg-blue-500",
    },
    pending: {
        label: "รอดำเนินการ",
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        dot: "bg-amber-500",
    },
    completed: {
        label: "เสร็จสิ้น",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        dot: "bg-emerald-500",
    },
};

/* -------------------------------------------------------------------------- */
/*  STATUS – Driver inspection (โทน glass)                                    */
/* -------------------------------------------------------------------------- */
/** ใช้ใน DriverTable.tsx — key = driver.status (open | pending | completed) */
export const DRIVER_STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; text: string; ring: string; dot: string }
> = {
    open: {
        label: "เปิดงาน",
        bg: "bg-sky-500/15",
        text: "text-sky-200",
        ring: "ring-sky-400/30",
        dot: "bg-sky-400",
    },
    pending: {
        label: "รอดำเนินการ",
        bg: "bg-amber-500/15",
        text: "text-amber-200",
        ring: "ring-amber-400/30",
        dot: "bg-amber-400",
    },
    completed: {
        label: "เสร็จสิ้น",
        bg: "bg-emerald-500/15",
        text: "text-emerald-200",
        ring: "ring-emerald-400/30",
        dot: "bg-emerald-400",
    },
};

/* -------------------------------------------------------------------------- */
/*  STATUS – TaskTable badge                                                  */
/* -------------------------------------------------------------------------- */
/** ใช้ใน TaskTable.tsx (badge + Excel export label) */
export const TASK_TABLE_STATUS: Record<string, { label: string; className: string }> = {
    open: { label: "เปิดงาน", className: "bg-blue-500/15 text-blue-200 border-blue-400/30" },
    pending: { label: "กำลังดำเนินการ", className: "bg-amber-500/15 text-amber-200 border-amber-400/30" },
    completed: { label: "เสร็จสิ้น", className: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30" },
};

/* -------------------------------------------------------------------------- */
/*  STATUS – ListUser (รายการเทรนเนอร์)                                        */
/* -------------------------------------------------------------------------- */
/** ใช้ใน ListUser.tsx (chip ในแต่ละแถวของงาน) */
export const LIST_USER_STATUS: Record<string, { label: string; dot: string; text: string }> = {
    open: {
        label: "เปิดงาน",
        dot: "bg-blue-400",
        text: "text-blue-100 bg-blue-500/20 border border-blue-400/30",
    },
    pending: {
        label: "รอดำเนินการ",
        dot: "bg-amber-400",
        text: "text-amber-100 bg-amber-500/20 border border-amber-400/30",
    },
    completed: {
        label: "เสร็จสิ้น",
        dot: "bg-emerald-400",
        text: "text-emerald-100 bg-emerald-500/20 border border-emerald-400/30",
    },
};

/* -------------------------------------------------------------------------- */
/*  Legacy – คงไว้เผื่อโค้ดอื่นยังอ้างถึง                                         */
/* -------------------------------------------------------------------------- */
export const STATUS_CONFIG = {
    completed: { label: "เสร็จสิ้น", color: "text-emerald-600", bgColor: "bg-emerald-500", ringColor: "ring-emerald-200" },
    open: { label: "เปิดงาน", color: "text-blue-600", bgColor: "bg-blue-500", ringColor: "ring-blue-200" },
    pending: { label: "รอดำเนินการ", color: "text-slate-400", bgColor: "bg-slate-300", ringColor: "ring-slate-200" },
} as const;

/* -------------------------------------------------------------------------- */
/*  Filter dropdown – ตัวเลือกสถานะ (พร้อม emoji)                              */
/* -------------------------------------------------------------------------- */
export const STATUS_FILTER_OPTIONS: { value: TaskStatus; label: string }[] = [
    { value: "open", label: "🔵 เปิดงาน" },
    { value: "pending", label: "🟡 รอดำเนินการ" },
    { value: "completed", label: "🟢 เสร็จสิ้น" },
];

/* -------------------------------------------------------------------------- */
/*  Calendar – ชื่อเดือน / วัน / ขีดจำกัดงานต่อช่อง                              */
/* -------------------------------------------------------------------------- */
export const CALENDAR_WEEKDAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export const CALENDAR_MONTHS_TH = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export const CALENDAR_MONTHS_TH_SHORT = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export const CALENDAR_MAX_VISIBLE_DESKTOP = 3;
export const CALENDAR_MAX_VISIBLE_MOBILE = 2;

/* -------------------------------------------------------------------------- */
/*  Pagination / Limits                                                       */
/* -------------------------------------------------------------------------- */
/** จำนวนแถวต่อหน้า ใน TaskTable */
export const TASK_TABLE_ROWS_PER_PAGE = 10;

/** จำนวนช่องอัปโหลดรูปใน [id]/page.tsx */
export const UPLOAD_SLOTS_COUNT = 6;

/** ความยาวสูงสุดของ driver_id ที่กรอกเอง (DriverTable.tsx) */
export const MANUAL_DRIVER_ID_MAX_LENGTH = 10;

/* -------------------------------------------------------------------------- */
/*  Roles                                                                     */
/* -------------------------------------------------------------------------- */
export const ROLE_SAFETY_TRAINER = "Safety Trainer";

/* -------------------------------------------------------------------------- */
/*  Truck types                                                               */
/* -------------------------------------------------------------------------- */
export const TRUCK_TYPES = ["Trailer", "Mixer"] as const;

export const ANALYTICS_TABS = ["สรุปภาพรวม", "สารเสพติด & แอลกอฮอล์", "PPE", "ตรวจสภาพรอบรถ"] as const;

