'use client';
import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import type { TaskFilterResult } from '../../../type';
import { analyticsQuery } from './query';

const MONTHS_TH_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmtMonth = (v: string) => {
    const [y, m] = v.split('-');
    return `${y.slice(2)} ${MONTHS_TH_SHORT[parseInt(m, 10) - 1] ?? v}`;
};

interface SummaryData {
    total_tasks: number;
    open: number;
    pending: number;
    completed: number;
    monthly_trend: { month: string; open: number; pending: number; completed: number }[];
}

const TrendTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl p-3 shadow-xl text-xs">
            <p className="text-white/60 font-medium mb-2">{fmtMonth(label)}</p>
            {payload.map((e: any) => (
                <div key={e.name} className="flex items-center gap-2 py-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: e.stroke }} />
                    <span className="text-white/70">{e.name}</span>
                    <span className="ml-auto font-bold text-white">{e.value}</span>
                </div>
            ))}
        </div>
    );
};

const PieTooltip = ({ active, payload, total }: any) => {
    if (!active || !payload?.length) return null;
    const pct = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : '0';
    return (
        <div className="bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl p-3 shadow-xl text-xs">
            <p className="font-bold" style={{ color: payload[0].payload.color }}>{payload[0].name}</p>
            <p className="text-white/70 mt-0.5">{payload[0].value} งาน ({pct}%)</p>
        </div>
    );
};

const TabSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="rounded-2xl h-72 bg-white/5 border border-white/10" />
        <div className="lg:col-span-2 rounded-2xl h-72 bg-white/5 border border-white/10" />
    </div>
);

export const OverviewTab = ({ filters }: { filters: TaskFilterResult }) => {
    const [data, setData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`/api/task/analytics/summary?${analyticsQuery(filters)}`)
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

    const total = data.total_tasks;
    const pieData = [
        { name: 'เสร็จสิ้น',    value: data.completed, color: '#2dd4bf' },
        { name: 'รอดำเนินการ', value: data.pending,   color: '#fbbf24' },
        { name: 'เปิดงาน',     value: data.open,      color: '#60a5fa' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Donut Chart */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-teal-900/30 backdrop-blur-md p-6">
                    <h3 className="text-sm font-semibold text-white/90 mb-4">สัดส่วนสถานะงาน</h3>
                    <div className="w-[180px] h-[180px] mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%" cy="50%"
                                    innerRadius={52} outerRadius={82}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip content={(props: any) => <PieTooltip {...props} total={total} />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2.5 mt-4">
                        {pieData.map(item => (
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

                {/* Area Chart */}
                <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-teal-900/30 backdrop-blur-md p-6">
                    <h3 className="text-sm font-semibold text-white/90 mb-4">
                        แนวโน้มงานรายเดือน
                        <span className="ml-2 text-[10px] font-normal text-white/40">ทั้งหมด {total} งาน</span>
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={data.monthly_trend.filter(d => d.open + d.pending + d.completed > 0)} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                            <defs>
                                {[
                                    { id: 'grad-c', color: '#2dd4bf' },
                                    { id: 'grad-p', color: '#fbbf24' },
                                    { id: 'grad-o', color: '#60a5fa' },
                                ].map(({ id, color }) => (
                                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtMonth} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<TrendTooltip />} />
                            <Area type="monotone" dataKey="completed" name="เสร็จสิ้น"    stroke="#2dd4bf" fill="url(#grad-c)" strokeWidth={2} dot={false} />
                            <Area type="monotone" dataKey="pending"   name="รอดำเนินการ" stroke="#fbbf24" fill="url(#grad-p)" strokeWidth={2} dot={false} />
                            <Area type="monotone" dataKey="open"      name="เปิดงาน"     stroke="#60a5fa" fill="url(#grad-o)" strokeWidth={2} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-5 mt-3">
                        {[
                            { color: '#2dd4bf', label: 'เสร็จสิ้น' },
                            { color: '#fbbf24', label: 'รอดำเนินการ' },
                            { color: '#60a5fa', label: 'เปิดงาน' },
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
