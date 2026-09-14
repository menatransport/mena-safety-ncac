import { NextResponse } from 'next/server';

// Media API (presign-api) — เดียวกับที่ mena-go-lb ใช้ (presign → PUT S3 → complete)
const MEDIA_API_BASE = process.env.media_api_url || 'https://presign-api-548129382487.asia-southeast1.run.app';

export async function POST(request: Request) {
    try {
        const { filename, content_type, file_size, user_id, batch_id, source_type } = await request.json();
        if (!user_id) {
            return NextResponse.json({ error: 'user_id จำเป็น' }, { status: 400 });
        }

        const res = await fetch(`${MEDIA_API_BASE}/media/presign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': String(user_id),
            },
            body: JSON.stringify({
                filename,
                content_type,
                file_size,
                ...(batch_id ? { batch_id } : {}),
                ...(source_type ? { source_type } : {}),
            }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json({ error: 'presign ล้มเหลว', detail: data }, { status: res.status });
        }
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('POST /api/media/presign error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
