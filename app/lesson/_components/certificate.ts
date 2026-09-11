// =============================================================================
// certificate.ts — วาดใบประกาศนียบัตร (Certificate of Completion) ลง <canvas>
// -----------------------------------------------------------------------------
// ทำไมวาดด้วย Canvas 2D แทนการ "แคปหน้าจอ" DOM (html2canvas ฯลฯ):
//   • ไม่ต้องเพิ่ม dependency และไม่มีปัญหา CSS ที่ไลบรารีแปลงไม่ครบ
//   • ได้ไฟล์ความละเอียดคงที่ 2000×1414 px เท่ากันทุกเครื่อง ไม่ขึ้นกับขนาดจอ
//   • คุมงานพิมพ์ระดับเอกสารทางการได้จริง (ขอบลายเส้น ตราประทับ ระยะขอบ)
//
// หน่วยที่ใช้ในไฟล์นี้เป็น "logical unit" ขนาด 1000 × 707 (สัดส่วน A4 แนวนอน)
// แล้วค่อยคูณ CERT_SCALE ตอน render จริง — แก้ layout ที่เดียว ได้ทุกความละเอียด
// =============================================================================

/** สัดส่วน A4 แนวนอน (297×210 มม.) — พิมพ์ลงกระดาษ A4 ได้พอดีไม่ต้องครอป */
export const CERT_W = 1000;
export const CERT_H = 707;
/** คูณ 2 → ไฟล์จริง 2000×1414 px (~170 dpi บน A4) คมพอสำหรับพิมพ์และแชร์ */
export const CERT_SCALE = 2;

/** ข้อมูลที่ต้องใช้ออกใบรับรอง 1 ใบ */
export type CertificateData = {
    /** ชื่อ-นามสกุลผู้รับ */
    recipientName: string;
    driverId: string;
    lessonId: string;
    lessonTitle: string;
    score: number;
    total: number;
    /** วันที่ออกใบรับรอง = วันที่สอบผ่าน */
    issuedAt: Date;
    /** ลูกค้า/หน่วยงานที่สังกัด (ไม่ระบุก็ได้) */
    clientName?: string;
};

/** ชื่อฟอนต์จริงที่ next/font สร้างให้ — อ่านจาก CSS variable ตอน runtime */
export type CertFonts = { sans: string; serif: string };

/* ── จานสีเอกสารทางการ: เขียวเข้ม + ทอง บนกระดาษสีงาช้าง ───────────────────── */
const C = {
    paper: "#FFFDF7",
    ink: "#0C3A2C",
    deep: "#07845A",
    muted: "#5F7A6E",
    faint: "#9DB3A8",
    gold: "#B8963E",
    goldSoft: "#E3CE95",
    goldDeep: "#8A6B21",
};

/* ───────────────────────────── helper: ข้อความ ───────────────────────────── */

/**
 * วาดข้อความพร้อมระยะห่างตัวอักษร (letter-spacing)
 * ctx.letterSpacing ยังไม่รองรับทุกเบราว์เซอร์ จึงวาดทีละตัวเองเพื่อให้ผลตรงกันหมด
 */
const spaced = (
    ctx: CanvasRenderingContext2D,
    str: string,
    x: number,
    y: number,
    spacing: number,
    align: "left" | "center" | "right" = "center"
) => {
    const chars = [...str];
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
    let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
    const prev = ctx.textAlign;
    ctx.textAlign = "left";
    chars.forEach((c, i) => {
        ctx.fillText(c, cx, y);
        cx += widths[i] + spacing;
    });
    ctx.textAlign = prev;
    return total;
};

/**
 * ตัดบรรทัดให้พอดีความกว้าง
 * ภาษาไทยไม่มีช่องว่างระหว่างคำ จึงใช้ Intl.Segmenter ตัดคำก่อน (ถ้าเบราว์เซอร์มี)
 * ไม่งั้นจะตัดกลางคำจนอ่านไม่รู้เรื่อง — fallback เป็นตัดรายอักษรเมื่อไม่รองรับ
 */
const wrap = (ctx: CanvasRenderingContext2D, str: string, maxWidth: number, maxLines: number) => {
    const text = str.trim();
    if (!text) return [""];

    let tokens: string[];
    try {
        const seg = new Intl.Segmenter("th", { granularity: "word" });
        tokens = [...seg.segment(text)].map((s) => s.segment);
    } catch {
        tokens = [...text];
    }

    const lines: string[] = [];
    let line = "";
    let used = 0;
    for (const t of tokens) {
        const next = line + t;
        if (line && ctx.measureText(next).width > maxWidth) {
            lines.push(line.trim());
            if (lines.length === maxLines) break;
            line = t.trimStart();
        } else {
            line = next;
        }
        used += 1;
    }
    if (lines.length < maxLines && line.trim()) {
        lines.push(line.trim());
        used = tokens.length;
    }

    /* ยาวเกินโควตาบรรทัด → ใส่ … ท้ายบรรทัดสุดท้ายแทนการปล่อยให้ล้นกรอบ */
    if (used < tokens.length && lines.length) {
        let last = lines[lines.length - 1];
        while (last.length > 1 && ctx.measureText(last + "…").width > maxWidth) {
            last = last.slice(0, -1);
        }
        lines[lines.length - 1] = last + "…";
    }
    return lines;
};

/**
 * ย่อขนาดฟอนต์ลงจนข้อความพอดีความกว้างที่กำหนด แล้วตั้ง ctx.font ค้างไว้ให้เลย
 * ใช้กับค่าที่ผู้ใช้กรอก (ชื่อ, ชื่อหลักสูตร, เลขที่ใบ) ซึ่งยาวแค่ไหนก็ได้
 */
const fitFont = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    font: (size: number) => string,
    size: number,
    min: number
) => {
    let s = size;
    ctx.font = font(s);
    while (s > min && ctx.measureText(text).width > maxWidth) {
        s -= 0.5;
        ctx.font = font(s);
    }
    return s;
};

/** ตัดท้ายข้อความด้วย … เมื่อยาวเกินกรอบ (ใช้กับบรรทัดที่ย่อฟอนต์ไม่ได้แล้ว) */
const ellipsize = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
    return `${t}…`;
};

/** ข้อความโค้งตามเส้นรอบวง — ใช้กับตัวหนังสือบนตราประทับ */
const arcText = (
    ctx: CanvasRenderingContext2D,
    str: string,
    cx: number,
    cy: number,
    radius: number,
    centerAngle: number,
    spread: number,
    flip: boolean
) => {
    const chars = [...str];
    /**
     * ครึ่งล่างของวงกลม มุมที่เพิ่มขึ้นจะวิ่งไปทางซ้าย ถ้าไล่ตัวอักษรทางเดียวกับครึ่งบน
     * ข้อความจะกลับหลัง (อ่านเป็น TROPSNART) จึงต้องไล่ย้อนทิศเมื่อ flip
     */
    const dir = flip ? -1 : 1;
    const step = (spread / Math.max(1, chars.length - 1)) * dir;
    const start = centerAngle - (spread / 2) * dir;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    chars.forEach((ch, i) => {
        const a = start + step * i;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        ctx.rotate(flip ? a - Math.PI / 2 : a + Math.PI / 2);
        ctx.fillText(ch, 0, 0);
        ctx.restore();
    });
    ctx.restore();
};

/* ───────────────────────────── helper: ลวดลาย ───────────────────────────── */

/** ลายกิโยเช (rosette) จาง ๆ กลางใบ — ลายกันปลอมแบบเดียวกับเอกสารทางการ */
const guilloche = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    ctx.save();
    ctx.globalAlpha = 0.055;
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 0.6;
    for (let ring = 0; ring < 3; ring++) {
        const R = r - ring * 26;
        const petals = 7 + ring * 2;
        ctx.beginPath();
        for (let i = 0; i <= 720; i++) {
            const t = (i * Math.PI) / 180;
            const rad = R * (0.72 + 0.28 * Math.cos(petals * t));
            const x = cx + Math.cos(t) * rad;
            const y = cy + Math.sin(t) * rad * 0.86;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();
};

/** ลายมุมกรอบ — เส้นคู่รูปตัว L + สี่เหลี่ยมข้าวหลามตัด */
const cornerOrnament = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dx: number,
    dy: number
) => {
    ctx.save();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + dx * 52, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * 52);
    ctx.stroke();

    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(x + dx * 38, y + dy * 9);
    ctx.lineTo(x + dx * 9, y + dy * 9);
    ctx.lineTo(x + dx * 9, y + dy * 38);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = C.gold;
    ctx.translate(x + dx * 9, y + dy * 9);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
};

/** เส้นคั่นประดับ: เส้นบาง 2 ข้าง คั่นกลางด้วยข้าวหลามตัด */
const divider = (ctx: CanvasRenderingContext2D, cx: number, y: number, width: number) => {
    ctx.save();
    ctx.strokeStyle = C.gold;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - width / 2, y);
    ctx.lineTo(cx - 12, y);
    ctx.moveTo(cx + 12, y);
    ctx.lineTo(cx + width / 2, y);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = C.gold;
    ctx.translate(cx, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3.5, -3.5, 7, 7);
    ctx.restore();
};

/** ตราประทับฝ่ายความปลอดภัย — ขอบหยัก วงทอง แกนกลางเขียวเข้ม มีเครื่องหมายถูก */
const seal = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, f: CertFonts) => {
    ctx.save();

    /* ขอบหยักรอบนอก */
    ctx.beginPath();
    const teeth = 44;
    for (let i = 0; i <= teeth * 2; i++) {
        const a = (i / (teeth * 2)) * Math.PI * 2;
        const rr = i % 2 === 0 ? r + 3.5 : r;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, C.goldSoft);
    g.addColorStop(0.45, C.gold);
    g.addColorStop(1, C.goldDeep);
    ctx.fillStyle = g;
    ctx.fill();

    /* วงในของแถบทอง */
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
    ctx.stroke();

    /* ตัวหนังสือโค้งบนแถบทอง */
    ctx.fillStyle = C.ink;
    ctx.font = `600 7.5px ${f.serif}`;
    arcText(ctx, "SAFETY DEPARTMENT", cx, cy, r - 12.5, -Math.PI / 2, 2.05, false);
    ctx.font = `600 6.5px ${f.serif}`;
    arcText(ctx, "MENA TRANSPORT", cx, cy, r - 12.5, Math.PI / 2, 1.6, true);

    /* แกนกลาง */
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 19, 0, Math.PI * 2);
    ctx.fill();

    /* เครื่องหมายถูก */
    ctx.strokeStyle = C.goldSoft;
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy - 3);
    ctx.lineTo(cx - 3, cy + 4);
    ctx.lineTo(cx + 10, cy - 10);
    ctx.stroke();

    ctx.fillStyle = C.goldSoft;
    ctx.font = `600 6px ${f.serif}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    spaced(ctx, "CERTIFIED", cx, cy + 17, 1.4, "center");

    ctx.restore();
};

/* ───────────────────────────── ข้อมูล / ฟอนต์ ───────────────────────────── */

/** เลขที่ใบรับรอง — สร้างจากบทเรียน+รหัสพนักงาน+วันที่ จึงซ้ำกันไม่ได้และตรวจย้อนได้ */
export const certificateNo = (d: CertificateData) => {
    const t = d.issuedAt;
    const ymd = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(
        t.getDate()
    ).padStart(2, "0")}`;
    return `MNA-SFT-${d.lessonId}-${d.driverId}-${ymd}`.toUpperCase().replace(/\s+/g, "");
};

/** ชื่อไฟล์ตอนดาวน์โหลด */
export const certificateFileName = (d: CertificateData, ext: string) =>
    `Certificate_${d.lessonId}_${d.driverId}.${ext}`.replace(/\s+/g, "");

/**
 * อ่านชื่อฟอนต์จริงจาก CSS variable ของ next/font
 * (next/font ตั้งชื่อ family แบบสุ่ม เช่น __Mitr_a1b2c3 — hardcode ชื่อไม่ได้)
 */
export const readCertFonts = (el?: HTMLElement | null): CertFonts => {
    const fallback = { sans: "system-ui, sans-serif", serif: "Georgia, 'Times New Roman', serif" };
    if (typeof window === "undefined") return fallback;
    const node = el ?? document.querySelector(".lsn") ?? document.body;
    if (!node) return fallback;
    const cs = getComputedStyle(node);
    const sans = cs.getPropertyValue("--font-mitr").trim();
    const serif = cs.getPropertyValue("--font-cormorant").trim();
    return {
        sans: sans ? `${sans}, ${fallback.sans}` : fallback.sans,
        serif: serif ? `${serif}, ${fallback.serif}` : fallback.serif,
    };
};

/** โหลดฟอนต์ให้เสร็จก่อนวาด — ไม่งั้น canvas จะ fallback เป็นฟอนต์ระบบ */
const ensureFonts = async (f: CertFonts) => {
    if (typeof document === "undefined" || !document.fonts) return;
    const wanted = [
        `300 40px ${f.sans}`,
        `400 40px ${f.sans}`,
        `500 40px ${f.sans}`,
        `600 40px ${f.sans}`,
        `400 40px ${f.serif}`,
        `500 40px ${f.serif}`,
        `600 40px ${f.serif}`,
        `700 40px ${f.serif}`,
        `italic 400 40px ${f.serif}`,
    ];
    await Promise.all(wanted.map((w) => document.fonts.load(w).catch(() => undefined)));
    await document.fonts.ready.catch(() => undefined);
};

/** โหลดโลโก้ (same-origin เท่านั้น เพื่อไม่ให้ canvas โดน taint จน export ไม่ได้) */
const loadLogo = (src: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });

/* ───────────────────────────── ตัวหลัก: วาดใบรับรอง ─────────────────────── */

/**
 * วาดใบประกาศนียบัตรลง canvas ที่ส่งเข้ามา (ตั้งขนาด/สเกลให้เอง)
 * เรียกซ้ำได้ — ล้างผืนผ้าใบใหม่ทุกครั้ง
 */
export async function drawCertificate(
    canvas: HTMLCanvasElement,
    data: CertificateData,
    fonts: CertFonts,
    scale = CERT_SCALE
) {
    await ensureFonts(fonts);
    const logo = await loadLogo("/mena.png");

    canvas.width = CERT_W * scale;
    canvas.height = CERT_H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, CERT_W, CERT_H);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";

    const cx = CERT_W / 2;
    const percent = data.total > 0 ? Math.round((data.score / data.total) * 100) : 100;

    /* ── 1. พื้นกระดาษ + แสงมุม ── */
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, CERT_W, CERT_H);

    const tint = (x: number, y: number, r: number, color: string, alpha: number) => {
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, color);
        rg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, CERT_W, CERT_H);
        ctx.restore();
    };
    tint(60, 40, 420, "#12B981", 0.08);
    tint(960, 690, 460, "#D8B860", 0.12);

    /* ── 2. ลายน้ำกลางใบ ── */
    guilloche(ctx, cx, 362, 232);

    /* ── 3. กรอบ 3 ชั้น + ลายมุม ── */
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 5;
    ctx.strokeRect(18, 18, CERT_W - 36, CERT_H - 36);

    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(30, 30, CERT_W - 60, CERT_H - 60);

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(36, 36, CERT_W - 72, CERT_H - 72);
    ctx.restore();

    cornerOrnament(ctx, 36, 36, 1, 1);
    cornerOrnament(ctx, CERT_W - 36, 36, -1, 1);
    cornerOrnament(ctx, 36, CERT_H - 36, 1, -1);
    cornerOrnament(ctx, CERT_W - 36, CERT_H - 36, -1, -1);

    /* ── 4. หัวกระดาษ: โลโก้ + ชื่อบริษัท ── */
    if (logo && logo.naturalHeight > 0) {
        const h = 40;
        const w = (logo.naturalWidth / logo.naturalHeight) * h;
        ctx.drawImage(logo, cx - w / 2, 58, w, h);
    } else {
        ctx.fillStyle = C.ink;
        ctx.font = `700 26px ${fonts.serif}`;
        ctx.fillText("MENA", cx, 90);
    }

    ctx.fillStyle = C.goldDeep;
    ctx.font = `600 12px ${fonts.serif}`;
    spaced(ctx, "MENA TRANSPORT CO., LTD.  ·  SAFETY DEPARTMENT", cx, 122, 3.4);

    /* ── 5. ชื่อเอกสาร ── */
    ctx.fillStyle = C.ink;
    ctx.font = `700 54px ${fonts.serif}`;
    spaced(ctx, "CERTIFICATE", cx, 186, 9);

    ctx.fillStyle = C.goldDeep;
    ctx.font = `500 19px ${fonts.serif}`;
    spaced(ctx, "OF COMPLETION", cx, 214, 10);

    ctx.fillStyle = C.muted;
    ctx.font = `400 14px ${fonts.sans}`;
    ctx.fillText("ประกาศนียบัตรรับรองการฝึกอบรมด้านความปลอดภัย", cx, 241);

    divider(ctx, cx, 260, 300);

    /* ── 6. คำรับรอง + ชื่อผู้รับ ── */
    ctx.fillStyle = C.muted;
    ctx.font = `italic 400 17px ${fonts.serif}`;
    ctx.fillText("This is to certify that", cx, 292);

    ctx.fillStyle = C.faint;
    ctx.font = `300 13px ${fonts.sans}`;
    ctx.fillText("ขอมอบประกาศนียบัตรฉบับนี้ไว้เพื่อแสดงว่า", cx, 312);

    /* ชื่อยาวเกินกรอบ → ย่อขนาดฟอนต์ลงอัตโนมัติ (ไม่ตัดคำ ไม่ให้ล้นขอบ) */
    fitFont(ctx, data.recipientName, 660, (s) => `600 ${s}px ${fonts.sans}`, 40, 22);
    ctx.fillStyle = C.ink;
    ctx.fillText(data.recipientName, cx, 362);

    const ruleW = Math.min(Math.max(ctx.measureText(data.recipientName).width + 90, 340), 720);
    ctx.save();
    ctx.strokeStyle = C.gold;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - ruleW / 2, 378);
    ctx.lineTo(cx + ruleW / 2, 378);
    ctx.stroke();
    ctx.restore();

    /* ── 7. หลักสูตรที่ผ่าน ── */
    ctx.fillStyle = C.muted;
    ctx.font = `400 13.5px ${fonts.sans}`;
    ctx.fillText("ได้ผ่านการฝึกอบรมและการทดสอบตามเกณฑ์ของหลักสูตร", cx, 406);

    ctx.fillStyle = C.faint;
    ctx.font = `italic 400 12px ${fonts.serif}`;
    ctx.fillText("has successfully completed the safety training course", cx, 423);

    /* ชื่อหลักสูตรได้ 2 บรรทัด — บรรทัดเดียวจัดให้อยู่กลางช่องว่างของบล็อกสองบรรทัด */
    ctx.fillStyle = C.deep;
    ctx.font = `500 21px ${fonts.sans}`;
    const titleLines = wrap(ctx, data.lessonTitle, 700, 2);
    const titleTop = titleLines.length === 1 ? 460 : 452;
    titleLines.forEach((line, i) => ctx.fillText(line, cx, titleTop + i * 27));

    /* ── 8. แถบสรุปผล 3 ช่อง ── */
    const boxW = 196;
    const boxH = 62;
    const gap = 16;
    const rowX = cx - (boxW * 3 + gap * 2) / 2;
    const rowY = 498;

    const cells = [
        { label: "ผลคะแนน · SCORE", value: `${percent}% (${data.score}/${data.total})` },
        { label: "ผลการทดสอบ · RESULT", value: "ผ่าน · PASSED" },
        {
            label: "วันที่ออกให้ · DATE OF ISSUE",
            value: data.issuedAt.toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
            }),
        },
    ];

    cells.forEach((cell, i) => {
        const x = rowX + i * (boxW + gap);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, rowY, boxW, boxH, 12);
        ctx.fillStyle = "rgba(18,185,129,.06)";
        ctx.fill();
        ctx.strokeStyle = "rgba(184,150,62,.42)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        /* ป้าย/ค่าจัดกึ่งกลางแนวตั้งในช่อง: บน 14px · ล่าง 12.5px (เผื่อสระบน–หางล่าง) */
        ctx.fillStyle = C.muted;
        ctx.font = `400 9.5px ${fonts.sans}`;
        spaced(ctx, cell.label, x + boxW / 2, rowY + 21, 0.8);

        /* ค่ายาวเกินช่อง (เช่น 100% (100/100)) ต้องย่อ ไม่ใช่ล้นออกนอกกรอบ */
        ctx.fillStyle = C.ink;
        fitFont(ctx, cell.value, boxW - 24, (s) => `500 ${s}px ${fonts.sans}`, 17, 12);
        ctx.fillText(cell.value, x + boxW / 2, rowY + 45);
    });

    /* ── 9-12. แถบท้ายใบ ──────────────────────────────────────────────────────
       สามคอลัมน์: เลขที่ใบรับรอง (ซ้าย) · ตราประทับ (กลาง) · ลายเซ็น (ขวา)
       ทั้งสองคอลัมน์ข้างใช้เส้นฐานร่วมกันที่ SIG_RULE / LINE_2 / LINE_3
       จึงอ่านเป็นแถวเดียวกัน ไม่ใช่สองก้อนลอย ๆ คนละระดับ */
    const SEP_Y = 574;
    const SEAL_CY = 620;
    const SEAL_R = 39;
    const RULE_Y = 617; // เส้นเลขที่ใบ = เส้นลายเซ็น (แถวเดียวกัน)
    const LINE_2 = 636;
    const LINE_3 = 652;
    const L = 84;
    const R = CERT_W - 84;

    /* เส้นคั่นเว้นช่องกลางไว้ให้ตราประทับ — ไม่งั้นเส้นจะพาดทับขอบตรา */
    ctx.save();
    ctx.strokeStyle = C.gold;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L, SEP_Y);
    ctx.lineTo(cx - 60, SEP_Y);
    ctx.moveTo(cx + 60, SEP_Y);
    ctx.lineTo(R, SEP_Y);
    ctx.stroke();
    ctx.restore();

    /* ── ซ้าย: เลขที่ใบรับรอง / รหัสพนักงาน (กว้างได้ถึงขอบตราประทับ) ── */
    const leftMax = cx - SEAL_R - 30 - L;

    ctx.textAlign = "left";
    ctx.fillStyle = C.faint;
    ctx.font = `400 9px ${fonts.sans}`;
    spaced(ctx, "เลขที่ใบรับรอง · CERTIFICATE NO.", L, 598, 0.6, "left");

    /* เลขที่ใบรับรองใช้ sans — Cormorant เป็นตัวเลข old-style (0 กับ o แยกยาก) */
    ctx.fillStyle = C.ink;
    fitFont(ctx, certificateNo(data), leftMax, (s) => `500 ${s}px ${fonts.sans}`, 12, 8.5);
    ctx.fillText(certificateNo(data), L, RULE_Y);

    ctx.fillStyle = C.muted;
    ctx.font = `400 10.5px ${fonts.sans}`;
    const who = `รหัสพนักงาน ${data.driverId}${data.clientName ? ` · ${data.clientName}` : ""}`;
    ctx.fillText(ellipsize(ctx, who, leftMax), L, LINE_2);

    ctx.fillStyle = C.faint;
    ctx.font = `300 9px ${fonts.sans}`;
    ctx.fillText("ออกโดยระบบ Safety Self Learning", L, LINE_3);

    /* ── กลาง: ตราประทับ (ต้องอยู่ในกรอบใน y=36..671 พอดี) ── */
    seal(ctx, cx, SEAL_CY, SEAL_R, fonts);

    /* ── ขวา: ลายเซ็นผู้มีอำนาจ ── */
    ctx.save();
    ctx.strokeStyle = C.ink;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(700, RULE_Y);
    ctx.lineTo(R, RULE_Y);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = "center";
    const sigX = (700 + R) / 2;
    ctx.fillStyle = C.ink;
    ctx.font = `500 12px ${fonts.sans}`;
    ctx.fillText("ผู้จัดการฝ่ายความปลอดภัย", sigX, LINE_2);

    ctx.fillStyle = C.muted;
    ctx.font = `600 9.5px ${fonts.serif}`;
    spaced(ctx, "SAFETY DEPARTMENT MANAGER", sigX, LINE_3, 1.2);
}

/* ───────────────────────────── ดาวน์โหลดไฟล์ ───────────────────────────── */

/**
 * แปลง canvas เป็นไฟล์ JPEG แล้วสั่งดาวน์โหลด
 * เลือก JPEG อย่างเดียวเพราะใบรับรองเป็นภาพทึบทั้งใบ ไม่ต้องใช้ความโปร่งใสของ PNG
 * ไฟล์เล็กกว่ามาก ส่งต่อทาง LINE/อีเมลได้ง่าย และผู้เรียนไม่ต้องเลือกอะไรเพิ่ม
 */
export async function downloadCertificate(canvas: HTMLCanvasElement, data: CertificateData) {
    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.95)
    );
    if (!blob) throw new Error("สร้างไฟล์ไม่สำเร็จ");

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = certificateFileName(data, "jpg");
    document.body.appendChild(a);
    a.click();
    a.remove();
    /* ปล่อย URL ช้าหน่อยเพื่อให้เบราว์เซอร์บนมือถือเริ่มดาวน์โหลดทัน */
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}
