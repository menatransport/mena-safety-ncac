'use client';

// =============================================================================
// AdminBar — แถบบนสุดของหน้าผู้ดูแล Safety Self Learning
// -----------------------------------------------------------------------------
// แถบเดิมมีแต่ของประดับ: ชื่อระบบ + คำโปรย + เวลาอัปเดต + ปุ่มส่งออก
// ทั้งที่หน้านี้ขาดของจำเป็นอยู่สองอย่างซึ่งทำให้ผู้ดูแลติดอยู่กลางทาง
//
//   1) ไม่มีหน้าไหนในระบบลิงก์มา /lesson-admin เลย (ต้องพิมพ์ URL เอง)
//      และเมื่อเข้ามาแล้วก็ไม่มีทางกลับไปส่วนอื่นของ MENA SAFETY
//   2) หน้านี้ต้องล็อกอิน แต่กลับไม่บอกว่ากำลังใช้งานเป็นใคร และออกจากระบบไม่ได้
//
// แถบใหม่จึงตัดคำโปรยทิ้ง ย้ายปุ่มส่งออกลงไปอยู่กับตัวกรองที่มันควบคุมจริง
// แล้วเอาพื้นที่ที่ได้คืนมาใส่ทางออก ทางลัด และตัวตนผู้ใช้แทน
// =============================================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Swal from 'sweetalert2';
import {
    ArrowLeft,
    ExternalLink,
    LogOut,
    RefreshCw,
} from 'lucide-react';

import { mitr } from '@/app/lesson/font';

/** โครงข้อมูลผู้ใช้ที่ระบบเก็บไว้ใน localStorage (ชุดเดียวกับ Navbar หลัก) */
type UserInfo = {
    firstname?: string;
    lastname?: string;
    username?: string;
    position?: string;
    employee_id?: string;
    image_url?: string;
    rememberMe?: boolean;
};

/**
 * "2 นาทีที่แล้ว" ตอบคำถามว่าข้อมูลเก่าหรือยังได้ทันที
 * ส่วน "17:34" บังคับให้ผู้ใช้ไปคิดลบเวลาเอง จึงใช้แบบสัมพัทธ์
 */
function relativeTime(from: Date | null, now: number): string {
    if (!from) return '';
    const sec = Math.max(0, Math.floor((now - from.getTime()) / 1000));
    if (sec < 45) return 'เมื่อสักครู่';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} นาทีที่แล้ว`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
    return `${Math.floor(hr / 24)} วันที่แล้ว`;
}

export function AdminBar({
    loading,
    loadedAt,
    onRefresh,
}: {
    loading: boolean;
    loadedAt: Date | null;
    onRefresh: () => void;
}) {
    const router = useRouter();
    const [user, setUser] = useState<UserInfo | null>(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem('userData');
            if (raw) setUser(JSON.parse(raw) as UserInfo);
        } catch {
            // อ่านไม่ได้ก็แค่ไม่แสดงชื่อ ไม่ควรทำให้ทั้งหน้าพัง
        }
    }, []);

    // ขยับนาฬิกาทุกครึ่งนาที เพื่อให้ข้อความ "…ที่แล้ว" ไม่ค้างอยู่ที่ค่าเดิม
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(id);
    }, []);

    // เวลาอัปเดตต้องคิดใหม่เมื่อ loadedAt เปลี่ยน ไม่ต้องรอครบ 30 วินาที
    useEffect(() => {
        setNow(Date.now());
    }, [loadedAt]);

    const fullName = [user?.firstname, user?.lastname].filter(Boolean).join(' ');
    const initials =
        (user?.firstname?.[0] ?? user?.username?.[0] ?? '?').toUpperCase() +
        (user?.lastname?.[0] ?? '').toUpperCase();

    /** ออกจากระบบตามขั้นตอนเดียวกับ Navbar หลัก — ล้าง token และเคารพ rememberMe */
    const handleSignOut = async () => {
        const result = await Swal.fire({
            title: 'ออกจากระบบ?',
            text: 'คุณจะต้องเข้าสู่ระบบใหม่เพื่อกลับมาจัดการบทเรียน',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ออกจากระบบ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#F0654F',
            cancelButtonColor: '#5F7A6E',
            customClass: { popup: mitr.className },
        });
        if (!result.isConfirmed) return;

        try {
            const raw = window.localStorage.getItem('userData');
            const remember = raw ? (JSON.parse(raw) as UserInfo).rememberMe : false;
            if (!remember) window.localStorage.removeItem('userData');
            window.localStorage.removeItem('authToken');
        } catch {
            // ล้างไม่ได้ก็ยังต้องออกจากระบบให้สำเร็จ
        }
        await signOut({ callbackUrl: '/login' });
    };

    return (
        <header className="sticky top-0 z-30 bg-lsn-ink shadow-md">
            <div className="flex items-center justify-between gap-3 p-3 md:p-4">
                {/* ซ้าย: ทางกลับ + ตัวตนผู้ใช้ — เรียงตำแหน่งแบบเดียวกับ header หลักของระบบ (Navbar) */}
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push('/home')}
                        title="กลับหน้าหลัก MENA SAFETY"
                        aria-label="กลับหน้าหลัก MENA SAFETY"
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/80 shadow-sm transition-all duration-300 hover:-translate-x-0.5 hover:border-white hover:bg-white hover:text-lsn-deep hover:shadow-md"
                    >
                        <ArrowLeft className="size-5" strokeWidth={1.9} />
                    </button>

                    <span className="hidden h-9 w-px shrink-0 bg-white/20 sm:block" />

                    {user?.image_url ? (
                        // รูปมาจาก S3 ภายนอก จึงไม่ใช้ next/image
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={user.image_url}
                            alt=""
                            className="size-11 shrink-0 rounded-xl border border-white/25 object-cover shadow-sm"
                        />
                    ) : (
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-sm font-bold text-white shadow-sm">
                            {initials}
                        </span>
                    )}

                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-bold leading-6 tracking-tight text-white">
                            {fullName || user?.username || 'ผู้ใช้งาน'}
                            {user?.employee_id && (
                                <span className="ml-2 font-semibold text-lsn-mint">{user.employee_id}</span>
                            )}
                        </h1>
                        {/* ป้ายนี้ไม่ใช่ของประดับ — หน้าผู้ดูแลกับหน้าผู้เรียนใช้ธีมเดียวกัน
                            และสลับไปมาได้จากปุ่มข้าง ๆ จึงต้องบอกให้ชัดว่าตอนนี้อยู่ฝั่งไหน */}
                        <p className="truncate text-sm font-medium text-white/70">
                            {user?.position ? `${user.position} • ` : ''}Safety Self Learning
                            <span className="ml-1.5 hidden rounded-lg bg-white/15 px-2 py-0.5 text-[12px] font-medium leading-5 text-white sm:inline">
                                ผู้ดูแลระบบ
                            </span>
                        </p>
                    </div>
                </div>

                {/* ขวา: ทางลัด + สถานะข้อมูล + ออกจากระบบ — ระยะห่างและทรงปุ่มตามจังหวะเดียวกับ header หลัก */}
                <div className="flex shrink-0 items-center gap-2 md:gap-3">
                    {/* คนที่สร้างบทเรียนควรกดดูได้ทันทีว่าคนขับเห็นเป็นแบบไหน */}
                    <a
                        href="/lesson"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="เปิดมุมมองผู้เรียนในแท็บใหม่"
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/20 hover:text-white"
                    >
                        <ExternalLink size={14} strokeWidth={1.9} />
                        <span className="hidden lg:inline">มุมมองผู้เรียน</span>
                    </a>

                    {/* ปุ่มเดียวทำสองหน้าที่: บอกว่าข้อมูลเก่าแค่ไหน และกดเพื่อโหลดใหม่
                        ดีกว่าแยกเป็นข้อความหนึ่งชิ้นกับปุ่มอีกหนึ่งชิ้นที่พูดเรื่องเดียวกัน */}
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={loading}
                        title="โหลดข้อมูลใหม่"
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/20 hover:text-white disabled:translate-y-0 disabled:opacity-60"
                    >
                        <RefreshCw
                            className={`size-[14px] shrink-0 ${loading ? 'animate-spin' : ''}`}
                            strokeWidth={1.9}
                        />
                        <span className="hidden whitespace-nowrap tabular-nums md:inline">
                            {loading ? 'กำลังโหลด…' : relativeTime(loadedAt, now)}
                        </span>
                    </button>
                </div>
            </div>
        </header>
    );
}
