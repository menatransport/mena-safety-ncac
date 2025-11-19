import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const res = await fetch(process.env.login_url!, {
      method: 'POST',
      headers: {  
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    

    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}