import { NextResponse } from 'next/server';

const API_BASE = process.env.api_url;

/** POST /api/task/driver/{inspection_task_driver_id}/drug-test — Add drug test */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const res = await fetch(
            `${API_BASE}/inspection/drug-test/${encodeURIComponent(id)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to add drug test', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('POST drug-test API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/** PUT /api/task/driver/{inspection_task_driver_id}/drug-test — Update drug test */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const res = await fetch(
            `${API_BASE}/inspection/drug-test/${encodeURIComponent(id)}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to update drug test', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('PUT drug-test API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/** GET /api/task/driver/{inspection_task_driver_id}/drug-test — Get drug test */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const res = await fetch(
            `${API_BASE}/inspection/drug-test/${encodeURIComponent(id)}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to get drug test', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('GET drug-test API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
