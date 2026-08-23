import type { DropdownlistData } from "@/lib/dropdownlist";

/** สิทธิ์แก้ไขข้อมูลหลัก (ดูได้ทุกคน แต่แก้ไขได้เฉพาะผู้ที่ตรงเงื่อนไขนี้) */
export const MASTER_EDIT_DEPARTMENT_ID = 17;
export const MASTER_EDIT_EMAIL = "kittaboon.l@menatransport.co.th";

/** ปิดการบังคับสิทธิ์ชั่วคราว — ตั้งเป็น true เมื่อต้องการจำกัดสิทธิ์แก้ไขอีกครั้ง */
export const MASTER_EDIT_ENFORCE = false;

export const canEditMasterData = (user: any): boolean => {
  if (!MASTER_EDIT_ENFORCE) return true;
  if (!user) return false;
  const deptOk = Number(user.department_id) === MASTER_EDIT_DEPARTMENT_ID;
  const emailOk = String(user.email || "").toLowerCase() === MASTER_EDIT_EMAIL;
  return deptOk && emailOk;
};

export type MasterFieldType = "text" | "textarea" | "select" | "options";
export type MasterRefSource = "sites" | "driver_roles";

export interface MasterField {
  key: string;
  label: string;
  type: MasterFieldType;
  required?: boolean;
  placeholder?: string;
  /** แหล่งข้อมูลของ select (อ้างอิงตารางอื่น) */
  source?: MasterRefSource;
  /** ตัวเลือกคงที่ของ field แบบ options */
  options?: { value: string; label: string }[];
  /** ซ่อนคอลัมน์นี้ในตารางเป็นค่าเริ่มต้น (เปิดดูได้จากเมนู "คอลัมน์") */
  hideInTable?: boolean;
  /** backend ส่งค่ามาให้อ่านอย่างเดียว (แก้ไข/ส่งกลับไม่ได้) */
  readOnly?: boolean;
}

export interface MasterConfig {
  /** key ใน dropdown store */
  storeKey: keyof DropdownlistData;
  /** path ของ backend (ไม่มี slash ปิดท้าย) */
  apiPath: string;
  label: string;
  description: string;
  idKey: string;
  /** field ที่ใช้เรียงลำดับหลัก */
  primaryKey: string;
  fields: MasterField[];
  /** ความสามารถที่ backend รองรับ */
  actions?: { create?: boolean; update?: boolean; delete?: boolean };
  /** ข้อความเตือนใต้หัวตาราง */
  note?: string;
}

/** ตารางอ้างอิงสำหรับ field แบบ select */
export const REF_SOURCES: Record<
  MasterRefSource,
  { apiPath: string; idKey: string; labelKeys: string[] }
> = {
  sites: { apiPath: "/sites", idKey: "site_id", labelKeys: ["site_name_th", "site_name_en"] },
  driver_roles: { apiPath: "/driver_roles", idKey: "driver_role_id", labelKeys: ["role_name"] },
};

export const MASTER_CONFIGS: MasterConfig[] = [
  {
    storeKey: "sites",
    apiPath: "/sites",
    label: "หน่วยงาน",
    description: "หน่วยงาน / ไซต์งานทั้งหมด",
    idKey: "site_id",
    primaryKey: "site_name_th",
    actions: { create: false, update: false, delete: false },
    note: "ข้อมูลหน่วยงานถูกล็อกไว้ ดูได้อย่างเดียว",
    fields: [
      { key: "site_code", label: "รหัสหน่วยงาน", type: "text", required: true },
      { key: "site_name_th", label: "ชื่อ (ไทย)", type: "text", required: true },
      { key: "site_name_en", label: "ชื่อ (อังกฤษ)", type: "text", required: true },
    ],
  },
  {
    storeKey: "departments",
    apiPath: "/departments",
    label: "ฝ่าย",
    description: "ฝ่าย / แผนกในฟอร์มรายงาน",
    idKey: "department_id",
    primaryKey: "department_name_th",
    actions: { create: false, update: false, delete: false },
    note: "ข้อมูลฝ่ายถูกล็อกไว้ ดูได้อย่างเดียว",
    fields: [
      { key: "department_name_th", label: "ชื่อฝ่าย (ไทย)", type: "text", required: true },
      { key: "department_name_en", label: "ชื่อฝ่าย (อังกฤษ)", type: "text", required: true },
    ],
  },
  {
    storeKey: "clients",
    apiPath: "/clients",
    label: "ลูกค้า",
    description: "ข้อมูลลูกค้าและหน่วยงานที่ดูแล",
    idKey: "client_id",
    primaryKey: "client_name",
    fields: [
      { key: "client_name", label: "ชื่อลูกค้า", type: "text", required: true },
      { key: "contact_info", label: "ข้อมูลติดต่อ", type: "text" },
      { key: "site_id", label: "หน่วยงาน", type: "select", source: "sites" },
    ],
  },
  {
    storeKey: "locations",
    apiPath: "/locations",
    label: "สถานที่",
    description: "สถานที่ต้นทาง / ปลายทาง",
    idKey: "location_id",
    primaryKey: "location_name",
    fields: [
      { key: "location_name", label: "ชื่อสถานที่", type: "text", required: true },
      { key: "site_id", label: "หน่วยงาน", type: "select", source: "sites", required: true },
    ],
  },
  {
    storeKey: "vehicles",
    apiPath: "/vehicles",
    label: "ทะเบียนรถ",
    description: "ทะเบียนรถ",
    idKey: "vehicle_id",
    primaryKey: "vehicle_number_plate",
    fields: [
      { key: "vehicle_number_plate", label: "ทะเบียนรถ", type: "text", required: true },
      { key: "truck_no", label: "เลขรถ", type: "text" },
      {
        key: "plate_type",
        label: "ประเภททะเบียน",
        type: "options",
        required: true,
        options: [
          { value: "head", label: "หัวลาก (head)" },
          { value: "tail", label: "หาง (tail)" },
        ],
      },
    ],
  },
  {
    storeKey: "masterdrivers",
    apiPath: "/masterdrivers",
    label: "พนักงานขับรถ",
    description: "รายชื่อพนักงานขับรถทั้งหมด",
    idKey: "driver_id",
    primaryKey: "first_name",
    actions: { create: true, update: false, delete: false },
    note: "ข้อมูลชุดนี้ซิงก์จากระบบต้นทาง จึงเพิ่มได้แต่ยังแก้ไข/ลบจากหน้านี้ไม่ได้",
    fields: [
      { key: "driver_id", label: "รหัสพนักงาน", type: "text", required: true },
      { key: "first_name", label: "ชื่อ", type: "text", required: true },
      { key: "last_name", label: "นามสกุล", type: "text", required: true },
      { key: "site_id", label: "หน่วยงาน", type: "select", source: "sites", required: true },
      {
        key: "driver_role_id",
        label: "ตำแหน่ง",
        type: "select",
        source: "driver_roles",
        required: true,
      },
      { key: "number_plate", label: "ทะเบียนรถ", type: "text" },
      { key: "truck_number", label: "เลขรถ", type: "text" },
      { key: "status", label: "สถานะ", type: "text" },
      { key: "truck_type", label: "ประเภทรถ", type: "text", hideInTable: true },
      { key: "client_name", label: "ลูกค้า", type: "text", hideInTable: true },
      { key: "plant_code", label: "รหัสแพลนต์", type: "text", hideInTable: true },
      { key: "plant_name", label: "ชื่อแพลนต์", type: "text", hideInTable: true },
      { key: "month_year", label: "เดือน/ปี", type: "text", hideInTable: true },
      { key: "fleet", label: "Fleet", type: "text", readOnly: true, hideInTable: true },
    ],
  },
  {
    storeKey: "driver_roles",
    apiPath: "/driver_roles",
    label: "ตำแหน่ง พขร.",
    description: "ตำแหน่งของพนักงานขับรถ",
    idKey: "driver_role_id",
    primaryKey: "role_name",
    fields: [{ key: "role_name", label: "ชื่อตำแหน่ง", type: "text", required: true }],
  },
  {
    storeKey: "mastercauses",
    apiPath: "/mastercauses",
    label: "สาเหตุ",
    description: "สาเหตุของเหตุการณ์ในฟอร์มรายงาน",
    idKey: "cause_id",
    primaryKey: "cause_name",
    fields: [
      { key: "cause_name", label: "ชื่อสาเหตุ", type: "text", required: true },
      { key: "description", label: "รายละเอียด", type: "textarea" },
      { key: "site_id", label: "หน่วยงาน", type: "select", source: "sites" },
    ],
  },
];

/** เรียก API ผ่าน proxy /api/list */
export const masterRequest = async (
  method: "GET" | "POST" | "PUT" | "DELETE",
  apiPath: string,
  body?: any
) => {
  const res = await fetch("/api/list", {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Path": apiPath,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  const data = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      })()
    : null;

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && (data.details || data.error || data.message)) ||
      `เกิดข้อผิดพลาด (${res.status})`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return data;
};
