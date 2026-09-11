/** ชนิดข้อมูลของระบบ Safety Self Learning (คอลเลกชัน safety_lesson_admin / safety_lesson_user) */

/** ตัวเลือกของคำถาม 1 ข้อ */
export interface LessonQuestion {
  /** ข้อความคำถาม */
  question: string;
  /** ตัวเลือก (2–6 ข้อ) */
  choices: string[];
  /**
   * วินาทีในวิดีโอที่คำถามนี้ถูกถามแทรก (optional)
   * ทุกข้ออยู่ในแบบทดสอบก่อน/หลังเรียนและนับคะแนนเหมือนกันเสมอ ไม่ว่าจะมีค่านี้หรือไม่
   *   • มีค่า  = นอกจากนับคะแนนแล้ว ยังขึ้น popup ถามแทรกระหว่างดูวิดีโอด้วย
   *             (คำตอบตอนดูวิดีโอไม่ถูกตรวจ เป็นแค่ตัวกระตุ้นความสนใจ)
   *   • ไม่ระบุ = นับคะแนนตามปกติ ไม่มี popup ระหว่างวิดีโอ
   */
  time_sec?: number;
}

/** บทเรียน 1 รายการ — collection: safety_lesson_admin */
export interface Lesson {
  _id?: string;
  lesson_id: string;
  title: string;
  description: string;
  /** URL รูปโลโก้บน S3 */
  logo: string;
  /**
   * รายชื่อลูกค้า (client_name) ที่ต้องเรียนบทเรียนนี้ ([] = ทุกคน)
   * เทียบกับ client_name ของคนขับใน masterdrivers
   */
  client_name: string[];
  questions: LessonQuestion[];
  /** เฉลย — index ของตัวเลือกที่ถูก เรียงตาม questions */
  answer: number[];
  /** กำหนดส่ง (ISO timestamp) */
  due_date: string;
  /** URL วิดีโอบน S3 */
  video: string;
  /** สถานะการใช้งาน — false = ปิด (คนขับจะไม่เห็นบทเรียนนี้), ไม่ระบุ = เปิด */
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type LessonStatus = 'ผ่าน' | 'ไม่ผ่าน';

/** ผลการทำบทเรียนของผู้ใช้ — collection: safety_lesson_user */
export interface LessonUserRecord {
  _id?: string;
  driver_id: string;
  lesson_id: string;
  /** คำตอบที่เลือก เรียงตาม questions (index ของตัวเลือก, -1 = ไม่ตอบ) */
  answer_user: number[];
  status: LessonStatus;
  created_at: string;
  /** ข้อมูลสรุปคะแนน — เก็บเพิ่มเพื่อให้ admin ดูย้อนหลังได้โดยไม่ต้องคำนวณใหม่ */
  score?: number;
  total?: number;
  /**
   * คะแนนทดสอบ "ก่อนเรียน" ของรอบนี้ (ใช้ชุดคำถามเดียวกัน)
   * เก็บไว้เพื่อเทียบพัฒนาการก่อน/หลังดูวิดีโอ — ไม่มีผลต่อการตัดสินผ่าน/ไม่ผ่าน
   * ไม่มีค่า = ผู้เรียนข้ามขั้นทดสอบก่อนเรียน (เช่น เข้ามาทบทวนบทที่ผ่านแล้ว)
   */
  pre_score?: number;
  pre_total?: number;
}

/** บทเรียน + สถานะของ driver คนนั้น (ใช้ในหน้า /lesson) */
export interface LessonWithProgress extends Lesson {
  /** null = ยังไม่เคยทำ */
  attempt: LessonUserRecord | null;
  is_overdue: boolean;
}

/** ข้อมูลคนขับจาก masterdrivers */
export interface DriverProfile {
  driver_id: string;
  first_name: string;
  last_name: string;
  /** ลูกค้าที่สังกัด ใช้กรองว่าต้องเรียนบทเรียนไหน */
  client_name: string;
  plant_name?: string;
  number_plate?: string;
}

/** เกณฑ์ผ่าน = ตอบถูก 80% ขึ้นไป */
export const PASS_RATIO = 0.8;

/** โลโก้สำรอง ใช้เมื่อบทเรียนไม่ได้ระบุรูป (logo เป็น optional) */
export const DEFAULT_LESSON_LOGO =
  'https://www.svgrepo.com/show/294336/video-player-movie.svg';
