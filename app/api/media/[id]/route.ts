import { NextResponse } from 'next/server';

const MEDIA_API_BASE = process.env.media_api_url || 'https://presign-api-548129382487.asia-southeast1.run.app';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        if (!userId) {
            return NextResponse.json({ error: 'user_id จำเป็น' }, { status: 400 });
        }

        const res = await fetch(`${MEDIA_API_BASE}/media/${id}`, {
            method: 'DELETE',
            headers: { 'X-User-Id': userId },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json({ error: 'ลบรูปล้มเหลว', detail: data }, { status: res.status });
        }
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('DELETE /api/media/[id] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
