import { NextResponse } from 'next/server';

/** Proxy ไปยัง read-model /analytics/incidents/cases — รายการเคสสำหรับ drill-down dialog */
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
    const url = `${base}/analytics/incidents/cases${qs ? `?${qs}` : ''}`;

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
    console.error('GET /api/analytics/incidents/cases error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
