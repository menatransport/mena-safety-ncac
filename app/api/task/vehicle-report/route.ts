import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const API_BASE = process.env.api_url;
const BUCKET_NAME = 'mn-bucket';
const BASE_PATH = 'trainer-app';

const s3 = new S3Client({
    region: process.env.region,
    endpoint: process.env.endpoint,
    credentials: {
        accessKeyId: process.env.accessKeyId!,
        secretAccessKey: process.env.secretAccessKey!,
    },
});

/** ป้ายกำกับรูปตรวจรอบคัน — key ตรงกับ fieldKey ที่หน้ากรอกใช้ตั้งชื่อไฟล์ */
const PHOTO_SLOTS = [
    { key: 'vehicle_front_photo', label: 'ด้านหน้ารถ' },
    { key: 'vehicle_left_photo', label: 'ด้านซ้ายรถ' },
    { key: 'vehicle_rear_photo', label: 'ด้านหลังรถ' },
    { key: 'vehicle_right_photo', label: 'ด้านขวารถ' },
    { key: 'vehicle_inside_photo', label: 'ภายในห้องโดยสาร' },
];

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** แปลง employee_id ของเทรนเนอร์เป็นชื่อ-นามสกุล เพื่อให้รายงานอ่านรู้เรื่อง */
async function resolveTrainerName(trainerId: string | null | undefined) {
    if (!trainerId) return null;
    const user = await getJson(`${API_BASE}/users/${encodeURIComponent(trainerId)}`);
    if (!user?.employee_id) return null;
    return `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() || null;
}

interface DriverInfo {
    inspection_task_driver_id: string;
    driver_id: string;
    first_name?: string | null;
    last_name?: string | null;
    number_plate?: string | null;
    truck_number?: string | null;
    truck_type?: string | null;
    inspection_date?: string | null;
    vehicle_status?: string | null;
}

async function getJson(url: string) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
}

/** รูปตรวจรอบคันถูกเก็บที่ trainer-app/{taskId}/{ชื่อคนขับ}/{fieldKey}.{ext} */
async function listVehiclePhotos(taskId: string, driverName: string) {
    const prefix = `${BASE_PATH}/${taskId}/`;
    const listed = await s3.send(
        new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: prefix })
    );

    const wanted = normalize(driverName);
    const found = new Map<string, string>(); // fieldKey → s3 key

    for (const obj of listed.Contents ?? []) {
        if (!obj.Key) continue;
        const parts = obj.Key.slice(prefix.length).split('/');
        if (parts.length < 2) continue;
        if (normalize(parts[0]) !== wanted) continue;

        const fileName = parts[parts.length - 1];
        const base = fileName.replace(/\.[^.]+$/, '');
        if (base.startsWith('vehicle_')) found.set(base, obj.Key);
    }

    const sign = (key: string) =>
        getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }), {
            expiresIn: 3600,
        });

    const slots = await Promise.all(
        PHOTO_SLOTS.map(async ({ key, label }) => {
            const s3Key = found.get(key);
            found.delete(key);
            return { key, label, url: s3Key ? await sign(s3Key) : null };
        })
    );

    // รูป vehicle_* อื่น ๆ ที่ไม่ตรง slot มาตรฐาน — แนบท้ายไว้ไม่ให้ตกหล่น
    const extras = await Promise.all(
        [...found.entries()].map(async ([key, s3Key]) => ({
            key,
            label: key.replace(/^vehicle_/, '').replace(/_/g, ' '),
            url: await sign(s3Key),
        }))
    );

    return [...slots, ...extras];
}

/**
 * GET /api/task/vehicle-report?task_id=...&driver_id=...
 * รวมข้อมูลสำหรับออกรายงาน PDF ตรวจสภาพรอบคัน 1 คัน
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('task_id');
        const driverId = searchParams.get('driver_id');

        if (!taskId || !driverId) {
            return NextResponse.json(
                { error: 'ต้องระบุ task_id และ driver_id' },
                { status: 400 }
            );
        }

        const detail = await getJson(
            `${API_BASE}/inspection/task/${encodeURIComponent(taskId)}`
        );
        if (!detail?.task) {
            return NextResponse.json({ error: 'ไม่พบงานตรวจนี้' }, { status: 404 });
        }

        const driver: DriverInfo | undefined = (detail.drivers ?? []).find(
            (d: DriverInfo) => String(d.driver_id) === String(driverId)
        );
        if (!driver) {
            return NextResponse.json({ error: 'ไม่พบคนขับในงานนี้' }, { status: 404 });
        }

        const driverName = `${driver.first_name ?? ''} ${driver.last_name ?? ''}`.trim();

        const [inspect, photos, trainerName] = await Promise.all([
            getJson(
                `${API_BASE}/inspection/vehicle-inspect/${encodeURIComponent(
                    driver.inspection_task_driver_id
                )}`
            ),
            listVehiclePhotos(taskId, driverName).catch((e) => {
                console.error('Vehicle photo list error:', e);
                return [];
            }),
            resolveTrainerName(detail.task.trainer_id).catch(() => null),
        ]);

        return NextResponse.json(
            {
                task: { ...detail.task, trainer_name: trainerName },
                driver: { ...driver, driver_name: driverName },
                checklist: inspect?.checklist ?? {},
                vehicle_status: inspect?.vechicle_status ?? driver.vehicle_status ?? null,
                photos,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('GET vehicle-report error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
