'use client';

import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import {
  AnalyticsQuery,
  IncidentAnalytics,
  SEVERITY_COLORS,
  fmtInt,
  fmtMoney,
  fmtPct,
  fmtPeriod,
  neutralBarColor,
  severityTextColor,
} from '@/lib/incidentAnalytics';
import { DASHBOARD_HELP } from '@/lib/dashboardHelp';
import { Column, DataTable, EmptyState, LegendDots, MiniBar, Panel, useChartTheme, useSurface } from './ui';
import { useCaseDrilldown } from './CaseListDialog';

const HOUR_BUCKETS = ['00-03', '04-07', '08-11', '12-15', '16-19', '20-23'];

export const RiskPanel = ({ data, query }: { data: IncidentAnalytics; query: AnalyticsQuery }) => {
  const s = useSurface();
  const chart = useChartTheme();
  const drill = useCaseDrilldown(query);
  const period = fmtPeriod(data.meta.start_date, data.meta.end_date);

  const pareto = useMemo(
    () =>
      data.causes.map((c) => ({
        ...c,
        short: c.cause.length > 16 ? `${c.cause.slice(0, 15)}…` : c.cause,
      })),
    [data.causes]
  );

  /** ค่าสูงสุดของ heatmap ใช้เป็นฐานของความเข้มสี — ถ้าไม่มีข้อมูลให้เป็น 1 กัน NaN */
  const maxHeat = Math.max(1, ...data.timing.heatmap.map((h) => h.total));
  const maxHour = Math.max(1, ...data.timing.by_hour.map((h) => h.total));
  const heatAt = (weekday: number, bucket: string) =>
    data.timing.heatmap.find((h) => h.weekday === weekday && h.bucket === bucket)?.total ?? 0;

  const causeColumns: Column<IncidentAnalytics['causes'][number]>[] = [
    {
      key: 'rank',
      header: '#',
      width: '36px',
      render: (_row, i) => <span className={`text-xs tabular-nums ${s.faint}`}>{i + 1}</span>,
    },
    {
      key: 'cause',
      header: 'สาเหตุ',
      render: (row) => (
        <div className="min-w-[150px]">
          <p className={`text-sm font-medium ${s.heading}`}>{row.cause}</p>
          <p className={`text-[11px] ${s.faint}`}>
            NC {row.nc} · AC {row.ac}
          </p>
        </div>
      ),
    },
    { key: 'count', header: 'เคส', align: 'right', render: (row) => <span className="font-semibold">{fmtInt(row.count)}</span> },
    { key: 'pct', header: 'สัดส่วน', align: 'right', render: (row) => fmtPct(row.pct, 1) },
    {
      key: 'cum',
      header: 'สะสม',
      align: 'right',
      render: (row) => (
        <span className={row.cum_pct <= 80 ? 'font-semibold text-amber-600' : s.faint}>{fmtPct(row.cum_pct, 1)}</span>
      ),
    },
    {
      key: 'severe',
      header: 'Crisis / Major',
      align: 'center',
      render: (row) => (
        <span className={`text-xs tabular-nums ${s.muted}`}>
          {row.Crisis} / {row.Major}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'ค่าเสียหายจริง (บาท)',
      align: 'right',
      render: (row) => fmtMoney(row.actual_cost),
    },
  ];

  return (
    <div className="space-y-4">
      {drill.dialog}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Pareto ของสาเหตุ"
          subtitle="แท่ง = จำนวนเคส · เส้น = สัดส่วนสะสม · เส้นประ 80% คือขอบเขตของสาเหตุที่ควรแก้ก่อน"
          help={DASHBOARD_HELP.pareto}
          action={
            <LegendDots
              items={[
                { label: 'จำนวนเคส', color: '#334155' },
                { label: 'สัดส่วนสะสม', color: '#d97706' },
              ]}
            />
          }
        >
          {pareto.length === 0 ? (
            <EmptyState label="ไม่มีข้อมูลสาเหตุในช่วงเวลาที่เลือก" />
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={pareto} margin={{ top: 8, right: 8, left: -8, bottom: 40 }}>
                  <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="short"
                    tick={{ fontSize: 10, fill: chart.tick }}
                    axisLine={{ stroke: chart.grid }}
                    tickLine={false}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis
                    yAxisId="count"
                    tick={{ fontSize: 11, fill: chart.tick }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="cum"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: chart.tick }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={chart.tooltip}
                    cursor={{ fill: chart.isDark ? '#1e293b60' : '#e2e8f060' }}
                    formatter={(value, name) =>
                      name === 'สัดส่วนสะสม' ? [`${Number(value).toFixed(1)}%`, name] : [`${fmtInt(Number(value))} เคส`, name]
                    }
                    labelFormatter={(_l, payload) => payload?.[0]?.payload?.cause ?? ''}
                  />
                  <ReferenceLine yAxisId="cum" y={80} stroke="#d97706" strokeDasharray="4 4" />
                  <Bar yAxisId="count" dataKey="count" name="จำนวนเคส" radius={[3, 3, 0, 0]} maxBarSize={44}>
                    {/* กลุ่ม vital few (สะสม ≤ 80%) ต้องเด่นกว่าเสมอ — บนพื้นมืดจึงต้อง
                        สลับขั้วความสว่าง ไม่ใช่ใช้สีเข้มชุดเดียวกับธีมสว่าง */}
                    {pareto.map((row) => {
                      const vital = row.cum_pct <= 80;
                      return (
                        <Cell
                          key={row.cause}
                          fill={
                            chart.isDark
                              ? vital ? '#cbd5e1' : '#475569'
                              : vital ? '#334155' : '#cbd5e1'
                          }
                        />
                      );
                    })}
                  </Bar>
                  <Line
                    yAxisId="cum"
                    type="monotone"
                    dataKey="cum_pct"
                    name="สัดส่วนสะสม"
                    stroke="#d97706"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#d97706' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          title="หมวดสาเหตุที่แท้จริง (5M1E)"
          subtitle="จากใบสอบสวนอุบัติเหตุ (AC) ที่บันทึกสาเหตุไว้แล้ว"
          help={DASHBOARD_HELP.rootCause}
        >
          {data.root_cause_categories.length === 0 ? (
            <EmptyState label="ยังไม่มีใบสอบสวน AC ที่ระบุหมวดสาเหตุในช่วงนี้" />
          ) : (
            <ul className="space-y-3">
              {data.root_cause_categories.map((c) => (
                <li key={c.category}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${s.heading}`}>{c.category}</span>
                    <span className={`tabular-nums ${s.muted}`}>
                      {fmtInt(c.count)} · {fmtPct(c.pct, 1)}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <MiniBar value={c.count} max={data.root_cause_categories[0].count} color="#7c3aed" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Heatmap */}
        <Panel
          className="xl:col-span-2"
          title="ความหนาแน่นของเหตุการณ์ตามวันและช่วงเวลา"
          subtitle="อ้างอิงเวลาที่เกิดเหตุจริง (เวลาไทย) · ใช้จัดตารางอบรมและรอบตรวจให้ตรงช่วงเสี่ยง"
          help={DASHBOARD_HELP.heatmap}
          action={
            <div className="flex items-center gap-2">
              <span className={`text-[11px] ${s.faint}`}>น้อย</span>
              <div className="flex gap-0.5">
                {[0.12, 0.3, 0.5, 0.7, 0.9].map((a) => (
                  <span key={a} className="h-3 w-4 rounded-sm" style={{ backgroundColor: `rgba(185,28,28,${a})` }} />
                ))}
              </div>
              <span className={`text-[11px] ${s.faint}`}>มาก</span>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className={`w-16 text-left text-[11px] font-semibold ${s.muted}`} />
                  {HOUR_BUCKETS.map((b) => (
                    <th key={b} className={`text-center text-[11px] font-semibold ${s.muted}`}>
                      {b}
                    </th>
                  ))}
                  <th className={`w-12 text-right text-[11px] font-semibold ${s.muted}`}>รวม</th>
                </tr>
              </thead>
              <tbody>
                {data.timing.by_weekday.map((w) => (
                  <tr key={w.weekday}>
                    <td className={`whitespace-nowrap text-[11px] font-medium ${s.body}`}>{w.label}</td>
                    {HOUR_BUCKETS.map((b) => {
                      const v = heatAt(w.weekday, b);
                      const alpha = v === 0 ? 0 : 0.12 + (v / maxHeat) * 0.78;
                      return (
                        <td key={b} className="p-0">
                          <button
                            type="button"
                            disabled={v === 0}
                            title={v > 0 ? `${w.label} ${b} น. — ${v} เคส · คลิกเพื่อดูรายการ` : `${w.label} ${b} น. — ไม่มีเคส`}
                            onClick={() =>
                              drill.open(`${w.label} · ${b} น.`, { weekday: w.weekday, hourBucket: b }, period)
                            }
                            className={`flex h-8 w-full items-center justify-center rounded text-[11px] font-semibold tabular-nums transition-shadow ${
                              alpha > 0.55 ? 'text-white' : s.body
                            } ${v === 0 ? `${s.track} cursor-default` : 'cursor-pointer hover:ring-2 hover:ring-rose-500'}`}
                            style={v > 0 ? { backgroundColor: `rgba(185,28,28,${alpha})` } : undefined}
                          >
                            {v || ''}
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-0 text-right">
                      <button
                        type="button"
                        disabled={w.total === 0}
                        title={w.total > 0 ? `คลิกเพื่อดูรายการเคสวัน${w.label}` : undefined}
                        onClick={() => drill.open(`วัน${w.label}`, { weekday: w.weekday }, period)}
                        className={`text-xs font-semibold tabular-nums ${s.heading} ${
                          w.total > 0 ? 'cursor-pointer underline decoration-dotted underline-offset-2 hover:decoration-solid' : ''
                        }`}
                      >
                        {fmtInt(w.total)}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 border-t pt-3 ${s.divider}`}>
            <span className={`inline-flex items-center gap-1.5 text-xs ${s.body}`}>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              ช่วงเสี่ยงสูงสุด <b>{data.timing.peak_window.label}</b> — {fmtInt(data.timing.peak_window.count)} เคส (
              {fmtPct(data.timing.peak_window.pct, 1)})
            </span>
            <span className={`text-xs ${s.muted}`}>
              วันที่เกิดเหตุมากที่สุด:{' '}
              <b>
                {[...data.timing.by_weekday].sort((a, b) => b.total - a.total)[0]?.label ?? '—'}
              </b>
            </span>
          </div>
        </Panel>

        {/* รายชั่วโมง */}
        <Panel title="การกระจายตามชั่วโมง" subtitle="24 ชั่วโมง — ใช้ยืนยันช่วงเสี่ยงจาก heatmap" help={DASHBOARD_HELP.hourly}>
          {maxHour <= 1 && data.timing.by_hour.every((h) => h.total === 0) ? (
            <EmptyState label="ไม่มีเคสที่ระบุเวลาเกิดเหตุ" />
          ) : (
            <div className="space-y-1">
              {data.timing.by_hour.map((h) => (
                <button
                  key={h.hour}
                  type="button"
                  disabled={h.total === 0}
                  title={h.total > 0 ? `${String(h.hour).padStart(2, '0')}:00 น. — คลิกเพื่อดูรายการเคส` : undefined}
                  onClick={() => drill.open(`เวลา ${String(h.hour).padStart(2, '0')}:00 น.`, { hour: h.hour }, period)}
                  className={`group flex w-full items-center gap-2 rounded px-1 py-0.5 transition-colors ${
                    h.total > 0 ? `cursor-pointer ${s.rowHover}` : ''
                  }`}
                >
                  <span className={`w-9 shrink-0 text-right text-[10px] tabular-nums ${s.faint}`}>
                    {String(h.hour).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <MiniBar
                      value={h.total}
                      max={maxHour}
                      color={h.total >= maxHour * 0.75 ? severityTextColor('Crisis', s.isDark) : neutralBarColor(s.isDark)}
                    />
                  </div>
                  <span className={`w-6 text-right text-[10px] tabular-nums ${s.muted}`}>{h.total || ''}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="ตารางสาเหตุแบบละเอียด"
        subtitle="แถวที่สัดส่วนสะสมไม่เกิน 80% คือกลุ่มที่ควรจัดการก่อนตามหลัก Pareto"
        help={DASHBOARD_HELP.pareto}
      >
        <DataTable
          columns={causeColumns}
          rows={data.causes}
          emptyLabel="ไม่มีข้อมูลสาเหตุในช่วงเวลาที่เลือก"
          onRowClick={(row) => drill.open(row.cause, { cause: row.cause }, period)}
        />
      </Panel>
    </div>
  );
};
