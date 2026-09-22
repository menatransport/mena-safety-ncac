import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
    region: process.env.region,
    endpoint: process.env.endpoint,
    credentials: {
        accessKeyId: process.env.accessKeyId!,
        secretAccessKey: process.env.secretAccessKey!,
    },
});

const BUCKET_NAME = 'mn-bucket';
const BASE_PATH = 'trainer-app';

/** ลิงก์นี้จะถูกฝังในไฟล์ Excel ที่ดาวน์โหลดไปเปิดทีหลัง — ใช้อายุยาวสุดที่ presigned URL (SigV4) รองรับ คือ 7 วัน */
const EXPIRES_IN = 60 * 60 * 24 * 7;

const PHOTO_FIELDS = [
    { field: 'vehicle_front_photo', out: 'front' },
    { field: 'vehicle_left_photo', out: 'left' },
    { field: 'vehicle_rear_photo', out: 'rear' },
    { field: 'vehicle_right_photo', out: 'right' },
    { field: 'vehicle_inside_photo', out: 'inside' },
] as const;

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

interface VehiclePhotoRequest {
    inspection_task_driver_id: string;
    inspection_task_id: string;
    driver_name: string;
}

type PhotoSet = Record<(typeof PHOTO_FIELDS)[number]['out'], string | null>;

const emptyPhotoSet = (): PhotoSet => ({ front: null, left: null, rear: null, right: null, inside: null });

/**
 * POST /api/task/vehicle-photos-batch
 * body: { vehicles: { inspection_task_driver_id, inspection_task_id, driver_name }[] }
 * คืน URL รูปตรวจรอบคัน (หน้า/ซ้าย/หลัง/ขวา) ของหลายคันพร้อมกัน — จัดกลุ่มตาม task
 * เพื่อ list S3 ครั้งเดียวต่องานตรวจ 1 งาน แทนที่จะยิงซ้ำทีละคัน
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);
        const vehicles: VehiclePhotoRequest[] = body?.vehicles;
        if (!Array.isArray(vehicles) || vehicles.length === 0) {
            return NextResponse.json({ error: 'ต้องระบุรายการรถ (vehicles)' }, { status: 400 });
        }

        const byTask = new Map<string, VehiclePhotoRequest[]>();
        for (const v of vehicles) {
            const list = byTask.get(v.inspection_task_id) ?? [];
            list.push(v);
            byTask.set(v.inspection_task_id, list);
        }

        const photos: Record<string, PhotoSet> = {};

        await Promise.all(
            [...byTask.entries()].map(async ([taskId, list]) => {
                const prefix = `${BASE_PATH}/${taskId}/`;
                const listed = await s3
                    .send(new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: prefix }))
                    .catch((e) => {
                        console.error('Vehicle photo batch list error:', e);
                        return null;
                    });

                if (!listed) {
                    for (const v of list) photos[v.inspection_task_driver_id] = emptyPhotoSet();
                    return;
                }

                // driver (normalized) → fieldKey → s3 key
                const byDriver = new Map<string, Map<string, string>>();
                for (const obj of listed.Contents ?? []) {
                    if (!obj.Key) continue;
                    const parts = obj.Key.slice(prefix.length).split('/');
                    if (parts.length < 2) continue;
                    const fileName = parts[parts.length - 1];
                    const base = fileName.replace(/\.[^.]+$/, '');
                    if (!base.startsWith('vehicle_')) continue;
                    const driverKey = normalize(parts[0]);
                    if (!byDriver.has(driverKey)) byDriver.set(driverKey, new Map());
                    byDriver.get(driverKey)!.set(base, obj.Key);
                }

                await Promise.all(
                    list.map(async (v) => {
                        const files = byDriver.get(normalize(v.driver_name)) ?? new Map<string, string>();
                        const entry = emptyPhotoSet();
                        await Promise.all(
                            PHOTO_FIELDS.map(async ({ field, out }) => {
                                const s3Key = files.get(field);
                                if (!s3Key) return;
                                entry[out] = await getSignedUrl(
                                    s3,
                                    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }),
                                    { expiresIn: EXPIRES_IN }
                                );
                            })
                        );
                        photos[v.inspection_task_driver_id] = entry;
                    })
                );
            })
        );

        return NextResponse.json({ photos });
    } catch (error) {
        console.error('POST vehicle-photos-batch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
