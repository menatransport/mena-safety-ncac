/**
 * ศูนย์กลางการควบคุมเอกสารแนบ (AC/NC)
 * แก้ไขรายการเอกสาร ฝ่ายที่รับผิดชอบ จำนวนไฟล์ และเงื่อนไขต่าง ๆ ได้ที่ไฟล์นี้ที่เดียว
 */

// ---------- Types ----------

export interface FileWithId {
  id: string;
  file: File;
  url: string;
  updateData: string;
  category: string;
  uploadDate: Date;
}

export interface CategoryFiles {
  [key: string]: FileWithId[];
}

export interface DocumentInfo {
  [key: string]: string;
}

export type CaseType = "ac" | "nc" | "all";

export interface DocumentCategory {
  /** คีย์ที่ใช้เก็บข้อมูล (ห้ามเปลี่ยนถ้ามีข้อมูลเดิมอยู่แล้ว) */
  value: string;
  /** ชื่อเอกสารที่แสดงบนหน้าจอ */
  label: string;
  /** ฝ่ายที่รับผิดชอบ (อ้างอิงค่าใน DEPARTMENTS) */
  department: string;
  /** แสดงเฉพาะฟอร์มที่ระบุ ("all" = ทุกฟอร์ม) */
  case: CaseType;
  /** ต้องกรอกเลขที่เอกสารหรือไม่ */
  no: boolean;
  /** เอกสารบังคับแนบ (แสดงเครื่องหมาย * และซ่อนไม่ได้) */
  required?: boolean;
  /** แนบได้หลายไฟล์ (ไม่ระบุ = แนบได้ 1 ไฟล์) */
  multiple?: boolean;
  /** แนบได้เฉพาะรูปภาพ และแสดงผลเป็นช่องรูป */
  imageOnly?: boolean;
}

// ---------- ค่าคงที่ ----------

/** ฝ่ายที่อ้างอิงตามฝ่ายผู้แจ้ง (จะแสดงชื่อฝ่ายจริงถ้าส่ง reporterDepartment มา) */
export const REPORTER_DEPARTMENT = "📄ตามฝ่ายผู้แจ้ง";

/** สถานะเอกสารที่เก็บลงฐานข้อมูล */
export const DOC_STATUS = {
  attached: "มี",
  missing: "ไม่มี",
  skipped: "ไม่ต้องแนบ",
} as const;

/** ชนิดไฟล์ที่อนุญาต */
export const ACCEPT_IMAGE = "image/*";
export const ACCEPT_DOCUMENT = "image/*,.pdf,.doc,.docx";

/** ขนาดรูปตัวอย่างเมื่อนำเมาส์ชี้ (px) */
export const HOVER_PREVIEW_SIZE = 340;

// ---------- ฝ่ายที่รับผิดชอบ ----------

export const DEPARTMENTS = [
  { value: REPORTER_DEPARTMENT, label: "ตามฝ่ายผู้แจ้ง", printLabel: "ตามฝ่ายผู้แจ้ง" },
  {
    value: "🚨Safety",
    label: "ฝ่ายมาตรฐานความปลอดภัย (Safety)",
    printLabel: "Safety",
  },
  {
    value: "ℹ️Compliance",
    label: "ฝ่ายกำกับดูแลปฎิบัติตามข้อกำหนด (Compliance)",
    printLabel: "Compliance",
  },
  { value: "💼การเงิน", label: "ฝ่ายการเงินและบัญชี", printLabel: "บัญชี" },
];

// ---------- รายการเอกสาร ----------

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  // ตามฝ่ายผู้แจ้ง
  {
    value: "event_img",
    label: "รูปเหตุการณ์",
    department: REPORTER_DEPARTMENT,
    required: true,
    case: "all",
    no: false,
    multiple: true,
    imageOnly: true,
  },
  {
    value: "record_doc",
    label: "บันทึกประจำวัน",
    department: REPORTER_DEPARTMENT,
    case: "ac",
    no: false,
  },
  {
    value: "medical_doc",
    label: "ใบรับรองแพทย์",
    department: REPORTER_DEPARTMENT,
    case: "ac",
    no: true,
  },
  {
    value: "writeoff_doc",
    label: "เอกสารการตัดจำหน่าย",
    department: REPORTER_DEPARTMENT,
    case: "all",
    no: false,
  },
  {
    value: "debt_doc",
    label: "ใบรับสภาพหนี้",
    department: REPORTER_DEPARTMENT,
    case: "all",
    no: true,
    multiple: true,
  },
  {
    value: "quotation_doc",
    label: "ใบเสนอราคา",
    department: REPORTER_DEPARTMENT,
    case: "ac",
    no: true,
  },
  {
    value: "customer_invoice",
    label: "ใบแจ้งหนี้ลูกค้า",
    department: REPORTER_DEPARTMENT,
    case: "all",
    no: true,
  },
  {
    value: "warning_doc",
    label: "ใบเตือน",
    department: REPORTER_DEPARTMENT,
    case: "nc",
    no: true,
  },
  {
    value: "damage_payment",
    label: "หลักฐานการชำระค่าเสียหาย (สำหรับบุคคลที่ 3) จ่ายโดยฝ่ายอื่น",
    department: REPORTER_DEPARTMENT,
    case: "all",
    no: true,
  },


  // ฝ่ายมาตรฐานความปลอดภัย
  {
    value: "investigate_report",
    label: "เอกสารสอบสวน",
    department: "🚨Safety",
    case: "ac",
    no: false,
    multiple: true,
  },
  {
    value: "warning_doc",
    label: "ใบเตือน",
    department: "🚨Safety",
    case: "ac",
    no: true,
  },

  // ฝ่ายกำกับดูแลปฎิบัติตามข้อกำหนด
  {
    value: "legal_doc",
    label: "เอกสารคดีความ",
    department: "ℹ️Compliance",
    case: "ac",
    no: false,
  },
  {
    value: "insurance_settlement_doc",
    label: "เอกสารประณีประนอมจากประกัน",
    department: "ℹ️Compliance",
    case: "all",
    no: false,
  },

  // ฝ่ายการเงินและบัญชี
  {
    value: "account_attachment_pjs_pay",
    label: "เอกสารแนบทางบัญชี (จ่าย)",
    department: "💼การเงิน",
    case: "all",
    no: false,
  },
  {
    value: "account_attachment_insurance",
    label: "เอกสารประกัน (รับ)",
    department: "💼การเงิน",
    case: "all",
    no: false,
  },
  {
    value: "account_damage_payment",
    label: "หลักฐานการชำระค่าเสียหาย (สำหรับบุคคลที่ 3) จ่ายโดยการเงิน",
    department: "💼การเงิน",
    case: "all",
    no: true,
  },
  
];

// ---------- กลุ่มเอกสารที่ต้องมีอย่างน้อย 1 รายการ ----------

export interface DocumentGroup {
  id: string;
  /** ข้อความอธิบายเงื่อนไข ใช้ตอนแจ้งเตือนก่อนบันทึก */
  label: string;
  /** รายการเอกสารในกลุ่ม (ต้องแนบอย่างน้อย 1 รายการ) */
  members: string[];
}

// export const DOCUMENT_GROUPS: DocumentGroup[] = [
//   {
//     id: "debt_or_quotation",
//     label: "ใบรับสภาพหนี้ หรือ ใบเสนอราคา (อย่างน้อย 1 รายการ)",
//     members: ["debt_doc", "quotation_doc"],
//   },
// ];

// ---------- ตัวช่วยเกี่ยวกับเอกสาร ----------

export const getCategory = (categoryValue: string) =>
  DOCUMENT_CATEGORIES.find((cat) => cat.value === categoryValue);

/** เอกสารที่ใช้ในฟอร์มนั้น ๆ */
export const getCategoriesByCase = (caseType: string) =>
  DOCUMENT_CATEGORIES.filter(
    (cat) => cat.case === caseType || cat.case === "all"
  );

/** จัดกลุ่มเอกสารตามฝ่าย (คงลำดับตามที่ประกาศไว้) */
export const groupCategoriesByDepartment = (categories: DocumentCategory[]) =>
  categories.reduce<{ [department: string]: DocumentCategory[] }>(
    (grouped, category) => {
      (grouped[category.department] ||= []).push(category);
      return grouped;
    },
    {}
  );

/** เอกสารนี้แนบได้หลายไฟล์หรือไม่ */
export const isMultipleCategory = (categoryValue: string) =>
  getCategory(categoryValue)?.multiple ?? false;

export const isImageCategory = (categoryValue: string) =>
  getCategory(categoryValue)?.imageOnly ?? false;

export const getAcceptTypes = (categoryValue: string) =>
  isImageCategory(categoryValue) ? ACCEPT_IMAGE : ACCEPT_DOCUMENT;

/** ชื่อฝ่ายที่แสดงผล: ถ้าเป็น "ตามฝ่ายผู้แจ้ง" ให้ใช้ชื่อฝ่ายผู้แจ้งจริง */
export const getDepartmentLabel = (
  department: string,
  reporterDepartment?: string
) => {
  if (department === REPORTER_DEPARTMENT && reporterDepartment) {
    return reporterDepartment;
  }
  return (
    DEPARTMENTS.find((dept) => dept.value === department)?.label || department
  );
};

/** ชื่อฝ่ายแบบสั้นสำหรับใบพิมพ์ */
export const getDepartmentPrintLabel = (
  department: string,
  reporterDepartment?: string
) => {
  if (department === REPORTER_DEPARTMENT && reporterDepartment) {
    return reporterDepartment;
  }
  return (
    DEPARTMENTS.find((dept) => dept.value === department)?.printLabel ||
    department
  );
};

/** กลุ่มเงื่อนไขที่เอกสารนี้อยู่ */
// export const getGroupOf = (categoryValue: string) =>
//   DOCUMENT_GROUPS.find((group) => group.members.includes(categoryValue));

/** สมาชิกของกลุ่มที่ใช้จริงในฟอร์มนั้น ๆ */
export const getGroupMembers = (group: DocumentGroup, caseType: string) =>
  group.members
    .map(getCategory)
    .filter(
      (cat): cat is DocumentCategory =>
        !!cat && (cat.case === caseType || cat.case === "all")
    );

/** กลุ่มมีผลบังคับเมื่อฟอร์มนั้นมีสมาชิกให้เลือกตั้งแต่ 2 รายการขึ้นไป */
export const isGroupActive = (group: DocumentGroup, caseType: string) =>
  getGroupMembers(group, caseType).length > 1;

/** กลุ่มนี้แนบครบเงื่อนไขแล้วหรือยัง (มีอย่างน้อย 1 รายการ) */
export const isGroupSatisfied = (
  group: DocumentGroup,
  caseType: string,
  files: CategoryFiles
) =>
  getGroupMembers(group, caseType).some(
    (cat) => (files[cat.value]?.length ?? 0) > 0
  );

// ---------- เลขที่เอกสาร ----------

/** คีย์เลขที่เอกสารรายไฟล์ (ไฟล์แรกใช้คีย์เดิมเพื่อให้ใบพิมพ์ยังอ่านได้) */
export const getDocNoKey = (categoryValue: string, index: number) =>
  index === 0 ? `${categoryValue}_no` : `${categoryValue}_no_${index + 1}`;

/** จำนวนช่องเลขที่เอกสารที่มีข้อมูลอยู่ในขณะนั้น */
const countDocNoSlots = (docs: DocumentInfo, categoryValue: string) => {
  const prefix = `${categoryValue}_no`;
  let highest = 1;
  Object.keys(docs).forEach((key) => {
    if (key === prefix) return;
    const match = key.match(new RegExp(`^${prefix}_(\\d+)$`));
    if (match) highest = Math.max(highest, Number(match[1]));
  });
  return highest;
};

/** เลื่อนเลขที่เอกสารขึ้นตามไฟล์ที่เหลือ หลังลบไฟล์ลำดับใดลำดับหนึ่ง */
export const reindexDocNos = (
  docs: DocumentInfo,
  categoryValue: string,
  removedIndex: number
): DocumentInfo => {
  const slots = countDocNoSlots(docs, categoryValue);
  const remaining = Array.from(
    { length: slots },
    (_, i) => docs[getDocNoKey(categoryValue, i)] || ""
  ).filter((_, i) => i !== removedIndex);

  const updated = { ...docs };
  for (let i = 0; i < slots; i++) {
    updated[getDocNoKey(categoryValue, i)] = remaining[i] || "";
  }
  return updated;
};

/** เลขที่เอกสารทั้งหมดของรายการนั้น (รวมกรณีแนบหลายไฟล์) */
export const getDocNos = (docs: DocumentInfo, categoryValue: string) =>
  Array.from({ length: countDocNoSlots(docs, categoryValue) }, (_, i) =>
    (docs[getDocNoKey(categoryValue, i)] || "").trim()
  ).filter(Boolean);

/** เลขที่เอกสารสำหรับแสดงผล/ใบพิมพ์ */
export const formatDocNos = (docs: DocumentInfo, categoryValue: string) =>
  getDocNos(docs, categoryValue).join(", ");

// ---------- สถานะเอกสาร ----------

export const isSkipped = (docs: DocumentInfo, categoryValue: string) =>
  docs[categoryValue] === DOC_STATUS.skipped;

/** สถานะที่ควรเป็นของเอกสารหนึ่งรายการ (คงค่า "ไม่ต้องแนบ" ที่ผู้ใช้เลือกไว้) */
export const resolveDocStatus = (hasFile: boolean, currentStatus?: string) => {
  if (hasFile) return DOC_STATUS.attached;
  return currentStatus === DOC_STATUS.skipped
    ? DOC_STATUS.skipped
    : DOC_STATUS.missing;
};

/** จำนวนเอกสารที่แนบแล้ว (อย่างน้อย 1 ไฟล์) */
export const countAttached = (
  categories: DocumentCategory[],
  files: CategoryFiles
) => categories.filter((cat) => (files[cat.value]?.length ?? 0) > 0).length;

/** จำนวนเอกสารที่ต้องแนบจริง (ไม่นับรายการที่ระบุว่าไม่ต้องแนบ) */
export const countRequired = (
  categories: DocumentCategory[],
  docs: DocumentInfo
) => categories.filter((cat) => !isSkipped(docs, cat.value)).length;

/** ระบุ "ไม่ต้องแนบ" ให้เอกสารนี้ได้หรือไม่ (เอกสารบังคับแนบซ่อนไม่ได้) */
export const canSkipCategory = (
  categoryValue: string,
  _caseType: string,
  _files: CategoryFiles,
  _docs: DocumentInfo
) => !getCategory(categoryValue)?.required;

/** เอกสารที่ยังขาดตามเงื่อนไข ใช้ตรวจก่อนบันทึก */
export const getMissingRequiredDocs = (
  caseType: string,
  files: CategoryFiles
): { value: string; label: string }[] =>
  getCategoriesByCase(caseType)
    .filter((cat) => cat.required && (files[cat.value]?.length ?? 0) === 0)
    .map((cat) => ({ value: cat.value, label: cat.label }));

// ---------- การปิดเคส ----------

/**
 * เอกสารที่ต้องแนบก่อนจึงจะปิดเคสได้
 *
 * ระหว่างที่ยังไม่เปิดใช้ฟอร์มสอบสวน (ส่วนที่ 2) ให้ใช้การแนบเอกสารสอบสวน
 * เป็นเงื่อนไขปิดเคสแทน — แนบแล้วถือว่าสอบสวนเสร็จ
 */
export const CASE_CLOSING_DOC = "investigate_doc";

export const getCaseClosingDocLabel = () =>
  getCategory(CASE_CLOSING_DOC)?.label ?? "เอกสารสอบสวน";

/** แนบเอกสารสอบสวนแล้วหรือยัง (ใช้เป็นเงื่อนไขเปิดปุ่มปิดเคส) */
export const hasCaseClosingDoc = (files: CategoryFiles) =>
  (files[CASE_CLOSING_DOC]?.length ?? 0) > 0;

/**
 * ระบุ "ไม่ต้องแนบ" ให้เอกสารที่ยังไม่มีไฟล์ — ใช้ตอนเคสถูกปิด
 *
 * เคสที่ปิดแล้วไม่มีใครมาแนบเอกสารเพิ่มอีก รายการที่ยังว่างจึงเป็นแค่ noise
 * ซ่อนออกไปให้เหลือเฉพาะเอกสารที่มีจริง (ยังกด "นำกลับมาแนบ" ได้ตลอด)
 *
 * เอกสารบังคับแนบ (required) ไม่แตะ — ต้องเห็นว่ายังขาดอยู่เสมอ
 */
export const skipEmptyDocs = (
  caseType: string,
  files: CategoryFiles,
  docs: DocumentInfo
): DocumentInfo => {
  const updated = { ...docs };
  getCategoriesByCase(caseType).forEach((cat) => {
    if (cat.required) return;
    if ((files[cat.value]?.length ?? 0) > 0) return;
    updated[cat.value] = DOC_STATUS.skipped;
  });
  return updated;
};

// ---------- ตัวช่วยเกี่ยวกับไฟล์ ----------

export const isImageFile = (file: File) => file.type.startsWith("image/");

export const isPdfFile = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const countTotalFiles = (files: CategoryFiles) =>
  Object.values(files).reduce((total, list) => total + list.length, 0);
