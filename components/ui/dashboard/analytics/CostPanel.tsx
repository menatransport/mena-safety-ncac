'use client';

import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AnalyticsQuery,
  IncidentAnalytics,
  SEVERITY_COLORS,
  caseDocHref,
  fmtDate,
  fmtInt,
  fmtMoney,
  fmtMoneyShort,
  fmtPct,
  fmtPeriod,
  fmtSignedPct,
  fmtTrendLabel,
} from '@/lib/incidentAnalytics';
import { DASHBOARD_HELP } from '@/lib/dashboardHelp';
import { Column, DataTable, EmptyState, LegendDots, MiniBar, Panel, SeverityChip, useChartTheme, useSurface } from './ui';
import { useCaseDrilldown } from './CaseListDialog';

export const CostPanel = ({ data, query }: { data: IncidentAnalytics; query: AnalyticsQuery }) => {
  const s = useSurface();
  const chart = useChartTheme();
  const drill = useCaseDrilldown(query);
  const period = fmtPeriod(data.meta.start_date, data.meta.end_date);
  const cost = data.cost;

  const series = useMemo(
    () =>
      data.trend.map((t) => ({
        label: fmtTrendLabel(t.key, data.meta.granularity),
        estimated_cost: t.estimated_cost,
        actual_cost: t.actual_cost,
      })),
    [data.trend, data.meta.granularity]
  );

  const recovery = cost.recovery;
  const recoveryItems = [
    { label: 'เคลมประกัน', value: recovery.insurance_claim, color: '#2563eb' },
    { label: 'ขายสินค้าคืนได้', value: recovery.product_resellable, color: '#0d9488' },
    { label: 'พนักงานขับรถรับผิดชอบ', value: recovery.driver_cost, color: '#d97706' },
    { label: 'บริษัทรับผิดชอบ', value: recovery.company_cost, color: '#b91c1c' },
    { label: 'ค่าปรับ', value: recovery.penalty, color: '#7c3aed' },
    { label: 'ความเสียหายคงเหลือ', value: recovery.remaining_damage_cost, color: '#64748b' },
  ];
  const recoveryTotal = recoveryItems.reduce((sum, r) => sum + r.value, 0);
  const maxRecovery = Math.max(1, ...recoveryItems.map((r) => r.value));
  const maxPriorityCost = Math.max(1, ...cost.by_priority.map((p) => p.actual));

  const caseColumns: Column<IncidentAnalytics['cost']['top_cases'][number]>[] = [
    {
      key: 'doc',
      header: 'เลขที่เอกสาร',
      render: (row) => (
        <div className="min-w-[150px]">
          <button
            type="button"
            onClick={() => window.open(caseDocHref(row.source, row.doc_no), '_blank', 'noopener,noreferrer')}
            title="เปิดเอกสารเคสในแท็บใหม่"
            className={`inline-flex items-center gap-1 font-mono text-xs font-semibold underline decoration-dotted underline-offset-2 transition-colors hover:decoration-solid ${s.heading}`}
          >
            {row.doc_no}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </button>
          <p className={`text-[11px] ${s.faint}`}>
            {fmtDate(row.date)} · {row.site_name}
          </p>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'ระดับ',
      align: 'center',
      render: (row) => <SeverityChip priority={row.priority} />,
    },
    {
      key: 'cause',
      header: 'สาเหตุ / ลูกค้า',
      render: (row) => (
        <div className="min-w-[140px]">
          <p className={`text-xs ${s.body}`}>{row.cause}</p>
          <p className={`text-[11px] ${s.faint}`}>{row.client_name}</p>
        </div>
      ),
    },
    {
      key: 'driver',
      header: 'พนักงานขับรถ',
      render: (row) => <span className={`text-xs ${s.body}`}>{row.driver_name}</span>,
    },
    {
      key: 'estimated',
      header: 'ประเมิน (บาท)',
      align: 'right',
      render: (row) => <span className={s.muted}>{fmtMoney(row.estimated_cost)}</span>,
    },
    {
      key: 'actual',
      header: 'จริง (บาท)',
      align: 'right',
      render: (row) => <span className={`font-semibold ${s.heading}`}>{fmtMoney(row.actual_cost)}</span>,
    },
    {
      key: 'status',
      header: 'สถานะ',
      align: 'center',
      render: (row) => <span className={`text-[11px] ${s.muted}`}>{row.casestatus}</span>,
    },
  ];

  const accuracy = cost.estimate_accuracy_pct;
  const accuracyTone =
    accuracy === null
      ? s.muted
      : Math.abs(accuracy) < 10
        ? 'text-teal-600'
        : accuracy > 0
          ? 'text-rose-600'
          : 'text-amber-600';

  return (
    <div className="space-y-4">
      {drill.dialog}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="ค่าเสียหายประเมินเทียบกับค่าเสียหายจริง"
          subtitle={`ราย${data.meta.granularity === 'day' ? 'วัน' : 'เดือน'} — ช่องว่างที่กว้างขึ้นเรื่อย ๆ แปลว่ากระบวนการประเมินหน้างานต้องทบทวน`}
          help={DASHBOARD_HELP.costTrend}
          action={
            <LegendDots
              items={[
                { label: 'ประเมิน', color: '#94a3b8' },
                { label: 'จริง', color: '#0f766e' },
              ]}
            />
          }
        >
          {series.length === 0 ? (
            <EmptyState label="ไม่มีข้อมูลค่าเสียหายในช่วงเวลาที่เลือก" />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                    tick={{ fontSize: 11, fill: chart.tick }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => fmtMoneyShort(Number(v))}
                  />
                  <Tooltip
                    contentStyle={chart.tooltip}
                    cursor={{ fill: chart.isDark ? '#1e293b60' : '#e2e8f060' }}
                    formatter={(value, name) => [`${fmtMoney(Number(value))} บาท`, name]}
                  />
                  <Bar dataKey="estimated_cost" name="ประเมิน" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="actual_cost" name="จริง" fill="#0f766e" radius={[3, 3, 0, 0]} maxBarSize={22} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className={`mt-4 grid grid-cols-2 gap-3 border-t pt-4 md:grid-cols-4 ${s.divider}`}>
            {[
              { label: 'ค่าเสียหายจริงรวม', value: `${fmtMoney(cost.total_actual)} บาท` },
              { label: 'ค่าเสียหายประเมินรวม', value: `${fmtMoney(cost.total_estimated)} บาท` },
              { label: 'เคสที่ปิดยอดแล้ว', value: `${fmtInt(cost.settled_cases)} เคส` },
            ].map((item) => (
              <div key={item.label}>
                <p className={`text-[11px] ${s.muted}`}>{item.label}</p>
                <p className={`mt-0.5 text-sm font-semibold tabular-nums ${s.heading}`}>{item.value}</p>
              </div>
            ))}
            <div>
              <p className={`text-[11px] ${s.muted}`}>ความคลาดเคลื่อนของการประเมิน</p>
              <p className={`mt-0.5 text-sm font-semibold tabular-nums ${accuracyTone}`}>
                {fmtSignedPct(accuracy)}
                <span className={`ms-1 text-[11px] font-normal ${s.faint}`}>
                  {accuracy === null ? '' : accuracy > 0 ? '(จริงสูงกว่า)' : '(จริงต่ำกว่า)'}
                </span>
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          title="การรับผิดชอบความเสียหาย"
          subtitle={`จากใบสอบสวน ${recovery.scope} ${fmtInt(recovery.documented_cases)} ฉบับในช่วงนี้`}
          help={DASHBOARD_HELP.recovery}
        >
          {recoveryTotal === 0 ? (
            <EmptyState label="ยังไม่มีการบันทึกยอดรับผิดชอบในใบสอบสวน" />
          ) : (
            <ul className="space-y-3">
              {recoveryItems.map((item) => (
                <li key={item.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={s.body}>{item.label}</span>
                    <span className={`font-semibold tabular-nums ${s.heading}`}>{fmtMoney(item.value)}</span>
                  </div>
                  <div className="mt-1.5">
                    <MiniBar value={item.value} max={maxRecovery} color={item.color} />
                  </div>
                  <p className={`mt-0.5 text-[10px] tabular-nums ${s.faint}`}>
                    {fmtPct((item.value / recoveryTotal) * 100, 1)} ของยอดที่บันทึกไว้
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          title="ค่าเสียหายตามระดับความรุนแรง"
          subtitle="ดูว่าความเสียหายกระจุกอยู่ที่ระดับใด"
          help={DASHBOARD_HELP.costByPriority}
        >
          {cost.by_priority.length === 0 ? (
            <EmptyState label="ไม่มีข้อมูลในช่วงเวลาที่เลือก" />
          ) : (
            <ul className="space-y-4">
              {cost.by_priority.map((p) => (
                <li key={p.priority}>
                  <div className="flex items-center justify-between">
                    <SeverityChip
                      priority={p.priority}
                      count={p.count}
                      onClick={() => drill.open(p.priority, { priority: p.priority }, period)}
                    />
                    <span className={`text-sm font-semibold tabular-nums ${s.heading}`}>{fmtMoney(p.actual)}</span>
                  </div>
                  <div className="mt-2">
                    <MiniBar value={p.actual} max={maxPriorityCost} color={SEVERITY_COLORS[p.priority] ?? '#64748b'} />
                  </div>
                  <p className={`mt-1 text-[11px] tabular-nums ${s.faint}`}>
                    เฉลี่ย {fmtMoney(p.avg_actual)} บาท/เคส · ประเมินไว้ {fmtMoney(p.estimated)} บาท
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          className="xl:col-span-2"
          title="10 เคสที่มีค่าเสียหายจริงสูงสุด"
          subtitle="ใช้ตรวจสอบว่าเคสมูลค่าสูงมีเอกสารและการสอบสวนครบถ้วนแล้วหรือไม่"
          help={DASHBOARD_HELP.topCases}
        >
          <DataTable
            columns={caseColumns}
            rows={cost.top_cases}
            emptyLabel="ยังไม่มีเคสที่บันทึกค่าเสียหายจริงในช่วงนี้"
          />
        </Panel>
      </div>
    </div>
  );
};
