import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTION_ADMIN, COLLECTION_USER } from '@/lib/mongodb';
import { normalizeLessonPayload, stripAnswer, validateLesson } from '@/lib/lesson';
import type { Lesson, LessonUserRecord } from '@/app/lesson/type';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/lesson/{lesson_id}
 * ส่ง ?driver_id= เพื่อดึงในโหมด user (ตัดเฉลยออก + แนบผลการทำล่าสุด)
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const driverId = url.searchParams.get('driver_id')?.trim();
    const isPreview = url.searchParams.get('preview') === '1';

    const db = await getDb();
    const lesson = await db.collection<Lesson>(COLLECTION_ADMIN).findOne({ lesson_id: id });

    if (!lesson) {
      return NextResponse.json({ error: 'ไม่พบบทเรียนนี้' }, { status: 404 });
    }

    /* ── โหมดทดลองเรียนของผู้ดูแล ──
     * ตัดเฉลยออกเหมือนฝั่งผู้เรียนทุกประการ แต่ข้ามด่าน is_active
     * เพราะประโยชน์หลักของพรีวิวคือได้ตรวจงานก่อนเปิดใช้จริง
     * และไม่แนบผลการทำของใครกลับไป
     *
     * หมายเหตุด้านสิทธิ์: ตอนนี้ /api ของระบบนี้ยังไม่มีการตรวจสิทธิ์ฝั่ง server
     * เลยสักเส้นทางเดียว (ล็อกอินยิงไป API ภายนอกแล้วเก็บ token ไว้ที่ client)
     * เส้นทางนี้จึงเปิดเท่ากับเส้นทางอื่นทั้งหมด ผลที่ตามมาคือคนที่รู้รหัสบทเรียน
     * เปิดดูบทเรียนที่ยังปิดอยู่ได้ — ถ้าจะปิดช่องนี้ ควรทำเป็นงานแยกที่ใส่
     * การตรวจ token ให้ทุกเส้นทางพร้อมกัน ไม่ใช่ดักเฉพาะตรงนี้จุดเดียว
     */
    if (isPreview) {
      return NextResponse.json(
        { lesson: stripAnswer(lesson), attempt: null, preview: true },
        { status: 200 }
      );
    }

    if (!driverId) {
      return NextResponse.json({ lesson }, { status: 200 });
    }

    // ปิดสถานะแล้ว = คนขับเข้าถึงไม่ได้ ตอบเหมือนไม่มีบทเรียนนี้
    if (lesson.is_active === false) {
      return NextResponse.json({ error: 'ไม่พบบทเรียนนี้' }, { status: 404 });
    }

    const attempt = await db
      .collection<LessonUserRecord>(COLLECTION_USER)
      .findOne({ driver_id: driverId, lesson_id: id }, { sort: { created_at: -1 } });

    return NextResponse.json({ lesson: stripAnswer(lesson), attempt }, { status: 200 });
  } catch (error) {
    console.error('GET /api/lesson/[id] error:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลบทเรียนได้' }, { status: 500 });
  }
}

/** PUT /api/lesson/{lesson_id} — แก้ไขบทเรียน (admin) */
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const payload = normalizeLessonPayload(body);

    const invalid = validateLesson(payload);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const db = await getDb();
    const result = await db
      .collection<Lesson>(COLLECTION_ADMIN)
      .findOneAndUpdate(
        { lesson_id: id },
        { $set: { ...payload, updated_at: new Date().toISOString() } },
        { returnDocument: 'after' }
      );

    if (!result) {
      return NextResponse.json({ error: 'ไม่พบบทเรียนนี้' }, { status: 404 });
    }

    return NextResponse.json({ success: true, lesson: result }, { status: 200 });
  } catch (error) {
    console.error('PUT /api/lesson/[id] error:', error);
    return NextResponse.json({ error: 'ไม่สามารถแก้ไขบทเรียนได้' }, { status: 500 });
  }
}

/**
 * PATCH /api/lesson/{lesson_id} — เปิด/ปิดสถานะการใช้งานบทเรียน (admin)
 * body: { is_active: boolean }
 * ปิดแล้วคนขับจะไม่เห็นบทเรียนนี้ แต่ผลการเรียนเดิมยังอยู่ครบ
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (typeof body?.is_active !== 'boolean') {
      return NextResponse.json({ error: 'ต้องระบุสถานะ is_active เป็น true หรือ false' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db
      .collection<Lesson>(COLLECTION_ADMIN)
      .findOneAndUpdate(
        { lesson_id: id },
        { $set: { is_active: body.is_active, updated_at: new Date().toISOString() } },
        { returnDocument: 'after' }
      );

    if (!result) {
      return NextResponse.json({ error: 'ไม่พบบทเรียนนี้' }, { status: 404 });
    }

    return NextResponse.json({ success: true, lesson: result }, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/lesson/[id] error:', error);
    return NextResponse.json({ error: 'ไม่สามารถเปลี่ยนสถานะบทเรียนได้' }, { status: 500 });
  }
}
