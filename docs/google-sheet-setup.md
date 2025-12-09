# การตั้งค่า Google Sheet สำหรับ User Test Results

## ขั้นตอนที่ 1: สร้าง Google Apps Script

1. เปิด Google Sheet: https://docs.google.com/spreadsheets/d/1FX-5DC5HgRrS8LVxzR2AH7ZZlmPEVdi-hOvDW44Lrx4/edit

2. ไปที่ **Extensions > Apps Script**

3. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดนี้:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('UserTestResults');
    
    // ถ้าไม่มี sheet ให้สร้างใหม่
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('UserTestResults');
      // เพิ่ม Header
      sheet.appendRow([
        'Timestamp',
        'User Name', 
        'Test Date',
        'Duration',
        'Total Steps',
        'Passed',
        'Failed',
        'Skipped',
        'Pass Rate',
        'Status',
        'Detailed Results'
      ]);
      
      // Format header
      var headerRange = sheet.getRange(1, 1, 1, 11);
      headerRange.setBackground('#10B981');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
    }
    
    // เพิ่มข้อมูล
    sheet.appendRow(data.rowData);
    
    // Color coding based on status
    var lastRow = sheet.getLastRow();
    var statusCell = sheet.getRange(lastRow, 10);
    if (data.rowData[9] === 'PASSED') {
      statusCell.setBackground('#D1FAE5');
      statusCell.setFontColor('#059669');
    } else {
      statusCell.setBackground('#FEE2E2');
      statusCell.setFontColor('#DC2626');
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, row: lastRow }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ message: 'User Test API is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Function สำหรับทดสอบ
function testAppend() {
  var testData = {
    rowData: [
      new Date().toISOString(),
      'Test User',
      '6/12/2025',
      '5:30',
      21,
      18,
      2,
      1,
      '85.71%',
      'FAILED',
      '[]'
    ]
  };
  
  var e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  var result = doPost(e);
  Logger.log(result.getContent());
}
```

## ขั้นตอนที่ 2: Deploy เป็น Web App

1. คลิก **Deploy > New deployment**
2. เลือก Type: **Web app**
3. ตั้งค่า:
   - Description: "User Test API"
   - Execute as: **Me**
   - Who has access: **Anyone**
4. คลิก **Deploy**
5. **คัดลอก Web App URL** ที่ได้

## ขั้นตอนที่ 3: เพิ่ม Environment Variable

เพิ่มใน `.env.local`:

```
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

แทนที่ `YOUR_SCRIPT_ID` ด้วย Script ID ที่ได้จากการ Deploy

## ขั้นตอนที่ 4: สร้าง Sheet Header (ถ้ายังไม่มี)

ใน Google Sheet สร้าง Sheet ชื่อ "UserTestResults" และเพิ่ม Header:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Timestamp | User Name | Test Date | Duration | Total Steps | Passed | Failed | Skipped | Pass Rate | Status | Detailed Results |

## หมายเหตุ

- ถ้าไม่ได้ตั้งค่า GOOGLE_SCRIPT_URL ระบบจะ log ผลการทดสอบใน console แทน
- สามารถดูผลการทดสอบได้ที่ Google Sheet โดยตรง
- ข้อมูล "Detailed Results" จะเป็น JSON ที่มีรายละเอียดของแต่ละ step
