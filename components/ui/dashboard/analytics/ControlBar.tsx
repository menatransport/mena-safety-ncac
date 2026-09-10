'use client';

import { useMemo } from 'react';
import { CalendarRange, Building2, Layers, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { AnalyticsQuery, SEVERITY_COLORS, fmtPeriod, toBuddhistYear } from '@/lib/incidentAnalytics';
import { useSurface } from './ui';

export interface SiteOption {
  site_id: number;
  site_code: string | null;
  label: string;
  label_en: string | null;
}

const iso = (d: Date) => {
  // ใช้เวลาท้องถิ่น ไม่ใช่ toISOString() — toISOString() แปลงเป็น UTC ก่อน
  // ทำให้วันที่ 1 ของเดือนกลายเป็นวันสุดท้ายของเดือนก่อนหน้าเมื่ออยู่ใน GMT+7
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export type PresetId = 'mtd' | 'last30' | 'qtd' | 'ytd' | 'custom';

/**
 * ไม่มี preset "ปีที่แล้ว" โดยตั้งใจ — ระบบเริ่มบันทึกข้อมูลจริงตั้งแต่ 1 ม.ค. 2569
 * ยังไม่มีปีก่อนหน้าที่มีข้อมูลใช้งานจริงให้เลือกดู (ดู SYSTEM_GO_LIVE ฝั่ง backend)
 */
export const buildPreset = (id: PresetId, today = new Date()): { startDate: string; endDate: string } | null => {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (id) {
    case 'mtd':
      return { startDate: iso(new Date(y, m, 1)), endDate: iso(today) };
    case 'last30': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { startDate: iso(from), endDate: iso(today) };
    }
    case 'qtd':
      return { startDate: iso(new Date(y, Math.floor(m / 3) * 3, 1)), endDate: iso(today) };
    case 'ytd':
      return { startDate: iso(new Date(y, 0, 1)), endDate: iso(today) };
    default:
      return null;
  }
};

const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'mtd', label: 'เดือนนี้' },
  { id: 'last30', label: '30 วันล่าสุด' },
  { id: 'qtd', label: 'ไตรมาสนี้' },
  { id: 'ytd', label: 'ปีนี้' },
];

const CASE_TYPES: { value: AnalyticsQuery['caseType']; label: string; hint: string }[] = [
  { value: 'all', label: 'ทั้งหมด', hint: 'NC + AC' },
  { value: 'nc', label: 'NC', hint: 'Non-Conformance' },
  { value: 'ac', label: 'AC', hint: 'Accident Case' },
];

interface ControlBarProps {
  query: AnalyticsQuery;
  activePreset: PresetId;
  onPreset: (id: PresetId) => void;
  onChange: (patch: Partial<AnalyticsQuery>) => void;
  sites: SiteOption[];
  loading: boolean;
  onRefresh: () => void;
  compareStart?: string | null;
  compareEnd?: string | null;
}

export const ControlBar = ({
  query,
  activePreset,
  onPreset,
  onChange,
  sites,
  loading,
  onRefresh,
  compareStart,
  compareEnd,
}: ControlBarProps) => {
  const s = useSurface();

  const periodLabel = useMemo(
    () => fmtPeriod(query.startDate, query.endDate),
    [query.startDate, query.endDate]
  );

  const togglePriority = (p: string) => {
    const next = query.priorities.includes(p)
      ? query.priorities.filter((x) => x !== p)
      : [...query.priorities, p];
    onChange({ priorities: next });
  };

  const chip = (active: boolean) =>
    `rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
      active ? `${s.chipActive} border-transparent` : s.chipIdle
    }`;

  return (
    <div className={`rounded-xl border shadow-sm ${s.panel}`}>
      {/* แถวที่ 1 — ช่วงเวลา */}
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 ${s.divider}`}>
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${s.muted}`}>
          <CalendarRange className="h-4 w-4" />
          ช่วงเวลา
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => onPreset(p.id)} className={chip(activePreset === p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={query.startDate}
            max={query.endDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className={`rounded-md border px-2 py-1 text-xs outline-none ${s.input}`}
          />
          <span className={`text-xs ${s.faint}`}>ถึง</span>
          <input
            type="date"
            value={query.endDate}
            min={query.startDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            className={`rounded-md border px-2 py-1 text-xs outline-none ${s.input}`}
          />
        </div>

        <div className="ms-auto flex items-center gap-3">
          <div className="text-right">
            <p className={`text-xs font-medium ${s.body}`}>{periodLabel}</p>
            {compareStart && compareEnd ? (
              <p className={`text-[11px] ${s.faint}`}>
                เทียบกับ {fmtPeriod(compareStart, compareEnd)}
              </p>
            ) : (
              <p className={`text-[11px] ${s.faint}`} title="ระบบเริ่มบันทึกข้อมูลจริงตั้งแต่ 1 ม.ค. 2569 — ช่วงก่อนหน้านั้นไม่มีข้อมูลให้เทียบ">
                ยังไม่มีช่วงก่อนหน้าให้เทียบ
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${s.chipActive}`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'กำลังโหลด' : 'รีเฟรช'}
          </button>
        </div>
      </div>

      {/* แถวที่ 2 — ขอบเขตข้อมูล */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${s.muted}`}>
            <Layers className="h-4 w-4" />
            ประเภท
          </span>
          <div className={`inline-flex overflow-hidden rounded-md border ${s.divider}`}>
            {CASE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                title={t.hint}
                onClick={() => onChange({ caseType: t.value })}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  query.caseType === t.value ? s.chipActive : `${s.body} ${s.rowHover}`
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${s.muted}`}>
            <Building2 className="h-4 w-4" />
            ศูนย์ปฏิบัติการ
          </span>
          <select
            value={query.siteIds[0] ?? 'all'}
            onChange={(e) => onChange({ siteIds: e.target.value === 'all' ? [] : [Number(e.target.value)] })}
            className={`rounded-md border px-2 py-1 text-xs outline-none ${s.input}`}
          >
            <option value="all">ทุกศูนย์</option>
            {sites.map((site) => (
              <option key={site.site_id} value={site.site_id}>
                {site.label}
                {site.label_en ? ` — ${site.label_en}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${s.muted}`}>
            <SlidersHorizontal className="h-4 w-4" />
            ระดับความรุนแรง
          </span>
          <div className="flex gap-1.5">
            {(['Crisis', 'Major', 'Minor'] as const).map((p) => {
              const active = query.priorities.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePriority(p)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    active ? 'border-transparent text-white' : s.chipIdle
                  }`}
                  style={active ? { backgroundColor: SEVERITY_COLORS[p] } : undefined}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: active ? '#fff' : SEVERITY_COLORS[p] }}
                  />
                  {p}
                </button>
              );
            })}
            {query.priorities.length > 0 && (
              <button type="button" onClick={() => onChange({ priorities: [] })} className={`text-xs underline ${s.faint}`}>
                ล้าง
              </button>
            )}
          </div>
        </div>

        <span className={`ms-auto text-[11px] ${s.faint}`}>
          ปีงบประมาณแสดงเป็น พ.ศ. · ข้อมูลปัจจุบัน {toBuddhistYear(new Date(query.endDate).getFullYear() || new Date().getFullYear())}
        </span>
      </div>
    </div>
  );
};
