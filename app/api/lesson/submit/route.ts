import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTION_ADMIN, COLLECTION_USER } from '@/lib/mongodb';
import { gradeLesson, quizBankIndices } from '@/lib/lesson';
import type { Lesson, LessonUserRecord } from '@/app/lesson/type';

export const dynamic = 'force-dynamic';

/** ตัวเลขที่รับได้จริง ไม่งั้นคืนค่าสำรอง */
const intOr = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
};

/**
 * POST /api/lesson/submit
 * body: { driver_id, lesson_id, answer_user: number[], phase?: 'pre' | 'post',
 *         pre_score?: number, pre_total?: number }
 *
 * คิดคะแนนจากคำถามทั้งหมดในบทเรียน (ทั้งข้อที่มี time_sec และไม่มี)
 * time_sec มีผลแค่กับ popup ระหว่างวิดีโอ ไม่มีผลต่อการนับคะแนนในแบบทดสอบนี้
 * ฝั่งผู้เรียนสลับลำดับข้อเองตอนทดสอบหลังเรียน แต่ answer_user ส่งกลับมาเรียงตาม
 * questions เสมอ การสลับลำดับจึงไม่กระทบการตรวจ
 *
 * ตรวจคำตอบฝั่ง server เท่านั้น
 *   • phase 'pre'  — ทดสอบก่อนเรียน: ตรวจให้อย่างเดียว ไม่บันทึก ไม่ส่งเฉลยกลับ
 *                    (ถ้าส่งเฉลยตอนนี้ ผู้เรียนจะเห็นคำตอบก่อนดูวิดีโอ)
 *   • phase 'post' — ทดสอบหลังเรียน (ค่าเริ่มต้น): บันทึกลง safety_lesson_user
 *                    พร้อมคะแนนก่อนเรียนของรอบนั้นเพื่อเทียบพัฒนาการ
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const driver_id = String(body?.driver_id ?? '').trim();
    const lesson_id = String(body?.lesson_id ?? '').trim();
    const phase = body?.phase === 'pre' ? 'pre' : 'post';
    // พรีวิว = ตรวจให้ครบเหมือนของจริง แต่ไม่เขียนลงฐานข้อมูล
    // (เรื่องสิทธิ์เข้าถึง ดูหมายเหตุใน /api/lesson/[id])
    const isPreview = body?.preview === true;

    if (!driver_id || !lesson_id) {
      return NextResponse.json({ error: 'ต้องระบุ driver_id และ lesson_id' }, { status: 400 });
    }

    const db = await getDb();
    const lesson = await db.collection<Lesson>(COLLECTION_ADMIN).findOne({ lesson_id });

    if (!lesson) {
      return NextResponse.json({ error: 'ไม่พบบทเรียนนี้' }, { status: 404 });
    }

    const answerKey = Array.isArray(lesson.answer) ? lesson.answer : [];
    // เติม -1 ให้ครบจำนวนข้อ เพื่อให้ index ของคำตอบตรงกับข้อเสมอแม้ client ส่งมาไม่ครบ
    const answer_user: number[] = answerKey.map((_, i) =>
      intOr(Array.isArray(body?.answer_user) ? body.answer_user[i] : NaN, -1)
    );

    const { score, total, status } = gradeLesson(
      answerKey,
      answer_user,
      quizBankIndices(lesson.questions)
    );

    /* ── ทดสอบก่อนเรียน: บอกแค่คะแนน ไม่แตะฐานข้อมูล ── */
    if (phase === 'pre') {
      return NextResponse.json({ success: true, phase, score, total });
    }

    /* ── ทดสอบหลังเรียน: บันทึกผล ── */
    const pre_score = intOr(body?.pre_score, -1);
    const pre_total = intOr(body?.pre_total, -1);
    // รับคะแนนก่อนเรียนเฉพาะที่อยู่ในช่วงที่เป็นไปได้ กัน client ส่งค่ามั่ว
    const hasPre = pre_score >= 0 && pre_total === total && pre_score <= total;

    const record: LessonUserRecord = {
      driver_id,
      lesson_id,
      answer_user,
      status,
      created_at: new Date().toISOString(),
      score,
      total,
      ...(hasPre ? { pre_score, pre_total } : {}),
    };

    // โหมดทดลองเรียน: ตรวจและสรุปผลให้ครบเหมือนของจริง แต่ไม่แตะฐานข้อมูล
    if (!isPreview) {
      await db.collection<LessonUserRecord>(COLLECTION_USER).insertOne(record);
    }

    return NextResponse.json(
      {
        success: true,
        phase,
        status,
        score,
        total,
        // ส่งเฉลยกลับหลังส่งคำตอบแล้วเท่านั้น เพื่อให้หน้าสรุปผลชี้ข้อที่ตอบผิดได้
        answer_key: answerKey,
        record,
        ...(isPreview ? { preview: true, saved: false } : {}),
      },
      { status: isPreview ? 200 : 201 }
    );
  } catch (error) {
    console.error('POST /api/lesson/submit error:', error);
    return NextResponse.json({ error: 'ไม่สามารถบันทึกคำตอบได้' }, { status: 500 });
  }
}
