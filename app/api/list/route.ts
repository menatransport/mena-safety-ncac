import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const apiPath = request.headers.get("x-api-path"); // ดึงค่า header

  if (!apiPath) {
    return NextResponse.json({ error: "Missing X-Api-Path header" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api-ncac.onrender.com${apiPath}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const text = await res.text(); // กันกรณี upstream ไม่ส่ง JSON
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream API failed", detail: text }, { status: res.status });
    }

    // พยายาม parse เป็น JSON ถ้าไม่สำเร็จส่งเป็น string
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ data: text });
    }
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Error", detail: err.message }, { status: 500 });
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