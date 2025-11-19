import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const apiPath = request.headers.get("x-api-path"); 
  if (!apiPath) {
    return NextResponse.json({ error: "Missing X-Api-Path header" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api-ncac.onrender.com${apiPath}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const res = await fetch('https://api-ncac.onrender.com' + url, {
      method: 'GET',
      headers: {  
        'Content-Type': 'application/json',
      },
    });
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}   