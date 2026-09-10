'use client';

import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AnalyticsQuery,
  IncidentAnalytics,
  SEVERITY_COLORS,
  SOURCE_COLORS,
  fmtInt,
  fmtMoney,
  fmtMoneyShort,
  fmtPct,
  fmtPeriod,
  fmtTrendLabel,
  neutralBarColor,
  severityTextColor,
} from '@/lib/incidentAnalytics';
import { DASHBOARD_HELP } from '@/lib/dashboardHelp';
import {
  Column,
  DataTable,
  DeltaBadge,
  EmptyState,
  InfoTooltip,
  LegendDots,
  MiniBar,
  Panel,
  useChartTheme,
  useSurface,
} from './ui';
import { useCaseDrilldown } from './CaseListDialog';

export const OverviewPanel = ({ data, query }: { data: IncidentAnalytics; query: AnalyticsQuery }) => {
  const s = useSurface();
  const chart = useChartTheme();
  const drill = useCaseDrilldown(query);
  const period = fmtPeriod(data.meta.start_date, data.meta.end_date);

  const trend = useMemo(
    () =>
      data.trend.map((t) => ({
        ...t,
        label: fmtTrendLabel(t.key, data.meta.granularity),
      })),
    [data.trend, data.meta.granularity]
  );

  const totalCases = data.kpis.total_cases.value;
  const maxSiteTotal = Math.max(1, ...data.sites.map((x) => x.total));
  const maxFunnel = Math.max(1, ...data.status.funnel.map((f) => f.count));
  const maxAging = Math.max(1, ...data.status.aging.map((a) => a.count));

  const siteColumns: Column<IncidentAnalytics['sites'][number]>[] = [
    {
      key: 'name',
      header: 'ศูนย์ปฏิบัติการ',
      render: (row) => (
        <div className="min-w-[130px]">
          <p className={`text-sm font-medium ${s.heading}`}>{row.name}</p>
          <div className="mt-1.5">
            <MiniBar value={row.total} max={maxSiteTotal} color="#334155" />
          </div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'เคส',
      align: 'right',
      render: (row) => (
        <div>
          <p className={`font-semibold ${s.heading}`}>{fmtInt(row.total)}</p>
          <p className={`text-[11px] ${s.faint}`}>{fmtPct(row.share_pct, 1)}</p>
        </div>
      ),
    },
    {
      key: 'mix',
      header: 'Crisis / Major / Minor',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          {(['Crisis', 'Major', 'Minor'] as const).map((p) => (
            <button
              key={p}
              type="button"
              title="คลิกเพื่อดูรายการเคส"
              onClick={(e) => {
                e.stopPropagation();
                drill.open(`${row.name} · ${p}`, { siteName: row.name, priority: p }, period);
              }}
              className="min-w-[34px] cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-shadow hover:ring-2 hover:ring-offset-1"
              style={
                {
                  backgroundColor: `${SEVERITY_COLORS[p]}1a`,
                  color: severityTextColor(p, s.isDark),
                  '--tw-ring-color': `${SEVERITY_COLORS[p]}80`,
                } as React.CSSProperties
              }
            >
              {row[p]}
            </button>
          ))}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'NC / AC',
      align: 'center',
      render: (row) => (
        <span className={`text-xs tabular-nums ${s.muted}`}>
          {row.nc} / {row.ac}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'ค่าเสียหายจริง (บาท)',
      align: 'right',
      render: (row) => (
        <div>
          <p className={`font-medium ${s.heading}`}>{fmtMoney(row.actual_cost)}</p>
          <p className={`text-[11px] ${s.faint}`}>{fmtPct(row.cost_share_pct, 1)} ของยอดรวม</p>
        </div>
      ),
    },
    {
      key: 'delta',
      header: 'เทียบช่วงก่อน',
      align: 'right',
      render: (row) => (
        <div className="flex flex-col items-end">
          <DeltaBadge changePct={row.change_pct} />
          <span className={`text-[11px] tabular-nums ${s.faint}`}>{row.previous} → {row.total}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {drill.dialog}
      {/* แนวโน้ม */}
      <Panel
        title="แนวโน้มจำนวนเคสและค่าเสียหาย"
        subtitle={`แท่ง = จำนวนเคสแยก NC/AC (แกนซ้าย) · เส้น = ค่าเสียหายจริง (แกนขวา) · ราย${
          data.meta.granularity === 'day' ? 'วัน' : 'เดือน'
        }`}
        help={DASHBOARD_HELP.trend}
        action={
          <LegendDots
            items={[
              { label: 'NC', color: SOURCE_COLORS.NC },
              { label: 'AC', color: SOURCE_COLORS.AC },
              { label: 'ค่าเสียหายจริง', color: '#0f766e' },
            ]}
          />
        }
      >
        {trend.length === 0 ? (
          <EmptyState label="ไม่มีเคสในช่วงเวลาที่เลือก" />
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: chart.tick }}
                  axisLine={{ stroke: chart.grid }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis
                  yAxisId="cases"
                  tick={{ fontSize: 11, fill: chart.tick }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="cost"
                  orientation="right"
                  tick={{ fontSize: 11, fill: chart.tick }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtMoneyShort(Number(v))}
                />
                <Tooltip
                  contentStyle={chart.tooltip}
                  cursor={{ fill: chart.isDark ? '#1e293b60' : '#e2e8f060' }}
                  formatter={(value, name) =>
                    name === 'ค่าเสียหายจริง'
                      ? [`${fmtMoney(Number(value))} บาท`, name]
                      : [`${fmtInt(Number(value))} เคส`, name]
                  }
                />
                <Legend wrapperStyle={{ display: 'none' }} />
                <Bar yAxisId="cases" dataKey="nc" name="NC" stackId="cases" fill={SOURCE_COLORS.NC} radius={[0, 0, 0, 0]} maxBarSize={38} />
                <Bar yAxisId="cases" dataKey="ac" name="AC" stackId="cases" fill={SOURCE_COLORS.AC} radius={[3, 3, 0, 0]} maxBarSize={38} />
                <Line
                  yAxisId="cost"
                  type="monotone"
                  dataKey="actual_cost"
                  name="ค่าเสียหายจริง"
                  stroke="#0f766e"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#0f766e' }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* สัดส่วนความรุนแรง */}
        <Panel
          title="โครงสร้างความรุนแรง"
          subtitle="สัดส่วนของแต่ละระดับ พร้อมการแยก NC / AC"
          help={DASHBOARD_HELP.severityMix}
        >
          {totalCases === 0 ? (
            <EmptyState label="ไม่มีเคสในช่วงเวลาที่เลือก" />
          ) : (
            <>
              <div className={`flex h-3 w-full overflow-hidden rounded-full ${s.track}`}>
                {data.severity_mix.map((m) => (
                  <div
                    key={m.priority}
                    title={`${m.priority} ${m.total} เคส (${m.pct}%)`}
                    style={{ width: `${m.pct}%`, backgroundColor: SEVERITY_COLORS[m.priority] ?? '#64748b' }}
                  />
                ))}
              </div>
              <ul className="mt-4 space-y-1">
                {data.severity_mix.map((m) => (
                  <li key={m.priority}>
                    <button
                      type="button"
                      title="คลิกเพื่อดูรายการเคส"
                      onClick={() => drill.open(m.priority, { priority: m.priority }, period)}
                      className={`group flex w-full cursor-pointer items-center gap-3 rounded-md px-1.5 py-1.5 text-left transition-colors ${s.rowHover}`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: SEVERITY_COLORS[m.priority] ?? '#64748b' }}
                      />
                      <span className={`flex-1 text-sm font-medium ${s.heading}`}>{m.priority}</span>
                      <span className={`text-xs tabular-nums ${s.muted}`}>NC {m.nc} · AC {m.ac}</span>
                      <span className={`w-14 text-right text-sm font-semibold tabular-nums ${s.heading}`}>
                        {fmtInt(m.total)}
                      </span>
                      <span className={`w-12 text-right text-xs tabular-nums ${s.faint}`}>{fmtPct(m.pct, 1)}</span>
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 ${s.faint}`} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        {/* สถานะเอกสาร + อายุเคสค้าง */}
        <Panel title="สถานะเอกสารและอายุเคสค้าง" subtitle="ตัววัดประสิทธิภาพการปิดเคส">
          <p className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide ${s.muted}`}>
            สถานะเอกสาร
            <InfoTooltip text={DASHBOARD_HELP.statusFunnel} />
          </p>
          <ul className="mt-2 space-y-2">
            {data.status.funnel.slice(0, 5).map((f) => (
              <li key={f.status}>
                <button
                  type="button"
                  title="คลิกเพื่อดูรายการเคส"
                  onClick={() => drill.open(`สถานะ ${f.status}`, { casestatus: f.status }, period)}
                  className={`group block w-full cursor-pointer rounded-md px-1 py-0.5 text-left transition-colors ${s.rowHover}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${s.body} inline-flex items-center gap-1`}>
                      {f.status}
                      <ChevronRight className={`h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 ${s.faint}`} />
                    </span>
                    <span className={`tabular-nums ${s.muted}`}>
                      {fmtInt(f.count)} · {fmtPct(f.pct, 1)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <MiniBar value={f.count} max={maxFunnel} color={neutralBarColor(s.isDark)} />
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <p className={`mt-5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide ${s.muted}`}>
            อายุของเคสที่ยังไม่ปิด ({fmtInt(data.status.open_cases)} เคส)
            <InfoTooltip text={DASHBOARD_HELP.aging} />
          </p>
          <ul className="mt-2 space-y-2">
            {data.status.aging.map((a, idx) => (
              <li key={a.bucket}>
                <button
                  type="button"
                  title="คลิกเพื่อดูรายการเคส"
                  onClick={() => drill.open(`เคสค้าง ${a.bucket}`, { agingBucket: a.bucket }, period)}
                  className={`group block w-full cursor-pointer rounded-md px-1 py-0.5 text-left transition-colors ${s.rowHover}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${s.body} inline-flex items-center gap-1`}>
                      {a.bucket}
                      <ChevronRight className={`h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 ${s.faint}`} />
                    </span>
                    <span className={`tabular-nums ${s.muted}`}>{fmtInt(a.count)}</span>
                  </div>
                  <div className="mt-1">
                    <MiniBar
                      value={a.count}
                      max={maxAging}
                      color={
                        idx >= 3
                          ? severityTextColor('Crisis', s.isDark)
                          : idx === 2
                            ? severityTextColor('Major', s.isDark)
                            : '#0d9488'
                      }
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ความปลอดภัย */}
        <Panel
          title="ความปลอดภัยและการปฏิบัติตามกฎ"
          subtitle="ตัวเลขที่ต้องรายงานผู้บริหารทุกครั้งที่ไม่เป็นศูนย์"
          help={DASHBOARD_HELP.safety}
        >
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'ผู้เสียชีวิต', value: data.safety.fatalities, color: severityTextColor('Crisis', s.isDark) },
              { label: 'บาดเจ็บ (เข้ารักษา)', value: data.safety.injured_hospitalized, color: severityTextColor('Major', s.isDark) },
              { label: 'บาดเจ็บ (ไม่เข้ารักษา)', value: data.safety.injured_not_hospitalized, color: '#0d9488' },
              { label: 'แอลกอฮอล์เป็นบวก', value: data.safety.alcohol_positive, color: severityTextColor('Crisis', s.isDark) },
              { label: 'สารเสพติดเป็นบวก', value: data.safety.drug_positive, color: severityTextColor('Crisis', s.isDark) },
              { label: 'เป็นฝ่ายผิด (AC)', value: data.safety.at_fault, color: severityTextColor('Major', s.isDark) },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg border px-3 py-2.5 ${s.panelSubtle}`}>
                <p className={`text-[11px] leading-tight ${s.muted}`}>{item.label}</p>
                <p
                  className="mt-1 text-xl font-semibold tabular-nums"
                  style={{ color: item.value > 0 ? item.color : undefined }}
                >
                  {fmtInt(item.value)}
                </p>
              </div>
            ))}
          </div>
          <p className={`mt-4 border-t pt-3 text-[11px] leading-relaxed ${s.divider} ${s.faint}`}>
            การบาดเจ็บและผลตรวจสารเสพติดบันทึกเฉพาะในเอกสาร AC — จากทั้งหมด{' '}
            {fmtInt(data.safety.ac_cases)} เคส · ที่ยังไม่ระบุฝ่ายผิด {fmtInt(data.safety.fault_unknown)} เคส
          </p>
        </Panel>
      </div>

      {/* ตารางศูนย์ปฏิบัติการ */}
      <Panel
        title="เปรียบเทียบรายศูนย์ปฏิบัติการ"
        subtitle="เรียงตามจำนวนเคส · ใช้หาจุดที่ควรลงมาตรการก่อน"
        help={DASHBOARD_HELP.sitesTable}
      >
        <DataTable
          columns={siteColumns}
          rows={data.sites}
          emptyLabel="ไม่มีเคสในช่วงเวลาที่เลือก"
          onRowClick={(row) => drill.open(row.name, { siteName: row.name }, period)}
        />
      </Panel>
    </div>
  );
};
