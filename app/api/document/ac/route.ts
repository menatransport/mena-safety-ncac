import { NextResponse } from 'next/server';

/** base URL ที่มี "/" ท้าย จะทำให้ path กลายเป็น "//" แล้ว FastAPI ตอบ 404 Not Found */
const acUrl = (suffix = '') => {
  const base = (process.env.ac_url || '').replace(/\/+$/, '');
  return suffix ? `${base}/${suffix}` : base;
};

/** ข้อความจริงจาก FastAPI (`detail`) ต้องถึงหน้าจอ ไม่งั้นทุกความผิดพลาดจะกลายเป็น 500 ลอย ๆ */
const errorMessage = (data: any, fallback: string): string => {
  const detail = data?.detail ?? data?.error;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  return JSON.stringify(detail);
};

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const res = await fetch(acUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await res.json().catch(() => null);

    if (!res.ok) {
      console.log(`API responded with status: ${res.status}`);
      return NextResponse.json(
        { message: errorMessage(responseData, 'บันทึกข้อมูลไม่สำเร็จ') },
        { status: res.status }
      );
    }

    return NextResponse.json(responseData);
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
    const docId = data.document_no_ac;
    // console.log('Updating data:', data);
    const res = await fetch(acUrl(encodeURIComponent(docId)), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await res.json().catch(() => null);

    if (!res.ok) {
      console.log(`API responded with status: ${res.status}`);
      return NextResponse.json(
        { message: errorMessage(responseData, 'อัปเดตข้อมูลไม่สำเร็จ') },
        { status: res.status }
      );
    }

    return NextResponse.json(responseData);
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
    const docid = searchParams.get('case_id');
    const apiUrl = acUrl(encodeURIComponent(docid || ''));

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
