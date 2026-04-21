import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

// S3 folder: trainer-app/{id}/{driverName}/
function buildPrefix(id: string, folder: string) {
  return `${BASE_PATH}/${id}/${folder}/`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subid: string }> }
) {
  const { id, subid } = await params;
  const folder = req.nextUrl.searchParams.get('folder') || subid;
  const formData = await req.formData();
  const files = formData.getAll('files') as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'ไม่มีไฟล์' }, { status: 400 });
  }

  const prefix = buildPrefix(id, folder);
  const uploadedPaths: string[] = [];

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `${prefix}${file.name}`;

    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }));
      uploadedPaths.push(key);
      console.log(`✅ Uploaded: ${key}`);
    } catch (err) {
      console.error('S3 Upload Error:', err);
      return NextResponse.json({ error: `Upload failed: ${file.name}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    paths: uploadedPaths,
    message: `อัปโหลดไฟล์ ${files.length} ไฟล์สำเร็จ`,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subid: string }> }
) {
  const { id, subid } = await params;
  const folder = req.nextUrl.searchParams.get('folder') || subid;
  const prefix = buildPrefix(id, folder);

  try {
    const response = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    }));

    const filesWithUrls = await Promise.all(
      (response.Contents || []).map(async (obj) => {
        if (!obj.Key) return null;

        const signedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: BUCKET_NAME, Key: obj.Key }),
          { expiresIn: 3600 }
        );

        return {
          key: obj.Key,
          fileName: obj.Key.split('/').pop(),
          url: signedUrl,
          size: obj.Size,
          lastModified: obj.LastModified,
        };
      })
    );

    return NextResponse.json({ files: filesWithUrls.filter(Boolean) });
  } catch (err) {
    console.error('S3 List Error:', err);
    return NextResponse.json({ error: 'ไม่สามารถดึงรายการไฟล์ได้' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { key } = await req.json();
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("❌ Delete error:", err);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
