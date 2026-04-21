import { NextResponse } from 'next/server';

const API_BASE = process.env.api_url;

/** GET /api/task/ppe?status=xxx — List all PPE tests */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const url = new URL(`${API_BASE}/inspection/ppe/`);
        if (status) url.searchParams.set('status', status);

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to list PPE tests', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('GET list PPE API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
