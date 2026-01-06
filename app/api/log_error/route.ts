import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const body = await request.json();

    if (!process.env.log_error_url) return NextResponse.json({ error: 'Log error URL not configured' }, { status: 500 });

    const res = await fetch(process.env.log_error_url, {
      method: 'POST',
      headers: {  
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ message: 'Error logged successfully' }, { status: 200 });
}