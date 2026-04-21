import { NextResponse } from 'next/server';

const API_BASE = process.env.api_url;

/** GET /api/task/driver/{inspection_task_driver_id} — Get driver detail */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const res = await fetch(
            `${API_BASE}/inspection/driver/${encodeURIComponent(id)}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to get driver detail', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('GET driver detail API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/** PUT /api/task/driver/{inspection_task_driver_id} — Update driver */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const res = await fetch(
            `${API_BASE}/inspection/driver/${encodeURIComponent(id)}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to update driver', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('PUT driver API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/** DELETE /api/task/driver/{inspection_task_driver_id} — Delete driver */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const res = await fetch(
            `${API_BASE}/inspection/driver/${encodeURIComponent(id)}`,
            {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to delete driver' },
                { status: res.status }
            );
        }
        const data = await res.json().catch(() => ({ success: true }));
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('DELETE driver API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
