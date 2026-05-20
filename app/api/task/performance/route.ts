import { NextResponse } from 'next/server';

const API_BASE = `${process.env.api_url}/inspection/performance`;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const trainer_id = searchParams.get('trainer_id');
    try {
        const res = await fetch(`${API_BASE}/${trainer_id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
            console.log(`API responded with status: ${res.status}`);
            return NextResponse.json(
                { error: 'Failed to fetch data from external API' },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('GET performance API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}