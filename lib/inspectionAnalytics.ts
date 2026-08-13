// =============================================================================
// Inspection Analytics – Server-side aggregation helpers
// -----------------------------------------------------------------------------
// Backend ไม่มี endpoint `/inspection/report_inspection/*` (เคยถูกเรียกตรงจาก
// client จนเกิด "Failed to fetch") — ไฟล์นี้ประกอบตัวเลขทั้งหมดขึ้นเองจาก
// endpoint ที่มีจริง 2 เส้น:
//   • GET /inspection/task/                     → รายการงาน (ใช้กรอง + trend)
//   • GET /inspection/report/driver-summary     → ผลตรวจรายคนขับ/รายคัน
//
// ใช้จาก app/api/task/analytics/[type]/route.ts เท่านั้น (server runtime)
// =============================================================================

const API_BASE = process.env.api_url;

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
export interface AnalyticsFilters {
    years: number[];
    months: number[];
    trainerId: string;
    clientName: string;
    status: string;
}

interface TaskRow {
    inspection_task_id: string;
    trainer_id: string | null;
    partner_trainer_ids: string[] | null;
    client_name: string | null;
    plant_name: string | null;
    plant_code: string | null;
    plan_date: string | null;
    action_date: string | null;
    inspection_task_status: string | null;
}

export interface DriverSummaryRow {
    inspection_task_id: string;
    plan_date: string | null;
    action_date: string | null;
    plant_name: string | null;
    client_name: string | null;
    trainer_id: string | null;
    driver_status: string | null;
    driver_id: string;
    first_name: string | null;
    last_name: string | null;
    number_plate: string | null;
    truck_number: string | null;
    truck_type: string | null;
    alcohol: number | null;
    amfetamin: string | null;
    kra: string | null;
    thc: string | null;
    drug_test_status: string | null;
    helmet_check: string | null;
    glasses_check: string | null;
    mask_check: string | null;
    vest_check: string | null;
    glove_check: string | null;
    safety_shoes_check: string | null;
    ppe_status: string | null;
    vehicle_status: string | null;
    [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/*  Cache — กัน driver-summary (ช้า ~7s/100 งาน) ถูกยิงซ้ำทุกครั้งที่สลับแท็บ    */
/* -------------------------------------------------------------------------- */
const TASKS_TTL = 60_000;
const ROWS_TTL = 5 * 60_000;
const CHUNK_SIZE = 80;

let tasksCache: { at: number; data: TaskRow[] } | null = null;
/** cache แยกราย task_id เพื่อให้ตัวกรองที่ต่างกันใช้ผลเดิมซ้ำได้ */
const rowsCache = new Map<string, { at: number; rows: DriverSummaryRow[] }>();

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/* -------------------------------------------------------------------------- */
/*  Fetchers                                                                  */
/* -------------------------------------------------------------------------- */
export async function fetchTasks(): Promise<TaskRow[]> {
    const now = Date.now();
    if (tasksCache && now - tasksCache.at < TASKS_TTL) return tasksCache.data;

    const res = await fetch(`${API_BASE}/inspection/task/`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`ดึงรายการงานไม่สำเร็จ (HTTP ${res.status})`);

    const data = (await res.json()) as TaskRow[];
    tasksCache = { at: now, data };
    return data;
}

async function fetchDriverSummaryChunk(taskIds: string[]): Promise<DriverSummaryRow[]> {
    const params = new URLSearchParams();
    taskIds.forEach((id) => params.append('task_ids', id));

    const res = await fetch(`${API_BASE}/inspection/report/driver-summary?${params}`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`ดึงผลตรวจรายคันไม่สำเร็จ (HTTP ${res.status})`);

    const data = await res.json();
    return Array.isArray(data) ? (data as DriverSummaryRow[]) : [];
}

export async function fetchDriverRows(taskIds: string[]): Promise<DriverSummaryRow[]> {
    if (taskIds.length === 0) return [];
    const now = Date.now();

    const missing = taskIds.filter((id) => {
        const hit = rowsCache.get(id);
        return !hit || now - hit.at > ROWS_TTL;
    });

    if (missing.length > 0) {
        const batches = await Promise.all(
            chunk(missing, CHUNK_SIZE).map((ids) =>
                fetchDriverSummaryChunk(ids).then((rows) => ({ ids, rows }))
            )
        );
        for (const { ids, rows } of batches) {
            // เขียน entry ว่างให้ทุก id ที่ขอไป — งานที่ยังไม่มีคนขับจะได้ไม่ยิงซ้ำ
            ids.forEach((id) => rowsCache.set(id, { at: now, rows: [] }));
            for (const row of rows) {
                rowsCache.get(row.inspection_task_id)?.rows.push(row);
            }
        }
    }

    return taskIds.flatMap((id) => rowsCache.get(id)?.rows ?? []);
}

/* -------------------------------------------------------------------------- */
/*  Filtering                                                                 */
/* -------------------------------------------------------------------------- */
export function parseFilters(searchParams: URLSearchParams): AnalyticsFilters {
    return {
        years: searchParams.getAll('year').map(Number).filter(Number.isFinite),
        months: searchParams.getAll('month').map(Number).filter(Number.isFinite),
        trainerId: searchParams.get('trainer_id') ?? '',
        clientName: searchParams.get('client_name') ?? '',
        status: searchParams.get('status') ?? '',
    };
}

/** อิง plan_date เหมือน TaskFilter ฝั่ง client เพื่อให้ตัวเลขตรงกับตารางงาน */
function matchesDate(planDate: string | null, years: number[], months: number[]) {
    if (years.length === 0 && months.length === 0) return true;
    if (!planDate) return false;
    const d = new Date(planDate);
    if (Number.isNaN(d.getTime())) return false;
    if (years.length > 0 && !years.includes(d.getFullYear())) return false;
    if (months.length > 0 && !months.includes(d.getMonth() + 1)) return false;
    return true;
}

export function filterTasks(tasks: TaskRow[], f: AnalyticsFilters): TaskRow[] {
    return tasks.filter((t) => {
        if (!matchesDate(t.plan_date, f.years, f.months)) return false;
        if (f.status && t.inspection_task_status !== f.status) return false;
        if (f.clientName && t.client_name !== f.clientName) return false;
        if (f.trainerId) {
            const isOwner = t.trainer_id === f.trainerId;
            const isPartner = (t.partner_trainer_ids ?? []).includes(f.trainerId);
            if (!isOwner && !isPartner) return false;
        }
        return true;
    });
}

/* -------------------------------------------------------------------------- */
/*  Value mapping                                                             */
/* -------------------------------------------------------------------------- */
type Tri = 'pass' | 'fail' | 'pending';

const NOT_TESTED = ['ไม่ได้ตรวจ', 'ไม่มีให้ตรวจ', 'toolbox talk online', '—', '-', ''];

function isNotTested(v: string | null | undefined) {
    if (v === null || v === undefined) return true;
    return NOT_TESTED.includes(String(v).trim().toLowerCase()) || NOT_TESTED.includes(String(v).trim());
}

/** สถานะรวมของ pass/fail/null ที่ backend ส่งมาแล้ว */
function triFromStatus(v: string | null): Tri {
    if (v === 'pass') return 'pass';
    if (v === 'fail') return 'fail';
    return 'pending';
}

/** ผลสารเสพติด: พบสาร = ไม่ผ่าน */
function triFromSubstance(v: string | null): Tri {
    if (isNotTested(v)) return 'pending';
    return String(v).includes('พบสาร') && !String(v).includes('ไม่พบสาร') ? 'fail' : 'pass';
}

/** แอลกอฮอล์: ต้องเป็น 0 เท่านั้นถึงผ่าน */
function triFromAlcohol(v: number | null): Tri {
    if (v === null || v === undefined) return 'pending';
    return Number(v) > 0 ? 'fail' : 'pass';
}

/** PPE: "มี" = ผ่าน, "ไม่มี"/"ชำรุด" = ไม่ผ่าน */
function triFromPpeItem(v: string | null): Tri {
    if (isNotTested(v)) return 'pending';
    return String(v).trim() === 'มี' ? 'pass' : 'fail';
}

function tally(list: Tri[]) {
    return {
        pass: list.filter((t) => t === 'pass').length,
        fail: list.filter((t) => t === 'fail').length,
        pending: list.filter((t) => t === 'pending').length,
    };
}

const rate = (pass: number, total: number) => (total > 0 ? (pass / total) * 100 : 0);

/* -------------------------------------------------------------------------- */
/*  Builders — รูปแบบ response ตรงกับที่แต่ละแท็บใช้อยู่แล้ว                       */
/* -------------------------------------------------------------------------- */
export function buildSummary(tasks: TaskRow[]) {
    const count = (s: string) => tasks.filter((t) => t.inspection_task_status === s).length;

    const trend = new Map<string, { month: string; open: number; pending: number; completed: number }>();
    for (const t of tasks) {
        if (!t.plan_date) continue;
        const d = new Date(t.plan_date);
        if (Number.isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const bucket = trend.get(key) ?? { month: key, open: 0, pending: 0, completed: 0 };
        const status = t.inspection_task_status;
        if (status === 'open' || status === 'pending' || status === 'completed') bucket[status] += 1;
        trend.set(key, bucket);
    }

    return {
        total_tasks: tasks.length,
        open: count('open'),
        pending: count('pending'),
        completed: count('completed'),
        monthly_trend: [...trend.values()].sort((a, b) => a.month.localeCompare(b.month)),
    };
}

const SUBSTANCES = [
    { substance: 'alcohol', label: 'แอลกอฮอล์' },
    { substance: 'amfetamin', label: 'แอมเฟตามีน' },
    { substance: 'kra', label: 'กระท่อม' },
    { substance: 'thc', label: 'กัญชา' },
] as const;

export function buildDrug(rows: DriverSummaryRow[]) {
    const overall = tally(rows.map((r) => triFromStatus(r.drug_test_status)));

    const by_substance = SUBSTANCES.map(({ substance, label }) => {
        const tris = rows.map((r) =>
            substance === 'alcohol'
                ? triFromAlcohol(r.alcohol)
                : triFromSubstance(r[substance] as string | null)
        );
        return { substance, label, ...tally(tris) };
    });

    return {
        total: rows.length,
        ...overall,
        pass_rate: rate(overall.pass, rows.length),
        by_substance,
    };
}

const PPE_ITEMS = [
    { field: 'helmet_check', label: 'หมวกนิรภัย' },
    { field: 'glasses_check', label: 'แว่นตานิรภัย' },
    { field: 'mask_check', label: 'หน้ากากอนามัย' },
    { field: 'vest_check', label: 'เสื้อสะท้อนแสง' },
    { field: 'glove_check', label: 'ถุงมือนิรภัย' },
    { field: 'safety_shoes_check', label: 'รองเท้านิรภัย' },
] as const;

export function buildPpe(rows: DriverSummaryRow[]) {
    const overall = tally(rows.map((r) => triFromStatus(r.ppe_status)));

    const by_item = PPE_ITEMS.map(({ field, label }) => {
        const t = tally(rows.map((r) => triFromPpeItem(r[field] as string | null)));
        return { field, label, ...t, compliance_rate: rate(t.pass, t.pass + t.fail) };
    });

    return { total: rows.length, ...overall, by_item };
}

export const VEHICLE_SECTIONS = [
    { key: 'front', label: 'ด้านหน้า' },
    { key: 'left', label: 'ด้านซ้าย' },
    { key: 'rear', label: 'ด้านหลัง' },
    { key: 'right', label: 'ด้านขวา' },
    { key: 'inside', label: 'ภายในรถ' },
] as const;

/** "ไฟท้าย (ชำรุด), แถบสะท้อนแสง (ไม่มี)" → ["ไฟท้าย (ชำรุด)", "แถบสะท้อนแสง (ไม่มี)"] */
function splitFailItems(raw: unknown): string[] {
    if (typeof raw !== 'string') return [];
    const text = raw.trim();
    if (!text || text === '—' || text === '-') return [];
    return text
        .split(/,(?![^(]*\))/)
        .map((s) => s.trim())
        .filter(Boolean);
}

export function buildVehicle(rows: DriverSummaryRow[]) {
    const overall = tally(rows.map((r) => triFromStatus(r.vehicle_status)));

    // นับรายอุปกรณ์ที่ไม่ผ่าน (ตัดวงเล็บอาการออก) เพื่อชี้จุดที่ต้องแก้จริง
    const failCount = new Map<string, number>();
    for (const r of rows) {
        for (const { key } of VEHICLE_SECTIONS) {
            for (const item of splitFailItems(r[`vehicle_${key}_fail_items`])) {
                const name = item.replace(/\s*\([^)]*\)\s*$/, '').trim() || item;
                failCount.set(name, (failCount.get(name) ?? 0) + 1);
            }
        }
    }

    const top_failed_sections = [...failCount.entries()]
        .map(([section, failed]) => ({ section, failed }))
        .sort((a, b) => b.failed - a.failed)
        .slice(0, 8);

    return {
        total: rows.length,
        ...overall,
        pass_rate: rate(overall.pass, rows.length),
        top_failed_sections,
        by_month: buildVehicleByMonth(rows),
    };
}

export interface VehicleMonthRow {
    inspection_task_id: string;
    inspection_task_driver_id: string;
    driver_id: string;
    driver_name: string;
    number_plate: string;
    truck_number: string;
    truck_type: string;
    client_name: string;
    plant_name: string;
    plan_date: string | null;
    action_date: string | null;
    vehicle_status: Tri;
    fail_count: number;
    sections: { key: string; label: string; result: string; fail_items: string[] }[];
}

/** จัดกลุ่มรถรายคันตามเดือน (ใช้ plan_date เหมือนตัวกรองหลัก) */
export function buildVehicleByMonth(rows: DriverSummaryRow[]) {
    const months = new Map<string, VehicleMonthRow[]>();

    for (const r of rows) {
        const base = r.plan_date ?? r.action_date;
        if (!base) continue;
        const d = new Date(base);
        if (Number.isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        const sections = VEHICLE_SECTIONS.map(({ key: k, label }) => ({
            key: k,
            label,
            result: (r[`vehicle_${k}_result`] as string) ?? '—',
            fail_items: splitFailItems(r[`vehicle_${k}_fail_items`]),
        }));

        const row: VehicleMonthRow = {
            inspection_task_id: r.inspection_task_id,
            inspection_task_driver_id: `${r.inspection_task_id}-${r.driver_id}`,
            driver_id: r.driver_id,
            driver_name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
            number_plate: r.number_plate ?? '-',
            truck_number: r.truck_number ?? '-',
            truck_type: r.truck_type ?? '-',
            client_name: r.client_name ?? '-',
            plant_name: r.plant_name ?? '-',
            plan_date: r.plan_date,
            action_date: r.action_date,
            vehicle_status: triFromStatus(r.vehicle_status),
            fail_count: sections.reduce((s, x) => s + x.fail_items.length, 0),
            sections,
        };

        const list = months.get(key) ?? [];
        list.push(row);
        months.set(key, list);
    }

    return [...months.entries()]
        .map(([month, vehicles]) => ({
            month,
            total: vehicles.length,
            pass: vehicles.filter((v) => v.vehicle_status === 'pass').length,
            fail: vehicles.filter((v) => v.vehicle_status === 'fail').length,
            pending: vehicles.filter((v) => v.vehicle_status === 'pending').length,
            vehicles: vehicles.sort((a, b) =>
                (a.plan_date ?? '').localeCompare(b.plan_date ?? '') ||
                a.number_plate.localeCompare(b.number_plate)
            ),
        }))
        .sort((a, b) => b.month.localeCompare(a.month));
}
