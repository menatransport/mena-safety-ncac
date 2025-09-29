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
    // แปลง URL และ extract query parameters
    const { searchParams } = new URL(request.url);
    
    // สร้าง query string จาก parameters ทั้งหมด
    const queryString = searchParams.toString();
    console.log('GET /api/document query params:', queryString);

    // เรียก API พร้อม query parameters
    const apiUrl = `https://api-ncac.onrender.com/case_reports${queryString ? `?${queryString}` : ''}`;
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
    
    // ถ้าผลลัพธ์เป็น array และมีข้อมูล ให้ return รายการแรก (สำหรับกรณี document_no)
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