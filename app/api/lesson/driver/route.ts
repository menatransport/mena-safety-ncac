import { NextRequest, NextResponse } from 'next/server';
import type { DriverProfile } from '@/app/lesson/type';
import { clientOf, loadDrivers } from '@/lib/lessonDrivers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lesson/driver?driver_id=680106
 * ยืนยันตัวตนคนขับจาก master data และคืน client_name เพื่อใช้กรองบทเรียน
 */
export async function GET(req: NextRequest) {
  const driverId = new URL(req.url).searchParams.get('driver_id')?.trim();

  if (!driverId) {
    return NextResponse.json({ error: 'กรุณาระบุรหัสพนักงาน' }, { status: 400 });
  }

  try {
    const rows = await loadDrivers();
    const found = rows.find(
      (d) => String(d.driver_id ?? '').trim().toLowerCase() === driverId.toLowerCase()
    );

    if (!found) {
      return NextResponse.json({ error: 'ไม่พบรหัสพนักงานนี้ในระบบ' }, { status: 404 });
    }

    const driver: DriverProfile = {
      driver_id: String(found.driver_id),
      first_name: found.first_name ?? '',
      last_name: found.last_name ?? '',
      client_name: clientOf(found),
      plant_name: found.plant_name ?? '',
      number_plate: found.number_plate ?? '',
    };

    return NextResponse.json({ driver }, { status: 200 });
  } catch (error) {
    console.error('GET /api/lesson/driver error:', error);
    // ต้นทาง master data ล่มไม่ควรทำให้คนขับเข้าเรียนไม่ได้ จึงปล่อยผ่านแบบไม่มีลูกค้า
    return NextResponse.json(
      {
        driver: {
          driver_id: driverId,
          first_name: '',
          last_name: '',
          client_name: '',
        } as DriverProfile,
        degraded: true,
      },
      { status: 200 }
    );
  }
}
