import { NextResponse } from 'next/server';

/** ตัวเลือก dropdown ของหน้า Dashboard (ศูนย์ปฏิบัติการ / ลูกค้า / ระดับความรุนแรง) */
export async function GET() {
  try {
    const base = process.env.api_url;
    if (!base) {
      return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า api_url ใน environment' }, { status: 500 });
    }

    const res = await fetch(`${base}/analytics/incidents/filters`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // master data เปลี่ยนน้อยมาก — cache ฝั่ง server ไว้ 5 นาทีเพื่อลดภาระ
      // connection pool ของ API ที่มีแค่ 5 ต่อ instance
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `API responded with status ${res.status}` }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('GET /api/analytics/incidents/filters error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
