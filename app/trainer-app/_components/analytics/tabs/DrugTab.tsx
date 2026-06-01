'use client';
import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { ShieldCheck, Wine } from 'lucide-react';
import type { TaskFilterResult } from '../../../type';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface SubstanceRow { substance: string; label: string; pass: number; fail: number; pending: number; }
interface DrugData {
    total: number; pass: number; fail: number; pending: number; pass_rate: number;
    by_substance: SubstanceRow[];
}

interface GroupStat { pass: number; fail: number; pending: number; pass_rate: number; }

const ALCOHOL_SUBSTANCE = 'alcohol';

function calcGroup(rows: SubstanceRow[]): GroupStat {
    const pass = rows.reduce((s, r) => s + r.pass, 0);
    const fail = rows.reduce((s, r) => s + r.fail, 0);
    const pending = rows.reduce((s, r) => s + r.pending, 0);
    const total = pass + fail + pending;
    return { pass, fail, pending, pass_rate: total > 0 ? (pass / total) * 100 : 0 };
}

const BarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl p-3 shadow-xl text-xs">
            <p className="text-white/60 font-medium mb-2">{label}</p>
            {payload.map((e: any) => (
                <div key={e.name} className="flex items-center gap-2 py-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: e.fill }} />
                    <span className="text-white/70">{e.name}</span>
                    <span className="ml-auto font-bold text-white">{e.value}</span>
                </div>
            ))}
        </div>
    );
};

const TabSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="rounded-2xl h-80 bg-white/5 border border-white/10" />
        <div className="lg:col-span-2 rounded-2xl h-80 bg-white/5 border border-white/10" />
    </div>
);

interface GaugePieProps {
    rate: number; color: string; label: string;
    icon: React.ReactNode; textColor: string;
}
const GaugePie = ({ rate, color, label, icon, textColor }: GaugePieProps) => (
    <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 mb-1">
            {icon}
            <span className="text-[11px] font-medium text-white/70">{label}</span>
        </div>
        <div className="w-[120px] h-[120px] relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={[{ value: Math.round(rate) }, { value: 100 - Math.round(rate) }]}
                        cx="50%" cy="50%"
                        startAngle={225} endAngle={-45}
                        innerRadius={36} outerRadius={52}
                        paddingAngle={0} dataKey="value" stroke="none"
                    >
                        <Cell fill={color} />
                        <Cell fill="rgba(255,255,255,0.07)" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className={`text-2xl font-bold ${textColor}`}>{rate.toFixed(1)}%</p>
                <p className="text-[9px] text-white/40 mt-0.5">ผ่าน</p>
            </div>
        </div>
    </div>
);

export const DrugTab = ({ filters }: { filters: TaskFilterResult }) => {
    const [data, setData] = useState<DrugData | null>(null);
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
        fetch(`${API_BASE}/inspection/report_inspection/drug?${p}`)
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

    const alcoholRows = data.by_substance.filter(r => r.substance === ALCOHOL_SUBSTANCE);
    const drugRows    = data.by_substance.filter(r => r.substance !== ALCOHOL_SUBSTANCE);
    const alcoholStat = calcGroup(alcoholRows);
    const drugStat    = calcGroup(drugRows);

    const chipRows = [
        {
            label: 'ผ่าน',
            drug:    { value: drugStat.pass,    color: '#2dd4bf', bg: 'bg-teal-500/15',   border: 'border-teal-400/30' },
            alcohol: { value: alcoholStat.pass,  color: '#818cf8', bg: 'bg-indigo-500/15', border: 'border-indigo-400/30' },
        },
        {
            label: 'ไม่ผ่าน',
            drug:    { value: drugStat.fail,    color: '#fb7185', bg: 'bg-rose-500/15',   border: 'border-rose-400/30' },
            alcohol: { value: alcoholStat.fail,  color: '#fb7185', bg: 'bg-rose-500/15',   border: 'border-rose-400/30' },
        },
        {
            label: 'รอผล',
            drug:    { value: drugStat.pending,    color: '#fbbf24', bg: 'bg-amber-500/15', border: 'border-amber-400/30' },
            alcohol: { value: alcoholStat.pending,  color: '#fbbf24', bg: 'bg-amber-500/15', border: 'border-amber-400/30' },
        },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Dual Gauge */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-teal-900/30 backdrop-blur-md p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500/30 to-indigo-600/30 border border-teal-400/20 flex items-center justify-center">
                            <ShieldCheck size={14} className="text-teal-200" />
                        </div>
                        <h3 className="text-sm font-semibold text-white/90">อัตราผ่านรวม</h3>
                    </div>

                    <div className="flex justify-around w-full">
                        <GaugePie
                            rate={drugStat.pass_rate}
                            color="#2dd4bf"
                            label="สารเสพติด"
                            textColor="text-teal-300"
                            icon={<ShieldCheck size={11} className="text-teal-400" />}
                        />
                        <GaugePie
                            rate={alcoholStat.pass_rate}
                            color="#818cf8"
                            label="แอลกอฮอล์"
                            textColor="text-indigo-300"
                            icon={<Wine size={11} className="text-indigo-400" />}
                        />
                    </div>

                    <div className="mt-4 space-y-2">
                        <div className="grid grid-cols-3 text-[10px] text-white/40 px-1 mb-1">
                            <span />
                            <span className="text-center text-teal-400/70">สารเสพติด</span>
                            <span className="text-center text-indigo-400/70">แอลกอฮอล์</span>
                        </div>
                        {chipRows.map(row => (
                            <div key={row.label} className="grid grid-cols-3 items-center gap-1">
                                <span className="text-[11px] text-white/50">{row.label}</span>
                                <div className={`flex items-center justify-center px-2 py-1 rounded-lg ${row.drug.bg} border ${row.drug.border}`}>
                                    <span className="text-xs font-bold" style={{ color: row.drug.color }}>{row.drug.value}</span>
                                </div>
                                <div className={`flex items-center justify-center px-2 py-1 rounded-lg ${row.alcohol.bg} border ${row.alcohol.border}`}>
                                    <span className="text-xs font-bold" style={{ color: row.alcohol.color }}>{row.alcohol.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Grouped Bar Chart */}
                <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-teal-900/30 backdrop-blur-md p-6">
                    <h3 className="text-sm font-semibold text-white/90 mb-4">ผลตรวจแยกตามสาร</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                            data={data.by_substance}
                            margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
                            barGap={3}
                            barCategoryGap="30%"
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<BarTooltip />} />
                            <Bar dataKey="pass"    name="ผ่าน"    fill="#2dd4bf" radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="fail"    name="ไม่ผ่าน" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="pending" name="รอผล"    fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={26} />
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="flex gap-5 mt-3">
                        {[
                            { color: '#2dd4bf', label: 'ผ่าน' },
                            { color: '#fb7185', label: 'ไม่ผ่าน' },
                            { color: '#fbbf24', label: 'รอผล' },
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
