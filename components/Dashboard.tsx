'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Coins,
  Download,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { sendErrorLog } from '@/lib/logError';
import { useUiTheme } from '@/lib/useUiTheme';
import {
  AnalyticsQuery,
  IncidentAnalytics,
  fetchIncidentAnalytics,
  fmtDate,
  fmtPeriod,
} from '@/lib/incidentAnalytics';
import {
  ControlBar,
  CostPanel,
  EntityPanel,
  InsightBoard,
  KpiStrip,
  OverviewPanel,
  PresetId,
  RiskPanel,
  SiteOption,
  buildPreset,
  useSurface,
} from '@/components/ui/dashboard/analytics';

const TABS = [
  { id: 'overview', label: 'ภาพรวม', icon: BarChart3, hint: 'แนวโน้ม ความรุนแรง และรายศูนย์' },
  { id: 'risk', label: 'สาเหตุและความเสี่ยง', icon: ShieldAlert, hint: 'Pareto 5M1E และช่วงเวลาเสี่ยง' },
  { id: 'cost', label: 'ต้นทุนความเสียหาย', icon: Coins, hint: 'ประเมินเทียบจริง และการรับผิดชอบ' },
  { id: 'entities', label: 'ผู้เกี่ยวข้อง', icon: Users, hint: 'พนักงานขับรถ รถ และลูกค้า' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const DEFAULT_PRESET: PresetId = 'ytd';

export const DashboardComponent = () => {
  const { theme } = useUiTheme();
  const s = useSurface();

  const [query, setQuery] = useState<AnalyticsQuery>(() => {
    const range = buildPreset(DEFAULT_PRESET)!;
    return { ...range, caseType: 'all', siteIds: [], priorities: [] };
  });
  const [activePreset, setActivePreset] = useState<PresetId>(DEFAULT_PRESET);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const [data, setData] = useState<IncidentAnalytics | null>(null);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  // ---------------------------------------------------------
  // ตัวเลือกศูนย์ปฏิบัติการ — master data โหลดครั้งเดียวต่อการเปิดหน้า
  // ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    fetch('/api/analytics/incidents/filters')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body?.sites) setSites(body.sites);
      })
      .catch(() => {
        /* ตัวกรองใช้ไม่ได้ไม่ควรทำให้ทั้งหน้าพัง — ผู้ใช้ยังดูภาพรวมทุกศูนย์ได้ */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------
  // ข้อมูลหลัก — ยกเลิก request เดิมทุกครั้งที่ตัวกรองเปลี่ยน
  // เพราะการกดเปลี่ยนช่วงเวลารัว ๆ ทำให้ response มาถึงสลับลำดับได้
  // ---------------------------------------------------------
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      fetchIncidentAnalytics(query, controller.signal)
        .then((result) => setData(result))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          const message = err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ';
          setError(message);
          sendErrorLog('Dashboard/fetchIncidentAnalytics', err instanceof Error ? err : String(err));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, reloadToken]);

  const patchQuery = useCallback((patch: Partial<AnalyticsQuery>) => {
    setQuery((prev) => ({ ...prev, ...patch }));
    if (patch.startDate || patch.endDate) setActivePreset('custom');
  }, []);

  const applyPreset = useCallback((id: PresetId) => {
    const range = buildPreset(id);
    if (!range) return;
    setActivePreset(id);
    setQuery((prev) => ({ ...prev, ...range }));
  }, []);

  // ---------------------------------------------------------
  // ส่งออก Excel — ใช้ตัวเลขชุดเดียวกับที่แสดงบนจอ ไม่ยิง API ซ้ำ
  // เพื่อไม่ให้ไฟล์ที่ส่งต่อในที่ประชุมขัดกับหน้าจอที่กำลังฉายอยู่
  // ---------------------------------------------------------
  const handleExport = useCallback(async () => {
    if (!data) return;
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const summary = [
        ['รายงานวิเคราะห์อุบัติการณ์ NC / AC'],
        ['ช่วงข้อมูล', fmtPeriod(data.meta.start_date, data.meta.end_date)],
        [
          'เทียบกับ',
          data.meta.compare_start_date && data.meta.compare_end_date
            ? fmtPeriod(data.meta.compare_start_date, data.meta.compare_end_date)
            : `ยังไม่มีข้อมูลย้อนหลัง (ระบบเริ่มใช้งาน ${fmtDate(data.meta.system_go_live_date)})`,
        ],
        ['สร้างเมื่อ', fmtDate(data.meta.generated_at)],
        [],
        ['ตัวชี้วัด', 'ค่าปัจจุบัน', 'ช่วงก่อนหน้า', 'เปลี่ยนแปลง (%)'],
        ...Object.entries(data.kpis).map(([key, m]) => [key, m.value, m.previous, m.change_pct ?? '-']),
        [],
        ['ประเด็นสำคัญ', 'รายละเอียด', 'ตัวเลข'],
        ...data.insights.map((i) => [i.title, i.detail, i.metric]),
      ];

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'สรุป');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.sites), 'รายศูนย์');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.causes), 'สาเหตุ');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.entities.drivers), 'พนักงานขับรถ');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.entities.vehicles), 'รถ');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.cost.top_cases), 'เคสมูลค่าสูง');

      XLSX.writeFile(wb, `incident-analytics_${data.meta.start_date}_${data.meta.end_date}.xlsx`);
    } catch (err) {
      sendErrorLog('Dashboard/handleExport', err instanceof Error ? err : String(err));
    }
  }, [data]);

  const pageBg =
    theme === 'Dark'
      ? 'bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900'
      : 'bg-slate-100';

  const tabButton = (active: boolean) =>
    `group relative flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors ${
      active ? s.heading : s.muted
    }`;

  const activeCount = useMemo(
    () => (query.siteIds.length ? 1 : 0) + (query.priorities.length ? 1 : 0) + (query.caseType !== 'all' ? 1 : 0),
    [query]
  );

  return (
    <div className={`min-h-screen ${pageBg} px-3 py-4 md:px-6 md:py-6 lg:px-8`}>
      <div className="mx-auto max-w-[1600px] space-y-4">
        {/* ส่วนหัว */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${s.faint}`}>
              MENA Safety · Incident Analytics
            </p>
            <h1 className={`mt-1 text-xl font-semibold tracking-tight md:text-2xl ${s.heading}`}>
              รายงานวิเคราะห์อุบัติการณ์และอุบัติเหตุ
            </h1>
            <p className={`mt-1 text-xs ${s.muted}`}>
              รวมเอกสาร NC (Non-Conformance) และ AC (Accident Case) · ตัวเลขทั้งหมดคำนวณจากฐานข้อมูลกลาง
              {data && ` · ข้อมูล ${data.meta.row_count.toLocaleString('th-TH')} เคสในช่วงที่เลือก`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${s.panelSubtle} ${s.muted} border`}>
                ใช้ตัวกรอง {activeCount} รายการ
              </span>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={!data}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${s.chipIdle}`}
            >
              <Download className="h-3.5 w-3.5" />
              ส่งออก Excel
            </button>
          </div>
        </header>

        {/* ตัวควบคุม */}
        <ControlBar
          query={query}
          activePreset={activePreset}
          onPreset={applyPreset}
          onChange={patchQuery}
          sites={sites}
          loading={loading}
          onRefresh={() => setReloadToken((n) => n + 1)}
          compareStart={data?.meta.compare_start_date}
          compareEnd={data?.meta.compare_end_date}
        />

        {/* สถานะผิดพลาด */}
        {error && (
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${
              s.isDark ? 'border-rose-900/70 bg-rose-950/40' : 'border-rose-200 bg-rose-50'
            }`}
          >
            <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${s.isDark ? 'text-rose-400' : 'text-rose-600'}`} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${s.isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                โหลดข้อมูลไม่สำเร็จ
              </p>
              <p className={`mt-0.5 text-xs ${s.muted}`}>{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${s.chipActive}`}
            >
              ลองอีกครั้ง
            </button>
          </div>
        )}

        {/* โครงหน้าระหว่างโหลดครั้งแรก */}
        {loading && !data && <DashboardSkeleton />}

        {data && (
          <>
            <KpiStrip data={data} query={query} />
            <InsightBoard insights={data.insights} />

            {/* แท็บ */}
            <div className={`rounded-xl border shadow-sm ${s.panel}`}>
              <nav className={`flex overflow-x-auto border-b px-2 ${s.divider}`} role="tablist">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      title={tab.hint}
                      onClick={() => setActiveTab(tab.id)}
                      className={tabButton(active)}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                      {active && (
                        <span
                          className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full ${
                            s.isDark ? 'bg-slate-100' : 'bg-slate-900'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </nav>
              <p className={`px-4 py-2 text-[11px] ${s.faint}`}>
                {TABS.find((t) => t.id === activeTab)?.hint}
              </p>
            </div>

            <div className={loading ? 'pointer-events-none opacity-60 transition-opacity' : 'transition-opacity'}>
              {activeTab === 'overview' && <OverviewPanel data={data} query={query} />}
              {activeTab === 'risk' && <RiskPanel data={data} query={query} />}
              {activeTab === 'cost' && <CostPanel data={data} query={query} />}
              {activeTab === 'entities' && <EntityPanel data={data} query={query} />}
            </div>

            <footer className={`pb-4 pt-2 text-center text-[11px] ${s.faint}`}>
              คำนวณจาก {data.meta.row_count.toLocaleString('th-TH')} เคส · ช่วง{' '}
              {fmtPeriod(data.meta.start_date, data.meta.end_date)} · ข้อมูล ณ {fmtDate(data.meta.generated_at)}
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

/** โครงหน้าระหว่างโหลด — รักษาความสูงของหน้าไว้เพื่อไม่ให้เนื้อหากระโดดตอนข้อมูลมาถึง */
const DashboardSkeleton = () => {
  const s = useSurface();
  const block = `animate-pulse rounded-xl border ${s.panel}`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${block} h-[92px]`} />
        ))}
      </div>
      <div className={`${block} h-[180px]`} />
      <div className={`${block} h-[360px]`} />
    </div>
  );
};
