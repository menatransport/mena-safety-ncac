import { NextResponse } from 'next/server';

const API_BASE = `${process.env.api_url}/inspection/task`;

export async function GET(request: Request) {
    try {
        const res = await fetch(API_BASE, {
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
        console.error('GET tasks API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: 'Failed to create task', detail: errData },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('POST task API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}