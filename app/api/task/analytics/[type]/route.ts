import { NextResponse } from 'next/server';
import {
    buildDrug,
    buildPpe,
    buildSummary,
    buildVehicle,
    fetchDriverRows,
    fetchTasks,
    filterTasks,
    parseFilters,
} from '@/lib/inspectionAnalytics';

const TYPES = ['summary', 'drug', 'ppe', 'vehicle'] as const;
type AnalyticsType = typeof TYPES[number];

/**
 * GET /api/task/analytics/{summary|drug|ppe|vehicle}
 * Query: year (ซ้ำได้), month (ซ้ำได้), trainer_id, client_name, status
 *
 * รวมข้อมูลจาก /inspection/task/ + /inspection/report/driver-summary แทน
 * endpoint /inspection/report_inspection/* ที่ backend ไม่มีจริง
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ type: string }> }
) {
    const { type } = await params;

    if (!TYPES.includes(type as AnalyticsType)) {
        return NextResponse.json(
            { error: `ไม่รู้จักรายงาน "${type}"`, allowed: TYPES },
            { status: 400 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const filters = parseFilters(searchParams);

        const tasks = filterTasks(await fetchTasks(), filters);

        if (type === 'summary') {
            return NextResponse.json(buildSummary(tasks), { status: 200 });
        }

        const rows = await fetchDriverRows(tasks.map((t) => t.inspection_task_id));

        if (type === 'drug') return NextResponse.json(buildDrug(rows), { status: 200 });
        if (type === 'ppe') return NextResponse.json(buildPpe(rows), { status: 200 });
        return NextResponse.json(buildVehicle(rows), { status: 200 });
    } catch (error) {
        console.error(`GET analytics/${type} error:`, error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
