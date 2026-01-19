import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const res = await fetch(process.env.ac_url!, {
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

    const res = await fetch(`${process.env.ac_url}/${docId}`, {
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
    const caseStatus = searchParams.getAll('casestatus');

    let apiUrl = `${process.env.ac_url}/`;
    
    if (startDate && endDate) {
      apiUrl += `?start_date=${startDate}&end_date=${endDate}`;
      caseStatus.forEach(status => {
        apiUrl += `&casestatus=${encodeURIComponent(status)}`;
      });
    }
    
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
    // console.log('API response data:', data);

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
