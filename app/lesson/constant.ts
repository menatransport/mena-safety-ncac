/** ค่าคงที่ + helper ฝั่ง client ของระบบ Safety Self Learning */

import { DEFAULT_LESSON_LOGO, type DriverProfile } from './type';

/** URL โลโก้ที่ใช้แสดงจริง — บทเรียนเก่าที่ logo ว่างจะได้รูปสำรอง */
export const lessonLogo = (logo?: string) => logo?.trim() || DEFAULT_LESSON_LOGO;

export const DRIVER_STORAGE_KEY = 'safety_lesson_driver';

/** อ่านข้อมูลคนขับที่จำไว้ใน localStorage (คืน null ถ้ายังไม่เคยเข้า) */
export const readDriverSession = (): DriverProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRIVER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DriverProfile;
    return parsed?.driver_id ? parsed : null;
  } catch {
    return null;
  }
};

export const writeDriverSession = (driver: DriverProfile) => {
  try {
    window.localStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(driver));
  } catch {
    // โหมด private browsing เขียนไม่ได้ — ยังใช้งานต่อได้ในรอบนี้
  }
};

export const clearDriverSession = () => {
  try {
    window.localStorage.removeItem(DRIVER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

/**
 * session รุ่นเก่าเก็บ fleet แทน client_name ถ้าเจอของเก่าต้องดึงโปรไฟล์ใหม่
 * ไม่งั้นคนขับที่เคยเข้าระบบไว้จะกรองบทเรียนไม่ได้และเห็นรายการว่างเปล่า
 */
export const isDriverSessionStale = (d: DriverProfile | null): boolean =>
  !!d && typeof d.client_name !== 'string';

export const driverFullName = (d: DriverProfile | null) =>
  !d ? '' : `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || d.driver_id;

/** วันที่แบบไทย เช่น 4 ก.ย. 2569 */
export const formatThaiDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatThaiDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** จำนวนวันที่เหลือถึงกำหนดส่ง (ติดลบ = เลยกำหนด) */
export const daysLeft = (due?: string): number | null => {
  if (!due) return null;
  const d = new Date(due).getTime();
  if (!Number.isFinite(d)) return null;
  return Math.ceil((d - Date.now()) / 86_400_000);
};

/**
 * ดึงรหัสวิดีโอ YouTube จาก URL (คืน null ถ้าไม่ใช่ลิงก์ YouTube)
 * รองรับทั้งลิงก์ปกติ ลิงก์ย่อ และ Shorts — รหัสยาว 11 ตัวเหมือนกันหมด
 * ท้าย URL ที่มี query (เช่น ?si=... , &t=...) ถูกตัดทิ้งเองเพราะจับแค่ 11 ตัว
 */
export const youtubeId = (url: string): string | null => {
  if (!url) return null;
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  return m?.[1] ?? null;
};

/** แปลง URL วิดีโอเป็น embed ของ YouTube ถ้าเป็นลิงก์ YouTube (นอกนั้นเล่นด้วย <video>) */
export const youtubeEmbed = (url: string): string | null => {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
};

/**
 * เลื่อนขึ้นบนสุด
 * บนมือถือหน้าจะสกอร์ลที่ window แต่บนเดสก์ท็อปเนื้อหาอยู่ในกรอบโทรศัพท์
 * ที่สกอร์ลเอง จึงต้องไล่หา element ที่สกอร์ลได้จริงจากจุดที่เรียกขึ้นไป
 */
export const scrollToTop = (from?: HTMLElement | null) => {
  window.scrollTo({ top: 0, behavior: 'smooth' });

  let node: HTMLElement | null = from ?? null;
  while (node) {
    if (node.scrollHeight > node.clientHeight + 1) {
      node.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    node = node.parentElement;
  }
};

/** วินาที → "m:ss" (เช่น 125 → "2:05") */
export const formatClock = (seconds?: number): string => {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '';
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * "m:ss" หรือ "mm:ss" หรือตัวเลขล้วน (นาที) → วินาที
 * คืน null ถ้าว่างหรือรูปแบบไม่ถูกต้อง
 */
export const parseClock = (value: string): number | null => {
  const text = value.trim();
  if (!text) return null;

  const parts = text.split(':');
  if (parts.length === 1) {
    const m = Number(parts[0]);
    return Number.isFinite(m) && m >= 0 ? Math.floor(m * 60) : null;
  }
  if (parts.length === 2) {
    const m = Number(parts[0]);
    const s = Number(parts[1]);
    if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
    if (m < 0 || s < 0 || s > 59) return null;
    return Math.floor(m) * 60 + Math.floor(s);
  }
  return null;
};
