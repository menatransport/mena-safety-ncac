import { NextResponse } from 'next/server';
///case-report-investigate/{document_no}
export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    // console.log("POST request data:",requestData);
    const document_no = request.headers.get("document_no") || "";
    // console.log("Document No from headers:", document_no);
    const res = await fetch(`${process.env.nc_investigation_url}/${document_no}`, {
      method: 'POST',
      headers: {  
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });


    if(!res.ok){
      console.log(`API responded with status: ${res.status}`);
      return NextResponse.json(
        { error: 'Failed to post data to external API' },
        { status: res.status }
      );
    } 
    const data = await res.json();
    
    return NextResponse.json(data, { status: 200 });
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
    const requestData = await request.json();
    // console.log("PUT request data:",requestData);
    const document_no = request.headers.get("document_no") || "";
    // console.log("Document No from headers:", document_no);
    const res = await fetch(`${process.env.nc_investigation_url}/${document_no}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    const data = await res.json();
    // console.log('API response data:', data);
    if (!res.ok) {
      console.log(`API responded with status: ${res.status}`);
      return NextResponse.json(
        { error: 'Failed to update data to external API' },
        { status: res.status }
      );
    } 
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('PUT DB API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const document_no = searchParams.get('document_no');

    const res = await fetch(`${process.env.nc_investigation_url}/${document_no}`, {
      method: 'GET',
      headers: {  
        'Content-Type': 'application/json',
      }
    });
   if (!res.ok) {
      console.log(`API responded with status: ${res.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch data from external API' },
        { status: res.status }
      );
    }
    const data = await res.json();
    //  console.log('API response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET DB API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

