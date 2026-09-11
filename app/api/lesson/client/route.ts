import { NextResponse } from 'next/server';
import { listClients } from '@/lib/lessonDrivers';

export const dynamic = 'force-dynamic';

/** GET /api/lesson/client — รายชื่อลูกค้าทั้งหมด สำหรับ dropdown ในฟอร์ม admin */
export async function GET() {
  try {
    return NextResponse.json({ clients: await listClients() }, { status: 200 });
  } catch (error) {
    console.error('GET /api/lesson/client error:', error);
    // ฟอร์มยังพิมพ์ชื่อลูกค้าเองได้ จึงคืน list ว่างแทนการ error
    return NextResponse.json({ clients: [], degraded: true }, { status: 200 });
  }
}
