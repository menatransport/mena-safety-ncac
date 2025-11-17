import { NextResponse } from 'next/server';
///case-report-investigate/{document_no}
export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("POST request data:",data);
    const document_no = request.headers.get("document_no") || "";
    console.log("Document No from headers:", document_no);
    const res = await fetch(`https://api-ncac.onrender.com/case-report-investigate/${document_no}`, {
      method: 'POST',
      headers: {  
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    console.log("POST DB API response status:", res);
    return NextResponse.json(await res);
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
    const document_no = searchParams.get('document_no');

    const res = await fetch(`https://api-ncac.onrender.com/case-report-investigate/${document_no}`, {
      method: 'GET',
      headers: {  
        'Content-Type': 'application/json',
      }
    });
   if (!res.ok) {
      throw new Error(`API responded with status: ${res.status}`);
    }
    const data = await res.json();
    console.log('API response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET DB API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

