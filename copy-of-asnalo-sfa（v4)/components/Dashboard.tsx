import React from 'react';
import { Deal, SalesMetric } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { DollarSign, TrendingUp, Users, Briefcase, Calendar, PieChart as PieChartIcon, ArrowRight } from 'lucide-react';

interface DashboardProps {
  deals: Deal[];
}

const MetricCard: React.FC<{ metric: SalesMetric; icon: React.ReactNode; color: string }> = ({ metric, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500">{metric.label}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-2">{metric.value}</h3>
      <div className={`flex items-center mt-2 text-sm ${metric.trendUp ? 'text-green-600' : 'text-red-600'}`}>
        <TrendingUp size={16} className={`mr-1 ${!metric.trendUp && 'rotate-180'}`} />
        <span>先月比 {metric.trend}%</span>
      </div>
    </div>
    <div className={`p-3 rounded-lg ${color} text-white`}>
      {icon}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ deals }) => {
  const totalRevenue = deals.reduce((acc, deal) => acc + deal.amount, 0);
  const wonDeals = deals.filter(d => d.stage === '成約').length;
  const winRate = deals.length > 0 ? Math.round((wonDeals / deals.length) * 100) : 0;
  
  // Pipeline Data (Stage based)
  const pipelineData = [
    '初回接触', 'ヒアリング', '提案中', '見積提示', '成約'
  ].map(stage => ({
    name: stage,
    value: deals.filter(d => d.stage === stage).reduce((acc, d) => acc + d.amount, 0)
  }));

  // Monthly Data Calculation
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  // Group deals by month (YYYY-MM)
  const monthlyStats = deals.reduce((acc, deal) => {
    const date = new Date(deal.expectedCloseDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[key]) {
      acc[key] = { month: key, revenue: 0, grossProfit: 0 };
    }
    acc[key].revenue += deal.amount;
    acc[key].grossProfit += deal.grossProfit;
    return acc;
  }, {} as Record<string, { month: string, revenue: number, grossProfit: number }>);

  // Convert to array and sort
  const monthlyData = Object.values(monthlyStats).sort((a: { month: string }, b: { month: string }) => a.month.localeCompare(b.month));

  // Current Month Forecast
  const currentMonthDeals = deals.filter(d => d.expectedCloseDate.startsWith(currentMonthKey));
  const currentMonthRevenue = currentMonthDeals.reduce((sum, d) => sum + d.amount, 0);
  const currentMonthProfit = currentMonthDeals.reduce((sum, d) => sum + d.grossProfit, 0);

  const metrics: { data: SalesMetric; icon: React.ReactNode; color: string }[] = [
    {
      data: { label: '総パイプライン', value: `¥${totalRevenue.toLocaleString()}`, trend: 12, trendUp: true },
      icon: <DollarSign size={24} />,
      color: 'bg-indigo-600'
    },
    {
      data: { label: '進行中案件', value: deals.filter(d => d.stage !== '成約' && d.stage !== '失注').length.toString(), trend: 5, trendUp: true },
      icon: <Briefcase size={24} />,
      color: 'bg-blue-500'
    },
    {
      data: { label: '成約率', value: `${winRate}%`, trend: 2, trendUp: false },
      icon: <TrendingUp size={24} />,
      color: 'bg-emerald-500'
    },
    {
      data: { label: 'アクティブ顧客', value: '18', trend: 8, trendUp: true },
      icon: <Users size={24} />,
      color: 'bg-violet-500'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">営業概要ダッシュボード</h2>
        <div className="text-sm text-slate-500">最終更新: 今すぐ</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, idx) => (
          <MetricCard key={idx} metric={m.data} icon={m.icon} color={m.color} />
        ))}
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Monthly Forecast Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Calendar size={20} className="text-indigo-600" />
            月別 売上・粗利推移（見込み含む）
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `¥${value/10000}万`} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`¥${value.toLocaleString()}`, '']}
                />
                <Legend iconType="circle" />
                <Bar dataKey="revenue" name="売上金額" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="grossProfit" name="粗利金額" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Month Forecast Details */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PieChartIcon size={20} className="text-indigo-600" />
            今月({today.getMonth() + 1}月)の着地見込み
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">受注想定額</p>
              <p className="text-xl font-bold text-indigo-900 mt-1">¥{currentMonthRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">粗利想定額</p>
              <p className="text-xl font-bold text-emerald-900 mt-1">¥{currentMonthProfit.toLocaleString()}</p>
            </div>
          </div>

          <h4 className="text-sm font-semibold text-slate-700 mb-3">今月クローズ予定の案件</h4>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {currentMonthDeals.length > 0 ? (
              currentMonthDeals.map(deal => (
                <div key={deal.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors">
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-slate-900 truncate">{deal.title}</p>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${deal.stage === '成約' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {deal.stage}
                      </span>
                      <span className="text-slate-500">{deal.expectedCloseDate}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-slate-700">¥{(deal.amount / 10000).toLocaleString()}万</p>
                    <p className="text-[10px] text-emerald-600 font-medium">利: ¥{(deal.grossProfit / 10000).toLocaleString()}万</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                今月クローズ予定の案件はありません
              </div>
            )}
          </div>
          
          <button className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 py-2 rounded-lg transition-colors">
            パイプラインで確認 <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Stage Breakdown Chart (Existing but moved down) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mt-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">フェーズ別パイプライン総額</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `¥${value/10000}万`} />
              <Tooltip 
                cursor={{fill: '#f1f5f9'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`¥${value.toLocaleString()}`, '金額']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {pipelineData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#10b981'][index % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;