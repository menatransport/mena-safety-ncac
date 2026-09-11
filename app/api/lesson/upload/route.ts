import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';
// วิดีโอไฟล์ใหญ่ ใช้เวลาอัปโหลดนานกว่า default
export const maxDuration = 300;

const s3 = new S3Client({
  region: process.env.region,
  endpoint: process.env.endpoint,
  credentials: {
    accessKeyId: process.env.accessKeyId!,
    secretAccessKey: process.env.secretAccessKey!,
  },
});

/** bucket ปลายทาง — ตัวเดียวกับที่ /api/attachment ใช้ ไม่ต้องตั้งค่าใน env */
const BUCKET_NAME = 'mn-bucket';
const BASE_PATH = 'safety-lesson';

const KINDS = {
  logo: { folder: 'logo', prefix: 'image/', maxMb: 5, label: 'โลโก้' },
  video: { folder: 'video', prefix: 'video/', maxMb: 200, label: 'วิดีโอ' },
} as const;

type Kind = keyof typeof KINDS;

/**
 * URL สาธารณะของไฟล์บน S3 (DigitalOcean Spaces)
 * ใช้รูปแบบ virtual-hosted <bucket>.<region>.digitaloceanspaces.com/<key>
 * เพื่อให้ลิงก์ที่เก็บลง MongoDB เปิดตรงจากเบราว์เซอร์ได้เลย
 */
const publicUrl = (key: string) => {
  const base = (process.env.endpoint || '').replace(/\/$/, '');
  if (!base) return key;
  const host = base.replace(/^https?:\/\//, '');
  return `https://${BUCKET_NAME}.${host}/${key}`;
};

/** POST /api/lesson/upload — form-data: file, kind=logo|video, lesson_id */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const kind = String(formData.get('kind') ?? '') as Kind;
    const lessonId = String(formData.get('lesson_id') ?? 'draft').trim() || 'draft';

    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์ที่อัปโหลด' }, { status: 400 });
    }

    const spec = KINDS[kind];
    if (!spec) {
      return NextResponse.json({ error: 'kind ต้องเป็น logo หรือ video' }, { status: 400 });
    }

    if (!file.type.startsWith(spec.prefix)) {
      return NextResponse.json(
        { error: `ไฟล์${spec.label}ต้องเป็นชนิด ${spec.prefix}*` },
        { status: 400 }
      );
    }

    if (file.size > spec.maxMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `ไฟล์${spec.label}ต้องมีขนาดไม่เกิน ${spec.maxMb} MB` },
        { status: 400 }
      );
    }

    // ตัดอักขระที่ทำให้ key เพี้ยน และเติม timestamp กันชื่อชนกัน
    const safeName = file.name.replace(/[^\w.\-ก-๙]/g, '_');
    const key = `${BASE_PATH}/${spec.folder}/${lessonId}/${Date.now()}_${safeName}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
        // ต้องเป็น public-read เพราะ URL ถูกเก็บลง MongoDB แล้วให้คนขับเปิดตรง ๆ
        // จากมือถือ โดยไม่ผ่าน presigned URL ที่มีวันหมดอายุ
        ACL: 'public-read',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    return NextResponse.json({ success: true, key, url: publicUrl(key) }, { status: 200 });
  } catch (error) {
    console.error('POST /api/lesson/upload error:', error);
    return NextResponse.json({ error: 'อัปโหลดไฟล์ไม่สำเร็จ' }, { status: 500 });
  }
}

/** DELETE /api/lesson/upload — body: { key } */
export async function DELETE(req: NextRequest) {
  try {
    const { key } = await req.json();
    if (!key || typeof key !== 'string' || !key.startsWith(`${BASE_PATH}/`)) {
      return NextResponse.json({ error: 'key ไม่ถูกต้อง' }, { status: 400 });
    }

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/lesson/upload error:', error);
    return NextResponse.json({ error: 'ลบไฟล์ไม่สำเร็จ' }, { status: 500 });
  }
}
