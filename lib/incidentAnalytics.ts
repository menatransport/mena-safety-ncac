/**
 * Contract + helper สำหรับ read-model /analytics/incidents/overview
 *
 * ตัวเลขทุกตัวบนหน้า Dashboard ถูกรวมยอดมาจากฝั่ง FastAPI แล้ว — ที่นี่จึงมีแค่
 * type, ตัวจัดรูปแบบ และชุดสี ไม่มีการคำนวณสถิติซ้ำ เพื่อไม่ให้ตัวเลขบนจอกับ
 * ตัวเลขในรายงานที่ดึงจาก API ตรงกันไม่ได้
 */

// ============================================================
// Types
// ============================================================
export interface Metric {
  value: number;
  previous: number;
  /** null = ช่วงก่อนหน้าเป็น 0 จึงเทียบเป็นเปอร์เซ็นต์ไม่ได้ */
  change_pct: number | null;
}

export interface DimensionRow {
  name: string;
  total: number;
  nc: number;
  ac: number;
  Crisis: number;
  Major: number;
  Minor: number;
  actual_cost: number;
  estimated_cost: number;
  last_incident: string | null;
  share_pct: number;
  cost_share_pct: number;
  previous: number;
  change_pct: number | null;
}

export interface TrendPoint {
  key: string;
  nc: number;
  ac: number;
  total: number;
  Crisis: number;
  Major: number;
  Minor: number;
  actual_cost: number;
  estimated_cost: number;
}

export interface CauseRow {
  cause: string;
  count: number;
  actual_cost: number;
  Crisis: number;
  Major: number;
  nc: number;
  ac: number;
  pct: number;
  cum_pct: number;
}

export interface TopCase {
  doc_no: string;
  source: 'NC' | 'AC';
  date: string | null;
  site_name: string;
  client_name: string;
  driver_name: string;
  priority: string;
  cause: string;
  actual_cost: number;
  estimated_cost: number;
  casestatus: string;
}

export interface Insight {
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  detail: string;
  metric: string;
}

export interface IncidentAnalytics {
  meta: {
    generated_at: string;
    start_date: string;
    end_date: string;
    days: number;
    compare_start_date: string;
    compare_end_date: string;
    case_type: string;
    granularity: 'day' | 'month';
    row_count: number;
  };
  kpis: {
    total_cases: Metric;
    nc_cases: Metric;
    ac_cases: Metric;
    crisis_cases: Metric;
    major_cases: Metric;
    minor_cases: Metric;
    actual_cost: Metric;
    estimated_cost: Metric;
    cost_per_case: Metric;
    cases_per_day: Metric;
    fatalities: Metric;
    injuries: Metric;
    open_cases: Metric;
    investigation_coverage_pct: Metric;
  };
  highlights: {
    days_since_last_crisis: number | null;
    last_crisis_date: string | null;
    last_crisis_doc: string | null;
  };
  severity_mix: { priority: string; nc: number; ac: number; total: number; pct: number }[];
  trend: TrendPoint[];
  sites: DimensionRow[];
  causes: CauseRow[];
  root_cause_categories: { category: string; count: number; pct: number }[];
  timing: {
    by_weekday: { weekday: number; label: string; total: number; severe: number }[];
    by_hour: { hour: number; total: number }[];
    heatmap: { weekday: number; weekday_label: string; bucket: string; total: number }[];
    peak_window: { label: string; count: number; pct: number };
  };
  status: {
    funnel: { status: string; count: number; pct: number }[];
    aging: { bucket: string; count: number }[];
    open_cases: number;
    overdue_cases: number;
    avg_open_age_days: number;
  };
  safety: {
    fatalities: number;
    injured_hospitalized: number;
    injured_not_hospitalized: number;
    alcohol_positive: number;
    drug_positive: number;
    at_fault: number;
    not_at_fault: number;
    fault_unknown: number;
    ac_cases: number;
  };
  cost: {
    total_actual: number;
    total_estimated: number;
    settled_cases: number;
    settled_estimated: number;
    settled_actual: number;
    estimate_accuracy_pct: number | null;
    by_priority: { priority: string; count: number; actual: number; estimated: number; avg_actual: number }[];
    recovery: {
      insurance_claim: number;
      product_resellable: number;
      driver_cost: number;
      company_cost: number;
      penalty: number;
      remaining_damage_cost: number;
      documented_cases: number;
      scope: string;
    };
    top_cases: TopCase[];
  };
  entities: {
    drivers: DimensionRow[];
    vehicles: DimensionRow[];
    clients: DimensionRow[];
    concentration: {
      driver_count: number;
      top5_driver_share_pct: number;
      repeat_driver_count: number;
      repeat_driver_cases: number;
    };
  };
  insights: Insight[];
}

export interface AnalyticsQuery {
  startDate: string;
  endDate: string;
  caseType: 'all' | 'nc' | 'ac';
  siteIds: number[];
  priorities: string[];
  granularity?: 'auto' | 'day' | 'month';
}

// ============================================================
// Fetch
// ============================================================
export async function fetchIncidentAnalytics(
  q: AnalyticsQuery,
  signal?: AbortSignal
): Promise<IncidentAnalytics> {
  const params = new URLSearchParams({
    start_date: q.startDate,
    end_date: q.endDate,
    case_type: q.caseType,
    granularity: q.granularity ?? 'auto',
  });
  q.siteIds.forEach((id) => params.append('site_id', String(id)));
  q.priorities.forEach((p) => params.append('priority', p));

  const res = await fetch(`/api/analytics/incidents?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `โหลดข้อมูลไม่สำเร็จ (HTTP ${res.status})`);
  }
  return res.json();
}

// ============================================================
// Drill-down: รายการเคสของมิติที่กดดู
// ============================================================
export interface CaseListItem {
  doc_no: string;
  source: 'NC' | 'AC';
  date: string | null;
  site_name: string;
  client_name: string;
  driver_name: string;
  truck_no: string;
  priority: string;
  casestatus: string;
  cause: string;
  actual_cost: number;
  estimated_cost: number;
}

export interface CaseListResponse {
  total: number;
  truncated: boolean;
  rows: CaseListItem[];
}

/**
 * ตัวกรองมิติเดียวที่ผู้ใช้กดดู — ต่อยอดจาก AnalyticsQuery ที่กำลังเลือกอยู่บนจอ
 *
 * `priority` และ `casestatus` ที่นี่แทนที่ (ไม่ใช่รวมกับ) ตัวกรองส่วนกลางใน query
 * เพราะเจตนาของการกดคือ "ดูเฉพาะอันนี้" ไม่ใช่ขยายขอบเขตให้กว้างขึ้น
 */
export interface CaseDrilldownFilter {
  siteName?: string;
  driverName?: string;
  vehicle?: string;
  clientName?: string;
  cause?: string;
  priority?: string;
  casestatus?: string;
  weekday?: number;
  hour?: number;
  hourBucket?: string;
  agingBucket?: string;
  sort?: 'date_desc' | 'cost_desc';
}

export async function fetchCaseList(
  q: AnalyticsQuery,
  filter: CaseDrilldownFilter,
  signal?: AbortSignal
): Promise<CaseListResponse> {
  const params = new URLSearchParams({
    start_date: q.startDate,
    end_date: q.endDate,
    case_type: q.caseType,
  });
  q.siteIds.forEach((id) => params.append('site_id', String(id)));

  const priorities = filter.priority ? [filter.priority] : q.priorities;
  priorities.forEach((p) => params.append('priority', p));

  if (filter.casestatus) params.append('casestatus', filter.casestatus);
  if (filter.siteName) params.set('site_name', filter.siteName);
  if (filter.driverName) params.set('driver_name', filter.driverName);
  if (filter.vehicle) params.set('vehicle', filter.vehicle);
  if (filter.clientName) params.set('client_name', filter.clientName);
  if (filter.cause) params.set('cause', filter.cause);
  if (filter.weekday !== undefined) params.set('weekday', String(filter.weekday));
  if (filter.hour !== undefined) params.set('hour', String(filter.hour));
  if (filter.hourBucket) params.set('hour_bucket', filter.hourBucket);
  if (filter.agingBucket) params.set('aging_bucket', filter.agingBucket);
  if (filter.sort) params.set('sort', filter.sort);

  const res = await fetch(`/api/analytics/incidents/cases?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `โหลดรายการเคสไม่สำเร็จ (HTTP ${res.status})`);
  }
  return res.json();
}

/** ลิงก์เปิดเอกสารเคสในแท็บใหม่ — /nc-form และ /ac-form อ่าน doc_no จาก query param เดียวกัน */
export const caseDocHref = (source: 'NC' | 'AC', docNo: string) =>
  source === 'AC' ? `/ac-form?doc=${encodeURIComponent(docNo)}` : `/nc-form?doc=${encodeURIComponent(docNo)}`;

// ============================================================
// Palette
// ============================================================
export const SEVERITY_COLORS: Record<string, string> = {
  Crisis: '#b91c1c',
  Major: '#d97706',
  Minor: '#0d9488',
};

/**
 * สีตัวอักษร/แท่งกราฟของความรุนแรง เมื่อวางบนพื้นเข้ม
 *
 * `SEVERITY_COLORS.Crisis` (#b91c1c) ออกแบบมาให้เป็นสีเข้มบนพื้นขาว — บนพื้น
 * slate-950 สีนี้มืดจนคอนทราสต์ต่ำกว่ามาตรฐานอ่านง่าย (WCAG AA) ใช้สีนี้แทน
 * เฉพาะตอน isDark เมื่อสีนั้นทำหน้าที่เป็นตัวอักษรหรือแท่งกราฟ ไม่ใช่แค่พื้นหลังจาง ๆ
 */
export const severityTextColor = (priority: string, isDark: boolean): string => {
  if (isDark && priority === 'Crisis') return '#f87171';
  return SEVERITY_COLORS[priority] ?? '#64748b';
};

/** สีแท่งกราฟกลาง (ไม่มีนัยความรุนแรง) — เทาเข้มไปกลืนกับพื้น track บนธีมมืด */
export const neutralBarColor = (isDark: boolean): string => (isDark ? '#64748b' : '#475569');

export const SOURCE_COLORS = {
  NC: '#2563eb',
  AC: '#7c3aed',
} as const;

export const COST_COLORS = {
  actual: '#0f766e',
  estimated: '#94a3b8',
  recovery: ['#0d9488', '#2563eb', '#d97706', '#b91c1c', '#7c3aed', '#64748b'],
} as const;

/**
 * โทนสีของ insight แต่ละระดับ
 *
 * โปรเจกต์นี้สลับธีมด้วย state ของ useUiTheme ไม่ได้ใส่คลาส `dark` ที่ <html>
 * ตัวแปร `dark:` ของ Tailwind จึงใช้ไม่ได้ — ต้องส่ง isDark เข้ามาเลือกคลาสเอง
 */
export const insightTone = (severity: Insight['severity'], isDark: boolean) => {
  const map = {
    critical: {
      label: 'วิกฤต',
      dot: 'bg-rose-600',
      border: isDark ? 'border-rose-900/70' : 'border-rose-200',
      text: isDark ? 'text-rose-300' : 'text-rose-700',
      chip: isDark ? 'bg-rose-950/60 text-rose-300' : 'bg-rose-50 text-rose-700',
    },
    warning: {
      label: 'เฝ้าระวัง',
      dot: 'bg-amber-500',
      border: isDark ? 'border-amber-900/70' : 'border-amber-200',
      text: isDark ? 'text-amber-300' : 'text-amber-700',
      chip: isDark ? 'bg-amber-950/60 text-amber-300' : 'bg-amber-50 text-amber-700',
    },
    info: {
      label: 'ข้อสังเกต',
      dot: 'bg-slate-500',
      border: isDark ? 'border-slate-700' : 'border-slate-200',
      text: isDark ? 'text-slate-300' : 'text-slate-700',
      chip: isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700',
    },
    positive: {
      label: 'สัญญาณบวก',
      dot: 'bg-teal-600',
      border: isDark ? 'border-teal-900/70' : 'border-teal-200',
      text: isDark ? 'text-teal-300' : 'text-teal-700',
      chip: isDark ? 'bg-teal-950/60 text-teal-300' : 'bg-teal-50 text-teal-700',
    },
  } as const;
  return map[severity] ?? map.info;
};

// ============================================================
// Formatters
// ============================================================
const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export const fmtInt = (n: number) => new Intl.NumberFormat('th-TH').format(Math.round(n ?? 0));

export const fmtMoney = (n: number) =>
  new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(Math.round(n ?? 0));

/** ย่อจำนวนเงินสำหรับ KPI tile และแกนกราฟ — 1.2 ล. / 84.0 พ. */
export const fmtMoneyShort = (n: number) => {
  const v = Math.abs(n ?? 0);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} ล.`;
  if (v >= 10_000) return `${(n / 1_000).toFixed(0)} พ.`;
  return fmtMoney(n);
};

export const fmtPct = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined ? '—' : `${n.toFixed(digits)}%`;

export const fmtSignedPct = (n: number | null | undefined) =>
  n === null || n === undefined ? 'ใหม่' : `${n > 0 ? '+' : ''}${n.toFixed(0)}%`;

/** ปี พ.ศ. — ทุกเอกสารในระบบนี้อ้างอิงปีพุทธศักราช */
export const toBuddhistYear = (year: number) => year + 543;

export const fmtTrendLabel = (key: string, granularity: 'day' | 'month') => {
  const [y, m, d] = key.split('-').map(Number);
  const month = THAI_MONTHS_SHORT[(m ?? 1) - 1] ?? '';
  if (granularity === 'month') return `${month} ${String(toBuddhistYear(y)).slice(-2)}`;
  return `${d} ${month}`;
};

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return `${dt.getDate()} ${THAI_MONTHS_SHORT[dt.getMonth()]} ${toBuddhistYear(dt.getFullYear())}`;
};

export const fmtPeriod = (start: string, end: string) => `${fmtDate(start)} – ${fmtDate(end)}`;

/**
 * ทิศทางของตัวเลขที่เปลี่ยนไป
 *
 * `higherIsBetter` ต้องระบุเสมอ เพราะบน dashboard นี้ตัวชี้วัดส่วนใหญ่
 * "เพิ่มขึ้น = แย่ลง" (จำนวนเคส ค่าเสียหาย) แต่บางตัวกลับกัน
 * (ความครอบคลุมของใบสอบสวน) การใช้สีเขียว/แดงผิดด้านทำให้อ่านผิดทันที
 */
export const deltaTone = (
  changePct: number | null,
  higherIsBetter: boolean,
  isDark: boolean
) => {
  if (changePct === null || Math.abs(changePct) < 0.5) {
    return {
      direction: 'flat' as const,
      className: isDark ? 'text-slate-400' : 'text-slate-500',
    };
  }
  const good = higherIsBetter ? changePct > 0 : changePct < 0;
  return {
    direction: (changePct > 0 ? 'up' : 'down') as 'up' | 'down',
    className: good
      ? isDark
        ? 'text-teal-400'
        : 'text-teal-600'
      : isDark
        ? 'text-rose-400'
        : 'text-rose-600',
  };
};
