import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: 'sgp1',
  endpoint: 'https://sgp1.digitaloceanspaces.com', 
  credentials: {
    accessKeyId: 'DO00FB9KEAJ6KG2A8TTK',
    secretAccessKey: 'LLrB/5TOpWirsxbCAPSiQVq4EtVJ3CNnIrFt0nim/9c',
  },
});

const BUCKET_NAME = 'mn-bucket';
const BASE_PATH = 'mn-ncac';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll('files') as File[];
  const document_no = formData.get('document_no') as string;
  
  console.log(' ++++++ Received files:', files);
  console.log(' ++++++ Document No:', document_no);
  
  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'ไม่มีไฟล์' }, { status: 400 });
  }

  if (!document_no) {
    return NextResponse.json({ error: 'ไม่มีหมายเลขเอกสาร' }, { status: 400 });
  }

  const uploadedPaths: string[] = [];
  for (const file of files) {
    // ใช้ document_no จาก formData แทนการ split ชื่อไฟล์
    const docid = document_no;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // สร้าง path: BASE_PATH/docid/filename
    const fileName = `${BASE_PATH}/${docid}/${file.name}`;

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    };

    try {
      await s3.send(new PutObjectCommand(uploadParams));
      uploadedPaths.push(fileName);
      console.log(`✅ Uploaded: ${fileName}`);
    } catch (err) {
      console.error('S3 Upload Error:', err);
      return NextResponse.json({ error: `Upload failed: ${file.name}` }, { status: 500 });
    }
  }

  return NextResponse.json({ 
    success: true, 
    paths: uploadedPaths,
    message: `อัปโหลดไฟล์ ${files.length} ไฟล์สำเร็จ`
  });
}

// GET: ดึงรายการไฟล์ของเอกสาร
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const document_no = searchParams.get('document_no');

  if (!document_no) {
    return NextResponse.json({ error: 'ไม่มีหมายเลขเอกสาร' }, { status: 400 });
  }

  const folderPath = `${BASE_PATH}/${document_no}/`;

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: folderPath,
    });

    const response = await s3.send(listCommand);
    const files = response.Contents?.map(obj => ({
      key: obj.Key,
      fileName: obj.Key?.split('/').pop(),
      size: obj.Size,
      lastModified: obj.LastModified,
      url: `https://${BUCKET_NAME}.sgp1.digitaloceanspaces.com/${obj.Key}`
    })) || [];

    return NextResponse.json({ files });
  } catch (err) {
    console.error('S3 List Error:', err);
    return NextResponse.json({ error: 'ไม่สามารถดึงรายการไฟล์ได้' }, { status: 500 });
  }
}

// DELETE: ลบไฟล์
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('filePath');

  if (!filePath) {
    return NextResponse.json({ error: 'ไม่มีเส้นทางไฟล์' }, { status: 400 });
  }

  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath,
    });

    await s3.send(deleteCommand);
    return NextResponse.json({ success: true, message: 'ลบไฟล์สำเร็จ' });
  } catch (err) {
    console.error('S3 Delete Error:', err);
    return NextResponse.json({ error: 'ไม่สามารถลบไฟล์ได้' }, { status: 500 });
  }
}