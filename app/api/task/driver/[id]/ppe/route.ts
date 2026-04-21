import { NextResponse } from 'next/server';

const API_BASE = process.env.api_url;

/** POST /api/task/driver/{inspection_task_driver_id}/ppe — Add PPE test */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const res = await fetch(
            `${API_BASE}/inspection/ppe/${encodeURIComponent(id)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to add PPE test', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('POST PPE API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/** PUT /api/task/driver/{inspection_task_driver_id}/ppe — Update PPE test */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const res = await fetch(
            `${API_BASE}/inspection/ppe/${encodeURIComponent(id)}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to update PPE test', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('PUT PPE API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/** GET /api/task/driver/{inspection_task_driver_id}/ppe — Get PPE test */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const res = await fetch(
            `${API_BASE}/inspection/ppe/${encodeURIComponent(id)}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to get PPE test', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('GET PPE API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
