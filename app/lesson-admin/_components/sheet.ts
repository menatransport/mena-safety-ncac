/**
 * คลาสร่วมของตารางข้อมูล — ใช้ทั้งแท็บบทเรียนและแท็บผู้เรียน
 *
 * สเกล "สบายตา" (ปรับ 7 ก.ย. 2569)
 * -----------------------------------------------------------------------------
 * ตัวอักษรและระยะห่างถูกขยายขึ้นทั้งชุดให้อ่านสบายในการใช้งานทั้งวัน
 * และตารางถูกตรึงไว้ที่ความหนาแน่นระดับ "สบายตา" อย่างเดียว ไม่มีตัวเลือกให้ตั้งค่า
 * — ตัวเลือกที่ผู้ดูแลต้องมานั่งเลือกเองคือภาระ ไม่ใช่ความสามารถ
 *
 * เส้นสองน้ำหนักคือทั้งระบบ:
 *   lsn-line        = เส้น "ภายใน"   — คั่นแถว คั่นช่อง ขอบชิป
 *   lsn-line-strong = เส้น "ขอบเขต" — ขอบแผง ใต้หัวตาราง เหนือแถบท้าย
 */

export const sheet = {
    /** แผงครอบตาราง — เงาระดับ e1 คือขอบนุ่ม ๆ ไม่ใช่เงาลอย */
    panel: 'overflow-hidden rounded-2xl border border-lsn-line-strong bg-white lsn-e1',

    /** แถบเครื่องมือเหนือตาราง (ตั้งใจให้เลื่อนหายไปได้ ไม่ปักหมุด) */
    toolbar:
        'flex min-h-16 flex-wrap items-center gap-3 border-b border-lsn-line-strong px-5 py-3 sm:flex-nowrap',

    /** กรอบเลื่อนแนวนอนของตาราง */
    scroll: 'overflow-x-auto',
    table: 'w-full border-collapse text-[15px]',

    /**
     * หัวตารางค้างไว้เวลาเลื่อน — พื้นทึบ ไม่ใช้กระจกฝ้า
     * ตัวหนังสือไทยจะเลอะเมื่อเนื้อหาเลื่อนผ่านด้านหลัง และเปลืองแรงเครื่องทุกเฟรม
     */
    th: 'sticky top-0 z-10 h-13 whitespace-nowrap bg-lsn-surface px-4 text-left text-[13px] font-medium leading-5 text-lsn-muted',
    thLine: 'border-b border-lsn-line-strong',
    thSorted: 'border-b-2 border-lsn-forest text-lsn-ink',

    /** ปุ่มเรียงลำดับในหัวคอลัมน์ */
    sortBtn: 'flex h-13 w-full items-center gap-2 transition-colors hover:text-lsn-ink',

    td: 'border-b border-lsn-line px-4 align-middle text-lsn-ink',

    /**
     * คอลัมน์เลขลำดับ — ปักหมุดซ้าย พื้นโปร่งเพื่อให้สีของแถว
     * (ชี้เมาส์ / ถูกเลือก) ลอดผ่านได้ ไม่งั้นจะเห็นรอยต่อ
     */
    rowNo: 'sticky left-0 z-[5] w-14 border-b border-lsn-line px-2 text-center text-[13px] tabular-nums text-lsn-muted',
    rowNoHead: 'sticky left-0 top-0 z-20 w-14 bg-lsn-surface px-2 text-center',

    /** แถบท้ายตาราง — จำนวนรายการและการแบ่งหน้าอยู่ด้วยกัน เพราะเป็นความคิดเดียวกัน */
    foot: 'flex min-h-15 flex-wrap items-center justify-between gap-3 border-t border-lsn-line-strong bg-lsn-surface px-5 py-3',

    /** ชิปลูกค้า — ชื่อบริษัทไทยยาว จึงเผื่อความกว้างและตัดด้วย … ที่ตัวอักษรข้างใน */
    chip: 'inline-flex h-7 max-w-52 items-center gap-1.5 overflow-hidden rounded-lg border border-lsn-line bg-lsn-tile px-2.5 text-[13px] leading-5 text-lsn-ink-70',
    chipAccent:
        'inline-flex h-7 items-center gap-1.5 rounded-lg bg-lsn-green-tint px-2.5 text-[13px] leading-5 text-lsn-green-900',

    /** ป้ายสถานะ ผ่าน/ไม่ผ่าน — ใช้พื้นจาง ไม่ใช่สีทึบ ตามไวยากรณ์สีเดิมของธีม */
    pillPass:
        'inline-flex h-7 items-center gap-2 whitespace-nowrap rounded-full border border-lsn-green-900/15 bg-lsn-green-tint px-3 text-[13px] font-medium leading-5 text-lsn-green-900',
    pillFail:
        'inline-flex h-7 items-center gap-2 whitespace-nowrap rounded-full border border-lsn-danger-ink/15 bg-lsn-danger/10 px-3 text-[13px] font-medium leading-5 text-lsn-danger-ink',

    /** ปุ่มในแถว — เห็นตลอดที่ .45 แล้วชัดขึ้นตอนชี้เมาส์
     *  ไม่ซ่อนสนิท เพราะปุ่มที่ซ่อนจะมองไม่เห็นทั้งบนจอสัมผัสและด้วยคีย์บอร์ด */
    rowActions:
        'flex justify-end gap-1 opacity-45 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
    rowAction:
        'flex size-9 items-center justify-center rounded-xl text-lsn-muted transition-colors hover:bg-lsn-green-soft hover:text-lsn-green-900',

    /** การ์ดรายการบนมือถือ — ตารางเลื่อนข้างบนจอเล็กใช้งานไม่ได้จริง */
    card: 'rounded-2xl border border-lsn-line bg-white p-4 transition-colors active:border-lsn-line-strong active:bg-lsn-row-hover',
} as const;

/** ปุ่มและช่องกรอกมาตรฐานของหน้าแอดมิน — สูง 40px ให้กดง่ายและอ่านชัด */
export const control = {
    btnPrimary:
        'lsn-press inline-flex h-10 items-center gap-2 rounded-xl bg-lsn-deep px-4 text-sm font-medium text-white transition-all duration-150 hover:bg-lsn-green-900 active:scale-[.98] active:bg-lsn-green-950 disabled:opacity-60',
    btnSecondary:
        'lsn-press inline-flex h-10 items-center gap-2 rounded-xl border border-lsn-input-line bg-white px-4 text-sm font-medium text-lsn-ink transition-all duration-150 hover:border-lsn-line-strong hover:bg-lsn-surface active:scale-[.98] disabled:opacity-60',
    btnGhost:
        'inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-lsn-green-900 transition-colors hover:bg-lsn-green-tint',
    iconBtn:
        'flex size-10 items-center justify-center rounded-xl text-lsn-muted transition-colors hover:bg-lsn-tile hover:text-lsn-ink disabled:opacity-60',
    input:
        'h-10 w-full rounded-xl border border-lsn-input-line bg-white pl-10 pr-4 text-sm text-lsn-ink outline-none transition placeholder:font-light placeholder:text-lsn-muted focus:border-lsn-forest focus:ring-[3px] focus:ring-lsn-brand/12',
    select:
        'h-10 rounded-xl border border-lsn-input-line bg-white px-3 text-sm text-lsn-ink outline-none transition focus:border-lsn-forest focus:ring-[3px] focus:ring-lsn-brand/12',
} as const;

/**
 * ความสูงแถว — ตรึงไว้ที่ระดับ "สบายตา" อย่างเดียว
 * บทเรียนมีสองบรรทัด (ชื่อ + คำอธิบาย) จึงสูงกว่าผลการเรียน
 */
export const ROW_HEIGHT = {
    lesson: 'h-19',
    user: 'h-16',
} as const;

/** ปุ่มเรียงลำดับบนหัวตาราง */
export type SortDir = 'asc' | 'desc';

export const toggleSort = <K extends string>(
    current: { key: K; dir: SortDir },
    key: K
): { key: K; dir: SortDir } =>
    current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' };

/** เปรียบเทียบค่าสำหรับ sort — รองรับทั้งข้อความไทยและตัวเลข */
export const compareValues = (a: unknown, b: unknown): number => {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a ?? '').localeCompare(String(b ?? ''), 'th', { numeric: true });
};
