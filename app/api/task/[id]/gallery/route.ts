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

type Category = 'overview' | 'drug' | 'ppe' | 'vehicle';

type GalleryItem = {
    key: string;
    fileName: string;
    url: string;
    driverName?: string;
    size?: number;
    lastModified?: Date;
};

function categorize(key: string, taskFolder: string): { category: Category | null; driverName?: string } {
    const relative = key.slice(taskFolder.length); // e.g. "{taskId}_xxx_ALL.jpg" or "John Doe/drug_test_result.jpg"
    const parts = relative.split('/');

    // Top-level file = overview (รูปภาพประกอบของงาน)
    if (parts.length === 1) {
        if (parts[0].includes('_ALL')) return { category: 'overview' };
        return { category: 'overview' };
    }

    // Driver subfolder file
    if (parts.length >= 2) {
        const driverName = parts[0];
        const fileName = parts[parts.length - 1].toLowerCase();
        if (fileName.startsWith('drug_') || fileName.startsWith('alcohol_')) {
            return { category: 'drug', driverName };
        }
        if (fileName.startsWith('ppe_')) {
            return { category: 'ppe', driverName };
        }
        if (fileName.startsWith('vehicle_')) {
            return { category: 'vehicle', driverName };
        }
    }
    return { category: null };
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const taskFolder = `${BASE_PATH}/${id}/`;

    try {
        const response = await s3.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: taskFolder,
        }));

        const groups: Record<Category, GalleryItem[]> = {
            overview: [],
            drug: [],
            ppe: [],
            vehicle: [],
        };

        await Promise.all(
            (response.Contents || []).map(async (obj) => {
                if (!obj.Key) return;
                const { category, driverName } = categorize(obj.Key, taskFolder);
                if (!category) return;

                const url = await getSignedUrl(
                    s3,
                    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: obj.Key }),
                    { expiresIn: 3600 }
                );

                groups[category].push({
                    key: obj.Key,
                    fileName: obj.Key.split('/').pop() ?? '',
                    url,
                    driverName,
                    size: obj.Size,
                    lastModified: obj.LastModified,
                });
            })
        );

        return NextResponse.json(groups);
    } catch (err) {
        console.error('Gallery list error:', err);
        return NextResponse.json({ error: 'ไม่สามารถดึงรูปภาพได้' }, { status: 500 });
    }
}
