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
    const header = request.headers.get("x-api-path");
    
    if (!header) {
      return NextResponse.json({ error: "Missing X-Api-Path header" }, { status: 400 });
    }

    console.log("header:", header);
    console.log("body:", body);
    
    const res = await fetch('https://api-ncac.onrender.com' + header, {
      method: 'POST',
      headers: {  
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      console.log(`API responded with status: ${res.status}`);
      const errorData = await res.text();
      console.error('API Error Response:', errorData);
      return NextResponse.json(
        { error: 'Failed to post data to external API', details: errorData },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json({ 
      error: 'Failed to process request', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}   