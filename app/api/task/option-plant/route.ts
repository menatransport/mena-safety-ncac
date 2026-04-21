import { NextResponse } from 'next/server';

const API_URL = `${process.env.api_url}/masterdrivers/option_plant`;

export async function GET() {
    try {
        const res = await fetch(API_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch option_plant data' },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('GET option_plant API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
