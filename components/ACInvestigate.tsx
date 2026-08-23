"use client";
import { useEffect, useMemo, useState } from "react";
import { CirclePlus, CircleMinus, Trash2, Paperclip, X, Bug, Copy, ArrowDown } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { DateTimePicker24h } from "./ui/datetime-picker";
import { SearchableSelect } from "./ui/searchable-select";
import {
  investigate_AC,
  acWhyItem,
  acRootCauseItem,
  acMeasureItem,
  acInvestigatorItem,
  acMeasureExistingFile,
} from "@/lib/caseReport";

/** พนักงานจากทะเบียนองค์กร (ใช้เฉพาะฟิลด์ที่ฟอร์มต้องการ) */
interface OrgUser {
  employee_id: string;
  firstname: string;
  lastname: string;
  position: string;
}

export interface MeasureFileMap {
  [measureId: string]: File[];
}
export interface MeasureExistingFileMap {
  [measureId: string]: acMeasureExistingFile[];
}

interface ACInvestigateProps {
  formInvestigate: Partial<investigate_AC>;
  setFormInvestigate: React.Dispatch<
    React.SetStateAction<Partial<investigate_AC>>
  >;
  /** ไฟล์ใหม่ที่ยังไม่ได้อัปโหลด แยกตามมาตรการ */
  measureFiles: MeasureFileMap;
  setMeasureFiles: React.Dispatch<React.SetStateAction<MeasureFileMap>>;
  /** ไฟล์ที่อัปโหลดไว้แล้ว แยกตามมาตรการ */
  measureExistingFiles: MeasureExistingFileMap;
  setMeasureExistingFiles: React.Dispatch<
    React.SetStateAction<MeasureExistingFileMap>
  >;
  isViewMode?: boolean;
}

// ========== Master Options ==========
const ACCIDENT_TYPES = [
  { value: "near_miss", label_th: "เกือบจะเกิดอุบัติเหตุ", label_en: "Near Miss" },
  { value: "injury_illness", label_th: "มีการบาดเจ็บ / เจ็บป่วย", label_en: "Injury / Illness" },
  { value: "motor_vehicle", label_th: "อุบัติเหตุทางยานพาหนะ", label_en: "Motor Vehicle Incident" },
  { value: "drug_alcohol", label_th: "การตรวจพบสารเสพติดและ/หรือแอลกอฮอล์", label_en: "D&A Non-Negative" },
  { value: "property_damage", label_th: "ทรัพย์สินสูญหาย / เสียหาย", label_en: "Property loss / damage" },
  { value: "environment", label_th: "ผลกระทบต่อสิ่งแวดล้อม", label_en: "Environment" },
  { value: "security", label_th: "อุบัติเหตุเกี่ยวกับการรักษาความปลอดภัย", label_en: "Security Incident" },
  { value: "public_complaint", label_th: "การร้องเรียนจากสาธารณะ", label_en: "Public Complaint" },
];

const SEVERITY_LEVELS = [
  {
    value: "L1",
    label: "L1 - เล็กน้อย (Low)",
    detail: "ทรัพย์สินไม่เสียหาย ไม่มีการบาดเจ็บ ค่าเสียหายตั้งแต่ 0 บาท แต่ไม่เกิน 10,000 บาท",
  },
  {
    value: "L2",
    label: "L2 - เล็กน้อย (Low)",
    detail: "ค่าเสียหายตั้งแต่ 10,001 บาท แต่ไม่เกิน 50,000 บาท หรือ บาดเจ็บเล็กน้อย ไม่มีการรักษาทางการแพทย์ ไม่หยุดงาน",
  },
  {
    value: "L3",
    label: "L3 - เล็กน้อย (Low)",
    detail: "ค่าเสียหายตั้งแต่ 50,001 บาท แต่ไม่เกิน 100,000 บาท หรือ พนักงานได้รับบาดเจ็บ หยุดงานไม่เกิน 3 วัน",
  },
  {
    value: "L4",
    label: "L4 - ปานกลาง (Moderate)",
    detail: "พนักงานได้รับบาดเจ็บ ไม่ถึงขั้นเสียชีวิต",
  },
  {
    value: "L5",
    label: "L5 - สูงมาก (High)",
    detail: "พนักงานบาดเจ็บถึงขั้นทุพลภาพ หรือเสียชีวิต",
  },
];

const CAUSE_CATEGORIES_5M1E = [
  { value: "man", label: "คน (Man)" },
  { value: "machine", label: "เครื่องจักร/ยานพาหนะ (Machine)" },
  { value: "material", label: "วัสดุ/สินค้า (Material)" },
  { value: "method", label: "วิธีการ/ขั้นตอนงาน (Method)" },
  { value: "measurement", label: "การวัด/การตรวจสอบ (Measurement)" },
  { value: "environment", label: "สภาพแวดล้อม (Environment)" },
];

const WHY_COUNT = 5;
const INVESTIGATOR_COUNT = 5;

const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ตีลำดับ seq ใหม่ให้ตรงกับตำแหน่งใน array เสมอ (1..n)
const withSeq = <T extends { seq?: number }>(rows: T[]): T[] =>
  rows.map((row, i) => ({ ...row, seq: i + 1 }));

const fullName = (user: OrgUser) =>
  `${user.firstname || ""} ${user.lastname || ""}`.trim();

// ค่าที่ใช้แทนชื่อเดิมซึ่งไม่มีอยู่ในทะเบียนพนักงานแล้ว (ข้อมูลเก่า/พนักงานลาออก)
const LEGACY_PREFIX = "__legacy__";

const newWhy = (rootCauseId: string): acWhyItem => ({
  id: uid(),
  seq: 0,
  root_cause_id: rootCauseId,
  problem: "",
  cause: "",
});

const newRootCause = (): acRootCauseItem => ({
  id: uid(),
  seq: 0,
  problem: "",
  root_cause: "",
  category: "",
});

/**
 * จัดชุด WHY ของแต่ละสาเหตุให้ต่อเนื่องกัน
 * - ตีเลข WHY 1..n แยกตามชุดวิเคราะห์
 * - ประเด็นของ WHY แรก = ประเด็นตั้งต้นของชุดนั้น, ถัดไป = คำตอบของ WHY ก่อนหน้า
 * - แถวที่ไม่ผูกกับสาเหตุใดเลย (ข้อมูลค้าง) เก็บต่อท้ายไว้ ไม่ทิ้ง
 */
const linkWhyChains = (
  whys: acWhyItem[],
  rootCauses: acRootCauseItem[]
): acWhyItem[] => {
  const linked = rootCauses.flatMap((rc) => {
    const chain = whys.filter((w) => w.root_cause_id === rc.id);
    return chain.map((why, i) => ({
      ...why,
      seq: i + 1,
      problem: i === 0 ? rc.problem || "" : chain[i - 1].cause || "",
    }));
  });
  const orphans = whys.filter(
    (w) => !rootCauses.some((rc) => rc.id === w.root_cause_id)
  );
  return [...linked, ...orphans];
};

/**
 * ใช้ตอนโหลดข้อมูลจาก API เข้ามาใหม่
 * - เรียงทุก array ตาม seq (ถ้าไม่มี seq ใช้ลำดับที่ API ส่งมา)
 * - เติม id ให้แถวที่ไม่มี เพื่อไม่ให้ React key / handler ชนกัน
 * - ตีเลข seq ใหม่ให้ต่อเนื่อง 1..n
 * - WHY ที่ยังไม่ผูกสาเหตุ (ข้อมูลรูปแบบเดิม) ให้ผูกกับสาเหตุแรก
 */
export const normalizeInvestigateData = (
  data: Partial<investigate_AC>
): Partial<investigate_AC> => {
  const sortRows = <T extends { id?: string; seq?: number }>(
    rows?: T[]
  ): T[] =>
    withSeq(
      [...(rows || [])]
        .map((row, i) => ({
          ...row,
          id: row.id || uid(),
          seq: typeof row.seq === "number" ? row.seq : i + 1,
        }))
        .sort((a, b) => a.seq - b.seq)
    );

  const rootCauses = sortRows(data.root_causes) as acRootCauseItem[];
  const whys = (sortRows(data.why_analysis) as acWhyItem[]).map((why) => ({
    ...why,
    root_cause_id: why.root_cause_id || rootCauses[0]?.id || "",
  }));

  return {
    ...data,
    root_causes: rootCauses,
    why_analysis: linkWhyChains(whys, rootCauses),
    measures: sortRows(data.measures) as acMeasureItem[],
    investigators: sortRows(data.investigators) as acInvestigatorItem[],
  };
};

// ========== Shared Styles ==========
const sectionHead =
  "flex flex-row justify-between items-start p-2 bg-gray-200 font-bold text-gray-800 mb-3 text-sm";

const inputBase =
  "w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black";

const viewModeStyle = "cursor-not-allowed bg-gray-100 text-blue-600 font-bold";

const RadioOption = ({
  name,
  checked,
  label,
  disabled,
  onSelect,
}: {
  name: string;
  checked: boolean;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
}) => (
  <label className="flex items-center">
    <input
      type="radio"
      name={name}
      checked={checked}
      disabled={disabled}
      onChange={onSelect}
      className={`mr-2 h-4 w-4 text-blue-600 ${disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
    />
    <span className="text-sm">{label}</span>
  </label>
);

// ปุ่มเพิ่ม/ลบรายการ มุมขวาของหัวข้อ (ลบได้จนเหลืออย่างน้อย 1 รายการ)
const SectionAddRemove = ({
  onAdd,
  onRemove,
  canRemove,
  hidden = false,
  addTitle = "เพิ่มรายการ",
  removeTitle = "ลบรายการล่าสุด",
}: {
  onAdd: () => void;
  onRemove: () => void;
  canRemove: boolean;
  hidden?: boolean;
  addTitle?: string;
  removeTitle?: string;
}) => (
  <div className={`flex items-center gap-1 p-1 ${hidden ? "hidden" : ""}`}>
    <button
      type="button"
      onClick={onAdd}
      title={addTitle}
      className="text-gray-600 hover:text-green-700 cursor-pointer transition duration-150"
    >
      <CirclePlus className="w-5 h-5 bg-white rounded-full" />
    </button>
    <button
      type="button"
      onClick={onRemove}
      disabled={!canRemove}
      title={canRemove ? removeTitle : "ต้องมีอย่างน้อย 1 รายการ"}
      className={`transition duration-150 ${canRemove
        ? "text-gray-600 hover:text-red-700 cursor-pointer"
        : "text-gray-400 cursor-not-allowed"
        }`}
    >
      <CircleMinus className="w-5 h-5 bg-white rounded-full" />
    </button>
  </div>
);

export const ACInvestigateComponent = ({
  formInvestigate,
  setFormInvestigate,
  measureFiles,
  setMeasureFiles,
  measureExistingFiles,
  setMeasureExistingFiles,
  isViewMode = false,
}: ACInvestigateProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // รายชื่อพนักงานสถานะ Active สำหรับเลือกผู้เข้าร่วมสอบสวน
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // ========== Dev Payload Log (ซ่อนไว้ เปิดด้วยปุ่ม / เห็นเฉพาะ dev หรือ ?debug=1) ==========
  const searchParams = useSearchParams();
  const isDebugEnabled =
    process.env.NODE_ENV !== "production" || searchParams.get("debug") === "1";
  const [showPayload, setShowPayload] = useState(false);
  const [copied, setCopied] = useState(false);

  const whys = formInvestigate.why_analysis || [];
  const rootCauses = formInvestigate.root_causes || [];
  const measures = formInvestigate.measures || [];
  const investigators = formInvestigate.investigators || [];

  const fieldClass = `${inputBase} ${isViewMode ? viewModeStyle : ""}`;

  // ========== โหลดทะเบียนพนักงาน (Active) สำหรับ dropdown ผู้เข้าร่วมสอบสวน ==========
  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const res = await fetch("/api/organization?employee_status=Active", {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        setOrgUsers(
          (data as OrgUser[])
            .filter((u) => u?.employee_id)
            .sort((a, b) => fullName(a).localeCompare(fullName(b), "th"))
        );
      } catch (error) {
        console.error("Load employee list error:", error);
      } finally {
        if (!cancelled) setIsLoadingUsers(false);
      }
    };

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  const userOptions = useMemo(
    () =>
      orgUsers.map((u) => ({ value: u.employee_id, label: fullName(u) })),
    [orgUsers]
  );

  // ค่าใน dropdown ของแต่ละแถว: อิงรหัสพนักงาน ถ้าไม่มีให้เทียบจากชื่อที่บันทึกไว้
  const investigatorValue = (person: acInvestigatorItem) => {
    if (person.employee_id) return person.employee_id;
    const name = (person.name || "").trim();
    if (!name) return "";
    const matched = orgUsers.find((u) => fullName(u) === name);
    return matched ? matched.employee_id : `${LEGACY_PREFIX}${person.id}`;
  };

  // ชื่อที่ไม่มีในทะเบียนแล้ว ยังต้องแสดงค่าเดิมได้ จึงเติมเป็นตัวเลือกเฉพาะแถวนั้น
  const optionsFor = (person: acInvestigatorItem) => {
    const value = investigatorValue(person);
    return value.startsWith(LEGACY_PREFIX)
      ? [{ value, label: person.name }, ...userOptions]
      : userOptions;
  };

  // ========== Seed Default Rows ==========
  useEffect(() => {
    setFormInvestigate((prev) => {
      const next: Partial<investigate_AC> = { ...prev };
      let changed = false;

      // ต้องมีชุดวิเคราะห์อย่างน้อย 1 ชุด และทุกชุดต้องมีแถว WHY ให้กรอก
      const baseRootCauses =
        prev.root_causes && prev.root_causes.length > 0
          ? prev.root_causes
          : withSeq([newRootCause()]);

      if (baseRootCauses !== prev.root_causes) {
        next.root_causes = baseRootCauses;
        changed = true;
      }

      const baseWhys = prev.why_analysis || [];
      const hasEmptyChain = baseRootCauses.some(
        (rc) => !baseWhys.some((w) => w.root_cause_id === rc.id)
      );

      if (hasEmptyChain) {
        const seededWhys = baseRootCauses.flatMap((rc) => {
          const chain = baseWhys.filter((w) => w.root_cause_id === rc.id);
          return chain.length > 0
            ? chain
            : Array.from({ length: WHY_COUNT }, () => newWhy(rc.id));
        });
        next.why_analysis = linkWhyChains(seededWhys, baseRootCauses);
        changed = true;
      }

      if (!prev.investigators || prev.investigators.length === 0) {
        next.investigators = withSeq(
          Array.from({ length: INVESTIGATOR_COUNT }, () => ({
            id: uid(),
            seq: 0,
            employee_id: "",
            name: "",
            position: "",
          }))
        );
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [setFormInvestigate]);

  // ========== Helpers ==========
  const setField = (name: keyof investigate_AC, value: any) =>
    setFormInvestigate((prev) => ({ ...prev, [name]: value }));

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ========== Type of Accident ==========
  const toggleAccidentType = (value: string) => {
    const current = formInvestigate.accident_types || [];
    setField(
      "accident_types",
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  };

  // ========== Why-Why Analysis (ชุดวิเคราะห์ของแต่ละสาเหตุ) ==========
  const whysOf = (rootCauseId: string) =>
    whys.filter((w) => w.root_cause_id === rootCauseId);

  // อัปเดต why แล้วผูกประเด็นของแต่ละขั้นให้ต่อเนื่องกันใหม่เสมอ
  const applyWhys = (
    nextWhys: acWhyItem[],
    nextRootCauses: acRootCauseItem[] = rootCauses
  ) => setField("why_analysis", linkWhyChains(nextWhys, nextRootCauses));

  const handleWhyCauseChange = (id: string, value: string) =>
    applyWhys(whys.map((w) => (w.id === id ? { ...w, cause: value } : w)));

  const addWhy = (rootCauseId: string) =>
    applyWhys([...whys, newWhy(rootCauseId)]);

  const removeLastWhy = (rootCauseId: string) => {
    const chain = whysOf(rootCauseId);
    if (chain.length <= 1) return; // ต้องเหลืออย่างน้อย 1 ขั้น
    const lastId = chain[chain.length - 1].id;
    applyWhys(whys.filter((w) => w.id !== lastId));
  };

  // ========== Root Cause ==========
  const handleRootCauseChange = (
    id: string,
    field: keyof acRootCauseItem,
    value: string
  ) => {
    const nextRootCauses = rootCauses.map((rc) =>
      rc.id === id ? { ...rc, [field]: value } : rc
    );
    setFormInvestigate((prev) => ({
      ...prev,
      root_causes: nextRootCauses,
      // ประเด็นตั้งต้นเปลี่ยน → WHY 1 ของชุดนั้นต้องเปลี่ยนตาม
      why_analysis: linkWhyChains(prev.why_analysis || [], nextRootCauses),
    }));
  };

  // นำคำตอบของ WHY สุดท้ายมาเป็นสาเหตุที่แท้จริงของชุดนั้น
  const adoptLastWhy = (rootCauseId: string) => {
    const chain = whysOf(rootCauseId);
    const lastCause = chain[chain.length - 1]?.cause?.trim();
    if (lastCause) handleRootCauseChange(rootCauseId, "root_cause", lastCause);
  };

  const addRootCause = () => {
    const rc = newRootCause();
    const nextRootCauses = withSeq([...rootCauses, rc]);
    setFormInvestigate((prev) => ({
      ...prev,
      root_causes: nextRootCauses,
      why_analysis: linkWhyChains(
        [
          ...(prev.why_analysis || []),
          ...Array.from({ length: WHY_COUNT }, () => newWhy(rc.id)),
        ],
        nextRootCauses
      ),
    }));
  };

  const removeRootCause = (id: string) => {
    if (rootCauses.length <= 1) return; // ต้องเหลืออย่างน้อย 1 รายการ
    const removedMeasureIds = measures
      .filter((m) => m.root_cause_id === id)
      .map((m) => m.id);

    setFormInvestigate((prev) => {
      const nextRootCauses = withSeq(
        (prev.root_causes || []).filter((rc) => rc.id !== id)
      );
      return {
        ...prev,
        root_causes: nextRootCauses,
        // ลบชุด WHY และมาตรการที่ผูกกับสาเหตุนี้ออกด้วย
        why_analysis: linkWhyChains(
          (prev.why_analysis || []).filter((w) => w.root_cause_id !== id),
          nextRootCauses
        ),
        measures: withSeq(
          (prev.measures || []).filter((m) => m.root_cause_id !== id)
        ),
      };
    });

    // ล้างไฟล์แนบของมาตรการที่ถูกลบไปพร้อมกัน
    if (removedMeasureIds.length > 0) {
      setMeasureFiles((prev) => {
        const next = { ...prev };
        removedMeasureIds.forEach((mid) => delete next[mid]);
        return next;
      });
    }
  };

  const removeLastRootCause = () => {
    const last = rootCauses[rootCauses.length - 1];
    if (last) removeRootCause(last.id);
  };

  // ========== Preventive / Corrective Measures ==========
  const measuresOf = (rootCauseId: string) =>
    measures.filter((m) => m.root_cause_id === rootCauseId);

  const addMeasure = (rootCauseId: string) =>
    setField(
      "measures",
      withSeq([
        ...measures,
        {
          id: uid(),
          seq: 0,
          root_cause_id: rootCauseId,
          measure: "",
          pic_contract: "",
          plan_date: "",
          action_completed_date: "",
        } as acMeasureItem,
      ])
    );

  const handleMeasureChange = (
    id: string,
    field: keyof acMeasureItem,
    value: string
  ) =>
    setField(
      "measures",
      measures.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );

  const removeMeasure = (id: string) => {
    setField(
      "measures",
      withSeq(measures.filter((m) => m.id !== id))
    );
    setMeasureFiles((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  // ========== Measure Attachments ==========
  const addMeasureFiles = (measureId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setMeasureFiles((prev) => ({
      ...prev,
      [measureId]: [...(prev[measureId] || []), ...Array.from(files)],
    }));
  };

  const removeMeasureNewFile = (measureId: string, fileIndex: number) =>
    setMeasureFiles((prev) => ({
      ...prev,
      [measureId]: (prev[measureId] || []).filter((_, i) => i !== fileIndex),
    }));

  const removeMeasureExistingFile = async (measureId: string, key: string) => {
    try {
      await fetch("/api/attachment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      setMeasureExistingFiles((prev) => ({
        ...prev,
        [measureId]: (prev[measureId] || []).filter((f) => f.key !== key),
      }));
    } catch (err) {
      console.error("Delete measure file error:", err);
    }
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);

  // ========== Dev Payload ==========
  // มาตรการที่ root_cause_id ชี้ไปยังสาเหตุที่ไม่มีอยู่จริง (จะไม่ถูกแสดงบนฟอร์ม)
  const orphanMeasures = measures
    .filter((m) => !rootCauses.some((rc) => rc.id === m.root_cause_id))
    .map((m) => ({ id: m.id, root_cause_id: m.root_cause_id }));

  const orphanWhys = whys
    .filter((w) => !rootCauses.some((rc) => rc.id === w.root_cause_id))
    .map((w) => ({ id: w.id, root_cause_id: w.root_cause_id }));

  const debugPayload = {
    ...formInvestigate,
    _warnings: { orphan_measures: orphanMeasures, orphan_whys: orphanWhys },
    _attachments: {
      pending: Object.fromEntries(
        Object.entries(measureFiles).map(([measureId, files]) => [
          measureId,
          files.map((f) => f.name),
        ])
      ),
      uploaded: Object.fromEntries(
        Object.entries(measureExistingFiles).map(([measureId, files]) => [
          measureId,
          files.map((f) => f.fileName),
        ])
      ),
    },
  };
  const debugPayloadText = JSON.stringify(debugPayload, null, 2);

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(debugPayloadText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy payload error:", err);
    }
  };

  // ========== Investigators ==========
  const handleInvestigatorChange = (
    id: string,
    field: keyof acInvestigatorItem,
    value: string
  ) =>
    setField(
      "investigators",
      investigators.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );

  // เลือกชื่อจากทะเบียนพนักงาน → เติมตำแหน่งให้อัตโนมัติ
  const handleInvestigatorSelect = (
    id: string,
    employeeId: string | number
  ) => {
    const selected = String(employeeId);
    if (selected.startsWith(LEGACY_PREFIX)) return; // เลือกชื่อเดิมซ้ำ ไม่ต้องแก้อะไร
    const user = orgUsers.find((u) => u.employee_id === selected);
    setField(
      "investigators",
      investigators.map((p) =>
        p.id === id
          ? {
            ...p,
            employee_id: user?.employee_id || "",
            name: user ? fullName(user) : "",
            position: user?.position || "",
          }
          : p
      )
    );
  };

  const addInvestigator = () =>
    setField(
      "investigators",
      withSeq([
        ...investigators,
        { id: uid(), seq: 0, employee_id: "", name: "", position: "" },
      ])
    );

  const removeInvestigator = () => {
    if (investigators.length <= 1) return;
    setField("investigators", withSeq(investigators.slice(0, -1)));
  };

  // ========== Reusable Radio ==========
  const fieldRadio = (
    field: keyof investigate_AC,
    value: string,
    label: string
  ) => (
    <RadioOption
      key={`${String(field)}-${value}`}
      name={String(field)}
      checked={formInvestigate[field] === value}
      label={label}
      disabled={isViewMode}
      onSelect={() => setField(field, value)}
    />
  );

  return (
    <div className="bg-white">
      {/* Part Header */}
      <div className="mb-3 border-b border-gray-400 pb-4">
        <label className="flex text-sm p-1 font-bold text-gray-800">
          Part 2: AC Investigation Report - Root Cause Analysis, Measures and
          Risk Assessment
        </label>
        <label className="flex text-sm p-1 font-bold text-gray-800">
          ส่วนที่ 2: รายงานผลการสอบสวนอุบัติเหตุ - การวิเคราะห์สาเหตุ
          มาตรการป้องกันแก้ไข และการประเมินความเสี่ยง
        </label>
      </div>

      {/* ========== Type of Accident ========== */}
      <div className={sectionHead}>
        <div className="flex flex-col">
          <h3>ชนิดของอุบัติเหตุ</h3>
          <p className="font-semibold text-xs text-gray-600">
            Type of Accident
          </p>
        </div>
        <span className="text-xs font-normal text-gray-600 p-1">
          เลือกได้มากกว่า 1 ข้อ
        </span>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {ACCIDENT_TYPES.map((type) => (
            <label
              key={type.value}
              className={`flex items-start gap-2 p-2 border rounded transition duration-150 ${(formInvestigate.accident_types || []).includes(type.value)
                ? "border-[#7fb98a] bg-[#f2fbf4]"
                : "border-gray-300 bg-white"
                } ${isViewMode ? "cursor-not-allowed" : "cursor-pointer hover:border-gray-400"}`}
            >
              <input
                type="checkbox"
                checked={(formInvestigate.accident_types || []).includes(
                  type.value
                )}
                onChange={() => toggleAccidentType(type.value)}
                disabled={isViewMode}
                className="mt-0.5 h-4 w-4 text-blue-600"
              />
              <span className="flex flex-col leading-tight">
                <span className="text-sm text-gray-800">{type.label_th}</span>
                <span className="text-xs text-gray-500">
                  ({type.label_en})
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-400"></div>

      {/* ========== Severity Level ========== */}
      <div className={sectionHead}>
        <div className="flex flex-col">
          <h3>ระดับความรุนแรง</h3>
          <p className="font-semibold text-xs text-gray-600">Severity Level</p>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-2">
          {SEVERITY_LEVELS.map((level) => (
            <label
              key={level.value}
              className={`flex items-start gap-2 p-2.5 border rounded transition duration-150 ${formInvestigate.severity_level === level.value
                ? "border-[#7fb98a] bg-[#f2fbf4]"
                : "border-gray-300 bg-white"
                } ${isViewMode ? "cursor-not-allowed" : "cursor-pointer hover:border-gray-400"}`}
            >
              <input
                type="radio"
                name="severity_level"
                checked={formInvestigate.severity_level === level.value}
                onChange={() => setField("severity_level", level.value)}
                disabled={isViewMode}
                className="mt-0.5 h-4 w-4 text-blue-600"
              />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-gray-800">
                  {level.label}
                </span>
                <span className="text-xs text-gray-600">{level.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-400"></div>

      {/* ========== Description of Accident ========== */}
      <div className={sectionHead}>
        <div className="flex flex-col">
          <h3>รายละเอียดสอบสวนอุบัติเหตุ</h3>
          <p className="font-semibold text-xs text-gray-600">
            Description investigation of Accident
          </p>
        </div>
      </div>
      <div className="p-6">
        <textarea
          name="accident_description"
          value={formInvestigate.accident_description || ""}
          onChange={(e) => {
            setField("accident_description", e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.max(120, e.target.scrollHeight)}px`;
          }}
          maxLength={4000}
          disabled={isViewMode}
          style={{ minHeight: "120px" }}
          className={`${fieldClass} resize-none overflow-hidden`}
        />
      </div>

      <div className="border-t border-gray-400"></div>

      {/* ========== Why-Why Analysis → Root Cause → Measures ========== */}
      <div className={sectionHead}>
        <div className="flex flex-col">
          <h3>การวิเคราะห์สาเหตุ และมาตรการป้องกันและแก้ไข</h3>
          <p className="font-semibold text-xs text-gray-600">
            Why-Why Analysis → Root Cause (5M1E) → Preventive / Corrective
            Measures
          </p>
        </div>
        <SectionAddRemove
          onAdd={addRootCause}
          onRemove={removeLastRootCause}
          canRemove={rootCauses.length > 1}
          hidden={isViewMode}
          addTitle="เพิ่มชุดการวิเคราะห์"
          removeTitle="ลบชุดการวิเคราะห์ล่าสุด"
        />
      </div>
      <div className="p-3 sm:p-6 space-y-4">

        {rootCauses.length === 0 && (
          <div className="text-center py-4 text-xs text-gray-500 border border-dashed border-gray-300 rounded">
            ยังไม่มีรายการ — กดปุ่ม + เพื่อเพิ่มชุดการวิเคราะห์
          </div>
        )}

        {rootCauses.map((rc, index) => (
          <div
            key={rc.id}
            className="border border-gray-300 rounded-lg bg-white overflow-hidden"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between gap-2 bg-gray-100 px-3 py-2 border-b border-gray-300">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-600 text-white text-[11px]">
                  {index + 1}
                </span>
                ชุดการวิเคราะห์ที่ {index + 1}
              </span>
              {!isViewMode && rootCauses.length > 1 && (
                <Trash2
                  onClick={() => removeRootCause(rc.id)}
                  className="w-4 h-4 text-gray-500 hover:text-red-600 cursor-pointer"
                />
              )}
            </div>

            {/* Card Body */}
            <div className="p-3 space-y-3">
              {/* ขั้นที่ 1 : ประเด็นปัญหาตั้งต้น */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ประเด็นปัญหาที่นำมาวิเคราะห์
                  <span className="ml-1 font-normal text-gray-500">
                    (Problem statement)
                  </span>
                </label>
                <input
                  type="text"
                  value={rc.problem || ""}
                  onChange={(e) =>
                    handleRootCauseChange(rc.id, "problem", e.target.value)
                  }
                  disabled={isViewMode}
                  placeholder="เช่น รถเสียหลักชนราวกั้นข้างทาง"
                  className={fieldClass}
                />
              </div>

              {/* ขั้นที่ 2 : Why-Why Analysis */}
              <div className="rounded border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-700">
                    Why-Why Analysis
                    <span className="ml-1 font-normal text-gray-500">
                      ({whysOf(rc.id).length} ขั้น)
                    </span>
                  </span>
                  {/* <SectionAddRemove
                    onAdd={() => addWhy(rc.id)}
                    onRemove={() => removeLastWhy(rc.id)}
                    canRemove={whysOf(rc.id).length > 1}
                    hidden={isViewMode}
                    addTitle="เพิ่มขั้น WHY"
                    removeTitle="ลบขั้น WHY ล่าสุด"
                  /> */}
                </div>

                <div className="p-2.5 space-y-2">
                  {whysOf(rc.id).map((why, wIndex) => (
                    <div
                      key={why.id}
                      className="grid grid-cols-[56px_1fr] gap-2 items-start"
                    >
                      <span className="mt-2 text-xs font-semibold text-gray-600">
                        WHY {wIndex + 1}
                      </span>
                      <div>
                        <p className="text-xs text-gray-500 mb-1 truncate">
                          ทำไม{" "}
                          <span className="text-gray-700">
                            {why.problem?.trim() ||
                              (wIndex === 0
                                ? "— กรอกประเด็นปัญหาด้านบน"
                                : "— กรอกคำตอบของ WHY ก่อนหน้า")}
                          </span>
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-sm text-gray-600">
                            เพราะ
                          </span>
                          <input
                            type="text"
                            value={why.cause || ""}
                            onChange={(e) =>
                              handleWhyCauseChange(why.id, e.target.value)
                            }
                            disabled={isViewMode}
                            placeholder=""
                            className={fieldClass}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ขั้นที่ 3 : สรุปสาเหตุที่แท้จริง */}
              <div className="flex justify-center text-gray-400">
                <ArrowDown className="w-4 h-4" />
              </div>

              <div className="rounded border border-gray-200 border-l-4 border-l-[#7fb98a] bg-[#f7fcf8] p-2.5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="block text-xs font-medium text-gray-700">
                        สรุปสาเหตุที่แท้จริง
                        <span className="ml-1 font-normal text-gray-500">
                          (Root Cause)
                        </span>
                      </label>
                      {!isViewMode && (
                        <button
                          type="button"
                          onClick={() => adoptLastWhy(rc.id)}
                          className="text-[11px] text-gray-600 hover:text-green-700 underline underline-offset-2 cursor-pointer"
                        >
                          ใช้คำตอบ WHY สุดท้าย
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={rc.root_cause || ""}
                      onChange={(e) =>
                        handleRootCauseChange(
                          rc.id,
                          "root_cause",
                          e.target.value
                        )
                      }
                      disabled={isViewMode}
                      placeholder=""
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      ประเภทสาเหตุ (5M1E)
                    </label>
                    <select
                      value={rc.category || ""}
                      onChange={(e) =>
                        handleRootCauseChange(rc.id, "category", e.target.value)
                      }
                      disabled={isViewMode}
                      className={fieldClass}
                    >
                      <option value=""></option>
                      {CAUSE_CATEGORIES_5M1E.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Measures linked to this root cause */}
              <div className="border-t border-dashed border-gray-300 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">
                    มาตรการป้องกันและแก้ไขของสาเหตุนี้
                    <span className="ml-1 font-normal text-gray-500">
                      ({measuresOf(rc.id).length} รายการ)
                    </span>
                  </span>
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={() => addMeasure(rc.id)}
                      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-green-700 border border-gray-300 hover:border-green-500 px-2 py-1 rounded cursor-pointer transition duration-150"
                    >
                      <CirclePlus className="w-3.5 h-3.5" />
                      เพิ่มมาตรการ
                    </button>
                  )}
                </div>

                {measuresOf(rc.id).length === 0 && (
                  <div className="text-center py-3 text-xs text-gray-500 border border-dashed border-gray-300 rounded">
                    ยังไม่มีมาตรการ — กด &quot;เพิ่มมาตรการ&quot;
                    เพื่อระบุวิธีแก้ไขและป้องกันสาเหตุนี้
                  </div>
                )}

                <div className="space-y-2">
                  {measuresOf(rc.id).map((m, mIndex) => (
                    <div
                      key={m.id}
                      className="rounded border border-gray-200 border-l-4 border-l-[#7fb98a] bg-gray-50 p-2.5 space-y-2.5"
                    >
                      {/* บรรทัดที่ 1 : ลำดับ + มาตรการ + ลบ */}
                      <div className="flex items-start gap-2">
                        <span className="mt-1.5 shrink-0 w-6 h-6 rounded-full bg-white border border-gray-300 text-[11px] font-semibold text-gray-600 flex items-center justify-center">
                          {mIndex + 1}
                        </span>
                        <textarea
                          value={m.measure || ""}
                          rows={2}
                          onChange={(e) => {
                            handleMeasureChange(m.id, "measure", e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = `${Math.max(
                              48,
                              e.target.scrollHeight
                            )}px`;
                          }}
                          disabled={isViewMode}
                          placeholder="ระบุมาตรการที่จะดำเนินการเพื่อแก้ไขและป้องกันสาเหตุนี้"
                          className={`${fieldClass} resize-none overflow-hidden`}
                        />
                        {!isViewMode && (
                          <Trash2
                            onClick={() => removeMeasure(m.id)}
                            className="mt-2 shrink-0 w-4 h-4 text-gray-400 hover:text-red-600 cursor-pointer"
                          />
                        )}
                      </div>

                      {/* บรรทัดที่ 2 : ผู้รับผิดชอบ + กำหนดการ */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:pl-8">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            ผู้รับผิดชอบ
                          </label>
                          <input
                            type="text"
                            value={m.pic_contract || ""}
                            onChange={(e) =>
                              handleMeasureChange(
                                m.id,
                                "pic_contract",
                                e.target.value
                              )
                            }
                            disabled={isViewMode}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            แผนดำเนินการ
                          </label>
                          <DateTimePicker24h
                            value={m.plan_date ? new Date(m.plan_date) : undefined}
                            onChange={(date) =>
                              handleMeasureChange(
                                m.id,
                                "plan_date",
                                date ? formatLocalDate(date) : ""
                              )
                            }
                            disabled={isViewMode}
                            usedFor="date"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            ดำเนินการเสร็จ
                          </label>
                          <DateTimePicker24h
                            value={
                              m.action_completed_date
                                ? new Date(m.action_completed_date)
                                : undefined
                            }
                            onChange={(date) =>
                              handleMeasureChange(
                                m.id,
                                "action_completed_date",
                                date ? formatLocalDate(date) : ""
                              )
                            }
                            disabled={isViewMode}
                            usedFor="date"
                          />
                        </div>
                      </div>

                      {/* บรรทัดที่ 3 : ไฟล์แนบของมาตรการ */}
                      <div className="md:pl-8">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          หลักฐาน / ไฟล์แนบ
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* ไฟล์ที่อัปโหลดไว้แล้ว */}
                          {(measureExistingFiles[m.id] || []).map((file) => (
                            <div
                              key={file.key}
                              className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-300 px-1.5 py-1 rounded max-w-[200px]"
                            >
                              {isImage(file.fileName) ? (
                                <img
                                  src={file.url}
                                  alt={file.fileName}
                                  className="w-7 h-7 object-cover rounded-sm cursor-pointer border border-gray-200"
                                  onClick={() => setPreviewUrl(file.url)}
                                />
                              ) : (
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate max-w-[130px]"
                                >
                                  {file.fileName}
                                </a>
                              )}
                              {!isViewMode && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeMeasureExistingFile(m.id, file.key)
                                  }
                                  className="text-gray-400 hover:text-red-600 cursor-pointer"
                                  aria-label="ลบไฟล์"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}

                          {/* ไฟล์ใหม่ที่ยังไม่อัปโหลด */}
                          {(measureFiles[m.id] || []).map((file, fIdx) => (
                            <div
                              key={`${file.name}-${fIdx}`}
                              className="inline-flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-200 px-1.5 py-1 rounded max-w-[200px]"
                            >
                              {file.type.startsWith("image/") ? (
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  className="w-7 h-7 object-cover rounded-sm cursor-pointer border border-gray-200"
                                  onClick={() =>
                                    setPreviewUrl(URL.createObjectURL(file))
                                  }
                                />
                              ) : (
                                <span className="truncate max-w-[130px]">
                                  {file.name}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeMeasureNewFile(m.id, fIdx)}
                                className="text-gray-400 hover:text-red-600 cursor-pointer"
                                aria-label="ลบไฟล์"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}

                          {/* ปุ่มแนบไฟล์ */}
                          {!isViewMode && (
                            <label className="inline-flex items-center gap-1 cursor-pointer text-xs text-gray-600 hover:text-blue-600 bg-white border border-gray-300 hover:border-blue-400 px-2 py-1 rounded transition duration-150">
                              <Paperclip className="w-3 h-3" />
                              <span>แนบไฟล์</span>
                              <input
                                type="file"
                                multiple
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                className="hidden"
                                onChange={(e) => {
                                  addMeasureFiles(m.id, e.target.files);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          )}

                          {isViewMode &&
                            (measureExistingFiles[m.id] || []).length === 0 &&
                            (measureFiles[m.id] || []).length === 0 && (
                              <span className="text-xs text-gray-400">
                                ไม่มีไฟล์แนบ
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-400"></div>

      {/* ========== Risk Assessment ========== */}
      <div className={sectionHead}>
        <div className="flex flex-col">
          <h3>การประเมินความเสี่ยง</h3>
          <p className="font-semibold text-xs text-gray-600">Risk Assessment</p>
        </div>
      </div>
      <div className="p-6 space-y-5">
        <div>
          <label className="block text-gray-700 font-medium mb-2 text-sm">
            มีการประเมินความเสี่ยงสำหรับกิจกรรมนี้หรือไม่
            <span className="block text-xs text-gray-500 font-normal">
              Has a risk assessment been completed for this activity?
            </span>
          </label>
          <div className="flex items-center space-x-6">
            {fieldRadio("risk_assessment_completed", "yes", "มี (Yes)")}
            {fieldRadio("risk_assessment_completed", "no", "ไม่มี (No)")}
          </div>
        </div>

        {/* กรณีมีการประเมินความเสี่ยง */}
          <div className="border-l-4 border-[#7fb98a] bg-[#f2fbf4] p-3 rounded space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2 text-sm">
                โปรดทบทวนการประเมินความเสี่ยงหลังจากเกิดอุบัติเหตุ
                <span className="block text-xs text-gray-500 font-normal">
                  Has the risk assessment been reviewed following the accident
                  or incident?
                </span>
              </label>
              <div className="flex items-center space-x-6">
                {fieldRadio("risk_assessment_reviewed", "yes", "ทบทวนแล้ว (Yes)")}
                {fieldRadio("risk_assessment_reviewed", "no", "ยังไม่ทบทวน (No)")}
                {fieldRadio("risk_assessment_reviewed", "na", "ไม่เกี่ยวข้อง (NA)")}
              </div>
            </div>

            {formInvestigate.risk_assessment_reviewed === "yes" && (
              <div>
                <label className="block text-gray-700 font-medium mb-2 text-sm">
                  ผลการทบทวนการประเมินความเสี่ยง
                  <span className="block text-xs text-gray-500 font-normal">
                    Result of the risk assessment after review
                  </span>
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  {fieldRadio(
                    "risk_assessment_result",
                    "required_revise",
                    "ต้องดำเนินการปรับแก้ (Required to be revised)"
                  )}
                  {fieldRadio(
                    "risk_assessment_result",
                    "not_required_revise",
                    "ไม่ต้องดำเนินการปรับแก้ (Not required to be revised)"
                  )}
                </div>
              </div>
            )}
          </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">
              วันที่ทำการประเมินและทบทวนความเสี่ยง:
            </label>
            <DateTimePicker24h
              value={
                formInvestigate.risk_assessment_date
                  ? new Date(formInvestigate.risk_assessment_date)
                  : undefined
              }
              onChange={(date) =>
                setField(
                  "risk_assessment_date",
                  date ? formatLocalDate(date) : ""
                )
              }
              disabled={isViewMode}
              usedFor="date"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">
              ประเมินความเสี่ยงโดย (Assessment team members):
            </label>
            <input
              type="text"
              value={formInvestigate.risk_assessment_team || ""}
              onChange={(e) => setField("risk_assessment_team", e.target.value)}
              disabled={isViewMode}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2 text-sm">
            แนบเอกสารการประเมินความเสี่ยง
            <span className="block text-xs text-gray-500 font-normal">
              แนบไฟล์ได้ที่หัวข้อ &quot;แนบเอกสาร&quot; ในส่วนที่ 1
            </span>
          </label>
          <div className="flex items-center space-x-6">
            {fieldRadio("risk_assessment_attached", "yes", "แนบแล้ว (Yes)")}
            {fieldRadio("risk_assessment_attached", "no", "ยังไม่ได้แนบ (No)")}
            {fieldRadio("risk_assessment_attached", "na", "ไม่เกี่ยวข้อง (NA)")}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-400"></div>

      {/* ========== Investigators ========== */}
      <div className={sectionHead}>
        <div className="flex flex-col">
          <h3>ผู้เข้าร่วมสอบสวน</h3>
          <p className="font-semibold text-xs text-gray-600">Investigators</p>
        </div>
        <SectionAddRemove
          onAdd={addInvestigator}
          onRemove={removeInvestigator}
          canRemove={investigators.length > 1}
          hidden={isViewMode}
          addTitle="เพิ่มผู้เข้าร่วมสอบสวน"
          removeTitle="ลบรายชื่อล่าสุด"
        />
      </div>
      <div className="p-3 sm:p-6 space-y-2">
        {investigators.map((person, index) => (
          <div
            key={person.id}
            className="grid grid-cols-1 md:grid-cols-[40px_1fr_1fr] gap-2 md:items-center"
          >
            <span className="text-sm font-semibold text-gray-700">
              {index + 1}.
            </span>
            <div>
              {index === 0 && (
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ชื่อ - สกุล (Name)
                </label>
              )}
              <SearchableSelect
                options={optionsFor(person)}
                value={investigatorValue(person)}
                onChange={(value) =>
                  handleInvestigatorSelect(person.id, value)
                }
                disabled={isViewMode}
                placeholder={
                  isLoadingUsers ? "กำลังโหลดรายชื่อ..." : "เลือกชื่อพนักงาน"
                }
                className="[&>div]:h-10 [&>div]:rounded [&>div]:text-sm"
              />
            </div>
            <div>
              {index === 0 && (
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ตำแหน่ง (Position)
                </label>
              )}
              <input
                type="text"
                value={person.position || ""}
                onChange={(e) =>
                  handleInvestigatorChange(
                    person.id,
                    "position",
                    e.target.value
                  )
                }
                disabled={isViewMode}
                placeholder="เติมอัตโนมัติเมื่อเลือกชื่อ"
                className={fieldClass}
              />
            </div>
          </div>
        ))}

        {/* Conclusion */}
        <div className="pt-4 mt-2 border-t border-dashed border-gray-300">
          <label className="block text-gray-700 font-medium mb-2 text-sm">
            ทางทีมสอบสวนเห็นตรงกันว่าเคสนี้เป็นเคสที่:
          </label>
          <div className="flex items-center space-x-6">
            {fieldRadio("avoidability", "avoidable", "หลีกเลี่ยงได้ (Avoidable)")}
            {fieldRadio(
              "avoidability",
              "unavoidable",
              "หลีกเลี่ยงไม่ได้ (Unavoidable)"
            )}
          </div>
        </div>
      </div>

      {/* ========== Dev Payload Log (ซ่อนไว้) ========== */}
      {isDebugEnabled && (
        <div className="fixed bottom-4 left-4 z-[90] print:hidden">
          {!showPayload ? (
            <button
              type="button"
              onClick={() => setShowPayload(true)}
              title="ดู payload ของ Investigate (dev only)"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg cursor-pointer transition duration-200 opacity-40 hover:opacity-100"
            >
              <Bug className="w-4 h-4" />
              Payload
            </button>
          ) : (
            <div className="w-[min(92vw,480px)] max-h-[70vh] flex flex-col bg-slate-900 text-slate-100 rounded-lg shadow-2xl border border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <Bug className="w-4 h-4" />
                  Investigate Payload
                  <span className="text-slate-400 font-normal">
                    ({debugPayloadText.length.toLocaleString()} chars)
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={copyPayload}
                    title="คัดลอก JSON"
                    className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-1.5 py-1 rounded hover:bg-slate-700 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPayload(false)}
                    title="ปิด"
                    className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto p-3 text-[11px] leading-relaxed whitespace-pre font-mono">
                {debugPayloadText}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 z-10 cursor-pointer"
              onClick={() => setPreviewUrl(null)}
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-lg shadow-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
