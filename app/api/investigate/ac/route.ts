import { NextResponse } from 'next/server';
/// backend: /accident-case-investigate/{document_no_ac}

/**
 * ตัด "/" ท้าย base URL ออกก่อนต่อ path เสมอ
 *
 * ถ้า ENV ตั้งมาเป็น ".../accident-case-investigate/" การต่อ path ตรง ๆ จะได้
 * ".../accident-case-investigate//AC-XX-0001" ซึ่ง FastAPI ไม่ match route ใด
 * แล้วตอบ 404 {"detail":"Not Found"} — หน้าตาเหมือน "ยังไม่เคยสอบสวน" เป๊ะ
 * ทำให้ทั้งฟอร์มดูปกติแต่บันทึกไม่เคยเข้าเลย
 */
const target = (document_no: string) => {
  const base = (process.env.ac_investigation_url || '').replace(/\/+$/, '');
  return `${base}/${encodeURIComponent(document_no)}`;
};

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const document_no = request.headers.get("document_no") || "";

    const res = await fetch(target(document_no), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.log(`API responded with status: ${res.status}`);
      return NextResponse.json(
        { error: data?.detail || 'Failed to post data to external API' },
        { status: res.status }
      );
    }

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
    const document_no = request.headers.get("document_no") || "";

    const res = await fetch(target(document_no), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.log(`API responded with status: ${res.status}`);
      return NextResponse.json(
        { error: data?.detail || 'Failed to update data to external API' },
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
    const document_no = searchParams.get('document_no') || "";

    const res = await fetch(target(document_no), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 404 = ยังไม่เคยสอบสวนเอกสารนี้ ไม่ใช่ความผิดพลาดของระบบ
    if (res.status === 404) {
      return NextResponse.json(null, { status: 404 });
    }

    if (!res.ok) {
      console.log(`API responded with status: ${res.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch data from external API' },
        { status: res.status }
      );
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const document_no =
      request.headers.get("document_no") || searchParams.get('document_no') || "";

    const res = await fetch(target(document_no), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.log(`API responded with status: ${res.status}`);
      return NextResponse.json(
        { error: 'Failed to delete data from external API' },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE DB API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
