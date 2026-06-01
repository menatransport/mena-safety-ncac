'use client';
import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Car } from 'lucide-react';
import type { TaskFilterResult } from '../../../type';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface VehicleData {
    total: number; pass: number; fail: number; pending: number; pass_rate: number;
    top_failed_sections: { section: string; failed: number }[];
}

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

    useEffect(() => {
        setLoading(true);
        setError(null);
        const p = new URLSearchParams();
        filters.selectedYears.forEach(y => p.append('year', String(y)));
        filters.selectedMonths.forEach(m => p.append('month', String(m)));
        if (filters.trainerId) p.set('trainer_id', filters.trainerId);
        if (filters.clientName) p.set('client_name', filters.clientName);
        if (filters.status && filters.status !== 'all') p.set('status', filters.status);
        fetch(`${API_BASE}/inspection/report_inspection/vehicle?${p}`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [filters]);

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
        </div>
    );
};
