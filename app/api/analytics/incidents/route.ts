import { NextResponse } from 'next/server';

/**
 * Proxy ไปยัง read-model /analytics/incidents/overview ของ NCAC API
 *
 * ปล่อย query string ผ่านทั้งชุด (รวม param ที่ซ้ำกันได้อย่าง site_id / priority)
 * เพื่อให้ฝั่ง FastAPI เป็นเจ้าของสัญญา parameter เพียงที่เดียว — ที่นี่ทำหน้าที่
 * แค่ปิดบัง base URL ไม่ให้หลุดไป browser เท่านั้น
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const base = process.env.api_url;

    if (!base) {
      return NextResponse.json(
        { error: 'ยังไม่ได้ตั้งค่า api_url ใน environment' },
        { status: 500 }
      );
    }

    const qs = searchParams.toString();
    const url = `${base}/analytics/incidents/overview${qs ? `?${qs}` : ''}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { error: body?.detail ?? `API responded with status ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(body);
  } catch (error) {
    console.error('GET /api/analytics/incidents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
