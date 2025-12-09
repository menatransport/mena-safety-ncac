import { NextResponse } from 'next/server';

// Google Sheet API Configuration
const GOOGLE_SHEET_ID = '1FX-5DC5HgRrS8LVxzR2AH7ZZlmPEVdi-hOvDW44Lrx4';
const GOOGLE_SHEET_NAME = 'UserTestResults';

interface TestResultPayload {
  userName: string;
  testDate: string;
  duration: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  totalSteps: number;
  results: Array<{
    stepId: number;
    stepTitle: string;
    status: string;
    timestamp: string;
    notes?: string;
  }>;
}

export async function POST(request: Request) {
  try {
    const data: TestResultPayload = await request.json();
    
    // Format data for Google Sheet
    const testSummary = {
      timestamp: new Date().toISOString(),
      userName: data.userName,
      testDate: new Date(data.testDate).toLocaleString('th-TH'),
      durationMinutes: Math.floor(data.duration / 60),
      durationSeconds: data.duration % 60,
      totalSteps: data.totalSteps,
      passedCount: data.passedCount,
      failedCount: data.failedCount,
      skippedCount: data.skippedCount,
      passRate: ((data.passedCount / data.totalSteps) * 100).toFixed(2) + '%',
      status: data.failedCount === 0 ? 'PASSED' : 'FAILED',
      detailedResults: JSON.stringify(data.results)
    };

    // Prepare row data for Google Sheet
    const rowData = [
      testSummary.timestamp,
      testSummary.userName,
      testSummary.testDate,
      `${testSummary.durationMinutes}:${String(testSummary.durationSeconds).padStart(2, '0')}`,
      testSummary.totalSteps,
      testSummary.passedCount,
      testSummary.failedCount,
      testSummary.skippedCount,
      testSummary.passRate,
      testSummary.status,
      testSummary.detailedResults
    ];

    // Use Google Apps Script Web App URL for appending data
    // You need to deploy a Google Apps Script as a Web App
    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

    if (GOOGLE_SCRIPT_URL) {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetId: GOOGLE_SHEET_ID,
          sheetName: GOOGLE_SHEET_NAME,
          rowData: rowData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to append to Google Sheet');
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Test results saved to Google Sheet',
        data: testSummary 
      });
    } else {
      // Fallback: Log to console if Google Script URL is not configured
      console.log('=== USER TEST RESULTS ===');
      console.log('Timestamp:', testSummary.timestamp);
      console.log('User:', testSummary.userName);
      console.log('Test Date:', testSummary.testDate);
      console.log('Duration:', `${testSummary.durationMinutes}m ${testSummary.durationSeconds}s`);
      console.log('Total Steps:', testSummary.totalSteps);
      console.log('Passed:', testSummary.passedCount);
      console.log('Failed:', testSummary.failedCount);
      console.log('Skipped:', testSummary.skippedCount);
      console.log('Pass Rate:', testSummary.passRate);
      console.log('Status:', testSummary.status);
      console.log('========================');

      // Try direct Google Sheets API if available
      const result = await appendToGoogleSheetDirect(rowData);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Test results logged (Google Script URL not configured)',
        data: testSummary,
        directApiResult: result
      });
    }

  } catch (error) {
    console.error('Error saving test results:', error);
    return NextResponse.json(
      { error: 'Failed to save test results', details: String(error) },
      { status: 500 }
    );
  }
}

// Direct Google Sheets API append (requires service account)
async function appendToGoogleSheetDirect(rowData: any[]) {
  try {
    // Using Google Sheets API v4 with fetch
    // Note: This requires proper authentication setup
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

    if (!GOOGLE_API_KEY && !GOOGLE_PRIVATE_KEY) {
      console.log('Google API credentials not configured. Skipping direct API call.');
      return { success: false, reason: 'No credentials' };
    }

    // For simplicity, we'll use a public append endpoint
    // In production, you should use proper OAuth2 or Service Account authentication
    
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${GOOGLE_SHEET_NAME}!A:K:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(sheetsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData]
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      console.log('Google Sheets API error:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('Direct Google Sheets API error:', error);
    return { success: false, error: String(error) };
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'User Test API',
    endpoints: {
      POST: 'Submit test results to Google Sheet'
    },
    googleSheetId: GOOGLE_SHEET_ID,
    sheetName: GOOGLE_SHEET_NAME
  });
}
