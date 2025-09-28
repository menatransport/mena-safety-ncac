import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  console.log('Received register request:', { email, password });
  const res = await fetch('https://api-ncac.onrender.com/auth/register', {
    method: 'POST',
    headers: {  
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  return NextResponse.json(await res.json());
}   