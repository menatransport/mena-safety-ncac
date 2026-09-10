import { NextResponse } from 'next/server';

const API_BASE = process.env.mena_api_url;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const qs = new URLSearchParams();
        const truckplate = searchParams.get('truckplate');
        if (truckplate) qs.set('truckplate', truckplate);
        qs.set('limit', searchParams.get('limit') ?? '50');
        qs.set('offset', searchParams.get('offset') ?? '0');

        const res = await fetch(`${API_BASE}/repair-request/requests?${qs.toString()}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch repair requests', detail: data },
                { status: res.status }
            );
        }
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('GET repair-request API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const res = await fetch(`${API_BASE}/repair-request/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to create repair request', detail: data },
                { status: res.status }
            );
        }
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('POST repair-request API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
