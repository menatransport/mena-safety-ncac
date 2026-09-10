'use client';

import { AnalyticsQuery, IncidentAnalytics, SEVERITY_COLORS, fmtInt, fmtMoneyShort, fmtPct, fmtPeriod } from '@/lib/incidentAnalytics';
import { DASHBOARD_HELP } from '@/lib/dashboardHelp';
import { StatTile, useSurface } from './ui';
import { useCaseDrilldown } from './CaseListDialog';

/**
 * แถบตัวชี้วัดหลัก
 *
 * เรียงตามลำดับที่ผู้บริหารถามจริงในที่ประชุม: เกิดกี่เคส → รุนแรงแค่ไหน →
 * เสียหายเท่าไร → มีคนเจ็บไหม → ค้างอยู่กี่เคส · ทุกตัวมีค่าเทียบช่วงก่อนหน้า
 * ที่ยาวเท่ากันเสมอ ตัวเลขจึงเทียบกันได้โดยไม่ต้องอธิบายเพิ่ม
 */
export const KpiStrip = ({ data, query }: { data: IncidentAnalytics; query: AnalyticsQuery }) => {
  const s = useSurface();
  const drill = useCaseDrilldown(query);
  const period = fmtPeriod(data.meta.start_date, data.meta.end_date);
  const k = data.kpis;
  const total = k.total_cases.value || 1;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {drill.dialog}
      <StatTile
        label="เคสทั้งหมด"
        value={fmtInt(k.total_cases.value)}
        unit="เคส"
        changePct={k.total_cases.change_pct}
        context={`NC ${fmtInt(k.nc_cases.value)} · AC ${fmtInt(k.ac_cases.value)}`}
        accent="#334155"
        accentDark="#e2e8f0"
        emphasis
        onClick={() => drill.open('เคสทั้งหมด', {}, period)}
        help={DASHBOARD_HELP.kpiTotal}
      />
      <StatTile
        label="ระดับ Crisis"
        value={fmtInt(k.crisis_cases.value)}
        unit="เคส"
        changePct={k.crisis_cases.change_pct}
        context={`${fmtPct((k.crisis_cases.value / total) * 100, 1)} ของทั้งหมด`}
        accent={SEVERITY_COLORS.Crisis}
        accentDark="#fb7185"
        emphasis
        onClick={() => drill.open('ระดับ Crisis', { priority: 'Crisis' }, period)}
        help={DASHBOARD_HELP.kpiCrisis}
      />
      <StatTile
        label="ระดับ Major"
        value={fmtInt(k.major_cases.value)}
        unit="เคส"
        changePct={k.major_cases.change_pct}
        context={`Minor ${fmtInt(k.minor_cases.value)} เคส`}
        accent={SEVERITY_COLORS.Major}
        accentDark="#fbbf24"
        onClick={() => drill.open('ระดับ Major', { priority: 'Major' }, period)}
        help={DASHBOARD_HELP.kpiMajor}
      />
      <StatTile
        label="ค่าเสียหายจริง"
        value={fmtMoneyShort(k.actual_cost.value)}
        unit="บาท"
        changePct={k.actual_cost.change_pct}
        context={`เฉลี่ย ${fmtMoneyShort(k.cost_per_case.value)}/เคส`}
        accent="#0f766e"
        accentDark="#2dd4bf"
        emphasis
        help={DASHBOARD_HELP.kpiActualCost}
      />
      <StatTile
        label="ผู้เสียชีวิต / บาดเจ็บ"
        value={`${fmtInt(k.fatalities.value)} / ${fmtInt(k.injuries.value)}`}
        unit="ราย"
        changePct={k.injuries.change_pct}
        context={
          data.highlights.days_since_last_crisis === null
            ? 'ยังไม่เคยมีเคส Crisis'
            : `ปลอด Crisis ${fmtInt(data.highlights.days_since_last_crisis)} วัน`
        }
        accent="#be123c"
        accentDark="#fb7185"
        help={DASHBOARD_HELP.kpiInjuries}
      />
      <StatTile
        label="เคสค้างดำเนินการ"
        value={fmtInt(k.open_cases.value)}
        unit="เคส"
        changePct={k.open_cases.change_pct}
        context={`เกิน 30 วัน ${fmtInt(data.status.overdue_cases)} เคส`}
        accent="#b45309"
        accentDark="#fbbf24"
        help={DASHBOARD_HELP.kpiOpenCases}
      />

      <div className={`col-span-2 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border px-4 py-2.5 md:col-span-3 xl:col-span-6 ${s.panelSubtle}`}>
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${s.muted}`}>บริบทเพิ่มเติม</span>
        <span className={`text-xs ${s.body}`}>
          ความถี่ <b className="tabular-nums">{k.cases_per_day.value.toFixed(2)}</b> เคส/วัน
        </span>
        <span className={`text-xs ${s.body}`}>
          ใบสอบสวนครอบคลุม <b className="tabular-nums">{fmtPct(k.investigation_coverage_pct.value, 1)}</b>
        </span>
        <span className={`text-xs ${s.body}`}>
          อายุเฉลี่ยเคสค้าง <b className="tabular-nums">{data.status.avg_open_age_days.toFixed(0)}</b> วัน
        </span>
        <span className={`text-xs ${s.body}`}>
          ค่าเสียหายประเมิน <b className="tabular-nums">{fmtMoneyShort(k.estimated_cost.value)}</b> บาท
        </span>
        <span className={`text-xs ${s.body}`}>
          ช่วงเสี่ยงสูงสุด <b>{data.timing.peak_window.label}</b>
        </span>
      </div>
    </div>
  );
};
