import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
  const body = await request.json();
  const res = await fetch(process.env.register_url!, {
    method: 'POST',
    headers: {  
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return NextResponse.json({ error: 'Registration failed' }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}   