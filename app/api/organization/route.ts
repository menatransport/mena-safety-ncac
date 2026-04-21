import { NextResponse } from 'next/server';

export async function GET (request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const res = await fetch(`${process.env.api_url}/users?${searchParams.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
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
        console.error('GET DB API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}