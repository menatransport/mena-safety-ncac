import { NextResponse } from 'next/server';

const API_BASE = process.env.api_url;

/** PATCH /api/task/driver/{inspection_task_driver_id}/status?status=xxx — Update driver status */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        if (!status) {
            return NextResponse.json(
                { error: 'Missing required query parameter: status' },
                { status: 400 }
            );
        }

        const res = await fetch(
            `${API_BASE}/inspection/driver/${encodeURIComponent(id)}/status?status=${encodeURIComponent(status)}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to update driver status', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json().catch(() => ({ success: true }));
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('PATCH driver status API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
