'use client';

import { ReactNode, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus, Inbox, Info } from 'lucide-react';
import { useUiTheme } from '@/lib/useUiTheme';
import { deltaTone, fmtSignedPct, SEVERITY_COLORS, severityTextColor } from '@/lib/incidentAnalytics';

/**
 * โทเคนพื้นผิวของหน้า Dashboard
 *
 * รวมคลาสไว้ที่เดียวเพราะทั้งหน้ามี 20+ กล่องที่ต้องดูเป็นระนาบเดียวกัน
 * ถ้าปล่อยให้แต่ละ component เขียน bg/border เอง ความต่างระดับเทาเพียงขั้นเดียว
 * ก็ทำให้ตารางกับกราฟที่วางข้างกันดูเหมือนคนละหน้า
 */
export const useSurface = () => {
  const { theme } = useUiTheme();
  const isDark = theme === 'Dark';
  return {
    isDark,
    page: isDark ? 'bg-slate-950' : 'bg-slate-100',
    panel: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
    panelSubtle: isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200',
    divider: isDark ? 'border-slate-800' : 'border-slate-200',
    heading: isDark ? 'text-slate-100' : 'text-slate-900',
    body: isDark ? 'text-slate-300' : 'text-slate-700',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    faint: isDark ? 'text-slate-500' : 'text-slate-400',
    rowHover: isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50',
    track: isDark ? 'bg-slate-800' : 'bg-slate-200',
    input: isDark
      ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-slate-500'
      : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500',
    chipActive: isDark ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white',
    chipIdle: isDark
      ? 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
      : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500',
  };
};

/** ธีมกราฟของ recharts — แกน เส้นตาราง และ tooltip ต้องเปลี่ยนตามธีมด้วย */
export const useChartTheme = () => {
  const { isDark } = useSurface();
  return {
    isDark,
    grid: isDark ? '#1e293b' : '#e2e8f0',
    axis: isDark ? '#64748b' : '#94a3b8',
    tick: isDark ? '#94a3b8' : '#64748b',
    tooltip: {
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      borderRadius: 10,
      color: isDark ? '#e2e8f0' : '#0f172a',
      fontSize: 12,
      boxShadow: isDark ? '0 12px 32px rgba(0,0,0,.5)' : '0 12px 32px rgba(15,23,42,.12)',
      padding: '8px 12px',
    } as React.CSSProperties,
  };
};

// ============================================================
// Info tooltip — ไอคอน info ข้าง header อธิบาย logic การคำนวณของหัวข้อนั้น
// ข้อความมาจาก lib/dashboardHelp.ts ทั้งหมด เพื่อแก้ไขได้จากที่เดียว
// ============================================================
export const InfoTooltip = ({ text }: { text: string }) => {
  const s = useSurface();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="คำอธิบายวิธีคำนวณ"
        className={`inline-flex items-center justify-center rounded-full transition-colors ${s.faint} ${
          s.isDark ? 'hover:text-slate-300' : 'hover:text-slate-600'
        }`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 w-64 max-w-[80vw] -translate-x-1/2 rounded-lg border px-3 py-2 text-[11px] font-normal leading-relaxed shadow-lg ${s.panel} ${s.body}`}
        >
          {text}
        </span>
      )}
    </span>
  );
};

// ============================================================
// Panel
// ============================================================
interface PanelProps {
  title?: string;
  subtitle?: string;
  /** ข้อความอธิบาย logic ของหัวข้อนี้ — แสดงเป็นไอคอน info ข้างชื่อหัวข้อ hover เพื่อดู */
  help?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const Panel = ({ title, subtitle, help, action, children, className = '', bodyClassName = '' }: PanelProps) => {
  const s = useSurface();
  return (
    <section className={`rounded-xl border shadow-sm ${s.panel} ${className}`}>
      {(title || action) && (
        <header className={`flex items-start justify-between gap-3 border-b px-4 py-3 md:px-5 ${s.divider}`}>
          <div className="min-w-0">
            {title && (
              <h3 className={`flex items-center gap-1.5 text-sm font-semibold tracking-tight md:text-[15px] ${s.heading}`}>
                {title}
                {help && <InfoTooltip text={help} />}
              </h3>
            )}
            {subtitle && <p className={`mt-0.5 text-xs leading-relaxed ${s.muted}`}>{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={`p-4 md:p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
};

// ============================================================
// Delta badge
// ============================================================
export const DeltaBadge = ({
  changePct,
  higherIsBetter = false,
  suffix,
}: {
  changePct: number | null;
  higherIsBetter?: boolean;
  suffix?: string;
}) => {
  const { isDark } = useSurface();
  const { direction, className } = deltaTone(changePct, higherIsBetter, isDark);
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${className}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {fmtSignedPct(changePct)}
      {suffix && <span className="font-normal opacity-70">{suffix}</span>}
    </span>
  );
};

// ============================================================
// Stat tile
// ============================================================
export const StatTile = ({
  label,
  value,
  unit,
  changePct,
  higherIsBetter = false,
  context,
  accent,
  accentDark,
  emphasis = false,
  onClick,
  help,
}: {
  label: string;
  value: string;
  unit?: string;
  changePct?: number | null;
  higherIsBetter?: boolean;
  context?: string;
  accent?: string;
  /**
   * สีของตัวเลขในโหมด Dark
   *
   * สีเดียวกันใช้ได้ทั้งสองธีมไม่ได้ — โทนเข้มอย่าง slate-700 ที่อ่านชัดบนพื้นขาว
   * แทบมองไม่เห็นบนพื้น slate-950 การ์ดที่ไม่ส่งค่านี้จะใช้สีตัวอักษรปกติแทน
   */
  accentDark?: string;
  emphasis?: boolean;
  /** เมื่อกำหนด การ์ดทั้งใบกดดูรายการเคสของตัวชี้วัดนี้ได้ */
  onClick?: () => void;
  /** ข้อความอธิบาย logic การคำนวณของตัวชี้วัดนี้ — แสดงเป็นไอคอน info ข้าง label */
  help?: string;
}) => {
  const s = useSurface();
  const valueColor = s.isDark ? accentDark : accent;
  return (
    <div
      onClick={onClick}
      title={onClick ? 'คลิกเพื่อดูรายการเคส' : undefined}
      className={`group relative rounded-xl border px-4 py-3.5 shadow-sm transition-colors ${s.panel} ${
        onClick ? `cursor-pointer ${s.isDark ? 'hover:border-slate-600' : 'hover:border-slate-400'}` : ''
      }`}
    >
      {accent && (
        <span
          className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
          style={{ backgroundColor: s.isDark ? (accentDark ?? accent) : accent }}
        />
      )}
      {onClick && (
        <ChevronRight
          className={`absolute right-3 top-3.5 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 ${s.faint}`}
        />
      )}
      <p className={`flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide ${s.muted}`}>
        {label}
        {help && <InfoTooltip text={help} />}
      </p>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span
          className={`font-semibold tabular-nums ${emphasis ? 'text-3xl' : 'text-2xl'} ${s.heading}`}
          style={valueColor && emphasis ? { color: valueColor } : undefined}
        >
          {value}
        </span>
        {unit && <span className={`text-xs font-medium ${s.muted}`}>{unit}</span>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {changePct !== undefined && <DeltaBadge changePct={changePct} higherIsBetter={higherIsBetter} />}
        {context && <span className={`truncate text-[11px] ${s.faint}`}>{context}</span>}
      </div>
    </div>
  );
};

// ============================================================
// Proportion bar (ใช้ในตารางแทน sparkline เพื่อให้อ่านสัดส่วนได้ทันที)
// ============================================================
export const MiniBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
  const s = useSurface();
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full ${s.track}`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
};

// ============================================================
// Severity chip
// ============================================================
export const SeverityChip = ({
  priority,
  count,
  onClick,
}: {
  priority: string;
  count?: number;
  /** เมื่อกำหนด ชิปนี้กดดูรายการเคสของความรุนแรงนี้ได้ */
  onClick?: () => void;
}) => {
  const { isDark } = useSurface();
  const tint = SEVERITY_COLORS[priority] ?? '#64748b';
  const text = severityTextColor(priority, isDark);
  const className = `inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-shadow ${
    onClick ? `cursor-pointer hover:ring-2 hover:ring-offset-1 ${isDark ? 'ring-offset-slate-900' : ''}` : ''
  }`;
  const style = { backgroundColor: `${tint}1a`, color: text, ...(onClick ? { '--tw-ring-color': `${tint}80` } : {}) } as React.CSSProperties;
  const content = (
    <>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tint }} />
      {priority}
      {count !== undefined && <span className="tabular-nums">{count}</span>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} title="คลิกเพื่อดูรายการเคส" className={className} style={style}>
        {content}
      </button>
    );
  }
  return (
    <span className={className} style={style}>
      {content}
    </span>
  );
};

// ============================================================
// Data table
// ============================================================
export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  render: (row: T, index: number) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  emptyLabel = 'ไม่มีข้อมูลในช่วงที่เลือก',
  maxHeight,
  onRowClick,
  rowTitle = 'คลิกเพื่อดูรายการเคส',
}: {
  columns: Column<T>[];
  rows: T[];
  emptyLabel?: string;
  maxHeight?: string;
  /** เมื่อกำหนด แถวทั้งหมดจะกดดูได้ — มีเคอร์เซอร์ชี้มือและลูกศรท้ายแถวเป็นสัญญาณ */
  onRowClick?: (row: T, index: number) => void;
  rowTitle?: string;
}) {
  const s = useSurface();
  if (!rows.length) return <EmptyState label={emptyLabel} />;

  return (
    <div className="overflow-x-auto" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      <table className="w-full min-w-full border-collapse text-sm">
        <thead>
          <tr className={`border-b ${s.divider}`}>
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={`px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide ${s.muted} ${
                  c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {c.header}
              </th>
            ))}
            {onRowClick && <th className="w-6" aria-hidden />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              title={onRowClick ? rowTitle : undefined}
              className={`group border-b last:border-0 ${s.divider} ${s.rowHover} transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-2 py-2.5 align-middle ${s.body} ${
                    c.align === 'right' ? 'text-right tabular-nums' : c.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {c.render(row, i)}
                </td>
              ))}
              {onRowClick && (
                <td className="px-1 py-2.5 align-middle">
                  <ChevronRight
                    className={`h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 ${s.faint}`}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Empty / error states
// ============================================================
export const EmptyState = ({ label }: { label: string }) => {
  const s = useSurface();
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-10 text-center ${s.faint}`}>
      <Inbox className="h-6 w-6" strokeWidth={1.5} />
      <p className="text-xs">{label}</p>
    </div>
  );
};

export const LegendDots = ({ items }: { items: { label: string; color: string }[] }) => {
  const s = useSurface();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className={`inline-flex items-center gap-1.5 text-[11px] ${s.muted}`}>
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
};
