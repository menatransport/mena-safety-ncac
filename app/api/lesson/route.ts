import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTION_ADMIN, COLLECTION_USER } from '@/lib/mongodb';
import { nextLessonId, normalizeLessonPayload, stripAnswer, validateLesson } from '@/lib/lesson';
import { normalizeClient } from '@/lib/lessonDrivers';
import type { Lesson, LessonUserRecord } from '@/app/lesson/type';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lesson
 *  - ไม่ส่ง query → คืนบทเรียนทั้งหมด (ใช้ในหน้า admin, มีเฉลย)
 *  - ส่ง ?driver_id=&client_name= → คืนเฉพาะบทเรียนของลูกค้านั้น พร้อมสถานะการทำของคนขับ (ไม่มีเฉลย)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get('driver_id')?.trim();
    const clientName = normalizeClient(searchParams.get('client_name'));

    const db = await getDb();
    const lessons = await db
      .collection<Lesson>(COLLECTION_ADMIN)
      .find({})
      .sort({ due_date: 1 })
      .toArray();

    // โหมด admin — คืนทุกอย่างรวมเฉลย
    if (!driverId) {
      return NextResponse.json({ lessons }, { status: 200 });
    }

    // โหมด user — กรองตามลูกค้าที่คนขับสังกัด (client_name ว่าง = บทเรียนสำหรับทุกคน)
    // เทียบแบบ normalize เพราะชื่อลูกค้าจากต้นทางมี non-breaking space ปนอยู่
    const visible = lessons.filter((l) => {
      // บทเรียนที่ถูกปิดสถานะไว้ ไม่ต้องแสดงให้คนขับเห็น
      if (l.is_active === false) return false;
      if (!Array.isArray(l.client_name) || l.client_name.length === 0) return true;
      if (!clientName) return false;
      return l.client_name.some((c) => normalizeClient(c) === clientName);
    });

    const attempts = await db
      .collection<LessonUserRecord>(COLLECTION_USER)
      .find({ driver_id: driverId })
      .sort({ created_at: -1 })
      .toArray();

    // เก็บเฉพาะครั้งล่าสุดของแต่ละบทเรียน (เรียง created_at desc มาแล้ว)
    const latest = new Map<string, LessonUserRecord>();
    for (const a of attempts) {
      if (!latest.has(a.lesson_id)) latest.set(a.lesson_id, a);
    }

    const now = Date.now();
    const withProgress = visible.map((l) => {
      const attempt = latest.get(l.lesson_id) ?? null;
      const due = new Date(l.due_date).getTime();
      return {
        ...stripAnswer(l),
        attempt,
        is_overdue: Number.isFinite(due) && due < now && attempt?.status !== 'ผ่าน',
      };
    });

    const passed = withProgress.filter((l) => l.attempt?.status === 'ผ่าน').length;

    return NextResponse.json(
      {
        lessons: withProgress,
        summary: {
          total: withProgress.length,
          passed,
          pending: withProgress.length - passed,
          percent: withProgress.length === 0 ? 0 : Math.round((passed / withProgress.length) * 100),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/lesson error:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลบทเรียนได้' }, { status: 500 });
  }
}

/** POST /api/lesson — สร้างบทเรียนใหม่ (admin) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = normalizeLessonPayload(body);

    const invalid = validateLesson(payload);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection<Lesson>(COLLECTION_ADMIN);

    const existing = await col.find({}, { projection: { lesson_id: 1 } }).toArray();
    const lesson_id = String(body.lesson_id ?? '').trim() || nextLessonId(existing.map((l) => l.lesson_id));

    if (await col.findOne({ lesson_id })) {
      return NextResponse.json({ error: `มีบทเรียนรหัส ${lesson_id} อยู่แล้ว` }, { status: 409 });
    }

    const now = new Date().toISOString();
    // บทเรียนใหม่เปิดใช้งานทันที ปิดภายหลังได้จากตารางหน้า admin
    const doc = { lesson_id, ...payload, is_active: true, created_at: now, updated_at: now } as Lesson;
    await col.insertOne(doc);

    return NextResponse.json({ success: true, lesson: doc }, { status: 201 });
  } catch (error) {
    console.error('POST /api/lesson error:', error);
    return NextResponse.json({ error: 'ไม่สามารถสร้างบทเรียนได้' }, { status: 500 });
  }
}
