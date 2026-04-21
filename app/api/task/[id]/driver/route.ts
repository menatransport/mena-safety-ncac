import { NextResponse } from 'next/server';

const API_BASE = process.env.api_url;

/** POST /api/task/{inspection_task_id}/driver — Add driver to task */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        console.log("url : ", `${API_BASE}/inspection/driver/${encodeURIComponent(id)}`);
        console.log("request body : ", body);
        const res = await fetch(
            `${API_BASE}/inspection/driver/${encodeURIComponent(id)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to add driver', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('POST add driver API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/** DELETE /api/task/{inspection_task_id}/driver — Remove driver from task */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const driverId = body.inspection_task_driver_id;
        if (!driverId) {
            return NextResponse.json({ error: 'Missing inspection_task_driver_id' }, { status: 400 });
        }
        const res = await fetch(
            `${API_BASE}/inspection/driver/${encodeURIComponent(driverId)}`,
            {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to delete driver', detail: errData },
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
