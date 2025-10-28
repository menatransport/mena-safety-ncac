import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Received data in POST /api/document Body:', data);

    const res = await fetch('https://api-ncac.onrender.com/accident-cases', {
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

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    console.log('Received data in PUT /api/document Body:', data);
    const docId = data.document_no_ac;

    const res = await fetch(`https://api-ncac.onrender.com/accident-cases/${docId}`, {
      method: 'PUT',
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
    
    const queryString = searchParams.toString();

    const apiUrl = `https://api-ncac.onrender.com/accident-cases${queryString ? `?${queryString}` : ''}`;
    console.log('API URL:', apiUrl);

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {  
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`API responded with status: ${res.status}`);
    }

    const data = await res.json();
    console.log('API response data:', data);

    if (Array.isArray(data) && data.length > 0 && searchParams.get('document_no')) {
      return NextResponse.json(data[0]);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET DB API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
