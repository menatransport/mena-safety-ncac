'use client';

import { Truck, User, Building } from 'lucide-react';
import {
  AnalyticsQuery,
  CaseDrilldownFilter,
  DimensionRow,
  IncidentAnalytics,
  SEVERITY_COLORS,
  fmtDate,
  fmtInt,
  fmtMoney,
  fmtPct,
  fmtPeriod,
  severityTextColor,
} from '@/lib/incidentAnalytics';
import { DASHBOARD_HELP } from '@/lib/dashboardHelp';
import { Column, DataTable, DeltaBadge, MiniBar, Panel, useSurface } from './ui';
import { useCaseDrilldown } from './CaseListDialog';

type EntityDimension = 'driverName' | 'vehicle' | 'clientName';

/**
 * ตารางจัดอันดับพนักงานขับรถ / รถ / ลูกค้า
 *
 * ทั้งสามชุดใช้โครงคอลัมน์เดียวกันโดยตั้งใจ — ผู้ใช้เรียนรู้การอ่านครั้งเดียว
 * แล้วใช้ได้ทั้งสามตาราง และเปรียบเทียบข้ามมิติได้โดยไม่ต้องปรับสายตา
 */
const rankColumns = (
  s: ReturnType<typeof useSurface>,
  maxTotal: number,
  headLabel: string,
  accent: string,
  dimensionKey: EntityDimension,
  onDrill: (title: string, filter: CaseDrilldownFilter) => void
): Column<DimensionRow>[] => [
  {
    key: 'rank',
    header: '#',
    width: '36px',
    render: (_row, i) => <span className={`text-xs tabular-nums ${s.faint}`}>{i + 1}</span>,
  },
  {
    key: 'name',
    header: headLabel,
    render: (row) => (
      <div className="min-w-[150px]">
        <p className={`text-sm font-medium ${s.heading}`}>{row.name}</p>
        <div className="mt-1.5">
          <MiniBar value={row.total} max={maxTotal} color={accent} />
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
            disabled={row[p] === 0}
            title={row[p] > 0 ? 'คลิกเพื่อดูรายการเคส' : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onDrill(`${row.name} · ${p}`, { [dimensionKey]: row.name, priority: p } as CaseDrilldownFilter);
            }}
            className={`min-w-[30px] rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-shadow ${
              row[p] > 0 ? 'cursor-pointer hover:ring-2 hover:ring-offset-1' : 'cursor-default'
            }`}
            style={
              {
                backgroundColor: row[p] > 0 ? `${SEVERITY_COLORS[p]}1a` : 'transparent',
                color: row[p] > 0 ? severityTextColor(p, s.isDark) : undefined,
                ...(row[p] > 0 ? { '--tw-ring-color': `${SEVERITY_COLORS[p]}80` } : {}),
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
    key: 'cost',
    header: 'ค่าเสียหายจริง (บาท)',
    align: 'right',
    render: (row) => fmtMoney(row.actual_cost),
  },
  {
    key: 'last',
    header: 'เกิดเหตุล่าสุด',
    align: 'right',
    render: (row) => <span className={`text-xs ${s.muted}`}>{fmtDate(row.last_incident)}</span>,
  },
  {
    key: 'delta',
    header: 'เทียบช่วงก่อน',
    align: 'right',
    render: (row) => <DeltaBadge changePct={row.change_pct} />,
  },
];

export const EntityPanel = ({ data, query }: { data: IncidentAnalytics; query: AnalyticsQuery }) => {
  const s = useSurface();
  const drill = useCaseDrilldown(query);
  const period = fmtPeriod(data.meta.start_date, data.meta.end_date);
  const onDrill = (title: string, filter: CaseDrilldownFilter) => drill.open(title, filter, period);
  const c = data.entities.concentration;
  const total = data.kpis.total_cases.value || 1;

  const maxDriver = Math.max(1, ...data.entities.drivers.map((d) => d.total));
  const maxVehicle = Math.max(1, ...data.entities.vehicles.map((d) => d.total));
  const maxClient = Math.max(1, ...data.entities.clients.map((d) => d.total));

  return (
    <div className="space-y-4">
      {drill.dialog}
      <Panel
        title="การกระจุกตัวของความเสี่ยง"
        subtitle="ถ้าเคสกระจุกอยู่ที่คนกลุ่มเล็ก มาตรการเฉพาะบุคคลจะได้ผลเร็วกว่ามาตรการทั้งองค์กร"
        help={DASHBOARD_HELP.concentration}
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: 'พนักงานขับรถที่เกิดเคส',
              value: fmtInt(c.driver_count),
              unit: 'คน',
              hint: `จากทั้งหมด ${fmtInt(total)} เคส`,
            },
            {
              label: 'สัดส่วนของ 5 อันดับแรก',
              value: fmtPct(c.top5_driver_share_pct, 1),
              unit: '',
              hint: c.top5_driver_share_pct >= 30 ? 'กระจุกตัวสูง' : 'กระจายตัวตามปกติ',
            },
            {
              label: 'เกิดเคสซ้ำ ≥ 3 ครั้ง',
              value: fmtInt(c.repeat_driver_count),
              unit: 'คน',
              hint: `รวม ${fmtInt(c.repeat_driver_cases)} เคส`,
            },
            {
              label: 'สัดส่วนเคสจากกลุ่มเกิดซ้ำ',
              value: fmtPct((c.repeat_driver_cases / total) * 100, 1),
              unit: '',
              hint: 'เป้าหมายหลักของโปรแกรมอบรมเฉพาะบุคคล',
            },
          ].map((item) => (
            <div key={item.label} className={`rounded-lg border px-3.5 py-3 ${s.panelSubtle}`}>
              <p className={`text-[11px] leading-tight ${s.muted}`}>{item.label}</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${s.heading}`}>
                {item.value}
                {item.unit && <span className={`ms-1 text-xs font-normal ${s.muted}`}>{item.unit}</span>}
              </p>
              <p className={`mt-0.5 text-[11px] ${s.faint}`}>{item.hint}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="พนักงานขับรถที่เกิดเคสสูงสุด"
        subtitle="สูงสุด 10 อันดับ · ใช้ประกอบการพิจารณาอบรมและมาตรการทางวินัย"
        help={DASHBOARD_HELP.driverTable}
        action={<User className={`h-4 w-4 ${s.faint}`} />}
      >
        <DataTable
          columns={rankColumns(s, maxDriver, 'พนักงานขับรถ', '#2563eb', 'driverName', onDrill)}
          rows={data.entities.drivers}
          emptyLabel="ไม่มีข้อมูลพนักงานขับรถในช่วงเวลาที่เลือก"
          onRowClick={(row) => onDrill(row.name, { driverName: row.name })}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <Panel
          title="ทะเบียน/หมายเลขรถที่เกิดเคสสูงสุด"
          subtitle="เคสซ้ำที่รถคันเดิมมักชี้ไปที่สภาพรถหรือเส้นทาง มากกว่าตัวบุคคล"
          help={DASHBOARD_HELP.vehicleTable}
          action={<Truck className={`h-4 w-4 ${s.faint}`} />}
        >
          <DataTable
            columns={rankColumns(s, maxVehicle, 'หมายเลขรถ', '#7c3aed', 'vehicle', onDrill)}
            rows={data.entities.vehicles}
            emptyLabel="ไม่มีข้อมูลรถในช่วงเวลาที่เลือก"
            onRowClick={(row) => onDrill(row.name, { vehicle: row.name })}
          />
        </Panel>

        <Panel
          title="ลูกค้าที่เกี่ยวข้องกับเคสสูงสุด"
          subtitle="ใช้เตรียมข้อมูลก่อนประชุมทบทวนงานกับลูกค้าแต่ละราย"
          help={DASHBOARD_HELP.clientTable}
          action={<Building className={`h-4 w-4 ${s.faint}`} />}
        >
          <DataTable
            columns={rankColumns(s, maxClient, 'ลูกค้า', '#0d9488', 'clientName', onDrill)}
            rows={data.entities.clients}
            emptyLabel="ไม่มีข้อมูลลูกค้าในช่วงเวลาที่เลือก"
            onRowClick={(row) => onDrill(row.name, { clientName: row.name })}
          />
        </Panel>
      </div>
    </div>
  );
};
