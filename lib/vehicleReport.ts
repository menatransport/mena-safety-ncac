// =============================================================================
// Vehicle Inspection Report — รายงานตรวจสภาพรอบคัน (รายคัน) สำหรับพิมพ์/บันทึก PDF
// -----------------------------------------------------------------------------
// ดึงข้อมูลจาก GET /api/task/vehicle-report?task_id=&driver_id=
// แล้วเปิดหน้าต่างพิมพ์ (Ctrl+P → Save as PDF)
// รูปแบบเอกสารอิงสไตล์ทางการเดียวกับ lib/printDocument.ts (AC/NC):
//   • หัวเอกสาร logo + ชื่อฟอร์ม ไทย/อังกฤษ
//   • แบ่งเป็น Part 1–3 พร้อม page-break ที่เหมาะสม
//   • Fixed footer "Document Control & Revision History" ทุกหน้าเมื่อพิมพ์
// =============================================================================

export interface VehicleReportChecklistItem {
    item: string;
    status: string;
    fieldKey?: string;
    remark?: string | null;
}

export interface VehicleReportData {
    task: {
        inspection_task_id: string;
        client_name?: string | null;
        plant_name?: string | null;
        plant_code?: string | null;
        plan_date?: string | null;
        action_date?: string | null;
        trainer_id?: string | null;
        trainer_name?: string | null;
    };
    driver: {
        driver_id: string;
        driver_name: string;
        number_plate?: string | null;
        truck_number?: string | null;
        truck_type?: string | null;
        inspection_date?: string | null;
    };
    checklist: Record<string, VehicleReportChecklistItem[]>;
    vehicle_status: string | null;
    photos: { key: string; label: string; url: string | null }[];
}

const SECTION_LABELS: Record<string, { th: string; en: string }> = {
    front: { th: 'ด้านหน้ารถ', en: 'Front' },
    left: { th: 'ด้านซ้ายรถ', en: 'Left Side' },
    rear: { th: 'ด้านหลังรถ', en: 'Rear' },
    right: { th: 'ด้านขวารถ', en: 'Right Side' },
    inside: { th: 'ภายในห้องโดยสาร', en: 'Cabin / Interior' },
};

const SECTION_ORDER = ['front', 'left', 'rear', 'right', 'inside'];

const esc = (v: unknown) =>
    String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const formatThaiDate = (value?: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatPrintedAt = () =>
    new Date().toLocaleString('th-TH', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

/** สถานะพิเศษ: รถเสีย/เข้าซ่อม → ตรวจสภาพรอบคันไม่ได้ นับเป็น N/A ไม่ใช่ "ไม่ผ่าน" */
const BREAKDOWN_STATUS = 'รถเสีย-ซ่อม';
const isBreakdown = (status: string) => status.includes('รถเสีย');
const isFail = (status: string) => status.includes('ไม่ผ่าน');
const isSkipped = (status: string) =>
    status.includes('ไม่มีให้ตรวจ') || status.includes('Toolbox') || isBreakdown(status) || !status.trim();

const resultBadge = (status: string) => {
    const label = status.trim() || 'ไม่ได้ตรวจ';
    if (isFail(label)) return `<span class="radio-badge radio-fail">${esc(label)}</span>`;
    if (isSkipped(label)) return `<span class="radio-badge radio-na">${esc(label)}</span>`;
    return `<span class="radio-badge radio-pass">${esc(label)}</span>`;
};

const overallBadge = (status: string | null) => {
    if (status === 'pass') return '<span class="verdict verdict-pass">ผ่านการตรวจ / PASS</span>';
    if (status === 'fail') return '<span class="verdict verdict-fail">ไม่ผ่านการตรวจ / FAIL</span>';
    return '<span class="verdict verdict-na">รอผลตรวจ / PENDING</span>';
};

/* -------------------------------------------------------------------------- */
/*  Styles — อิงชุดเดียวกับ printDocument.ts (AC/NC) ให้เอกสารเป็นชุดเดียวกัน     */
/* -------------------------------------------------------------------------- */
const styles = `
  @media print {
    @page {
      /* เว้นขอบบนมากขึ้น กันตารางที่ไหลต่อจากหน้าก่อนชิดขอบกระดาษ */
      size: A4;
      padding: 7mm 5mm 2mm 5mm;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print { display: none !important; }

    /* footer ทุกหน้า = 2 ชั้น
       1) tfoot ของ shell → มองไม่เห็น ทำหน้าที่ "จองพื้นที่จริง" ท้ายทุกหน้า
          (เดิมใช้ position:fixed อย่างเดียว เลยทับแถวล่างสุดจนข้อมูลตกหล่น)
       2) .page-footer-fixed → ตัวที่แสดงจริง ตรึงชิดขอบล่างกระดาษทุกหน้า รวมหน้าสุดท้าย */
    .page-shell > tfoot { display: table-footer-group; }
    .page-shell > tfoot .page-footer { visibility: hidden; }
    .page-footer-fixed {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 10px; /* ให้ความกว้างตรงกับ .container */
    }

    /* ตารางยาว: ให้ตัดข้ามหน้าได้ + หัวตารางซ้ำทุกหน้า + ห้ามตัดกลางแถว */
    .checklist-block { page-break-inside: auto; break-inside: auto; }
    .data-table { page-break-inside: auto; break-inside: auto; }
    .data-table thead { display: table-header-group; }
    .data-table tfoot { display: table-row-group; }
    .data-table tr { page-break-inside: avoid; break-inside: avoid; }

    /* หัวข้อห้ามหลุดจากตารางของตัวเอง */
    .section-header,
    .part-header {
      page-break-inside: avoid; break-inside: avoid;
      page-break-after: avoid; break-after: avoid;
    }

    .photo-card { page-break-inside: avoid; break-inside: avoid; }
  }

  @media screen {
    .page-shell > tfoot,
    .page-footer-fixed { display: none; }
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  /* Page shell — tbody = เนื้อหา, tfoot = Document Control (ซ้ำทุกหน้าเวลาพิมพ์) */
  .page-shell { width: 100%; border-collapse: collapse; }
  .page-shell > tbody > tr > td,
  .page-shell > tfoot > tr > td { padding: 0; border: 0; vertical-align: top; }

  .page-footer { padding-top: 8px; font-size: 9px; color: #374151; background-color: white; }
  .page-footer table { width: 100%; border-collapse: collapse; }
  .page-footer th,
  .page-footer td { border: 1px solid #374151; padding: 3px 6px; text-align: left; }
  .page-footer th { background-color: #e5e7eb; font-weight: 600; text-align: center; }
  .page-footer .label { font-weight: 500; background-color: #c9c9c9; }

  body {
    font-family: 'Sarabun', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.35;
    color: #1f2937;
    font-size: 11px;
    background-color: white;
  }

  .container { max-width: 210mm; margin: 0 auto; padding: 10px; background-color: white; }

  /* หน้าแรกมีที่ว่างเหลือ — เว้นระยะให้หายใจกว่าหน้าอื่น */
  .part-one .part-header { margin: 14px 0 12px; }
  .part-one .section-header { padding: 7px 10px; margin: 16px 0 10px; }
  .part-one .data-table th,
  .part-one .data-table td { padding: 5px 8px; }

  /* Header */
  .header { text-align: center; border-bottom: 1px solid #9ca3af; padding-bottom: 10px; margin-bottom: 14px; }
  .header h1 { color: #1f2937; font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .header .subtitle { color: #4b5563; font-size: 12px; }

  /* Doc Info */
  .doc-info {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 14px; padding: 8px 12px;
    background-color: #f9fafb; border-radius: 5px; border-left: 4px solid #0f766e;
  }
  .doc-info .doc-no { font-size: 13px; font-weight: 600; }
  .doc-info .doc-sub { font-size: 10px; color: #6b7280; }
  .doc-info .doc-status { text-align: right; }

  /* Part / Section headers */
  .part-header { border-bottom: 1px solid #9ca3af; margin: 12px 0 8px; padding-bottom: 4px; }
  .part-header p { font-size: 11px; font-weight: 600; color: #1f2937; }
  .part-header p + p { font-size: 10px; font-weight: 400; color: #6b7280; }

  .section-header { background-color: #e6e6e6; padding: 5px 10px; margin: 10px 0 6px; }
  .section-header h3 { font-size: 12px; font-weight: 700; color: #1f2937; margin: 0; }
  .section-header p { font-size: 10px; font-weight: 600; color: #4b5563; margin: 0; }
  .section-header .count { float: right; font-size: 10px; font-weight: 600; color: #4b5563; }
  .section-header .count .bad { color: #991b1b; }

  /* Tables */
  .data-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .data-table th,
  .data-table td { border: 1px solid #d1d5db; padding: 3px 8px; text-align: left; }
  .data-table th { background-color: #f3f4f6; font-weight: 500; color: #374151; }
  .data-table td { color: #1f2937; background-color: white; }
  .data-table td.label { background-color: #f9fafb; font-weight: 600; color: #374151; white-space: nowrap; }
  .data-table tr.row-fail td { background-color: #fef2f2; }
  .text-center { text-align: center; }

  /* Badges */
  .radio-badge { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; }
  .radio-pass { background-color: #d1fae5; color: #065f46; }
  .radio-fail { background-color: #fecaca; color: #991b1b; }
  .radio-na   { background-color: #e5e7eb; color: #4b5563; }

  .verdict { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; }
  .verdict-pass { background-color: #065f46; color: #fff; }
  .verdict-fail { background-color: #991b1b; color: #fff; }
  .verdict-na   { background-color: #6b7280; color: #fff; }
  .notice-breakdown { border: 1px solid #d97706; background-color: #fffbeb; color: #92400e; border-radius: 4px; padding: 8px 12px; margin: 8px 0; font-size: 12px; font-weight: 600; }
  .notice-breakdown span { display: block; font-weight: 400; font-size: 11px; color: #b45309; margin-top: 2px; }

  /* Photos — ใช้ inline-block แทน grid เพราะ grid ตัดข้ามหน้าตอนพิมพ์แล้วรูปหาย */
  .photo-grid { font-size: 0; }
  .photo-card {
    display: inline-block; vertical-align: top;
    width: calc(50% - 4px); margin: 0 8px 8px 0; font-size: 11px;
    border: 1px solid #d1d5db; page-break-inside: avoid; break-inside: avoid;
  }
  .photo-card:nth-child(2n) { margin-right: 0; }
  .photo-card .cap { background-color: #f3f4f6; border-bottom: 1px solid #d1d5db; padding: 3px 7px; font-size: 10px; font-weight: 600; color: #374151; }
  /* 55mm × 3 แถว + หัวข้อ + footer พอดี 1 หน้า (กันไม่ให้บรรทัดท้ายเอกสารตกไปหน้าใหม่) */
  .photo-card .frame { height: 55mm; display: flex; align-items: center; justify-content: center; background-color: #fafafa; }
  .photo-card img { max-width: 100%; max-height: 55mm; object-fit: contain; }
  .photo-card .empty { font-size: 10px; color: #9ca3af; }

  /* Footer / signatures */
  .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #9ca3af; page-break-inside: avoid; break-inside: avoid; }
  .signature-row { display: flex; justify-content: space-around; margin-bottom: 24px; }
  .signature-box { text-align: center; min-width: 180px; }
  .signature-box .title { font-size: 12px; font-weight: 500; color: #374151; }
  .signature-line { border-top: 1px solid #374151; margin-top: 50px; padding-top: 6px; font-size: 11px; color: #6b7280; }
  .print-info { text-align: center; font-size: 9px; color: #6b7280; margin-top: 10px; }

  /* Page break helpers */
  .page-break { page-break-before: always; break-before: page; }
  .avoid-break { page-break-inside: avoid; break-inside: avoid; }

  /* Screen-only toolbar */
  .toolbar { position: sticky; top: 0; z-index: 10; background-color: #0f766e; color: #fff; padding: 8px 16px; display: flex; gap: 10px; align-items: center; }
  .toolbar button { background-color: #fff; color: #0f766e; border: 0; border-radius: 4px; padding: 5px 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
`;

/* -------------------------------------------------------------------------- */
/*  Builders                                                                  */
/* -------------------------------------------------------------------------- */
function buildChecklistSections(checklist: Record<string, VehicleReportChecklistItem[]>) {
    const keys = [
        ...SECTION_ORDER.filter((k) => checklist[k]?.length),
        ...Object.keys(checklist).filter((k) => !SECTION_ORDER.includes(k) && checklist[k]?.length),
    ];

    if (keys.length === 0) {
        return '<p style="color:#6b7280;font-size:12px;padding:8px 0;">ไม่พบรายการตรวจของรถคันนี้</p>';
    }

    return keys
        .map((key) => {
            const items = checklist[key] ?? [];
            const label = SECTION_LABELS[key] ?? { th: key, en: '' };
            const failed = items.filter((i) => isFail(i.status)).length;

            const rows = items
                .map(
                    (it, i) => `
              <tr class="${isFail(it.status) ? 'row-fail' : ''}">
                <td class="text-center" style="width:6%;">${i + 1}</td>
                <td>${esc(it.item)}</td>
                <td class="text-center" style="width:18%;">${resultBadge(it.status ?? '')}</td>
                <td style="width:26%;">${esc(it.remark ?? '') || '-'}</td>
              </tr>`
                )
                .join('');

            return `
        <div class="checklist-block">
          <div class="section-header">
            <span class="count">${items.length} รายการ${failed > 0 ? ` · <span class="bad">ไม่ผ่าน ${failed}</span>` : ''}</span>
            <h3>${esc(label.th)}</h3>
            <p>${esc(label.en)}</p>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th class="text-center" style="width:6%;">ลำดับ</th>
                <th>รายการตรวจ</th>
                <th class="text-center" style="width:18%;">ผลการตรวจ</th>
                <th style="width:26%;">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
        })
        .join('');
}

function buildDocumentControlFooter(data: VehicleReportData) {
    const { task, driver } = data;
    return `
      <div class="page-footer">
        <table>
          <thead>
            <tr>
              <th colspan="6" style="text-align: center; background-color: #c9c9c9;">Document Control &amp; Revision History</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="label" style="width: 15%;">Document Ref</td>
              <td style="width: 35%;">${esc(task.inspection_task_id)}-${esc(driver.driver_id)}</td>
              <td class="label" style="width: 15%;">Document Name</td>
              <td colspan="3">Vehicle Walk-around Inspection Report (VR)</td>
            </tr>
            <tr>
              <td class="label">Document Owner</td>
              <td>${esc(task.trainer_name || task.trainer_id || ' ')}</td>
              <td class="label">Version No</td>
              <td style="width: 10%;">01</td>
              <td class="label" style="width: 12%;">Revision Date</td>
              <td style="width: 13%;"></td>
            </tr>
            <tr>
              <td class="label">Approved By</td>
              <td> </td>
              <td class="label">Approved Date</td>
              <td> </td>
              <td class="label">Printed</td>
              <td>${esc(formatPrintedAt())}</td>
            </tr>
          </tbody>
        </table>
      </div>`;
}

/**
 * ห่อเนื้อหาทั้งเอกสารด้วยตาราง shell ที่มี tfoot = Document Control
 * → เบราว์เซอร์ซ้ำ footer ทุกหน้าและ "กันพื้นที่จริง" ให้ ไม่ทับแถวสุดท้ายเหมือน position:fixed
 */
function buildPageShell(content: string, footer: string) {
    return `
    <table class="page-shell">
      <tfoot><tr><td>${footer}</td></tr></tfoot>
      <tbody><tr><td>${content}</td></tr></tbody>
    </table>`;
}

/** origin ใช้เติมหน้า path ของโลโก้ เพราะหน้าต่างพิมพ์เปิดจาก about:blank */
export function buildVehicleReportHtml(data: VehicleReportData, origin = '') {
    const { task, driver, photos } = data;

    const allItems = Object.values(data.checklist ?? {}).flat();
    // ทั้งคันถูกตั้งเป็น "รถเสีย-ซ่อม" → รายงานต้องระบุว่าไม่มีการตรวจสภาพรถ
    const breakdownCount = allItems.filter((i) => isBreakdown(i.status ?? '')).length;
    const isVehicleBreakdown = allItems.length > 0 && breakdownCount === allItems.length;
    const breakdownNotice = isVehicleBreakdown
        ? `<div class="notice-breakdown">ไม่มีการตรวจสภาพรถ เนื่องจาก ${esc(BREAKDOWN_STATUS)}
             <span>No walk-around inspection performed — vehicle under breakdown / repair.</span>
           </div>`
        : '';
    const statusBadge = isVehicleBreakdown
        ? `<span class="verdict verdict-na">ไม่มีการตรวจ (${esc(BREAKDOWN_STATUS)})</span>`
        : overallBadge(data.vehicle_status);
    const failCount = allItems.filter((i) => isFail(i.status)).length;
    const naCount = allItems.filter((i) => isSkipped(i.status ?? '')).length;
    const passCount = allItems.length - failCount - naCount;

    const failedList = allItems
        .filter((i) => isFail(i.status))
        .map((i) => `${i.item}${i.remark ? ` (${i.remark})` : ''}`);

    // ใช้เป็นชื่อไฟล์ตั้งต้นตอน Save as PDF — ใส่ทั้งทะเบียนและเบอร์รถ
    const vehicleTitle = [driver.number_plate, driver.truck_number]
        .filter(Boolean)
        .join(' · ') || driver.driver_name;

    const photoCards = photos
        .map(
            (p) => `
      <div class="photo-card">
        <div class="cap">${esc(p.label)}</div>
        <div class="frame">
          ${p.url
                    ? `<img src="${esc(p.url)}" alt="${esc(p.label)}" />`
                    : '<span class="empty">ไม่มีรูปภาพ</span>'
                }
        </div>
      </div>`
        )
        .join('');

    const footerHtml = buildDocumentControlFooter(data);

    const part1 = `
    <!-- Header -->
    <div class="header" style="position: relative; text-align: center;">
      <div style="position: absolute; left: 0; top: 50%; transform: translateY(-65%);">
        <img src="${esc(origin)}/mena.png" alt="MENA Logo" style="height: 50px; width: auto;" />
      </div>
      <div>
        <h1>แบบรายงานผลการตรวจสภาพรถรอบคัน</h1>
        <div class="subtitle">Vehicle Walk-around Inspection Report (VR)</div>
      </div>
    </div>

    <!-- Doc info -->
    <div class="doc-info">
      <div>
        <div class="doc-no">${esc(task.inspection_task_id)}-${esc(driver.driver_id)}</div>
        <div class="doc-sub">ทะเบียนรถ ${esc(driver.number_plate ?? '-')} · เบอร์รถ ${esc(driver.truck_number ?? '-')} · ${esc(driver.driver_name || '-')}</div>
      </div>
      <div class="doc-status">${statusBadge}</div>
    </div>

    ${breakdownNotice}

    <!-- Part 1 -->
    <div class="part-header">
      <p>Part 1: Inspection Overview — งานตรวจ ข้อมูลรถ และสรุปผล</p>
      <p>ส่วนที่ 1: ข้อมูลการตรวจ ข้อมูลรถและพนักงานขับรถ พร้อมสรุปผลการตรวจ</p>
    </div>

    <div class="section-header">
      <h3>ข้อมูลการตรวจ</h3>
      <p>Inspection Information</p>
    </div>
    <table class="data-table avoid-break">
      <tr>
        <td class="label" style="width:18%;">ลูกค้า</td>
        <td style="width:32%;">${esc(task.client_name ?? '-')}</td>
        <td class="label" style="width:18%;">หน่วยงาน / Plant</td>
        <td>${esc(task.plant_name ?? '-')}${task.plant_code ? ` (${esc(task.plant_code)})` : ''}</td>
      </tr>
      <tr>
        <td class="label">วันที่แผนตรวจ</td>
        <td>${esc(formatThaiDate(task.plan_date))}</td>
        <td class="label">วันที่ตรวจจริง</td>
        <td>${esc(formatThaiDate(task.action_date ?? driver.inspection_date))}</td>
      </tr>
      <tr>
        <td class="label">ผู้ตรวจ (Trainer)</td>
        <td>${esc(task.trainer_name || task.trainer_id || '-')}</td>
        <td class="label">เลขที่งานตรวจ</td>
        <td>${esc(task.inspection_task_id)}</td>
      </tr>
    </table>

    <div class="section-header">
      <h3>ข้อมูลรถและพนักงานขับรถ</h3>
      <p>Vehicle &amp; Driver Information</p>
    </div>
    <table class="data-table avoid-break">
      <tr>
        <td class="label" style="width:18%;">ทะเบียนรถ</td>
        <td style="width:32%;"><strong>${esc(driver.number_plate ?? '-')}</strong></td>
        <td class="label" style="width:18%;">หมายเลขรถ</td>
        <td>${esc(driver.truck_number ?? '-')}</td>
      </tr>
      <tr>
        <td class="label">ประเภทรถ</td>
        <td>${esc(driver.truck_type ?? '-')}</td>
        <td class="label">รหัสพนักงาน</td>
        <td>${esc(driver.driver_id)}</td>
      </tr>
      <tr>
        <td class="label">ชื่อพนักงานขับรถ</td>
        <td colspan="3">${esc(driver.driver_name || '-')}</td>
      </tr>
    </table>

    <div class="section-header">
      <h3>สรุปผลการตรวจ</h3>
      <p>Inspection Summary</p>
    </div>
    <table class="data-table avoid-break">
      <thead>
        <tr>
          <th class="text-center">รายการตรวจทั้งหมด</th>
          <th class="text-center">ผ่าน</th>
          <th class="text-center">ไม่ผ่าน</th>
          <th class="text-center">ไม่มีให้ตรวจ/ไม่เกี่ยวข้อง</th>
          <th class="text-center">ผลสรุป</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center"><strong>${allItems.length}</strong></td>
          <td class="text-center" style="color:#065f46;font-weight:600;">${passCount}</td>
          <td class="text-center" style="color:#991b1b;font-weight:600;">${failCount}</td>
          <td class="text-center" style="color:#4b5563;font-weight:600;">${naCount}</td>
          <td class="text-center">${statusBadge}</td>
        </tr>
      </tbody>
    </table>

    ${failCount > 0
            ? `
    <div class="section-header">
      <h3>รายการที่ตรวจไม่ผ่าน</h3>
      <p>Non-conformance Items</p>
    </div>
    <table class="data-table avoid-break">
      <thead>
        <tr><th class="text-center" style="width:8%;">ลำดับ</th><th>รายการ / อาการที่พบ</th></tr>
      </thead>
      <tbody>
        ${failedList
                .map((t, i) => `<tr><td class="text-center">${i + 1}</td><td>${esc(t)}</td></tr>`)
                .join('')}
      </tbody>
    </table>`
            : ''
        }`;

    const part2 = `
    <div class="part-header">
      <p>Part 2: Checklist Result — ผลการตรวจรายรายการ แยกตามด้าน</p>
      <p>ส่วนที่ 2: ผลการตรวจรายการตามด้านของรถ (หน้า / ซ้าย / หลัง / ขวา / ภายใน)</p>
    </div>

    ${breakdownNotice}
    ${buildChecklistSections(data.checklist)}`;

    const part3 = `
    <div class="part-header">
      <p>Part 3: Walk-around Photos &amp; Approval — ภาพถ่ายและการลงนาม</p>
      <p>ส่วนที่ 3: ภาพถ่ายการตรวจรอบคัน และการลงนามรับรอง</p>
    </div>

    <div class="section-header">
      <h3>ภาพถ่ายการตรวจรอบคัน</h3>
      <p>Walk-around Photos</p>
    </div>
    <div class="photo-grid">${photoCards || '<p style="color:#6b7280;font-size:12px;">ไม่มีรูปภาพประกอบ</p>'}</div>

    <div class="print-info">
      เอกสารนี้จัดทำโดยระบบ Safety Trainer App · พิมพ์เมื่อ ${esc(formatPrintedAt())}
    </div>`;

    return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>รายงานตรวจสภาพรอบคัน ${esc(vehicleTitle)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>${styles}</style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF</button>
    <span style="font-size:11px;opacity:.9;">เลือกปลายทางเป็น "Save as PDF" เพื่อบันทึกไฟล์</span>
  </div>

  <div class="page-footer-fixed">${footerHtml}</div>

  <div class="container">
    ${buildPageShell(`<div class="part-one">${part1}</div><div class="page-break"></div>${part2}<div class="page-break"></div>${part3}`, footerHtml)}
  </div>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/*  Entry point                                                               */
/* -------------------------------------------------------------------------- */
/** ดึงข้อมูลรายงาน 1 คัน แล้วเปิดหน้าต่างพิมพ์ (throw ถ้าโหลดไม่สำเร็จ) */
export async function printVehicleReport(taskId: string, driverId: string) {
    const res = await fetch(
        `/api/task/vehicle-report?task_id=${encodeURIComponent(taskId)}&driver_id=${encodeURIComponent(driverId)}`
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `โหลดข้อมูลรายงานไม่สำเร็จ (HTTP ${res.status})`);
    }

    const data: VehicleReportData = await res.json();
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) throw new Error('เบราว์เซอร์บล็อกป๊อปอัป — กรุณาอนุญาตป๊อปอัปแล้วลองใหม่');

    win.document.write(buildVehicleReportHtml(data, window.location.origin));
    win.document.close();
    win.focus();
    // รอให้ฟอนต์ + รูปโหลดครบก่อนเปิดกล่องพิมพ์ ไม่งั้นรูปจะหายจาก PDF
    win.onload = () => setTimeout(() => win.print(), 400);
}
