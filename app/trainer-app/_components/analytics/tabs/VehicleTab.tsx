'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Car, FileText, FilterX, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import type { TaskFilterResult } from '../../../type';
import { CALENDAR_MONTHS_TH } from '../../../constant';
import { analyticsQuery } from './query';
import { ColumnFilter, type SortDir } from './ColumnFilter';
import { printVehicleReport } from '@/lib/vehicleReport';

interface VehicleRow {
    inspection_task_id: string;
    inspection_task_driver_id: string;
    driver_id: string;
    driver_name: string;
    number_plate: string;
    truck_number: string;
    truck_type: string;
    client_name: string;
    plant_name: string;
    plan_date: string | null;
    action_date: string | null;
    vehicle_status: 'pass' | 'fail' | 'pending';
    fail_count: number;
    sections: { key: string; label: string; result: string; fail_items: string[] }[];
}

interface VehicleMonthGroup {
    month: string;
    total: number; pass: number; fail: number; pending: number;
    vehicles: VehicleRow[];
}

interface VehicleData {
    total: number; pass: number; fail: number; pending: number; pass_rate: number;
    top_failed_sections: { section: string; failed: number }[];
    by_month: VehicleMonthGroup[];
}

const MONTH_LABEL = (key: string) => {
    const [y, m] = key.split('-');
    return `${CALENDAR_MONTHS_TH[parseInt(m, 10) - 1] ?? m} ${Number(y) + 543}`;
};

const fmtDate = (v: string | null) =>
    v ? new Date(v).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';

const STATUS_CHIP: Record<VehicleRow['vehicle_status'], { label: string; cls: string }> = {
    pass: { label: 'ผ่าน', cls: 'bg-teal-500/15 text-teal-200 border-teal-400/30' },
    fail: { label: 'ไม่ผ่าน', cls: 'bg-rose-500/15 text-rose-200 border-rose-400/30' },
    pending: { label: 'รอตรวจ', cls: 'bg-amber-500/15 text-amber-200 border-amber-400/30' },
};

/* -------------------------------------------------------------------------- */
/*  นิยามคอลัมน์ — ใช้ทั้งวาดหัวตาราง, กรอง และเรียง                              */
/* -------------------------------------------------------------------------- */
const NO_FAIL = 'ไม่มีจุดที่ไม่ผ่าน';
const STATUS_ORDER: Record<VehicleRow['vehicle_status'], number> = { fail: 0, pending: 1, pass: 2 };

/** ตัดวงเล็บอาการออก เพื่อให้รายการค่าที่กรองได้สั้นและซ้ำกันน้อย */
const failItemName = (raw: string) => raw.replace(/\s*\([^)]*\)\s*$/, '').trim() || raw;

const rowDate = (v: VehicleRow) => v.action_date ?? v.plan_date;

interface ColumnDef {
    key: string;
    label: string;
    /** ค่าที่แถวนี้ "เป็น" สำหรับการกรอง — แถวผ่านเมื่อมีค่าใดค่าหนึ่งถูกเลือก */
    values: (v: VehicleRow) => string[];
    sortValue: (v: VehicleRow) => string | number;
    sortLabels?: { asc: string; desc: string };
    align?: 'center';
    thClass?: string;
}

const COLUMNS: ColumnDef[] = [
    { key: 'number_plate', label: 'ทะเบียนรถ', values: v => [v.number_plate], sortValue: v => v.number_plate, thClass: 'px-4' },
    { key: 'truck_number', label: 'เบอร์รถ', values: v => [v.truck_number], sortValue: v => v.truck_number },
    { key: 'truck_type', label: 'ประเภท', values: v => [v.truck_type], sortValue: v => v.truck_type },
    { key: 'driver_name', label: 'พนักงานขับรถ', values: v => [v.driver_name || '-'], sortValue: v => v.driver_name },
    { key: 'plant_name', label: 'หน่วยงาน', values: v => [v.plant_name], sortValue: v => v.plant_name },
    {
        key: 'date',
        label: 'วันที่ตรวจ',
        values: v => [fmtDate(rowDate(v))],
        sortValue: v => rowDate(v) ?? '',
        sortLabels: { asc: 'เก่า → ใหม่', desc: 'ใหม่ → เก่า' },
    },
    {
        key: 'status',
        label: 'ผลตรวจ',
        values: v => [STATUS_CHIP[v.vehicle_status].label],
        sortValue: v => STATUS_ORDER[v.vehicle_status],
        sortLabels: { asc: 'ไม่ผ่านก่อน', desc: 'ผ่านก่อน' },
        align: 'center',
    },
    {
        key: 'fails',
        label: 'จุดที่ไม่ผ่าน',
        values: v => {
            const items = v.sections.flatMap(s => s.fail_items).map(failItemName);
            return items.length ? [...new Set(items)] : [NO_FAIL];
        },
        sortValue: v => v.fail_count,
        sortLabels: { asc: 'น้อย → มาก', desc: 'มาก → น้อย' },
    },
];

const BarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl p-3 shadow-xl text-xs">
            <p className="text-white/60 font-medium mb-1">{label}</p>
            <p className="font-bold text-rose-300">{payload[0].value} คัน</p>
        </div>
    );
};

const TabSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="rounded-2xl h-80 bg-white/5 border border-white/10" />
        <div className="lg:col-span-2 rounded-2xl h-80 bg-white/5 border border-white/10" />
    </div>
);

export const VehicleTab = ({ filters }: { filters: TaskFilterResult }) => {
    const [data, setData] = useState<VehicleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    /** แสดงทีละเดือนแบบ tab — กันไม่ให้หน้ายืดยาวลงไปด้านล่างเวลากางหลายเดือนพร้อมกัน */
    const [activeMonth, setActiveMonth] = useState<string | null>(null);
    const [pdfBusy, setPdfBusy] = useState<string | null>(null);
    /** ค่าที่ถูกติ๊กไว้ต่อคอลัมน์ — ไม่มี key = เลือกทั้งหมด */
    const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
    const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`/api/task/analytics/vehicle?${analyticsQuery(filters)}`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then((d: VehicleData) => {
                setData(d);
                // เปิดเดือนล่าสุดไว้ให้อัตโนมัติ
                // setOpenMonths(d.by_month?.length ? [d.by_month[0].month] : []);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [filters]);

    const handlePdf = async (row: VehicleRow) => {
        setPdfBusy(row.inspection_task_driver_id);
        try {
            await printVehicleReport(row.inspection_task_id, row.driver_id);
        } catch (e) {
            Swal.fire('สร้างรายงานไม่สำเร็จ', e instanceof Error ? e.message : 'เกิดข้อผิดพลาด', 'error');
        } finally {
            setPdfBusy(null);
        }
    };

    /* ── ตัวกรอง/เรียงระดับคอลัมน์ (สไตล์ Excel) ── */
    const allVehicles = useMemo(
        () => data?.by_month.flatMap(g => g.vehicles) ?? [],
        [data]
    );

    /** ค่าที่เลือกได้ของแต่ละคอลัมน์ — รวมจากทุกเดือนเพื่อให้กรองกลับคืนได้เสมอ */
    const columnOptions = useMemo(() => {
        const map: Record<string, string[]> = {};
        for (const col of COLUMNS) {
            const set = new Set<string>();
            allVehicles.forEach(v => col.values(v).forEach(x => set.add(x)));
            map[col.key] = [...set].sort((a, b) => a.localeCompare(b, 'th'));
        }
        return map;
    }, [allVehicles]);

    const visibleMonths = useMemo(() => {
        if (!data) return [];
        const activeCols = COLUMNS.filter(c => colFilters[c.key]);
        const sortCol = sort ? COLUMNS.find(c => c.key === sort.key) : null;

        return data.by_month
            .map(g => {
                let rows = g.vehicles.filter(v =>
                    activeCols.every(c => c.values(v).some(x => colFilters[c.key].includes(x)))
                );
                if (sortCol && sort) {
                    rows = [...rows].sort((a, b) => {
                        const av = sortCol.sortValue(a);
                        const bv = sortCol.sortValue(b);
                        const cmp = typeof av === 'number' && typeof bv === 'number'
                            ? av - bv
                            : String(av).localeCompare(String(bv), 'th');
                        return sort.dir === 'asc' ? cmp : -cmp;
                    });
                }
                return {
                    ...g,
                    vehicles: rows,
                    total: rows.length,
                    pass: rows.filter(v => v.vehicle_status === 'pass').length,
                    fail: rows.filter(v => v.vehicle_status === 'fail').length,
                    pending: rows.filter(v => v.vehicle_status === 'pending').length,
                };
            })
            .filter(g => g.vehicles.length > 0);
    }, [data, colFilters, sort]);

    // เดือนที่เลือกไว้อาจหายไปหลังกรอง — เด้งกลับไปเดือนแรกที่ยังเหลืออยู่
    useEffect(() => {
        if (visibleMonths.length === 0) {
            setActiveMonth(null);
            return;
        }
        setActiveMonth(prev =>
            prev && visibleMonths.some(g => g.month === prev) ? prev : visibleMonths[0].month
        );
    }, [visibleMonths]);

    const activeGroup = visibleMonths.find(g => g.month === activeMonth) ?? visibleMonths[0];

    const filteredCount = visibleMonths.reduce((s, g) => s + g.vehicles.length, 0);
    const tableFiltered = Object.keys(colFilters).length > 0 || sort !== null;

    const setColumnFilter = (key: string, values: string[] | undefined) =>
        setColFilters(prev => {
            const next = { ...prev };
            if (values === undefined) delete next[key];
            else next[key] = values;
            return next;
        });

    const clearTableFilters = () => { setColFilters({}); setSort(null); };

    if (loading) return <TabSkeleton />;
    if (error || !data) return (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-xs text-rose-300">
            ไม่สามารถโหลดข้อมูลได้: {error ?? 'ไม่มีข้อมูล'}
        </div>
    );

    const total = data.total;
    const passRate = Math.round(data.pass_rate);
    const gaugeData = [{ value: passRate }, { value: 100 - passRate }];
    const statusBreakdown = [
        { name: 'ผ่าน',    value: data.pass,    color: '#2dd4bf' },
        { name: 'ไม่ผ่าน', value: data.fail,    color: '#fb7185' },
        { name: 'รอตรวจ',  value: data.pending, color: '#fbbf24' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gauge + breakdown */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-teal-900/30 backdrop-blur-md p-6 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-4 self-start">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/30 flex items-center justify-center">
                            <Car size={14} className="text-teal-200" />
                        </div>
                        <h3 className="text-sm font-semibold text-white/90">อัตราผ่านรถ</h3>
                    </div>

                    <div className="w-[180px] h-[180px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={gaugeData}
                                    cx="50%" cy="50%"
                                    startAngle={225} endAngle={-45}
                                    innerRadius={55} outerRadius={78}
                                    paddingAngle={0}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell fill="#2dd4bf" />
                                    <Cell fill="rgba(255,255,255,0.07)" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-4xl font-bold text-teal-300">{data.pass_rate.toFixed(1)}%</p>
                            <p className="text-xs text-white/50 mt-0.5">ผ่านการตรวจ</p>
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-2 mt-4">
                        {statusBreakdown.map(item => (
                            <div key={item.name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                                    <span className="text-xs text-white/60">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-white">{item.value}</span>
                                    <span className="text-[10px] text-white/40">
                                        {total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Horizontal Bar Chart — top failed sections */}
                <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-teal-900/30 backdrop-blur-md p-6">
                    <h3 className="text-sm font-semibold text-white/90 mb-4">ส่วนที่ตรวจไม่ผ่านบ่อยที่สุด</h3>
                    {data.top_failed_sections.length === 0 ? (
                        <p className="text-xs text-white/30 text-center py-12">ยังไม่มีข้อมูลส่วนที่ไม่ผ่าน</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={230}>
                            <BarChart
                                data={data.top_failed_sections}
                                layout="vertical"
                                margin={{ top: 4, right: 40, bottom: 0, left: 4 }}
                                barCategoryGap="30%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis
                                    dataKey="section"
                                    type="category"
                                    tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={125}
                                />
                                <Tooltip content={<BarTooltip />} />
                                <Bar
                                    dataKey="failed"
                                    name="ไม่ผ่าน"
                                    fill="#fb7185"
                                    radius={[0, 4, 4, 0]}
                                    maxBarSize={26}
                                    background={{ radius: [0, 4, 4, 0], fill: 'rgba(255,255,255,0.06)' } as any}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                    <div className="flex items-center gap-1.5 mt-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        <span className="text-xs text-white/60">จำนวนครั้งที่ไม่ผ่านการตรวจ</span>
                    </div>
                </div>
            </div>

            {/* ตารางรถรายคัน แบ่งตามเดือน */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-teal-900/30 backdrop-blur-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-semibold text-white/90">รายการตรวจรถรายคัน</h3>
                        <p className="text-[11px] text-white/40 mt-0.5">แบ่งตามเดือน · กดไอคอนบนหัวตารางเพื่อกรอง/เรียง · ปุ่ม PDF เพื่อออกรายงานตรวจรอบคัน</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {tableFiltered && (
                            <button
                                onClick={clearTableFilters}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-teal-500/15 border border-teal-400/30 text-teal-200 hover:bg-teal-500/25 transition-colors cursor-pointer"
                            >
                                <FilterX size={12} /> ล้างตัวกรอง
                            </button>
                        )}
                        <span className="text-[11px] text-white/40">
                            {tableFiltered ? `${filteredCount} / ${total}` : total} คัน
                        </span>
                    </div>
                </div>

                {(data.by_month?.length ?? 0) === 0 ? (
                    <p className="text-xs text-white/30 text-center py-10">ยังไม่มีข้อมูลรถในช่วงที่เลือก</p>
                ) : visibleMonths.length === 0 ? (
                    <p className="text-xs text-white/30 text-center py-10">ไม่มีรถที่ตรงกับตัวกรองที่เลือก</p>
                ) : (
                    <div className="space-y-3">
                        {/* แถบเลือกเดือน — ดูทีละเดือน ไม่กางซ้อนกันจนหน้ายาว */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {visibleMonths.map(group => {
                                const isActive = group.month === activeGroup?.month;
                                return (
                                    <button
                                        key={group.month}
                                        onClick={() => setActiveMonth(group.month)}
                                        className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${isActive
                                            ? 'bg-teal-500/15 border-teal-400/40 text-teal-100'
                                            : 'bg-white/[0.03] border-white/10 text-white/55 hover:text-white/90 hover:bg-white/[0.06]'
                                            }`}
                                    >
                                        {MONTH_LABEL(group.month)}
                                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${isActive ? 'bg-teal-400/20 text-teal-100' : 'bg-white/10 text-white/45'}`}>
                                            {group.total}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {activeGroup && (
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                                    <span className="text-sm font-semibold text-white/90">{MONTH_LABEL(activeGroup.month)}</span>
                                    <span className="text-[11px] text-white/40">{activeGroup.total} คัน</span>
                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-teal-500/15 text-teal-200 border border-teal-400/30">ผ่าน {activeGroup.pass}</span>
                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-500/15 text-rose-200 border border-rose-400/30">ไม่ผ่าน {activeGroup.fail}</span>
                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-500/15 text-amber-200 border border-amber-400/30">รอตรวจ {activeGroup.pending}</span>
                                    </div>
                                </div>

                                {/* จำกัดความสูงตาราง + หัวตารางค้างไว้ → หน้าไม่ยืดลงไปเรื่อย ๆ */}
                                <div className="overflow-auto max-h-[58vh]">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] uppercase tracking-wide text-white/40">
                                                {COLUMNS.map(col => (
                                                    <th
                                                        key={col.key}
                                                        className={`${col.thClass ?? 'px-3'} py-2 font-medium whitespace-nowrap sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm ${col.align === 'center' ? 'text-center' : ''}`}
                                                    >
                                                        <span className={`inline-flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : ''}`}>
                                                            {col.label}
                                                            <ColumnFilter
                                                                label={col.label}
                                                                options={columnOptions[col.key] ?? []}
                                                                selected={colFilters[col.key]}
                                                                sortDir={sort?.key === col.key ? sort.dir : null}
                                                                sortLabels={col.sortLabels}
                                                                onSortChange={dir => setSort(dir ? { key: col.key, dir } : null)}
                                                                onSelectedChange={values => setColumnFilter(col.key, values)}
                                                            />
                                                        </span>
                                                    </th>
                                                ))}
                                                <th className="px-3 py-2 font-medium text-center sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm">รายงาน</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeGroup.vehicles.map(v => {
                                                const chip = STATUS_CHIP[v.vehicle_status];
                                                const failItems = v.sections.flatMap(s => s.fail_items);
                                                const busy = pdfBusy === v.inspection_task_driver_id;
                                                return (
                                                    <tr key={v.inspection_task_driver_id} className="border-t border-white/5 hover:bg-white/[0.04] transition-colors">
                                                        <td className="px-4 py-2.5 text-xs font-semibold text-white/90 whitespace-nowrap">{v.number_plate}</td>
                                                        <td className="px-3 py-2.5 text-xs text-white/60 whitespace-nowrap">{v.truck_number}</td>
                                                        <td className="px-3 py-2.5 text-xs text-white/60 whitespace-nowrap">{v.truck_type}</td>
                                                        <td className="px-3 py-2.5 text-xs text-white/70 whitespace-nowrap">{v.driver_name || '-'}</td>
                                                        <td className="px-3 py-2.5 text-xs text-white/50 whitespace-nowrap">{v.plant_name}</td>
                                                        <td className="px-3 py-2.5 text-xs text-white/50 whitespace-nowrap">{fmtDate(v.action_date ?? v.plan_date)}</td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${chip.cls}`}>
                                                                {chip.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-[11px] text-white/50 max-w-[260px]">
                                                            {failItems.length === 0
                                                                ? <span className="text-white/25">—</span>
                                                                : <span title={failItems.join(', ')} className="line-clamp-2">{failItems.join(', ')}</span>}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <button
                                                                onClick={() => handlePdf(v)}
                                                                disabled={busy}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-teal-400/40 hover:bg-teal-500/10 disabled:opacity-50 transition-colors cursor-pointer"
                                                            >
                                                                {busy
                                                                    ? <Loader2 size={13} className="animate-spin" />
                                                                    : <FileText size={13} />}
                                                                PDF
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
