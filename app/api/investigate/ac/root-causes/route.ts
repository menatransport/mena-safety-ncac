import { NextRequest, NextResponse } from 'next/server';
import type { acRootCauseItem } from '@/lib/caseReport';

/// backend: GET /accident-case-investigate/ (list) + GET /accident-case-investigate/{document_no_ac}

const base = () => (process.env.ac_investigation_url || '').replace(/\/+$/, '');

const PAGE_SIZE = 500; // ค่าสูงสุดที่ backend รับได้
const CONCURRENCY = 8;

interface InvestigateListItem {
  document_no_ac: string;
  root_cause_count?: number;
}

/**
 * POST /api/investigate/ac/root-causes
 * body: { document_nos: string[] }
 * คืน root_causes ของหลายเอกสารพร้อมกัน (ใช้ตอน Export Excel)
 * list ของ backend ไม่มี root_causes มาด้วย จึงใช้ list คัดเฉพาะเอกสารที่สอบสวนแล้ว
 * แล้วค่อยดึงรายละเอียดทีละเอกสาร แทนที่จะยิงทุกเอกสารที่ export
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const documentNos: string[] = body?.document_nos;
    if (!Array.isArray(documentNos) || documentNos.length === 0) {
      return NextResponse.json({ error: 'ต้องระบุเลขที่เอกสาร (document_nos)' }, { status: 400 });
    }
    const wanted = new Set(documentNos);

    const targets: string[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const res = await fetch(`${base()}/?limit=${PAGE_SIZE}&offset=${offset}`);
      if (!res.ok) {
        console.log(`API responded with status: ${res.status}`);
        return NextResponse.json({ error: 'Failed to fetch data from external API' }, { status: res.status });
      }
      const page: InvestigateListItem[] = await res.json();
      for (const item of page) {
        if (wanted.has(item.document_no_ac) && (item.root_cause_count ?? 1) > 0) {
          targets.push(item.document_no_ac);
        }
      }
      if (page.length < PAGE_SIZE) break;
    }

    const rootCauses: Record<string, acRootCauseItem[]> = {};
    let cursor = 0;
    const worker = async () => {
      while (cursor < targets.length) {
        const documentNo = targets[cursor++];
        const res = await fetch(`${base()}/${encodeURIComponent(documentNo)}`).catch(() => null);
        if (!res?.ok) continue;
        const data = await res.json().catch(() => null);
        const items: acRootCauseItem[] = [...(data?.root_causes || [])].sort(
          (a, b) => (a.seq ?? 0) - (b.seq ?? 0)
        );
        rootCauses[documentNo] = items;
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    return NextResponse.json({ root_causes: rootCauses });
  } catch (error) {
    console.error('POST investigate/ac/root-causes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
