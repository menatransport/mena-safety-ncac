'use client';
import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { HardHat } from 'lucide-react';
import type { TaskFilterResult } from '../../../type';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface PpeItem { field: string; label: string; pass: number; fail: number; pending: number; compliance_rate: number; }
interface PpeData {
    total: number; pass: number; fail: number; pending: number;
    by_item: PpeItem[];
}

const getBarColor = (v: number) => {
    if (v >= 95) return '#2dd4bf';
    if (v >= 88) return '#60a5fa';
    return '#fbbf24';
};

const BarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl p-3 shadow-xl text-xs">
            <p className="text-white/90 font-semibold">{label}</p>
            <p className="font-bold mt-1" style={{ color: getBarColor(payload[0].value) }}>
                {Number(payload[0].value).toFixed(1)}% compliance
            </p>
        </div>
    );
};

const TabSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="rounded-2xl h-80 bg-white/5 border border-white/10" />
        <div className="lg:col-span-2 rounded-2xl h-80 bg-white/5 border border-white/10" />
    </div>
);

export const PpeTab = ({ filters }: { filters: TaskFilterResult }) => {
    const [data, setData] = useState<PpeData | null>(null);
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
        fetch(`${API_BASE}/inspection/report_inspection/ppe?${p}`)
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
    const statusPie = [
        { name: 'ผ่าน',    value: data.pass,    color: '#2dd4bf' },
        { name: 'ไม่ผ่าน', value: data.fail,    color: '#fb7185' },
        { name: 'รอตรวจ',  value: data.pending, color: '#fbbf24' },
    ];
    const avgCompliance = data.by_item.length > 0
        ? Math.round(data.by_item.reduce((a, b) => a + b.compliance_rate, 0) / data.by_item.length)
        : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Donut + legend */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-teal-900/30 backdrop-blur-md p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/30 flex items-center justify-center">
                            <HardHat size={14} className="text-teal-200" />
                        </div>
                        <h3 className="text-sm font-semibold text-white/90">สัดส่วน PPE</h3>
                    </div>

                    <div className="w-[160px] h-[160px] mx-auto relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusPie}
                                    cx="50%" cy="50%"
                                    innerRadius={45} outerRadius={72}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }: any) => {
                                        if (!active || !payload?.length) return null;
                                        const pct = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : '0';
                                        return (
                                            <div className="bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl p-3 shadow-xl text-xs">
                                                <p className="font-bold" style={{ color: payload[0].payload.color }}>{payload[0].name}</p>
                                                <p className="text-white/70 mt-0.5">{payload[0].value} ชุด ({pct}%)</p>
                                            </div>
                                        );
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-2xl font-bold text-teal-300">{avgCompliance}%</p>
                            <p className="text-[10px] text-white/50">เฉลี่ย</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2.5 mt-4">
                        {statusPie.map(item => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
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

                {/* Horizontal Bar Chart */}
                <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-teal-900/30 backdrop-blur-md p-6">
                    <h3 className="text-sm font-semibold text-white/90 mb-4">อัตราการปฏิบัติตามรายอุปกรณ์</h3>
                    <ResponsiveContainer width="100%" height={230}>
                        <BarChart
                            data={data.by_item}
                            layout="vertical"
                            margin={{ top: 4, right: 40, bottom: 0, left: 4 }}
                            barCategoryGap="25%"
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                            <XAxis
                                type="number"
                                domain={[0, 100]}
                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => `${v}%`}
                            />
                            <YAxis
                                dataKey="label"
                                type="category"
                                tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                width={115}
                            />
                            <Tooltip content={<BarTooltip />} />
                            <Bar
                                dataKey="compliance_rate"
                                radius={[0, 4, 4, 0]}
                                maxBarSize={22}
                                background={{ radius: [0, 4, 4, 0], fill: 'rgba(255,255,255,0.06)' } as any}
                            >
                                {data.by_item.map((item, i) => (
                                    <Cell key={i} fill={getBarColor(item.compliance_rate)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-4 mt-3">
                        {[
                            { color: '#2dd4bf', label: '≥ 95% ดีเยี่ยม' },
                            { color: '#60a5fa', label: '88–94% ดี' },
                            { color: '#fbbf24', label: '< 88% ควรปรับปรุง' },
                        ].map(({ color, label }) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                                <span className="text-xs text-white/60">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
