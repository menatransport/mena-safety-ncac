/**
 * ฟอนต์ของธีมบทเรียน (Safety Self Learning)
 * ใช้ Mitr ตามแบบ 3a — โหลดผ่าน next/font เพื่อไม่ให้มี FOUT และไม่ยิง Google Fonts ตอน runtime
 * แชร์กันระหว่าง /lesson (ผู้เรียน) และ /lesson-admin (ผู้ดูแล)
 */
import { Cormorant_Garamond, Mitr } from 'next/font/google';

export const mitr = Mitr({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-mitr',
  display: 'swap',
});

/**
 * ฟอนต์ serif สำหรับใบประกาศนียบัตร (ข้อความอังกฤษ + ตราประทับ)
 * เอกสารรับรองสากลใช้ serif เป็นมาตรฐาน — Mitr เป็น sans จึงดูไม่เป็นทางการพอ
 * ใช้เฉพาะ /lesson จึงโหลดที่ layout ของบทเรียน ไม่กระทบหน้าอื่นของระบบ
 */
export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});
