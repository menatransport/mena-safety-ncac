import {
  DOCUMENT_FULL_ACCESS_DEPARTMENT_IDS,
  SITE_OWNER_DEPARTMENT_ID,
} from "./departments";

export interface DocumentRoleInput {
  /** ฝ่ายที่รับผิดชอบเอกสาร */
  departmentId?: number | string | null;
  /** ศูนย์ของเอกสาร */
  siteId?: number | string | null;
  /** ชื่อผู้แจ้งในเอกสาร */
  reporterName?: string | null;
  /** ชื่อผู้ใช้ที่ล็อกอินอยู่ */
  currentUserName?: string | null;
  /** ฝ่ายของผู้ใช้ที่ล็อกอินอยู่ (userData.department_id) */
  currentDepartmentId?: number | string | null;
}

const toId = (value?: number | string | null): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

/**
 * สิทธิ์การแก้ไข/ลบเอกสาร AC-NC — คืน true เมื่อ "ดูได้เท่านั้น"
 *
 * แก้ไขได้เมื่อเข้าเงื่อนไขใดเงื่อนไขหนึ่ง:
 *  1. อยู่ฝ่าย Safety / Compliance (ดูแลเอกสารทุกใบ)
 *  2. อยู่ฝ่ายเดียวกับฝ่ายที่รับผิดชอบเอกสาร
 *  3. อยู่ฝ่ายจัดส่งที่ดูแลศูนย์ของเอกสารนั้น
 *  4. เป็นผู้แจ้งเอกสารนั้นเอง
 *
 * เทียบด้วย department_id/site_id เท่านั้น — ดูเหตุผลที่ lib/departments.ts
 */
export function documentRole({
  departmentId,
  siteId,
  reporterName,
  currentUserName,
  currentDepartmentId,
}: DocumentRoleInput): boolean {
  const currentDeptId = toId(currentDepartmentId);

  if (currentDeptId !== null) {
    if (DOCUMENT_FULL_ACCESS_DEPARTMENT_IDS.includes(currentDeptId)) {
      return false;
    }

    const docDeptId = toId(departmentId);
    if (docDeptId !== null && docDeptId === currentDeptId) {
      return false;
    }

    const docSiteId = toId(siteId);
    if (docSiteId !== null && SITE_OWNER_DEPARTMENT_ID[docSiteId] === currentDeptId) {
      return false;
    }
  }

  // เหลือกรณีสุดท้าย: เฉพาะผู้แจ้งเท่านั้นที่แก้เอกสารของตัวเองได้
  const reporter = String(reporterName ?? "").trim();
  const currentUser = String(currentUserName ?? "").trim();
  if (!reporter || !currentUser) return true;

  return reporter !== currentUser;
}
