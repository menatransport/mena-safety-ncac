'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, SearchX, X } from 'lucide-react';
import {
  AnalyticsQuery,
  CaseDrilldownFilter,
  CaseListItem,
  caseDocHref,
  fetchCaseList,
  fmtDate,
  fmtMoney,
} from '@/lib/incidentAnalytics';
import { SeverityChip, useSurface } from './ui';

interface DrilldownState {
  title: string;
  subtitle?: string;
  filter: CaseDrilldownFilter;
}

/**
 * Hook สำหรับเปิดไดอะล็อกรายการเคสจากมิติที่กด
 *
 * ใช้แบบ `const drill = useCaseDrilldown(query)` แล้ววาง `{drill.dialog}` ไว้ที่ใดที่หนึ่ง
 * ในพาเนล จากนั้นเรียก `drill.open(title, filter)` ใน onClick ของแต่ละจุดที่กดดูได้
 */
export const useCaseDrilldown = (query: AnalyticsQuery) => {
  const [state, setState] = useState<DrilldownState | null>(null);

  return {
    open: (title: string, filter: CaseDrilldownFilter, subtitle?: string) => setState({ title, filter, subtitle }),
    dialog: state ? (
      <CaseListDialog
        query={query}
        title={state.title}
        subtitle={state.subtitle}
        filter={state.filter}
        onClose={() => setState(null)}
      />
    ) : null,
  };
};

const CaseListDialog = ({
  query,
  title,
  subtitle,
  filter,
  onClose,
}: {
  query: AnalyticsQuery;
  title: string;
  subtitle?: string;
  filter: CaseDrilldownFilter;
  onClose: () => void;
}) => {
  const s = useSurface();
  const [rows, setRows] = useState<CaseListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchCaseList(query, filter, controller.signal)
      .then((res) => {
        setRows(res.rows);
        setTotal(res.total);
        setTruncated(res.truncated);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'โหลดรายการเคสไม่สำเร็จ');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const openCase = (row: CaseListItem) => window.open(caseDocHref(row.source, row.doc_no), '_blank', 'noopener,noreferrer');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} />
      <div
        className={`relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border shadow-2xl ${s.panel}`}
      >
        <header className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${s.divider}`}>
          <div className="min-w-0">
            <h2 className={`text-sm font-semibold ${s.heading}`}>{title}</h2>
            {subtitle && <p className={`mt-0.5 text-xs ${s.muted}`}>{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className={`shrink-0 rounded-md p-1.5 transition-colors ${s.chipIdle}`}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading && (
            <div className={`flex items-center justify-center gap-2 py-14 text-sm ${s.muted}`}>
              <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายการเคส…
            </div>
          )}

          {!loading && error && (
            <div
              className={`flex flex-col items-center gap-2 py-14 text-center text-sm ${
                s.isDark ? 'text-rose-300' : 'text-rose-700'
              }`}
            >
              {error}
            </div>
          )}

          {!loading && !error && rows && rows.length === 0 && (
            <div className={`flex flex-col items-center gap-2 py-14 text-center ${s.faint}`}>
              <SearchX className="h-6 w-6" strokeWidth={1.5} />
              <p className="text-xs">ไม่มีเคสที่ตรงกับเงื่อนไขนี้</p>
            </div>
          )}

          {!loading && !error && rows && rows.length > 0 && (
            <table className="w-full min-w-full border-collapse text-sm">
              <thead>
                <tr className={`border-b text-left ${s.divider}`}>
                  <th className={`px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide ${s.muted}`}>
                    เลขที่เอกสาร
                  </th>
                  <th className={`px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide ${s.muted}`}>วันที่</th>
                  <th className={`px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide ${s.muted}`}>
                    ศูนย์ / ผู้เกี่ยวข้อง
                  </th>
                  <th
                    className={`px-2 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide ${s.muted}`}
                  >
                    ความรุนแรง
                  </th>
                  <th className={`px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide ${s.muted}`}>สถานะ</th>
                  <th
                    className={`px-2 pb-2 text-right text-[11px] font-semibold uppercase tracking-wide ${s.muted}`}
                  >
                    ค่าเสียหายจริง
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.doc_no} className={`border-b last:border-0 ${s.divider} ${s.rowHover} transition-colors`}>
                    <td className="px-2 py-2.5 align-top">
                      <button
                        type="button"
                        onClick={() => openCase(row)}
                        title="เปิดเอกสารเคสในแท็บใหม่"
                        className={`inline-flex items-center gap-1 font-mono text-xs font-semibold underline decoration-dotted underline-offset-2 transition-colors hover:decoration-solid ${s.heading}`}
                      >
                        {row.doc_no}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </button>
                      <p className={`mt-0.5 text-[10px] ${s.faint}`}>
                        {row.source === 'AC' ? 'อุบัติเหตุ' : 'ไม่สอดคล้อง'} · {row.cause}
                      </p>
                    </td>
                    <td className={`px-2 py-2.5 align-top text-xs ${s.body}`}>{fmtDate(row.date)}</td>
                    <td className="px-2 py-2.5 align-top">
                      <p className={`text-xs ${s.body}`}>{row.site_name}</p>
                      <p className={`text-[11px] ${s.faint}`}>
                        {row.driver_name !== 'ไม่ระบุพนักงานขับรถ' ? row.driver_name : row.client_name}
                      </p>
                    </td>
                    <td className="px-2 py-2.5 align-top text-center">
                      <SeverityChip priority={row.priority} />
                    </td>
                    <td className={`px-2 py-2.5 align-top text-xs ${s.body}`}>{row.casestatus}</td>
                    <td className={`px-2 py-2.5 align-top text-right text-xs font-medium tabular-nums ${s.heading}`}>
                      {fmtMoney(row.actual_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer className={`flex items-center justify-between gap-3 border-t px-5 py-3 ${s.divider}`}>
          <span className={`text-[11px] ${s.faint}`}>
            {!loading &&
              !error &&
              (truncated
                ? `แสดง ${rows?.length ?? 0} จากทั้งหมด ${total.toLocaleString('th-TH')} เคส`
                : `รวม ${total.toLocaleString('th-TH')} เคส`)}
          </span>
          <button type="button" onClick={onClose} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${s.chipIdle}`}>
            ปิด
          </button>
        </footer>
      </div>
    </div>
  );
};
