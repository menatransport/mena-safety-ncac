import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Get document number
    const documentNo = formData.get('document_no') as string;
    
    if (!documentNo) {
      return NextResponse.json(
        { error: 'Document number is required' },
        { status: 400 }
      );
    }

    // Get files and categories
    const files = formData.getAll('files') as File[];
    const categories = formData.getAll('categories') as string[];

    console.log(`Processing ${files.length} files for document: ${documentNo}`);

    // Here you would typically:
    // 1. Upload files to your storage service (AWS S3, Google Cloud, etc.)
    // 2. Save file metadata to your database
    // 3. Associate files with the document

    // For now, we'll just log the information
    const fileInfo = files.map((file, index) => ({
      originalName: file.name,
      size: file.size,
      type: file.type,
      category: categories[index] || 'general',
      documentNo: documentNo
    }));

    console.log('File information:', fileInfo);

    // Simulate successful upload
    const response = {
      success: true,
      message: 'Files uploaded successfully',
      documentNo: documentNo,
      files: fileInfo,
      uploadedCount: files.length
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error processing file upload:', error);
    return NextResponse.json(
      { error: 'Failed to process file upload' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentNo = searchParams.get('document_no');

    if (!documentNo) {
      return NextResponse.json(
        { error: 'Document number is required' },
        { status: 400 }
      );
    }

    // Here you would typically fetch attachments from your database
    // For now, return a mock response
    const attachments = [
      {
        id: '1',
        filename: `${documentNo}.รูปทั่วไป.01.jpg`,
        category: 'รูปทั่วไป',
        size: 1024000,
        uploadDate: new Date().toISOString(),
        url: `/api/attachment/download/${documentNo}.รูปทั่วไป.01.jpg`
      }
    ];

    return NextResponse.json({
      success: true,
      documentNo: documentNo,
      attachments: attachments,
      count: attachments.length
    });

  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  }
}