import type { Lesson, LessonQuestion, LessonUserRecord } from '@/app/lesson/type';
import { DEFAULT_LESSON_LOGO, PASS_RATIO } from '@/app/lesson/type';

/** ลบเฉลยออกก่อนส่งให้ฝั่ง user — กันเปิด devtools แล้วเห็นคำตอบ */
export const stripAnswer = <T extends { answer?: unknown }>(lesson: T): Omit<T, 'answer'> => {
  const { answer: _answer, ...rest } = lesson;
  return rest;
};

/* =============================================================================
 * คลังข้อสอบก่อน/หลังเรียน
 * -----------------------------------------------------------------------------
 * คลังข้อสอบ = คำถามทั้งหมดใน questions[] เสมอ ไม่ว่าจะมี time_sec หรือไม่
 * time_sec ใช้แค่กำหนดว่าข้อนั้น "แทรก popup ระหว่างดูวิดีโอด้วย" เป็นตัวช่วย
 * กระตุ้นความสนใจ (ตอบระหว่างวิดีโอไม่ใช่การส่งคำตอบที่ถูกตรวจ) แต่ตัวข้อเองยังคง
 * อยู่ในแบบทดสอบก่อนเรียนและหลังเรียนเหมือนข้ออื่น ๆ ทุกประการ
 * =========================================================================== */

/** index ของข้อในคลังข้อสอบก่อน/หลังเรียน (เรียงตามลำดับเดิมใน questions) */
export const quizBankIndices = (questions: LessonQuestion[] = []): number[] =>
  questions.map((_, i) => i);

/** สลับลำดับแบบ Fisher–Yates บนสำเนา — ไม่แตะอาร์เรย์ต้นทาง */
export const shuffle = <T>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * ตรวจคำตอบ คืนคะแนนและสถานะผ่าน/ไม่ผ่าน
 * ส่ง scoredIndices มาเมื่อคิดคะแนนเฉพาะบางข้อ ไม่ส่ง = คิดทุกข้อ
 */
export const gradeLesson = (
  answerKey: number[],
  answerUser: number[],
  scoredIndices?: number[]
): { score: number; total: number; status: LessonUserRecord['status'] } => {
  const scored = scoredIndices ?? answerKey.map((_, i) => i);
  const total = scored.length;
  const score = scored.reduce(
    (acc, i) => (answerUser[i] === answerKey[i] ? acc + 1 : acc),
    0
  );
  // บทเรียนที่ไม่มีคำถาม ถือว่าผ่านทันทีเมื่อกดยืนยันว่าดูวิดีโอจบ
  const passed = total === 0 ? true : score / total >= PASS_RATIO;
  return { score, total, status: passed ? 'ผ่าน' : 'ไม่ผ่าน' };
};

/** สร้าง lesson_id ถัดไปในรูปแบบ ST-LESSON-001 */
export const nextLessonId = (existingIds: string[]): string => {
  const max = existingIds.reduce((acc, id) => {
    const n = Number(/^ST-LESSON-(\d+)$/.exec(id ?? '')?.[1]);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `ST-LESSON-${String(max + 1).padStart(3, '0')}`;
};

/** normalize payload จากฟอร์ม admin ให้ตรง schema ก่อนเขียนลง MongoDB */
export const normalizeLessonPayload = (body: Partial<Lesson>) => {
  const questions: LessonQuestion[] = Array.isArray(body.questions)
    ? body.questions
        .filter((q) => q && typeof q.question === 'string' && q.question.trim() !== '')
        .map((q) => {
          const seconds = Number(q.time_sec);
          return {
            question: String(q.question).trim(),
            choices: (Array.isArray(q.choices) ? q.choices : [])
              .map((c) => String(c ?? '').trim())
              .filter((c) => c !== ''),
            // เก็บเฉพาะเวลาที่เป็นตัวเลขไม่ติดลบ นอกนั้นถือว่าไม่ได้ระบุ
            ...(Number.isFinite(seconds) && seconds >= 0
              ? { time_sec: Math.floor(seconds) }
              : {}),
          };
        })
    : [];

  const answer: number[] = questions.map((q, i) => {
    const raw = Number(Array.isArray(body.answer) ? body.answer[i] : NaN);
    // ถ้า index เฉลยหลุดขอบตัวเลือก ให้ fallback เป็นข้อแรกแทนการเก็บค่าพัง
    return Number.isInteger(raw) && raw >= 0 && raw < q.choices.length ? raw : 0;
  });

  return {
    title: String(body.title ?? '').trim(),
    description: String(body.description ?? '').trim(),
    // โลโก้เป็น optional — ไม่กรอกก็เก็บรูปสำรองไว้ให้เลย
    logo: String(body.logo ?? '').trim() || DEFAULT_LESSON_LOGO,
    client_name: Array.isArray(body.client_name)
      ? body.client_name.map((c) => String(c).trim()).filter(Boolean)
      : [],
    questions,
    answer,
    due_date: String(body.due_date ?? '').trim(),
    video: String(body.video ?? '').trim(),
  };
};

/** ตรวจความถูกต้องขั้นต่ำของบทเรียน คืน error message หรือ null ถ้าผ่าน */
export const validateLesson = (
  lesson: ReturnType<typeof normalizeLessonPayload>
): string | null => {
  if (!lesson.title) return 'กรุณากรอกชื่อบทเรียน';
  if (!lesson.due_date) return 'กรุณาระบุกำหนดส่ง';
  if (Number.isNaN(new Date(lesson.due_date).getTime())) return 'รูปแบบกำหนดส่งไม่ถูกต้อง';
  const bad = lesson.questions.findIndex((q) => q.choices.length < 2);
  if (bad !== -1) return `คำถามข้อที่ ${bad + 1} ต้องมีตัวเลือกอย่างน้อย 2 ข้อ`;
  return null;
};
