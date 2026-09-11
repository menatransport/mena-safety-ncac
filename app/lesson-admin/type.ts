/** ชนิดข้อมูลเฉพาะหน้า admin ของ Safety Self Learning */

import type { LessonStatus, LessonUserRecord } from '@/app/lesson/type';

/** เรกคอร์ดผู้เรียนที่ API แนบชื่อบทเรียนมาให้แล้ว (หนึ่งครั้งที่ส่ง = หนึ่งรายการ) */
export interface LessonUserRow extends LessonUserRecord {
    lesson_title: string;
}

/**
 * สรุปผลราย "พนักงาน × บทเรียน" — หนึ่งคู่เหลือหนึ่งแถว
 *
 * หน้าผลการเรียนตอบคำถามว่า "คนนี้ผ่านบทเรียนนี้หรือยัง" การไล่ทุกครั้งที่ส่ง
 * ทำให้คนที่ทำซ้ำสามรอบกินพื้นที่สามแถวและอ่านสถานะจริงยาก
 * จึงยุบเหลือผลของครั้งล่าสุด แล้วพกจำนวนครั้งติดมาด้วยเพื่อไม่ให้ข้อมูลนั้นหายไป
 */
export interface LessonUserSummary {
    /** driver_id + lesson_id ใช้เป็น key ของแถว */
    key: string;
    driver_id: string;
    lesson_id: string;
    lesson_title: string;
    /** สถานะจากครั้งล่าสุด */
    status: LessonStatus;
    score: number;
    total: number;
    /** คะแนนก่อนเรียนของครั้งล่าสุด (ไม่มีถ้าผู้เรียนข้ามขั้นนั้น) */
    pre_score?: number;
    /** เวลาที่ส่งของครั้งล่าสุด */
    created_at: string;
    /** จำนวนครั้งที่ส่งภายในช่วงที่กรองอยู่ */
    attempts: number;
}

export type AdminTab = 'lesson' | 'user';
