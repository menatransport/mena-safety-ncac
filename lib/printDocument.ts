import { caseReport_AC, caseReport_NC, investigate_AC } from './caseReport';
import {
  DOC_STATUS,
  formatDocNos,
  getCategoriesByCase,
  getCategory,
  getDepartmentPrintLabel,
} from './attachment';

interface NCFormData {
  document_no?: string;
  priority?: string;
  casestatus?: string;
  site_name?: string;
  department_name?: string;
  incident_date?: string;
  incident_cause?: string;
  case_details?: string;
  client_name?: string;
  origin_name?: string;
  destination?: string;
  case_location?: string;
  vehicle_head_plate?: string;
  vehicle_tail_plate?: string;
  driver_role_name?: string;
  driver_name?: string;
  reporter_name?: string;
  record_date?: string;
  estimated_cost?: string | number;
  actual_price?: string | number;
  products?: Array<{
    product_name: string;
    amount: number;
    unit: string;
    damage_value?: number;
    responsible_party?: string;
  }>;
  docs?: Array<{
    [key: string]: string;
  }>;
}

interface InvestigateData {
  root_cause_analysis?: string;
  corrective_actions?: Array<{
    corrective_action: string;
    pic_contract: string;
    plan_date: string | null;
    action_completed_date: string | null;
  }>;
  claim_type?: string;
  insurance_claim?: string | number;
  product_resellable?: string | number;
  remaining_damage_cost?: string | number;
  driver_cost?: string | number;
  company_cost?: string | number;
}

/**
 * ส่วนของเอกสารที่ต้องการพิมพ์
 * - part1 = รายงานเบื้องต้น, part2 = รายงานผลการสอบสวน, both = ทั้งสองส่วน
 * หน้าภาพประกอบเหตุการณ์และสถานะการติดตามเอกสารจะแนบให้ทุกกรณี
 */
export type PrintParts = 'part1' | 'part2' | 'both';

interface PrintDocumentData {
  formData: NCFormData;
  investigateData?: InvestigateData;
  userinfo?: any;
  attachedFiles?: { [key: string]: any[] };
  parts?: PrintParts;
}

interface PrintACDocumentData {
  formData: caseReport_AC;
  investigateData?: Partial<investigate_AC>;
  userinfo?: any;
  attachedFiles?: { [key: string]: any[] };
  parts?: PrintParts;
}

// ==================== Shared Utility Functions ====================

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatShortDate = (dateString?: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'Pending':
      return '<span style="background-color: #fbbf24; color: #873f13; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Pending</span>';
    case 'Voided':
      return '<span style="background-color: #ffbfd1; color: #4d0c1e; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Voided</span>';
    case 'Completed Investigate':
      return '<span style="background-color: #baffe6; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Completed</span>';
    default:
      return '<span style="background-color: #e5e7eb; color: #374151; padding: 2px 8px; border-radius: 4px; font-size: 12px;">-</span>';
  }
};

const getPriorityBadge = (priority?: string) => {
  switch (priority) {
    case 'Crisis':
      return '<span style="background-color: #e2b3ff; color: #3c0d59; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Crisis</span>';
    case 'Major':
      return '<span style="background-color: #ffbfd1; color: #4d0c1e; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Major</span>';
    case 'Minor':
      return '<span style="background-color: #ffe5b5; color: #703702; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Minor</span>';
    default:
      return '<span style="background-color: #e5e7eb; color: #374151; padding: 2px 8px; border-radius: 4px; font-size: 12px;">-</span>';
  }
};

const formatCurrency = (value?: string | number) => {
  if (!value) return '';
  return Number(value).toLocaleString('th-TH') + ' บาท';
};

const getRadioBadge = (value?: string, yesText: string = 'มี', noText: string = 'ไม่มี') => {
  if (value === 'yes') {
    return `<span class="radio-badge radio-yes">${yesText}</span>`;
  }
  return `<span class="radio-badge radio-no">${noText}</span>`;
};

// ==================== Shared Styles ====================

const getSharedStyles = () => `
  @media print {
    @page {
      size: A4;
      margin: 10mm;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* ตารางครอบทั้งหน้า: tfoot จะถูกพิมพ์ซ้ำท้ายทุกหน้า และกันที่ให้อัตโนมัติ */
    .page-wrap {
      width: 100%;
      border-collapse: collapse;
    }

    .page-wrap > tfoot {
      display: table-footer-group;
    }

    .page-wrap > tbody > tr > td,
    .page-wrap > tfoot > tr > td {
      padding: 0;
      border: none;
      vertical-align: top;
    }

    .page-footer {
      font-size: 9px;
      color: #374151;
      background-color: white;
      padding-top: 10px;
    }

    /* ชุดใน tfoot ใช้จองพื้นที่ท้ายทุกหน้าไม่ให้เนื้อหาทับ Document Control (ไม่แสดงผล) */
    .page-footer-spacer {
      visibility: hidden;
    }

    /* ชุดที่แสดงจริง ตรึงไว้ล่างสุดของกระดาษทุกหน้า (เบราว์เซอร์พิมพ์ซ้ำให้ทุกหน้า) */
    .page-footer-fixed {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
    }
    
    .page-footer table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .page-footer th,
    .page-footer td {
      border: 1px solid #374151;
      padding: 3px 6px;
      text-align: left;
    }
    
    .page-footer th {
      background-color: #e5e7eb;
      font-weight: 600;
      text-align: center;
    }
    
    .page-footer .label {
      font-weight: 500;
      background-color: #c9c9c9;
    }
  }
  
  @media screen {
    .page-footer {
      display: none;
    }

    .page-wrap,
    .page-wrap > tbody,
    .page-wrap > tbody > tr,
    .page-wrap > tbody > tr > td {
      display: block;
      width: 100%;
    }
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Sarabun', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.5;
    color: #1f2937;
    font-size: 12px;
    background-color: white;
  }
  
  .container {
    max-width: 210mm;
    margin: 0 auto;
    padding: 16px;
    background-color: white;
  }
  
  /* Header */
  .header {
    text-align: center;
    border-bottom: 1px solid #9ca3af;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  
  .header h1 {
    color: #1f2937;
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  
  .header .subtitle {
    color: #4b5563;
    font-size: 14px;
  }
  
  /* Section Header */
  .section-header {
    background-color: #e6e6e6;
    padding: 8px 12px;
    margin-bottom: 12px;
    margin-top: 16px;
  }
  
  .section-header h3 {
    font-size: 13px;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }
  
  .section-header p {
    font-size: 11px;
    font-weight: 600;
    color: #4b5563;
    margin: 0;
  }
  
  /* Content Section */
  .section-content {
    padding: 12px 16px;
  }
  
  /* Grid Layout */
  .grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  
  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  
  .grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .col-span-4 {
    grid-column: span 4;
  }
  
  .col-span-3 {
    grid-column: span 3;
  }
  
  .col-span-2 {
    grid-column: span 2;
  }
  
  /* Form Group */
  .form-group {
    margin-bottom: 8px;
  }
  
  .form-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 4px;
  }
  
  .form-value {
    font-size: 12px;
    color: #1f2937;
    padding: 6px 8px;
    background-color: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    min-height: 28px;
  }
  
  .form-value.highlight {
    color: #2563eb;
    font-weight: 700;
  }
  
  /* Text Area */
  .text-area {
    font-size: 12px;
    color: #1f2937;
    padding: 8px;
    background-color: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    min-height: 60px;
    white-space: pre-wrap;
  }
  
  /* Divider */
  .divider {
    border-top: 1px solid #9ca3af;
    margin: 16px 0;
  }
  
  /* Table */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  
  .data-table th,
  .data-table td {
    border: 1px solid #d1d5db;
    padding: 6px 10px;
    text-align: left;
  }
  
  .data-table th {
    background-color: #f3f4f6;
    font-weight: 500;
    color: #374151;
  }
  
  .data-table td {
    color: #1f2937;
    background-color: white;
  }
  
  .text-center {
    text-align: center;
  }
  
  .text-right {
    text-align: right;
  }
  
  /* Status Badge */
  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  }
  
  /* Radio Badge */
  .radio-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
  }
  
  .radio-yes {
    background-color: #fecaca;
    color: #991b1b;
  }
  
  .radio-no {
    background-color: #d1fae5;
    color: #065f46;
  }
  
  /* Doc Info Header */
  .doc-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 10px 12px;
    background-color: #f9fafb;
    border-radius: 6px;
    border-left: 4px solid #3b82f6;
  }
  
  .doc-info .doc-no {
    font-size: 14px;
    font-weight: 600;
  }
  
  .doc-info .doc-status {
    text-align: right;
  }
  
  /* Footer */
  .footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #9ca3af;
  }
  
  .signature-row {
    display: flex;
    justify-content: space-around;
    margin-bottom: 40px;
  }
  
  .signature-box {
    text-align: center;
    min-width: 180px;
  }
  
  .signature-box .title {
    font-size: 12px;
    font-weight: 500;
    color: #374151;
  }
  
  .signature-line {
    border-top: 1px solid #374151;
    margin-top: 50px;
    padding-top: 6px;
    font-size: 11px;
    color: #6b7280;
  }
  
  .print-info {
    text-align: center;
    font-size: 10px;
    color: #6b7280;
    margin-top: 16px;
  }
  
  /* Page Break */
  .page-break {
    page-break-before: always;
    break-before: page;
  }
  
  /* Part Header */
  .part-header {
    border-bottom: 1px solid #9ca3af;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  
  .part-header p {
    font-size: 12px;
    font-weight: 700;
    color: #1f2937;
    margin: 2px 0;
  }
  
  /* Injury Badge */
  .injury-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    min-width: 60px;
  }
  
  .injury-minor {
    background-color: #fef3c7;
    color: #92400e;
  }
  
  .injury-hospitalized {
    background-color: #fed7aa;
    color: #c2410c;
  }
  
  .injury-fatal {
    background-color: #fecaca;
    color: #991b1b;
  }

  /* ภาพประกอบเหตุการณ์ */
  .photo-group-title {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    margin: 10px 0 6px;
    padding-bottom: 3px;
    border-bottom: 1px solid #e5e7eb;
  }

  .photo-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }

  .photo-item {
    width: calc(50% - 4px);
    box-sizing: border-box;
    border: 1px solid #d1d5db;
    padding: 4px;
    page-break-inside: avoid;
  }

  .photo-item img {
    display: block;
    width: 100%;
    height: 55mm;
    object-fit: contain;
    background-color: #f9fafb;
  }

  .photo-caption {
    margin-top: 3px;
    font-size: 9px;
    color: #6b7280;
    word-break: break-all;
  }

  /* บล็อกวิเคราะห์สาเหตุ */
  .analysis-block {
    border: 1px solid #d1d5db;
    padding: 8px 10px;
    margin-bottom: 12px;
  }

  .analysis-title {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
  }

  .analysis-sub {
    font-size: 11px;
    font-weight: 600;
    color: #4b5563;
    margin: 8px 0 4px;
  }

  /* กันหัวข้อค้างท้ายหน้า และกันแถวตารางถูกตัดครึ่ง */
  .section-header,
  .analysis-title,
  .analysis-sub,
  .form-label {
    page-break-after: avoid;
    break-after: avoid;
  }

  .data-table thead {
    display: table-header-group;
  }

  .data-table tr,
  .form-group {
    page-break-inside: avoid;
    break-inside: avoid;
  }
`;


// ==================== Document Control (ท้ายทุกหน้า) ====================

/**
 * ตาราง Document Control ที่พิมพ์ซ้ำท้ายทุกหน้า — ต้องเรียกใช้ 2 ชุดเสมอ
 * - variant "spacer": วางใน <tfoot> เพื่อจองพื้นที่ท้ายหน้าไว้ (ซ่อนไม่ให้เห็น)
 * - variant "fixed": ชุดที่แสดงจริง ตรึงไว้ล่างสุดของกระดาษ ไม่ลอยตามเนื้อหาในหน้าที่สั้น
 */
const getDocumentControlHTML = (options: {
  variant: 'spacer' | 'fixed';
  documentNo?: string;
  documentName: string;
  ownerName?: string;
  approvedByLabel: string;
  approvedDateLabel: string;
}): string => `
      <div class="page-footer page-footer-${options.variant}">
        <table>
          <thead>
            <tr>
              <th colspan="6" style="text-align: center; background-color: #c9c9c9;">Document Control & Revision History</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="label" style="width: 15%;">Document Ref</td>
              <td style="width: 35%;">${options.documentNo || ' '}</td>
              <td class="label" style="width: 15%;">Document Name</td>
              <td colspan="3">${options.documentName}</td>
            </tr>
            <tr>
              <td class="label">Document Owner</td>
              <td>${options.ownerName || ' '}</td>
              <td class="label">Version No</td>
              <td style="width: 10%;">01</td>
              <td class="label" style="width: 12%;">Revision Date</td>
              <td style="width: 13%;"></td>
            </tr>
            <tr>
              <td class="label">${options.approvedByLabel}</td>
              <td> </td>
              <td class="label">${options.approvedDateLabel}</td>
              <td> </td>
              <td class="label">Printed</td>
              <td>${formatDate(new Date().toISOString())}</td>
            </tr>
          </tbody>
        </table>
      </div>`;

// ==================== Print NC Document Function ====================

export const printDocument_nc = (data: PrintDocumentData) => {
  
  const { formData, investigateData, userinfo, attachedFiles, parts = 'both' } = data;
  
  const htmlContent = generateNCFormHTML(formData, investigateData, userinfo, attachedFiles, parts);
  const printWindow = window.open('', '', 'width=800,height=600');
  
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  }
};

const generateNCFormHTML = (formData: NCFormData, investigateData?: InvestigateData, userinfo?: any, attachedFiles?: { [key: string]: any[] }, parts: PrintParts = 'both'): string => {
  // console.log('Generating investigateData:', investigateData);
  const includePart1 = parts === 'part1' || parts === 'both';
  const includePart2 = parts === 'part2' || parts === 'both';
  const ncDocumentControl = {
    documentNo: formData.document_no,
    documentName: 'Non-Conformity Services (NC)',
    ownerName: formData.reporter_name,
    approvedByLabel: 'Approved By',
    approvedDateLabel: 'Approved Date',
  };
  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${formData.document_no || 'N/A'}</title>
      <style>
        ${getSharedStyles()}
      </style>
    </head>
    <body>
      <!-- Document Control ตัวจริง: ตรึงไว้ล่างสุดของกระดาษทุกหน้า -->
      ${getDocumentControlHTML({ variant: 'fixed', ...ncDocumentControl })}

      <table class="page-wrap">
        <tfoot>
          <tr>
            <td>
      <!-- ชุดจองพื้นที่ท้ายทุกหน้า (ซ่อนไว้) -->
      ${getDocumentControlHTML({ variant: 'spacer', ...ncDocumentControl })}
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td>
      <div class="container">
        <!-- Header -->
        <div class="header" style="position: relative; text-align: center;">
          <div style="position: absolute; left: 0; top: 50%; transform: translateY(-65%);">
            <img src="/mena.png" alt="MENA Logo" style="height: 50px; width: auto;" />
          </div>
          <div>
            <h1>แบบรายงานการให้บริการที่ไม่เป็นไปตามข้อกำหนดเบื้องต้น</h1>
            <div class="subtitle">Initial Non-Conformity Services Form (NC)</div>
          </div>
        </div>
        
        ${includePart1 ? `
        <!-- Part 1 Header -->
        <div class="part-header">
          <p>Part 1: Initial NC Reporting - Overview and key details</p>
          <p>ส่วนที่ 1: รายงานการให้บริการที่ไม่เป็นไปตามข้อกำหนด - รายละเอียดเบื้องต้น</p>
        </div>
        
        <!-- ข้อมูลเบื้องต้น -->
        <div class="section-header">
          <h3>ข้อมูลเบื้องต้น</h3>
          <p>Basic Information</p>
        </div>
        <div class="section-content">
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">เลขที่เอกสาร:</label>
              <div class="">${formData.document_no || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">สถานะ:</label>
              <div class="">${getStatusBadge(formData.casestatus)}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ระดับความสำคัญ:</label>
              <div class="">${getPriorityBadge(formData.priority)}</div>
            </div>
            <div class="form-group">
              <label class="form-label">สำนักงาน/ศูนย์ปฏิบัติการ:</label>
              <div class="form-value">${formData.site_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ฝ่าย:</label>
              <div class="form-value">${formData.department_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ผู้รายงาน:</label>
              <div class="form-value">${formData.reporter_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">วันและเวลา บันทึกเหตุ:</label>
              <div class="form-value">${formatDate(formData.record_date)}</div>
            </div>
            <div class="form-group">
              <label class="form-label">วันและเวลา เกิดเหตุ:</label>
              <div class="form-value">${formatDate(formData.incident_date)}</div>
            </div>
            <div class="form-group">
              <label class="form-label">สาเหตุการเกิด:</label>
              <div class="form-value">${formData.incident_cause || ' '}</div>
            </div>
            <div class="form-group col-span-3">
              <label class="form-label">รายละเอียดเหตุการณ์:</label>
              <div class="text-area">${formData.case_details || ' '}</div>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- ข้อมูลการขนส่งและสถานที่ -->
        <div class="section-header">
          <h3>ข้อมูลการขนส่งและสถานที่</h3>
          <p>Transportation and Location Information</p>
        </div>
        <div class="section-content">
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">ลูกค้า:</label>
              <div class="form-value">${formData.client_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ต้นทาง/แพล้น:</label>
              <div class="form-value">${formData.origin_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ปลายทาง:</label>
              <div class="form-value">${formData.destination || ' '}</div>
            </div>
            <div class="form-group col-span-3">
              <label class="form-label">สถานที่เกิดเหตุ:</label>
              <div class="form-value">${formData.case_location || ' '}</div>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- Page Break - เริ่มหน้าใหม่ -->
        <div class="page-break"></div>
       
        <!-- ข้อมูลพนักงานจัดส่ง -->
        <div class="section-header">
          <h3>ข้อมูลพนักงานจัดส่ง</h3>
          <p>Delivery Personnel Information</p>
        </div>
        <div class="section-content">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">ทะเบียนรถหัว:</label>
              <div class="form-value">${formData.vehicle_head_plate || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ทะเบียนรถหาง:</label>
              <div class="form-value">${formData.vehicle_tail_plate || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ประเภทคนขับ:</label>
              <div class="form-value">${formData.driver_role_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ชื่อ-สกุลคนขับ:</label>
              <div class="form-value">${formData.driver_name || ' '}</div>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- ความเสียหาย และค่าใช้จ่าย -->
        <div class="section-header">
          <h3>ความเสียหาย และค่าใช้จ่าย</h3>
          <p>Damages and Costs</p>
        </div>
        <div class="section-content">
          <table class="data-table" style="margin-bottom: 16px;">
            <thead>
              <tr>
                <th style="width: 8%;" class="text-center">ลำดับ</th>
                <th style="width: 34%;">สินค้า</th>
                <th style="width: 12%;" class="text-center">จำนวน</th>
                <th style="width: 12%;">หน่วย</th>
                <th style="width: 19%;" class="text-center">มูลค่าความเสียหาย (บาท)</th>
                <th style="width: 15%;">ผู้รับผิดชอบ</th>
              </tr>
            </thead>
            <tbody>
              ${[0, 1, 2, 3, 4].map((i) => {
                const product = formData.products?.[i];
                return `
                <tr>
                  <td class="text-center">${i + 1}</td>
                  <td>${product?.product_name || ''}</td>
                  <td class="text-right">${product?.amount || ''}</td>
                  <td>${product?.unit || ''}</td>
                  <td class="text-right">${product?.damage_value ? Number(product.damage_value).toLocaleString('th-TH') : ''}</td>
                  <td>${product?.responsible_party || ''}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
          
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">มูลค่าความเสียหายประมาณการ:</label>
              <div class="form-value">${formData.estimated_cost ? Number(formData.estimated_cost).toLocaleString('th-TH') + ' บาท' : ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">มูลค่าความเสียหายจริง:</label>
              <div class="form-value">${formData.actual_price ? Number(formData.actual_price).toLocaleString('th-TH') + ' บาท' : ' '}</div>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        ` : ''}

        ${includePart2 ? `
        ${includePart1 ? '<div class="page-break"></div>' : ''}

        <!-- Part 2 Header -->
        <div class="part-header">
          <p>Part 2: NC Investigation - Root Cause Analysis and Corrective Actions</p>
          <p>ส่วนที่ 2: การสอบสวน NC - การวิเคราะห์สาเหตุหลักและการดำเนินการแก้ไข</p>
        </div>
        
        <!-- การวิเคราะห์สาเหตุของปัญหา -->
        <div class="section-header">
          <h3>การวิเคราะห์สาเหตุของปัญหา</h3>
          <p>Root Cause Analysis</p>
        </div>
        <div class="section-content">
          <div class="form-group">
            <label class="form-label">การวิเคราะห์สาเหตุของปัญหา:</label>
            <div class="text-area">${investigateData?.root_cause_analysis || ''}</div>
          </div>
        </div>
        
   
        
        <!-- แผนการดำเนินการแก้ไขและป้องกัน -->
        <div class="section-header">
          <h3>แผนการดำเนินการแก้ไขและป้องกัน</h3>
          <p>Corrective and Preventive Action Plan</p>
        </div>
        <div class="section-content">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 8%;" class="text-center">ลำดับ</th>
                <th style="width: 40%;">การดำเนินการ</th>
                <th style="width: 20%;">ผู้รับผิดชอบ</th>
                <th style="width: 16%;" class="text-center">วันที่กำหนดเสร็จ</th>
                <th style="width: 16%;" class="text-center">วันที่เสร็จจริง</th>
              </tr>
            </thead>
            <tbody>
              ${[0, 1, 2, 3, 4, 5, 6].map((i) => {
                const action = investigateData?.corrective_actions?.[i];
                return `
                <tr>
                  <td class="text-center">${i + 1}</td>
                  <td>${action?.corrective_action || ''}</td>
                  <td>${action?.pic_contract || ''}</td>
                  <td class="text-center">${action?.plan_date ? formatShortDate(action.plan_date) : ''}</td>
                  <td class="text-center">${action?.action_completed_date ? formatShortDate(action.action_completed_date) : ''}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- ข้อมูลการเคลมและค่าใช้จ่าย -->

        
        <div class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3>ข้อมูลการเคลมและค่าใช้จ่าย</h3>
            <p>Claim Information and Costs</p>
          </div>
          <div style="text-align: right;">
            ${Number(formData.actual_price || 0) === 0 
              ? `<span style="font-size: 12px;">มูลค่าความเสียหายประมาณการ: <strong style="color: #2563eb;">${formData.estimated_cost ? Number(formData.estimated_cost).toLocaleString('th-TH') + ' บาท' : ''}</strong></span>`
              : `<span style="font-size: 12px;">มูลค่าความเสียหายจริง: <strong style="color: #2563eb;">${formData.actual_price ? Number(formData.actual_price).toLocaleString('th-TH') + ' บาท' : ''}</strong></span>`
            }
          </div>
        </div>
        <div class="section-content">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">ประเภทการเคลม:</label>
              <div class="form-value">${investigateData?.claim_type || ''}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ประกันรับเคลม (บาท):</label>
              <div class="form-value">${investigateData?.insurance_claim ? Number(investigateData.insurance_claim).toLocaleString('th-TH') : ''}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ขายสินค้าได้ (บาท):</label>
              <div class="form-value">${investigateData?.product_resellable ? Number(investigateData.product_resellable).toLocaleString('th-TH') : ''}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ค่าความเสียหายคงเหลือ (บาท):</label>
              <div class="form-value">${investigateData?.remaining_damage_cost ? Number(investigateData.remaining_damage_cost).toLocaleString('th-TH') : ''}</div>
            </div>
            <div class="form-group">
              <label class="form-label">คนขับรับผิดชอบค่าใช้จ่าย (บาท):</label>
              <div class="form-value">${investigateData?.driver_cost ? Number(investigateData.driver_cost).toLocaleString('th-TH') : ''}</div>
            </div>
            <div class="form-group">
              <label class="form-label">บริษัทรับผิดชอบค่าใช้จ่าย (บาท):</label>
              <div class="form-value">${investigateData?.company_cost ? Number(investigateData.company_cost).toLocaleString('th-TH') : ''}</div>
            </div>
          </div>
        </div>
        
        ` : ''}

        <div class="page-break"></div>
        <!-- ตารางอัปโหลดเอกสารและสถานะการติดตามเอกสาร -->
        <div class="section-header">
          <h3>สถานะการติดตามเอกสาร</h3>
          <p>Document Tracking Status</p>
        </div>
        <div class="section-content">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;" class="text-center">ลำดับ</th>
                <th style="width: 30%;">ชื่อเอกสาร</th>
                <th style="width: 15%;">ฝ่ายรับผิดชอบ</th>
                <th style="width: 10%;" class="text-center">สถานะ</th>
                <th style="width: 15%;">เลขที่เอกสาร</th>
                <th style="width: 25%;">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${getCategoriesByCase('nc').map((doc, index) => {
                const docInfo = formData.docs?.[0] || {};
                const hasAttachment = attachedFiles && attachedFiles[doc.value] && attachedFiles[doc.value].length > 0;
                const docStatus = docInfo[doc.value] || DOC_STATUS.attached;

                // กำหนดสถานะ: แนบแล้ว > ไม่ต้องแนบ > มี > ไม่มี
                let status = docStatus;
                let statusColor = '';

                if (hasAttachment) {
                  status = 'แนบแล้ว';
                } else if (docStatus === DOC_STATUS.skipped) {
                  status = DOC_STATUS.skipped;
                } else if (docStatus === DOC_STATUS.attached) {
                } else {
                  status = DOC_STATUS.missing;
                }

                const docNo = doc.no ? formatDocNos(docInfo, doc.value) : '';
                const remark = docInfo[`${doc.value}_remark`] || '';
                return `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td style="font-size: 11px;">${doc.label}</td>
                  <td style="font-size: 11px;">${getDepartmentPrintLabel(doc.department, formData.department_name)}</td>
                  <td class="text-center">
                    <span style="background-color: ${statusColor}; border-radius: 4px; font-size: 11px;">${status}</span>
                  </td>
                  <td style="font-size: 11px;">${docNo}</td>
                  <td style="font-size: 11px;">${remark}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>

        <!-- ภาพประกอบเหตุการณ์ -->
        ${generatePhotosHTML(attachedFiles)}

        <!-- Footer -->
        <div class="footer">
          <div class="signature-row">
            <div class="signature-box">
              <div class="title">ผู้รายงาน</div>
              <div class="signature-line">( ${formData.reporter_name || '................................'} )</div>
            </div>
            <div class="signature-box">
              <div class="title">ผู้ตรวจสอบ</div>
              <div class="signature-line">( ................................ )</div>
            </div>
            <div class="signature-box">
              <div class="title">ผู้อนุมัติ</div>
              <div class="signature-line">( ................................ )</div>
            </div>
          </div>
          
          
        </div>
      </div>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;
};

// ==================== Print AC Document Function ====================

// ==================== AC Part 2 (Investigate) & Photo Helpers ====================

const AC_ACCIDENT_TYPE_LABELS: { [key: string]: string } = {
  near_miss: 'เกือบจะเกิดอุบัติเหตุ (Near Miss)',
  injury_illness: 'มีการบาดเจ็บ / เจ็บป่วย (Injury / Illness)',
  motor_vehicle: 'อุบัติเหตุทางยานพาหนะ (Motor Vehicle Incident)',
  drug_alcohol: 'การตรวจพบสารเสพติดและ/หรือแอลกอฮอล์ (D&A Non-Negative)',
  property_damage: 'ทรัพย์สินสูญหาย / เสียหาย (Property loss / damage)',
  environment: 'ผลกระทบต่อสิ่งแวดล้อม (Environment)',
  security: 'อุบัติเหตุเกี่ยวกับการรักษาความปลอดภัย (Security Incident)',
  public_complaint: 'การร้องเรียนจากสาธารณะ (Public Complaint)',
};

const AC_SEVERITY_LABELS: { [key: string]: string } = {
  L1: 'L1 - เล็กน้อย (Low)',
  L2: 'L2 - เล็กน้อย (Low)',
  L3: 'L3 - เล็กน้อย (Low)',
  L4: 'L4 - ปานกลาง (Moderate)',
  L5: 'L5 - สูงมาก (High)',
};

const AC_CAUSE_CATEGORY_LABELS: { [key: string]: string } = {
  man: 'คน (Man)',
  machine: 'เครื่องจักร/ยานพาหนะ (Machine)',
  material: 'วัสดุ/สินค้า (Material)',
  method: 'วิธีการ/ขั้นตอนงาน (Method)',
  measurement: 'การวัด/การตรวจสอบ (Measurement)',
  environment: 'สภาพแวดล้อม (Environment)',
};

const AC_AVOIDABILITY_LABELS: { [key: string]: string } = {
  avoidable: 'หลีกเลี่ยงได้ (Avoidable)',
  unavoidable: 'หลีกเลี่ยงไม่ได้ (Unavoidable)',
};

const AC_YES_NO_NA_LABELS: { [key: string]: string } = {
  yes: 'ใช่ (Yes)',
  no: 'ไม่ (No)',
  na: 'ไม่เกี่ยวข้อง (NA)',
};

const AC_RISK_RESULT_LABELS: { [key: string]: string } = {
  required_revise: 'ต้องดำเนินการปรับแก้ (Required to be revised)',
  not_required_revise: 'ไม่ต้องดำเนินการปรับแก้ (Not required to be revised)',
};

const labelOf = (map: { [key: string]: string }, value?: string) =>
  (value && map[value]) || value || ' ';

/** ส่วนที่ 2: รายงานผลการสอบสวน (แสดงเมื่อมีข้อมูลการสอบสวนแล้ว) */
const generateACInvestigateHTML = (investigateData?: Partial<investigate_AC>, pageBreakBefore: boolean = true): string => {
  if (!investigateData) return '';

  const rootCauses = investigateData.root_causes || [];
  const whys = investigateData.why_analysis || [];
  const measures = investigateData.measures || [];
  const investigators = (investigateData.investigators || []).filter(
    (person) => (person?.name || '').trim() !== ''
  );
  const accidentTypes = investigateData.accident_types || [];

  const hasContent =
    !!investigateData.investigate_id ||
    !!investigateData.accident_description ||
    accidentTypes.length > 0 ||
    rootCauses.length > 0;
  if (!hasContent) return '';

  const analysisHTML = rootCauses
    .map((rootCause, index) => {
      const groupWhys = whys
        .filter((why) => why.root_cause_id === rootCause.id)
        .sort((a, b) => (a.seq || 0) - (b.seq || 0));
      const groupMeasures = measures
        .filter((measure) => measure.root_cause_id === rootCause.id)
        .sort((a, b) => (a.seq || 0) - (b.seq || 0));

      return `
          <div class="analysis-block">
            <div class="analysis-title">ชุดวิเคราะห์ที่ ${index + 1}</div>
            <div class="grid-2">
              <div class="form-group col-span-2">
                <label class="form-label">ประเด็นปัญหา (Problem):</label>
                <div class="form-value">${rootCause.problem || ' '}</div>
              </div>
              <div class="form-group">
                <label class="form-label">รากของปัญหา (Root Cause):</label>
                <div class="form-value">${rootCause.root_cause || ' '}</div>
              </div>
              <div class="form-group">
                <label class="form-label">ประเภทสาเหตุ (5M1E):</label>
                <div class="form-value">${labelOf(AC_CAUSE_CATEGORY_LABELS, rootCause.category)}</div>
              </div>
            </div>

            <div class="analysis-sub">Why-Why Analysis</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 8%;" class="text-center">WHY</th>
                  <th style="width: 46%;">ประเด็น</th>
                  <th style="width: 46%;">เพราะ</th>
                </tr>
              </thead>
              <tbody>
                ${(groupWhys.length > 0 ? groupWhys : [null]).map((why: any, i: number) => `
                  <tr>
                    <td class="text-center">${why?.seq || i + 1}</td>
                    <td>${why?.problem || ''}</td>
                    <td>${why?.cause || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="analysis-sub">มาตรการป้องกัน / แก้ไข (Preventive / Corrective Actions)</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 6%;" class="text-center">ลำดับ</th>
                  <th style="width: 44%;">มาตรการ</th>
                  <th style="width: 20%;">ผู้รับผิดชอบ</th>
                  <th style="width: 15%;" class="text-center">กำหนดแล้วเสร็จ</th>
                  <th style="width: 15%;" class="text-center">แล้วเสร็จจริง</th>
                </tr>
              </thead>
              <tbody>
                ${(groupMeasures.length > 0 ? groupMeasures : [null]).map((measure: any, i: number) => `
                  <tr>
                    <td class="text-center">${i + 1}</td>
                    <td>${measure?.measure || ''}</td>
                    <td>${measure?.pic_contract || ''}</td>
                    <td class="text-center">${measure?.plan_date ? formatShortDate(measure.plan_date) : ''}</td>
                    <td class="text-center">${measure?.action_completed_date ? formatShortDate(measure.action_completed_date) : ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`;
    })
    .join('');

  return `
        ${pageBreakBefore ? '<div class="page-break"></div>' : ''}

        <div class="part-header">
          <p>Part 2: AC Investigation Report - Root cause analysis and corrective actions</p>
          <p>ส่วนที่ 2: รายงานผลการสอบสวนอุบัติเหตุ - การวิเคราะห์สาเหตุและมาตรการแก้ไข</p>
        </div>

        <div class="section-header">
          <h3>การจำแนกอุบัติเหตุ</h3>
          <p>Accident Classification</p>
        </div>
        <div class="section-content">
          <div class="grid-2">
            <div class="form-group col-span-2">
              <label class="form-label">ประเภทอุบัติเหตุ:</label>
              <div class="form-value">${accidentTypes.length > 0
      ? accidentTypes.map((type) => labelOf(AC_ACCIDENT_TYPE_LABELS, type)).join(' / ')
      : ' '
    }</div>
            </div>
            <div class="form-group">
              <label class="form-label">ระดับความรุนแรง:</label>
              <div class="form-value">${labelOf(AC_SEVERITY_LABELS, investigateData.severity_level)}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ลักษณะการหลีกเลี่ยง:</label>
              <div class="form-value">${labelOf(AC_AVOIDABILITY_LABELS, investigateData.avoidability)}</div>
            </div>
            <div class="form-group col-span-2">
              <label class="form-label">รายละเอียดการสอบสวน:</label>
              <div class="text-area">${investigateData.accident_description || ' '}</div>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="section-header">
          <h3>การวิเคราะห์สาเหตุและมาตรการ</h3>
          <p>Why-Why Analysis / Root Cause (5M1E) / Corrective Actions</p>
        </div>
        <div class="section-content">
          ${analysisHTML || '<div class="form-value">ยังไม่มีการวิเคราะห์สาเหตุ</div>'}
        </div>

        <div class="divider"></div>

        <div class="section-header">
          <h3>การประเมินความเสี่ยง</h3>
          <p>Risk Assessment</p>
        </div>
        <div class="section-content">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">มีการประเมินความเสี่ยงสำหรับกิจกรรมนี้:</label>
              <div class="form-value">${labelOf(AC_YES_NO_NA_LABELS, investigateData.risk_assessment_completed)}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ทบทวนการประเมินหลังเกิดอุบัติเหตุ:</label>
              <div class="form-value">${labelOf(AC_YES_NO_NA_LABELS, investigateData.risk_assessment_reviewed)}</div>
            </div>
            <div class="form-group col-span-2">
              <label class="form-label">ผลการทบทวนการประเมินความเสี่ยง:</label>
              <div class="form-value">${labelOf(AC_RISK_RESULT_LABELS, investigateData.risk_assessment_result)}</div>
            </div>
            <div class="form-group">
              <label class="form-label">วันที่ประเมิน / ทบทวน:</label>
              <div class="form-value">${investigateData.risk_assessment_date ? formatShortDate(investigateData.risk_assessment_date) : ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ประเมินโดย (Assessment team):</label>
              <div class="form-value">${investigateData.risk_assessment_team || ' '}</div>
            </div>
            <div class="form-group col-span-2">
              <label class="form-label">แนบเอกสารการประเมินความเสี่ยง:</label>
              <div class="form-value">${labelOf(AC_YES_NO_NA_LABELS, investigateData.risk_assessment_attached)}</div>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="section-header">
          <h3>ผู้เข้าร่วมสอบสวน</h3>
          <p>Investigators</p>
        </div>
        <div class="section-content">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 8%;" class="text-center">ลำดับ</th>
                <th style="width: 46%;">ชื่อ - สกุล</th>
                <th style="width: 46%;">ตำแหน่ง</th>
              </tr>
            </thead>
            <tbody>
              ${(investigators.length > 0 ? investigators : [null, null]).map((person: any, i: number) => `
                <tr>
                  <td class="text-center">${i + 1}</td>
                  <td>${person?.name || ''}</td>
                  <td>${person?.position || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
};

/** ภาพประกอบเหตุการณ์จากไฟล์แนบ (เฉพาะไฟล์รูป) */
const generatePhotosHTML = (attachedFiles?: { [key: string]: any[] }): string => {
  if (!attachedFiles) return '';

  const isImage = (item: any) => {
    const type = item?.file?.type || '';
    if (type.startsWith('image/')) return true;
    const name = (item?.file?.name || item?.url || '').toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp)(\?|$)/.test(name);
  };

  const groups = Object.entries(attachedFiles)
    .map(([category, files]) => ({
      category,
      label: getCategory(category)?.label || category,
      images: (Array.isArray(files) ? files : []).filter(isImage),
    }))
    .filter((group) => group.images.length > 0);

  if (groups.length === 0) return '';

  const groupsHTML = groups
    .map((group) => `
          <p class="photo-group-title">${group.label} (${group.images.length} รูป)</p>
          <div class="photo-grid">
            ${group.images.map((item: any, i: number) => `
              <div class="photo-item">
                <img src="${item.url}" alt="${group.label} ${i + 1}" />
                <div class="photo-caption">${i + 1}. ${item?.file?.name || ''}</div>
              </div>
            `).join('')}
          </div>`)
    .join('');

  return `
        <div class="page-break"></div>

        <div class="section-header">
          <h3>ภาพประกอบเหตุการณ์</h3>
          <p>Photographic Evidence</p>
        </div>
        <div class="section-content">
          ${groupsHTML}
        </div>`;
};

export const printDocument_ac = (data: PrintACDocumentData) => {
  console.log("printDocument_ac data:", data);
  const { formData, investigateData, userinfo, attachedFiles, parts = 'both' } = data;
  const htmlContent = generateACFormHTML(formData, investigateData, userinfo, attachedFiles, parts);
  const printWindow = window.open('', '', 'width=800,height=600');
  
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  }
};

const generateACFormHTML = (formData: caseReport_AC, investigateData?: Partial<investigate_AC>, userinfo?: any, attachedFiles?: { [key: string]: any[] }, parts: PrintParts = 'both'): string => {
  const includePart1 = parts === 'part1' || parts === 'both';
  const includePart2 = parts === 'part2' || parts === 'both';
  // ค่าเสียหาย: แสดงเฉพาะกลุ่มที่มีข้อมูล (สินค้า / รถและอื่นๆ) ในตารางเดียว
  const damageItems = Array.isArray(formData.damage_items) ? formData.damage_items : [];
  const baht = (value: any) => Number(value) ? Number(value).toLocaleString('th-TH') : '';

  const damageGroups = [
    {
      key: 'goods',
      label: 'ความเสียหายของสินค้า',
      shown: formData.product_damage === 'yes',
      estimated: Number(formData.estimated_goods_damage_value) || 0,
      actual: Number(formData.actual_goods_damage_value) || 0,
      rows: damageItems.filter((item: any) => item?.damage_category === 'goods'),
    },
    {
      key: 'vehicle',
      label: 'ความเสียหายของรถและอื่นๆ',
      shown: formData.truck_damage === 'yes',
      estimated: Number(formData.estimated_vehicle_damage_value) || 0,
      actual: Number(formData.actual_vehicle_damage_value) || 0,
      rows: damageItems.filter((item: any) => item?.damage_category === 'vehicle'),
    },
  ]
    .map((group) => {
      // เก็บเฉพาะแถวที่กรอกข้อมูลจริง
      const rows = group.rows.filter(
        (item: any) => (item?.damage_detail || '').trim() !== '' || Number(item?.damage_value) > 0
      );
      const rowsTotal = rows.reduce((sum: number, item: any) => sum + (Number(item?.damage_value) || 0), 0);
      return { ...group, rows: group.shown ? rows : [], total: group.shown ? (rowsTotal || group.actual) : group.actual };
    })
    // กลุ่มที่ระบุว่า "ไม่เสียหาย" จะขึ้นเฉพาะเมื่อมียอดค้างจากข้อมูลเดิม ไม่เอาแถวที่ถูกซ่อนมาพิมพ์
    .filter((group) => group.shown || group.estimated > 0 || group.actual > 0);

  const acDocumentControl = {
    documentNo: formData.document_no_ac,
    documentName: 'Accident Report (AC)',
    ownerName: formData.reporter_name,
    approvedByLabel: 'Investigate By',
    approvedDateLabel: 'Investigate Date',
  };

  const totalEstimated = damageGroups.reduce((sum, group) => sum + group.estimated, 0);
  const totalActual = damageGroups.reduce((sum, group) => sum + group.total, 0);

  const damageTableHTML = damageGroups.length === 0 ? '' : `
          <table class="data-table" style="margin-bottom: 16px;">
            <thead>
              <tr>
                <th style="width: 8%;" class="text-center">ลำดับ</th>
                <th style="width: 47%;">รายการความเสียหาย</th>
                <th style="width: 25%;" class="text-right">มูลค่า (บาท)</th>
                <th style="width: 20%;">ผู้รับผิดชอบ</th>
              </tr>
            </thead>
            <tbody>
              ${damageGroups.map((group) => `
                <tr style="background-color: #f3f4f6; font-weight: 600;">
                  <td colspan="4">
                    ${group.label}${group.estimated ? ` <span style="font-weight: 400; color: #6b7280;">(ประมาณการ ${baht(group.estimated)} บาท)</span>` : ''}
                  </td>
                </tr>
                ${group.rows.length > 0
      ? group.rows.map((item: any, i: number) => `
                    <tr>
                      <td class="text-center">${i + 1}</td>
                      <td>${item?.damage_detail || ''}</td>
                      <td class="text-right">${baht(item?.damage_value)}</td>
                      <td>${item?.responsible_party || ''}</td>
                    </tr>
                  `).join('')
      : `
                    <tr>
                      <td colspan="4" style="color: #6b7280;">ไม่มีรายการย่อย</td>
                    </tr>
                  `}
                <tr>
                  <td colspan="2" class="text-right" style="font-weight: 600;">รวม${group.label}</td>
                  <td class="text-right" style="font-weight: 600;">${baht(group.total) || '0'}</td>
                  <td></td>
                </tr>
              `).join('')}
              ${damageGroups.length > 1 ? `
                <tr style="font-weight: 700; background-color: #e5e7eb;">
                  <td colspan="2" class="text-right">รวมค่าเสียหายจริงทั้งหมด</td>
                  <td class="text-right">${baht(totalActual) || '0'}</td>
                  <td></td>
                </tr>
              ` : ''}
              ${totalEstimated ? `
                <tr>
                  <td colspan="2" class="text-right" style="color: #6b7280;">รวมประมาณการทั้งหมด</td>
                  <td class="text-right" style="color: #6b7280;">${baht(totalEstimated)}</td>
                  <td></td>
                </tr>
              ` : ''}
            </tbody>
          </table>`;
  
  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${formData.document_no_ac || 'N/A'}</title>
      <style>
        ${getSharedStyles()}
      </style>
    </head>
    <body>
      <!-- Document Control ตัวจริง: ตรึงไว้ล่างสุดของกระดาษทุกหน้า -->
      ${getDocumentControlHTML({ variant: 'fixed', ...acDocumentControl })}

      <table class="page-wrap">
        <tfoot>
          <tr>
            <td>
      <!-- ชุดจองพื้นที่ท้ายทุกหน้า (ซ่อนไว้) -->
      ${getDocumentControlHTML({ variant: 'spacer', ...acDocumentControl })}
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td>
      <div class="container">
        <!-- Header -->
        <div class="header" style="position: relative; text-align: center;">
          <div style="position: absolute; left: 0; top: 50%; transform: translateY(-65%);">
            <img src="/mena.png" alt="MENA Logo" style="height: 50px; width: auto;" />
          </div>
          <div>
            <h1>แบบรายงานอุบัติเหตุเบื้องต้น</h1>
            <div class="subtitle">Initial Accident Report Form (AC)</div>
          </div>
        </div>
        
        ${includePart1 ? `
        <!-- Part 1 Header -->
        <div class="part-header">
          <p>Part 1: Initial AC Reporting - Overview and key details</p>
          <p>ส่วนที่ 1: รายงานอุบัติเหตุเบื้องต้น - รายละเอียดและข้อมูลสำคัญ</p>
        </div>
        
        <!-- ข้อมูลเบื้องต้น -->
        <div class="section-header">
          <h3>ข้อมูลเบื้องต้น</h3>
          <p>Basic Information</p>
        </div>
        <div class="section-content">
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">เลขที่เอกสาร:</label>
              <div class="">${formData.document_no_ac || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">สถานะ:</label>
              <div class="">${getStatusBadge(formData.casestatus)}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ระดับความสำคัญ:</label>
              <div class="">${getPriorityBadge(formData.priority)}</div>
            </div>
            <div class="form-group">
              <label class="form-label">สำนักงาน/ศูนย์ปฏิบัติการ:</label>
              <div class="form-value">${formData.site_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ฝ่าย:</label>
              <div class="form-value">${formData.department_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ผู้รายงาน:</label>
              <div class="form-value">${formData.reporter_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">วันและเวลา บันทึกเหตุ:</label>
              <div class="form-value">${formatDate(formData.record_datetime)}</div>
            </div>
            <div class="form-group">
              <label class="form-label">วันและเวลา เกิดเหตุ:</label>
              <div class="form-value">${formatDate(formData.incident_datetime)}</div>
            </div>
             <div class="form-group">
              <label class="form-label">ลักษณะความรับผิดจากอุบัติเหตุ:</label>
              <div class="form-value">${formData.fault_party || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">สาเหตุการเกิด:</label>
              <div class="form-value">${formData.incident_cause || ' '}</div>
            </div>
            <div class="form-group col-span-3">
              <label class="form-label">รายละเอียดเหตุการณ์:</label>
              <div class="text-area">${formData.case_details || ' '}</div>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- ข้อมูลการขนส่งและสถานที่ -->
        <div class="section-header">
          <h3>ข้อมูลการขนส่งและสถานที่</h3>
          <p>Transportation and Location Information</p>
        </div>
        <div class="section-content">
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">ลูกค้า:</label>
              <div class="form-value">${formData.client_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ต้นทาง/แพล้น:</label>
              <div class="form-value">${formData.origin_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ปลายทาง:</label>
              <div class="form-value">${formData.destination || ' '}</div>
            </div>
            <div class="form-group col-span-3">
              <label class="form-label">สถานที่เกิดเหตุ:</label>
              <div class="form-value">${formData.case_location || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">จังหวัด:</label>
              <div class="form-value">${formData.province_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">อำเภอ:</label>
              <div class="form-value">${formData.district_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ตำบล:</label>
              <div class="form-value">${formData.sub_district_name || ' '}</div>
            </div>
            <div class="form-group col-span-3">
              <label class="form-label">สถานีตำรวจในพื้นที่:</label>
              <div class="form-value">${formData.police_station_area || ' '}</div>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- Page Break - เริ่มหน้าใหม่ -->
        <div class="page-break"></div>
       
        <!-- ข้อมูลพนักงานจัดส่งและยานพาหนะ -->
        <div class="section-header">
          <h3>ข้อมูลพนักงานจัดส่งและยานพาหนะ</h3>
          <p>Delivery Personnel and Vehicle Information</p>
        </div>
        <div class="section-content">
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">เลขรถ:</label>
              <div class="form-value">${formData.vehicle_truckno || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ทะเบียนรถหัว:</label>
              <div class="form-value">${formData.vehicle_head_plate || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ทะเบียนรถหาง:</label>
              <div class="form-value">${formData.vehicle_tail_plate || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ประเภทคนขับ:</label>
              <div class="form-value">${formData.driver_role_name || ' '}</div>
            </div>
            <div class="form-group col-span-2">
              <label class="form-label">ชื่อ-สกุลคนขับ:</label>
              <div class="form-value">${formData.driver_name || ' '}</div>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- ข้อมูลการทดสอบ -->
        <div class="section-header">
          <h3>ข้อมูลการทดสอบ</h3>
          <p>Test Information</p>
        </div>
        <div class="section-content">
          <div class="grid-4">
            <div class="form-group">
              <label class="form-label">ตรวจแอลกอฮอล์:</label>
              <div>${getRadioBadge(formData.alcohol_test, 'ตรวจ', 'ไม่ตรวจ')}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ผลตรวจแอลกอฮอล์ (mg%):</label>
              <div class="form-value">${formData.alcohol_test === 'yes' ? (formData.alcohol_test_result || '0') : ''}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ตรวจสารเสพติด:</label>
              <div>${getRadioBadge(formData.drug_test, 'ตรวจ', 'ไม่ตรวจ')}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ชนิดสารเสพติดที่พบ:</label>
              <div class="form-value">${formData.drug_test === 'yes' ? (formData.drug_test_result || '') : ''}</div>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- ข้อมูลการบาดเจ็บ -->
        <div class="section-header">
          <h3>ข้อมูลการบาดเจ็บ</h3>
          <p>Injury Information</p>
        </div>
        <div class="section-content">
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">บาดเจ็บ (ไม่เข้ารพ.):</label>
              <div class="form-value">
                <span class="injury-badge injury-minor">${formData.injured_not_hospitalized || 0} คน</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">บาดเจ็บ (เข้ารพ.):</label>
              <div class="form-value">
                <span class="injury-badge injury-hospitalized">${formData.injured_hospitalized || 0} คน</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">เสียชีวิต:</label>
              <div class="form-value">
                <span class="injury-badge injury-fatal">${formData.fatalities || 0} คน</span>
              </div>
            </div>
            <div class="form-group col-span-3">
              <label class="form-label">รายละเอียดการบาดเจ็บ:</label>
              <div class="text-area">${formData.injury_description || ' '}</div>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        <div class="page-break"></div>
        
        <!-- ข้อมูลคู่กรณี -->
        <div class="section-header">
          <h3>ข้อมูลคู่กรณี และการเคลม</h3>
          <p>Other Party Information</p>
        </div>
        <div class="section-content">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">ชื่อ-สกุลคู่กรณี:</label>
              <div class="form-value">${formData.other_party_full_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ทะเบียนรถคู่กรณี:</label>
              <div class="form-value">${formData.other_party_vehicle_plate || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">บริษัท/องค์กรคู่กรณี:</label>
              <div class="form-value">${formData.other_party_company_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">เบอร์โทรศัพท์คู่กรณี:</label>
              <div class="form-value">${formData.other_party_phone || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ประกันภัยคู่กรณี:</label>
              <div class="form-value">${formData.other_party_insurance_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">เลขที่เคลมคู่กรณี:</label>
              <div class="form-value">${formData.other_party_claim_no || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ชื่อ-สกุลเจ้าหน้าที่เคลม:</label>
              <div class="form-value">${formData.claim_officer_full_name || ' '}</div>
            </div>
            <div class="form-group">
              <label class="form-label">เบอร์โทรศัพท์เจ้าหน้าที่เคลม:</label>
              <div class="form-value">${formData.claim_officer_phone || ' '}</div>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        
          <!-- ความเสียหายและมูลค่าความเสียหาย -->
        <div class="section-header">
          <h3>ความเสียหายและมูลค่าความเสียหาย</h3>
          <p>Damage Information and Costs</p>
        </div>
        <div class="section-content">
          <div class="grid-2" style="margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">ความเสียหายของรถ:</label>
              <div>${getRadioBadge(formData.truck_damage, 'เสียหาย', 'ไม่เสียหาย')}</div>
            </div>
            <div class="form-group">
              <label class="form-label">ความเสียหายของสินค้า:</label>
              <div>${getRadioBadge(formData.product_damage, 'เสียหาย', 'ไม่เสียหาย')}</div>
            </div>
            ${formData.truck_damage === 'yes' ? `
            <div class="form-group col-span-2">
              <label class="form-label">เลขที่แจ้งซ่อม (MR):</label>
              <div class="form-value">${formData.repair_request_no || ' '}</div>
            </div>
            <div class="form-group col-span-2">
              <label class="form-label">รายละเอียดความเสียหายของรถ:</label>
              <div class="text-area">${formData.truck_damage_details || ' '}</div>
            </div>
            ` : ''}
            ${formData.product_damage === 'yes' ? `
            <div class="form-group col-span-2">
              <label class="form-label">รายละเอียดความเสียหายของสินค้า:</label>
              <div class="text-area">${formData.product_damage_details || ' '}</div>
            </div>
            ` : ''}
          </div>
          
          ${damageTableHTML}
        </div>
        
        <div class="divider"></div>
        ` : ''}

        <!-- ส่วนที่ 2: ผลการสอบสวน -->
        ${includePart2 ? generateACInvestigateHTML(investigateData, includePart1) : ''}

        <div class="divider"></div>
        <div class="page-break"></div>
        
        <!-- สถานะการติดตามเอกสาร -->
        <div class="section-header">
          <h3>สถานะการติดตามเอกสาร</h3>
          <p>Document Tracking Status</p>
        </div>
        <div class="section-content">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;" class="text-center">ลำดับ</th>
                <th style="width: 30%;">ชื่อเอกสาร</th>
                <th style="width: 15%;">ฝ่ายรับผิดชอบ</th>
                <th style="width: 10%;" class="text-center">สถานะ</th>
                <th style="width: 15%;">เลขที่เอกสาร</th>
                <th style="width: 25%;">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${getCategoriesByCase('ac').map((doc, index) => {
                const docInfo = formData.docs?.[0] || {};
                const hasAttachment = attachedFiles && attachedFiles[doc.value] && attachedFiles[doc.value].length > 0;
                const docStatus = docInfo[doc.value] || DOC_STATUS.attached;

                let status = docStatus;
                if (hasAttachment) {
                  status = 'แนบแล้ว';
                } else if (docStatus === DOC_STATUS.skipped) {
                  status = DOC_STATUS.skipped;
                } else if (docStatus !== DOC_STATUS.attached) {
                  status = DOC_STATUS.missing;
                }

                const docNo = doc.no ? formatDocNos(docInfo, doc.value) : '';
                const remark = docInfo[`${doc.value}_remark`] || '';
                return `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td style="font-size: 11px;">${doc.label}</td>
                  <td style="font-size: 11px;">${getDepartmentPrintLabel(doc.department, formData.department_name)}</td>
                  <td class="text-center">
                    <span style="border-radius: 4px; font-size: 11px;">${status}</span>
                  </td>
                  <td style="font-size: 11px;">${docNo}</td>
                  <td style="font-size: 11px;">${remark}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>

        <!-- ภาพประกอบเหตุการณ์ -->
        ${generatePhotosHTML(attachedFiles)}

        <!-- Footer -->
        <div class="footer">
          <div class="signature-row">
            <div class="signature-box">
              <div class="title">ผู้รายงาน</div>
              <div class="signature-line">( ${formData.reporter_name || '................................'} )</div>
            </div>
            <div class="signature-box">
              <div class="title">ผู้ตรวจสอบ</div>
              <div class="signature-line">( ................................ )</div>
            </div>
            <div class="signature-box">
              <div class="title">ผู้อนุมัติ</div>
              <div class="signature-line">( ................................ )</div>
            </div>
          </div>
        </div>
      </div>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;
};