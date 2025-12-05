import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const res = await fetch(process.env.nc_url!, {
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
    const docId = data.document_no;

    const res = await fetch(`${process.env.nc_url}/${docId}`, {
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
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let apiUrl = `${process.env.nc_url}/`;
    
    if (startDate && endDate) {
      apiUrl += `?start_date=${startDate}&end_date=${endDate}`;
    }
    
    console.log('APIURL NC:', apiUrl);
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

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET DB API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}