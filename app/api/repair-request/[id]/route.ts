import { NextResponse } from 'next/server';

const API_BASE = process.env.mena_api_url;

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const res = await fetch(`${API_BASE}/repair-request/requests/${encodeURIComponent(id)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch repair request', detail: data },
                { status: res.status }
            );
        }
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('GET repair-request/[id] API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
