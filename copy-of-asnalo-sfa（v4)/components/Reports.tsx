import React, { useState } from 'react';
import { Deal } from '../types';
import { generateSalesReport } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Sparkles, FileText, Download, Filter } from 'lucide-react';

interface ReportsProps {
  deals: Deal[];
}

const Reports: React.FC<ReportsProps> = ({ deals }) => {
  const [reportText, setReportText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Calculations for Charts ---

  // 1. Activity Type Distribution
  const allActivities = deals.flatMap(d => d.activities);
  const activityCounts = allActivities.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const activityData = Object.entries(activityCounts).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981'];

  // 2. Revenue vs Gross Profit by Stage (excluding Lost)
  const stageFinancials = deals
    .filter(d => d.stage !== '失注')
    .reduce((acc, d) => {
      if (!acc[d.stage]) acc[d.stage] = { name: d.stage, revenue: 0, profit: 0 };
      acc[d.stage].revenue += d.amount;
      acc[d.stage].profit += d.grossProfit;
      return acc;
    }, {} as Record<string, { name: string, revenue: number, profit: number }>);
  
  const financialData = Object.values(stageFinancials);


  const handleGenerateReport = async () => {
    setIsGenerating(true);
    const text = await generateSalesReport(deals);
    setReportText(text);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">営業レポート</h2>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium">
            <Filter size={16} /> フィルター
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium">
            <Download size={16} /> エクスポート
          </button>
        </div>
      </div>

      {/* AI Executive Summary Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Sparkles className="text-indigo-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">AI エグゼクティブサマリー</h3>
              <p className="text-sm text-slate-500">現在のパイプライン全体を分析し、戦略的インサイトを提供します。</p>
            </div>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 flex items-center gap-2"
          >
            {isGenerating ? '分析中...' : 'レポートを生成'}
            {!isGenerating && <Sparkles size={16} />}
          </button>
        </div>
        
        <div className="p-8 min-h-[200px]">
           {!reportText && !isGenerating && (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
               <FileText size={48} className="mb-4 opacity-50" />
               <p>「レポートを生成」ボタンを押すと、AIによる分析が開始されます。</p>
             </div>
           )}
           
           {isGenerating && (
             <div className="space-y-4 animate-pulse max-w-3xl mx-auto">
               <div className="h-4 bg-slate-100 rounded w-3/4"></div>
               <div className="h-4 bg-slate-100 rounded w-full"></div>
               <div className="h-4 bg-slate-100 rounded w-5/6"></div>
               <div className="h-32 bg-slate-50 rounded w-full mt-6"></div>
             </div>
           )}

           {reportText && !isGenerating && (
             <div className="prose prose-indigo max-w-none text-slate-700">
                {reportText.split('\n').map((line, i) => (
                  <p key={i} className="mb-2 text-sm leading-relaxed whitespace-pre-wrap">{line}</p>
                ))}
             </div>
           )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Financials Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">フェーズ別 売上・粗利構成</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `¥${val/10000}万`}/>
                <RechartsTooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`¥${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Bar dataKey="revenue" name="売上" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="粗利" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">活動タイプ別内訳</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Detailed Forecast Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">受注見込み詳細一覧</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">案件名</th>
                <th className="px-6 py-4">フェーズ</th>
                <th className="px-6 py-4">確度</th>
                <th className="px-6 py-4 text-right">受注予定額</th>
                <th className="px-6 py-4 text-right">粗利予定額</th>
                <th className="px-6 py-4">完了予定日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deals.map(deal => (
                <tr key={deal.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{deal.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium 
                      ${deal.stage === '成約' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {deal.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4">{deal.probability}%</td>
                  <td className="px-6 py-4 text-right font-medium text-indigo-900">¥{deal.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-700">¥{deal.grossProfit.toLocaleString()}</td>
                  <td className="px-6 py-4">{deal.expectedCloseDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;