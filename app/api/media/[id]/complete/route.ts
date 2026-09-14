import { NextResponse } from 'next/server';

const MEDIA_API_BASE = process.env.media_api_url || 'https://presign-api-548129382487.asia-southeast1.run.app';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { user_id } = await request.json().catch(() => ({}));
        if (!user_id) {
            return NextResponse.json({ error: 'user_id จำเป็น' }, { status: 400 });
        }

        const res = await fetch(`${MEDIA_API_BASE}/media/${id}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': String(user_id),
            },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json({ error: 'complete ล้มเหลว', detail: data }, { status: res.status });
        }
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('POST /api/media/[id]/complete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
