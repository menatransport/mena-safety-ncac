/**
 * แหล่งข้อมูลกลางของ "ฝ่าย" ที่ใช้กำหนดสิทธิ์
 *
 * กฎ: การกำหนดสิทธิ์ต้องเทียบด้วย department_id เท่านั้น ห้ามเทียบด้วยชื่อฝ่าย เพราะ
 *  - ชื่อฝ่ายชนกันได้ — department_name_en "Safety Standards" มีทั้ง id 8 (มาตรฐานความปลอดภัย [Safety])
 *    และ id 16 (Safety)
 *  - ข้อมูลผู้ใช้ (userData.department) เก็บชื่ออังกฤษ แต่ในเอกสารเก็บชื่อไทย (department_name)
 *    การเทียบสองฝั่งด้วยชื่อจึงตรงกันเฉพาะฝ่ายที่ชื่อไทย = ชื่ออังกฤษ
 *  - ชื่อฝ่ายเป็นข้อมูลหลักที่ฝ่ายบุคคลแก้ไขได้ตลอด แต่ id ไม่เปลี่ยน
 */

/** department_id จากตารางข้อมูลหลัก /departments */
export const DEPARTMENT_ID = {
  CHIEF: 1,
  DATA_ANALYSIS: 2,
  VEHICLE: 3,
  FINANCE: 4,
  PROCUREMENT: 5,
  ACCOUNTING: 6,
  HR_PAYROLL: 7,
  /** มาตรฐานความปลอดภัย [Safety] */
  SAFETY: 8,
  SALES: 9,
  SECRETARY_COMPLIANCE: 10,
  OPERATION_SUPPORT: 11,
  DELIVERY_LAT_KRABANG: 15,
  /** Safety */
  SAFETY_STANDARDS: 16,
  /** Compliance */
  COMPLIANCE: 17,
  DELIVERY_SARABURI: 19,
  DELIVERY_BANG_PAKONG: 20,
  IT: 21,
  HR_MASS: 22,
  HR_HRBP: 23,
  HR_DEVELOPMENT: 24,
} as const;

/** ฝ่ายที่แก้ไข/ลบเอกสาร AC-NC ได้ทุกใบ ไม่ว่าใครเป็นผู้แจ้ง */
export const DOCUMENT_FULL_ACCESS_DEPARTMENT_IDS: number[] = [
  DEPARTMENT_ID.SAFETY,
  DEPARTMENT_ID.SAFETY_STANDARDS,
  DEPARTMENT_ID.COMPLIANCE,
];

/** site_id -> ฝ่ายจัดส่งที่ดูแลศูนย์นั้น (ฝ่ายจัดส่งแก้เอกสารของศูนย์ในสังกัดได้) */
export const SITE_OWNER_DEPARTMENT_ID: Record<number, number> = {
  2: DEPARTMENT_ID.DELIVERY_LAT_KRABANG, // ศลบ. ลาดกระบัง
  5: DEPARTMENT_ID.DELIVERY_LAT_KRABANG, // ศขก. ขอนแก่น
  3: DEPARTMENT_ID.DELIVERY_SARABURI,    // สสบ. สระบุรี
  4: DEPARTMENT_ID.DELIVERY_SARABURI,    // ศรย. ระยอง
  6: DEPARTMENT_ID.DELIVERY_BANG_PAKONG, // ศบก. บางปะกง
};

/** ฝ่ายที่ให้เลือกในตัวกรอง "ฝ่าย" ของหน้ารายการเอกสาร */
export const RECORD_FILTER_DEPARTMENT_IDS: number[] = [
  DEPARTMENT_ID.VEHICLE,
  DEPARTMENT_ID.DELIVERY_LAT_KRABANG,
  DEPARTMENT_ID.SAFETY_STANDARDS,
  DEPARTMENT_ID.COMPLIANCE,
  DEPARTMENT_ID.DELIVERY_SARABURI,
  DEPARTMENT_ID.DELIVERY_BANG_PAKONG,
];

/**
 * แปลงชื่อฝ่ายเป็น department_id — ใช้เฉพาะตอนอ่านข้อมูลเก่าที่ API คืนมาเป็นชื่อ
 * (เอกสาร AC-NC เก็บเป็น department_name) ไม่ใช่สำหรับเช็คสิทธิ์โดยตรง
 */
export const findDepartmentId = (
  departments: any[] | undefined,
  departmentName?: string | null
): number | null => {
  const name = String(departmentName ?? "").trim();
  if (!name || !departments?.length) return null;

  const matched =
    departments.find((dept: any) => dept?.department_name_th === name) ||
    departments.find((dept: any) => dept?.department_name === name) ||
    departments.find((dept: any) => dept?.department_name_en === name);

  return matched?.department_id != null ? Number(matched.department_id) : null;
};

/** แปลงชื่อ/รหัสศูนย์เป็น site_id — ใช้เฉพาะตอนอ่านข้อมูลเก่าที่ API คืนมาเป็นชื่อ */
export const findSiteId = (
  sites: any[] | undefined,
  siteName?: string | null
): number | null => {
  const name = String(siteName ?? "").trim();
  if (!name || !sites?.length) return null;

  const matched =
    sites.find((site: any) => site?.site_name_th === name) ||
    sites.find((site: any) => site?.site_code === name) ||
    sites.find((site: any) => site?.site_name === name) ||
    sites.find((site: any) => site?.site_name_en === name);

  return matched?.site_id != null ? Number(matched.site_id) : null;
};
