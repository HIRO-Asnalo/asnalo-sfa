import React, { useState } from 'react';
import { MOCK_CLIENTS, MOCK_DEALS } from './constants';
import { Deal, DealStage } from './types';
import Dashboard from './components/Dashboard';
import Kanban from './components/Kanban';
import DealModal from './components/DealModal';
import Reports from './components/Reports';
import { LayoutDashboard, KanbanSquare, Users, Settings, PieChart, LogOut } from 'lucide-react';

type View = 'dashboard' | 'pipeline' | 'clients' | 'reports';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Helper to update a deal's stage
  const handleStageChange = (dealId: string, newStage: DealStage) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
  };

  const handleUpdateDeal = (updatedDeal: Deal) => {
     setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
     setSelectedDeal(updatedDeal);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
        <div className="p-6 flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-600/50">
            A
          </div>
          <span className="font-bold text-xl tracking-tight">Asnalo SFA</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">ダッシュボード</span>
          </button>
          <button 
            onClick={() => setCurrentView('pipeline')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'pipeline' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <KanbanSquare size={20} />
            <span className="font-medium">案件管理</span>
          </button>
          <button 
            onClick={() => setCurrentView('clients')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'clients' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Users size={20} />
            <span className="font-medium">顧客一覧</span>
          </button>
          
          <div className="pt-4 mt-4 border-t border-slate-800">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">分析</p>
            <button 
              onClick={() => setCurrentView('reports')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'reports' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <PieChart size={20} />
              <span className="font-medium">レポート</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
            <Settings size={20} />
            <span className="font-medium">設定</span>
          </button>
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-slate-800 text-red-400 hover:text-red-300 transition-all mt-1">
            <LogOut size={20} />
            <span className="font-medium">ログアウト</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50/50 p-8">
        {currentView === 'dashboard' && <Dashboard deals={deals} />}
        
        {currentView === 'pipeline' && (
          <Kanban 
            deals={deals} 
            clients={MOCK_CLIENTS} 
            onDealClick={setSelectedDeal}
            onDealStageChange={handleStageChange}
          />
        )}

        {currentView === 'clients' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h2 className="text-xl font-bold text-slate-800">顧客ディレクトリ</h2>
               <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">顧客登録</button>
             </div>
             <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-100">
                 <tr>
                   <th className="px-6 py-4">氏名</th>
                   <th className="px-6 py-4">会社名</th>
                   <th className="px-6 py-4">役職</th>
                   <th className="px-6 py-4">連絡先</th>
                   <th className="px-6 py-4">操作</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {MOCK_CLIENTS.map(client => (
                   <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                       <img src={client.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-slate-200" />
                       {client.name}
                     </td>
                     <td className="px-6 py-4">{client.company}</td>
                     <td className="px-6 py-4">{client.role}</td>
                     <td className="px-6 py-4 text-slate-500">{client.email}</td>
                     <td className="px-6 py-4">
                       <button className="text-indigo-600 hover:text-indigo-800 font-medium">詳細</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}

        {currentView === 'reports' && <Reports deals={deals} />}

      </main>

      {/* Deal Modal */}
      {selectedDeal && (
        <DealModal 
          deal={selectedDeal} 
          client={MOCK_CLIENTS.find(c => c.id === selectedDeal.clientId)!} 
          onClose={() => setSelectedDeal(null)}
          onUpdate={handleUpdateDeal}
        />
      )}
    </div>
  );
};

export default App;