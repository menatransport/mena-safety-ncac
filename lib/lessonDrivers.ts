const API_BASE = process.env.api_url || 'https://api-ncac.onrender.com';

export type MasterDriver = {
  driver_id?: string;
  first_name?: string;
  last_name?: string;
  client_name?: string;
  plant_name?: string;
  number_plate?: string;
};

/**
 * ชื่อลูกค้าจากต้นทางมีทั้ง non-breaking space ( ) และช่องว่างซ้ำ ๆ ปนอยู่
 * เช่น "บริษัท  ชลประทานคอนกรีต จำกัด" การเทียบแบบตรงตัวจึงพลาดได้ง่าย
 * ฟังก์ชันนี้ยุบช่องว่างทุกชนิดให้เหลือช่องเดียวก่อนนำไปเทียบ
 */
export const normalizeClient = (value?: string | null): string =>
  String(value ?? '')
    .replace(/[\s ]+/g, ' ')
    .trim()
    .toLowerCase();

/** ลูกค้าที่คนขับคนนี้สังกัด ใช้กำหนดว่าต้องเรียนบทเรียนไหน */
export const clientOf = (d: MasterDriver): string => String(d.client_name ?? '').trim();

/** cache รายชื่อคนขับไว้ 5 นาที — เป็น master data ที่เปลี่ยนไม่บ่อยแต่ list ใหญ่ */
let driverCache: { at: number; rows: MasterDriver[] } | null = null;
let clientCache: { at: number; rows: string[] } | null = null;
const TTL_MS = 5 * 60 * 1000;

export const loadDrivers = async (): Promise<MasterDriver[]> => {
  if (driverCache && Date.now() - driverCache.at < TTL_MS) return driverCache.rows;

  const res = await fetch(`${API_BASE}/masterdrivers`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`masterdrivers responded ${res.status}`);

  const data = await res.json();
  const rows: MasterDriver[] = Array.isArray(data) ? data : (data?.data ?? []);
  driverCache = { at: Date.now(), rows };
  return rows;
};

/** รายชื่อลูกค้าทั้งหมด สำหรับให้ admin เลือกว่าบทเรียนนี้ใครต้องเรียน */
export const listClients = async (): Promise<string[]> => {
  if (clientCache && Date.now() - clientCache.at < TTL_MS) return clientCache.rows;

  const res = await fetch(`${API_BASE}/clients/clients-unique`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`clients-unique responded ${res.status}`);

  const data = await res.json();
  const raw: { client_name?: string }[] = Array.isArray(data) ? data : (data?.data ?? []);

  const seen = new Set<string>();
  const rows: string[] = [];
  for (const c of raw) {
    const name = String(c?.client_name ?? '').trim();
    const key = normalizeClient(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push(name);
  }
  rows.sort((a, b) => a.localeCompare(b, 'th'));

  clientCache = { at: Date.now(), rows };
  return rows;
};
