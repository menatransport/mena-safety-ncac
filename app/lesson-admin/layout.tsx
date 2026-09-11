import type { Metadata } from 'next';

import { mitr } from '@/app/lesson/font';

export const metadata: Metadata = {
  title: 'Safety Self Learning — ผู้ดูแลระบบ',
  description: 'จัดการบทเรียนความปลอดภัยและติดตามผลการเรียนของพนักงานขับรถ',
};

/**
 * Layout ของฝั่งผู้ดูแล — ทำหน้าที่เดียวคือ "ครอบขอบเขตธีม"
 *
 * ธีมบทเรียนใช้ฟอนต์และชุดสีคนละชุดกับหน้าอื่นในโปรเจกต์
 * จึงผูก `.lsn` + ตัวแปรฟอนต์ Mitr ไว้ที่ระดับ layout ครั้งเดียว
 * แทนที่จะไปใส่ซ้ำในทุกคอมโพเนนต์ (และกันไม่ให้รั่วไปหน้าอื่นด้วย)
 */
export default function LessonAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${mitr.variable} lsn lsn-canvas min-h-dvh`}>{children}</div>
  );
}
