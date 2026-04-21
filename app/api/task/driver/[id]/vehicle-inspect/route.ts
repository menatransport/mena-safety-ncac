import { NextResponse } from 'next/server';

const API_BASE = process.env.api_url;

/** POST /api/task/driver/{inspection_task_driver_id}/vehicle-inspect — Create vehicle inspection */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        // console.log('Creating vehicle inspection with data:', body);
        const res = await fetch(
            `${API_BASE}/inspection/vehicle-inspect/${encodeURIComponent(id)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to create vehicle inspection', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('POST vehicle-inspect API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/** GET /api/task/driver/{inspection_task_driver_id}/vehicle-inspect — Get vehicle inspection */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const res = await fetch(
            `${API_BASE}/inspection/vehicle-inspect/${encodeURIComponent(id)}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to get vehicle inspection', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('GET vehicle-inspect API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/** PUT /api/task/driver/{inspection_task_driver_id}/vehicle-inspect — Update vehicle inspection */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        // console.log('Updating vehicle inspection with data:', JSON.stringify(body));
        const res = await fetch(
            `${API_BASE}/inspection/vehicle-inspect/${encodeURIComponent(id)}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        );
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to update vehicle inspection', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('PUT vehicle-inspect API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/** DELETE /api/task/driver/{inspection_task_driver_id}/vehicle-inspect — Delete vehicle inspection */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const res = await fetch(
            `${API_BASE}/inspection/vehicle-inspect/${encodeURIComponent(id)}`,
            {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to delete vehicle inspection' },
                { status: res.status }
            );
        }
        const data = await res.json().catch(() => ({ success: true }));
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('DELETE vehicle-inspect API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
