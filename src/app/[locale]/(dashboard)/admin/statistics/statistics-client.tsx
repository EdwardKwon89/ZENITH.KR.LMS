"use client";

import React, { useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from "recharts";
import { getCostProfitStats } from "@/app/actions/statistics";
import { ZenCard } from "@/components/ui/ZenUI";
import { TrendingUp, DollarSign, Activity, Percent } from "lucide-react";

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function StatisticsClient({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState(initialData.period);
  const [isLoading, setIsLoading] = useState(false);

  const handlePeriodChange = async (newPeriod: 'WEEK' | 'MONTH' | 'YEAR') => {
    setIsLoading(true);
    setPeriod(newPeriod);
    try {
      const result = await getCostProfitStats(newPeriod);
      setData(result);
    } catch (error) {
      alert("통계 조회 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = data.statsByMode.reduce((sum: number, s: any) => sum + s.revenue, 0);
  const totalCost = data.statsByMode.reduce((sum: number, s: any) => sum + s.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {['WEEK', 'MONTH', 'YEAR'].map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p as any)}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              period === p 
                ? "bg-white text-brand-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {p === 'WEEK' ? '주간' : p === 'MONTH' ? '월간' : '연간'}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ZenCard className="p-5 flex items-center gap-4 border-l-4 border-l-brand-500">
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">총 매출</div>
            <div className="text-xl font-bold text-slate-900">${totalRevenue.toLocaleString()}</div>
          </div>
        </ZenCard>
        <ZenCard className="p-5 flex items-center gap-4 border-l-4 border-l-rose-500">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">총 원가</div>
            <div className="text-xl font-bold text-slate-900">${totalCost.toLocaleString()}</div>
          </div>
        </ZenCard>
        <ZenCard className="p-5 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">총 수익</div>
            <div className="text-xl font-bold text-slate-900">${totalProfit.toLocaleString()}</div>
          </div>
        </ZenCard>
        <ZenCard className="p-5 flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Percent size={20} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">평균 수익률</div>
            <div className="text-xl font-bold text-slate-900">{avgMargin.toFixed(1)}%</div>
          </div>
        </ZenCard>
      </div>

      {/* Charts Row 1: Mode Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ZenCard>
          <div className="p-1">
            <h3 className="text-lg font-bold text-slate-800">모드별 수익 분석</h3>
            <p className="text-sm text-slate-500 mb-4">AIR / SEA / CIR 모드별 매출 및 원가 비교</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.statsByMode}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mode" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                  <Bar dataKey="revenue" name="매출" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="원가" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ZenCard>

        <ZenCard>
          <div className="p-1">
            <h3 className="text-lg font-bold text-slate-800">매출 비중</h3>
            <p className="text-sm text-slate-500 mb-4">운송 모드별 매출 기여도</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statsByMode}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="revenue"
                    nameKey="mode"
                  >
                    {data.statsByMode.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ZenCard>
      </div>

      {/* Charts Row 2: Margin Analysis */}
      <ZenCard>
        <div className="p-1">
          <h3 className="text-lg font-bold text-slate-800">수익률 추이 (모드별)</h3>
          <p className="text-sm text-slate-500 mb-4">모드별 이익률(Margin) 현황</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.statsByMode}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mode" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} unit="%" />
                <Tooltip />
                <Line type="monotone" dataKey="margin" name="수익률" stroke="#10b981" strokeWidth={3} dot={{r: 6}} activeDot={{r: 8}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ZenCard>
    </div>
  );
}
