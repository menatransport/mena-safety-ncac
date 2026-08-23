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

// PUT / DELETE สำหรับหน้า Master Data (proxy ไปยัง backend ตาม X-Api-Path)
//
// X-Api-Path มาจาก client ตรง ๆ ถ้าไม่จำกัดปลายทาง route นี้จะกลายเป็น
// open proxy ที่ยิง DELETE ไปตารางไหนก็ได้ (เช่น /accident-cases/1) จากเบราว์เซอร์
// จึงอนุญาตเฉพาะตาราง master data ที่หน้า /master-data ใช้จริงเท่านั้น
const MASTER_RESOURCES = [
  'sites',
  'departments',
  'clients',
  'locations',
  'vehicles',
  'masterdrivers',
  'driver_roles',
  'mastercauses',
] as const;

// อนุญาต "/resource", "/resource/" และ "/resource/{id}" เท่านั้น — กัน path traversal ไปในตัว
const ALLOWED_PATH = new RegExp(
  `^/(${MASTER_RESOURCES.join('|')})(/[A-Za-z0-9_-]*)?$`
);

const forward = async (request: Request, method: 'PUT' | 'DELETE') => {
  const apiPath = request.headers.get('x-api-path');

  if (!apiPath) {
    return NextResponse.json({ error: 'Missing X-Api-Path header' }, { status: 400 });
  }

  if (!ALLOWED_PATH.test(apiPath)) {
    console.error(`${method} blocked — path ไม่อยู่ใน allowlist: ${apiPath}`);
    return NextResponse.json(
      { error: 'ปลายทางนี้ไม่อนุญาตให้แก้ไขผ่าน /api/list' },
      { status: 403 }
    );
  }

  try {
    const body = method === 'PUT' ? await request.text() : undefined;

    const res = await fetch(`https://api-ncac.onrender.com${apiPath}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body } : {}),
    });

    const text = await res.text();

    if (!res.ok) {
      console.error(`${method} API Error Response:`, text);
      return NextResponse.json(
        { error: 'Failed to update data on external API', details: text },
        { status: res.status }
      );
    }

    try {
      return NextResponse.json(text ? JSON.parse(text) : { success: true });
    } catch {
      return NextResponse.json({ success: true, message: text });
    }
  } catch (error) {
    console.error(`Error in ${method} request:`, error);
    return NextResponse.json({
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
};

export async function PUT(request: Request) {
  return forward(request, 'PUT');
}

export async function DELETE(request: Request) {
  return forward(request, 'DELETE');
}
