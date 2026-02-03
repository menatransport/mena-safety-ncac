import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const reqBody = await request.json();
    const isGoogleLogin = 'id_token' in reqBody;
    const endpoint = isGoogleLogin 
        ? "https://api-ncac.onrender.com/auth/login/google"
        : "https://api-ncac.onrender.com/auth/login";

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {  
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
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