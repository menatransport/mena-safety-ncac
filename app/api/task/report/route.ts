import { NextResponse } from 'next/server';

const API_BASE = `${process.env.api_url}/inspection/report/driver-summary`;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskIds = searchParams.getAll('task_ids');

        if (taskIds.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        const params = new URLSearchParams();
        taskIds.forEach((id) => params.append('task_ids', id));

        const res = await fetch(`${API_BASE}?${params.toString()}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
            console.error(`Driver summary API responded with status: ${res.status}`);
            return NextResponse.json(
                { error: 'Failed to fetch driver summary' },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('GET driver summary error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
