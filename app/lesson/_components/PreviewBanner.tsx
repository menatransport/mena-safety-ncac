'use client';

// =============================================================================
// PreviewBanner — แถบบอกว่ากำลังอยู่ใน "โหมดทดลองเรียน" ของผู้ดูแล
// -----------------------------------------------------------------------------
// วางไว้ใน layout ของ /lesson จึงขึ้นครบทุกขั้น (แนะนำ → ก่อนเรียน → วิดีโอ →
// หลังเรียน → สรุปผล) โดยไม่ต้องไปแก้ทุกจุดที่หน้าบทเรียน return ออกมา
//
// ใช้ sticky ไม่ใช่ fixed — เพราะบนมือถือแอปกินเต็มจอ แถบลอยจะไปทับปุ่มย้อนกลับ
// ส่วน sticky จะดันเนื้อหาลงมาให้เองและยังค้างอยู่บนสุดตอนเลื่อน
// =============================================================================

import { useEffect, useState } from 'react';
import { ArrowLeft, Eye } from 'lucide-react';

export function PreviewBanner() {
    const [on, setOn] = useState(false);

    useEffect(() => {
        setOn(new URLSearchParams(window.location.search).get('preview') === '1');
    }, []);

    if (!on) return null;

    return (
        <div className="sticky top-0 z-50 flex items-center gap-3 bg-lsn-ink px-4 py-2.5 text-white">
            <Eye className="size-[18px] shrink-0" strokeWidth={1.9} />

            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-5">โหมดทดลองเรียน</p>
                <p className="text-[11px] leading-4 text-white/70">
                    เป็นหน้าจอเดียวกับที่พนักงานขับรถเห็น · คะแนนจะไม่ถูกบันทึก
                </p>
            </div>

            <a
                href="/lesson-admin"
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors hover:bg-white/12"
            >
                <ArrowLeft className="size-4" strokeWidth={2} />
                กลับ
            </a>
        </div>
    );
}
