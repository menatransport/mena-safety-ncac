'use client';

import { Lightbulb } from 'lucide-react';
import { Insight, insightTone } from '@/lib/incidentAnalytics';
import { EmptyState, Panel, useSurface } from './ui';

/**
 * ประเด็นสรุปจากฝั่ง API
 *
 * ตั้งใจให้อยู่บนสุดของหน้าและอ่านจบได้ก่อนกราฟทุกตัว — กราฟตอบว่า "ตัวเลข
 * เป็นอย่างไร" แต่คนอ่าน dashboard ต้องการคำตอบว่า "แล้วต้องทำอะไรต่อ"
 * เกณฑ์ทั้งหมดอยู่ที่ routes/incident_analytics.py::_build_insights
 */
export const InsightBoard = ({ insights }: { insights: Insight[] }) => {
  const s = useSurface();

  const counts = insights.reduce<Record<string, number>>((acc, i) => {
    acc[i.severity] = (acc[i.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Panel
      title="ประเด็นสำคัญจากข้อมูล"
      subtitle="คัดเฉพาะรายการที่ผ่านเกณฑ์นัยสำคัญในช่วงเวลาที่เลือก"
      action={
        <div className="flex items-center gap-1.5">
          {(['critical', 'warning', 'info', 'positive'] as const).map((sev) =>
            counts[sev] ? (
              <span
                key={sev}
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${insightTone(sev, s.isDark).chip}`}
              >
                {insightTone(sev, s.isDark).label} {counts[sev]}
              </span>
            ) : null
          )}
        </div>
      }
      bodyClassName="p-0 md:p-0"
    >
      {insights.length === 0 ? (
        <EmptyState label="ไม่พบประเด็นที่เข้าเกณฑ์นัยสำคัญ — ตัวชี้วัดอยู่ในระดับปกติทั้งหมด" />
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2">
          {insights.map((insight, i) => {
            const tone = insightTone(insight.severity, s.isDark);
            return (
              <li
                key={`${insight.title}-${i}`}
                className={`flex gap-3 border-b px-4 py-3.5 md:px-5 ${s.divider} ${
                  i % 2 === 0 ? 'lg:border-r' : ''
                }`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold leading-snug ${s.heading}`}>{insight.title}</p>
                  <p className={`mt-1 text-xs leading-relaxed ${s.muted}`}>{insight.detail}</p>
                </div>
                {insight.metric && (
                  <span
                    className={`h-fit shrink-0 rounded-md px-2 py-1 text-xs font-bold tabular-nums ${tone.chip}`}
                  >
                    {insight.metric}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] md:px-5 ${s.faint}`}>
        <Lightbulb className="h-3.5 w-3.5" />
        ประเด็นถูกจัดอันดับตามความรุนแรงและขนาดของผลกระทบ แสดงสูงสุด 8 รายการ
      </p>
    </Panel>
  );
};
