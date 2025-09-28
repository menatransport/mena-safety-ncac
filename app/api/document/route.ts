import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Received data in POST /api/document Body:', data);

    const res = await fetch('https://api-ncac.onrender.com/case_reports', {
      method: 'POST',
      headers: {  
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    

    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('POST DB API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Build query parameters
    const params = new URLSearchParams();
    
    // Add all search parameters to the API call
    searchParams.forEach((value, key) => {
      if (value) {
        params.append(key, value);
      }
    });

    console.log('GET /api/document params:', params.toString());

    const res = await fetch(`https://api-ncac.onrender.com/case_reports?${params.toString()}`, {
      method: 'GET',
      headers: {  
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`API responded with status: ${res.status}`);
    }

    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('GET DB API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}