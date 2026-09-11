import type { Metadata } from 'next';

import { cormorant, mitr } from './font';
import { PreviewBanner } from './_components/PreviewBanner';

export const metadata: Metadata = {
  title: 'Safety Self Learning',
  description: 'ระบบเรียนรู้ความปลอดภัยด้วยตนเองสำหรับพนักงานขับรถ',
};

/**
 * Layout ของฝั่งผู้เรียน — ออกแบบเพื่อมือถือเป็นหลัก (ธีม 3a)
 *
 * บนมือถือแอปกินเต็มจอตามปกติ
 * บนจอใหญ่จะยกแอปขึ้นมาเป็นกรอบโทรศัพท์ตรงกลาง พร้อมแผงแนะนำด้านซ้าย
 * แทนที่จะปล่อยให้เป็นแถบแคบ ๆ ลอยอยู่กลางจอว่าง ๆ
 */
export default function LessonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${mitr.variable} ${cormorant.variable} lsn lsn-canvas min-h-dvh w-full`}>
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center gap-14 px-0 lg:px-10">

        {/* กรอบแอป — เต็มจอบนมือถือ, เป็นการ์ดทรงโทรศัพท์บนจอใหญ่ */}
        <div className="w-full max-w-[420px] shrink-0 lg:py-10">
          <div className="lsn-noscroll min-h-dvh w-full overflow-hidden bg-white lg:h-[840px] lg:max-h-[calc(100dvh-5rem)] lg:min-h-0 lg:overflow-y-auto lg:rounded-[38px] lg:shadow-[0_24px_60px_-20px_rgba(11,35,26,0.28)] lg:ring-1 lg:ring-lsn-line">
            {/* ขึ้นเฉพาะตอนผู้ดูแลเปิดด้วย ?preview=1 — ผู้เรียนจริงจะไม่เห็น */}
            <PreviewBanner />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
