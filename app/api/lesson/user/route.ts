import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTION_ADMIN, COLLECTION_USER } from '@/lib/mongodb';
import type { Lesson, LessonUserRecord } from '@/app/lesson/type';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lesson/user — รายการผลการเรียนทั้งหมด (แท็บ User Management ของ admin)
 * query: driver_id, lesson_id, status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter: Record<string, unknown> = {};

    const driverId = searchParams.get('driver_id')?.trim();
    const lessonId = searchParams.get('lesson_id')?.trim();
    const status = searchParams.get('status')?.trim();

    if (driverId) filter.driver_id = driverId;
    if (lessonId) filter.lesson_id = lessonId;
    if (status === 'ผ่าน' || status === 'ไม่ผ่าน') filter.status = status;

    const db = await getDb();
    const records = await db
      .collection<LessonUserRecord>(COLLECTION_USER)
      .find(filter)
      .sort({ created_at: -1 })
      .limit(2000)
      .toArray();

    // แนบชื่อบทเรียนให้ตารางอ่านง่าย โดยไม่ต้องยิง API ซ้ำจากฝั่ง client
    const lessons = await db
      .collection<Lesson>(COLLECTION_ADMIN)
      .find({}, { projection: { lesson_id: 1, title: 1 } })
      .toArray();
    const titleOf = new Map(lessons.map((l) => [l.lesson_id, l.title]));

    return NextResponse.json(
      {
        records: records.map((r) => ({ ...r, lesson_title: titleOf.get(r.lesson_id) ?? '-' })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/lesson/user error:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลผู้เรียนได้' }, { status: 500 });
  }
}

/** DELETE /api/lesson/user?id={_id} — ลบผลการทำ 1 รายการ (admin) */
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ error: 'ต้องระบุ id' }, { status: 400 });
    }

    const { ObjectId } = await import('mongodb');
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'id ไม่ถูกต้อง' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection(COLLECTION_USER).deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'ไม่พบรายการนี้' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/lesson/user error:', error);
    return NextResponse.json({ error: 'ไม่สามารถลบรายการได้' }, { status: 500 });
  }
}
