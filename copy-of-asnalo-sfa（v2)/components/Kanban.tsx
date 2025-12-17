import React from 'react';
import { Deal, DealStage, Client } from '../types';
import { DEAL_STAGES } from '../constants';
import { MoreHorizontal, Plus } from 'lucide-react';

interface KanbanProps {
  deals: Deal[];
  clients: Client[];
  onDealClick: (deal: Deal) => void;
  onDealStageChange: (dealId: string, newStage: DealStage) => void;
}

const Kanban: React.FC<KanbanProps> = ({ deals, clients, onDealClick, onDealStageChange }) => {
  
  const getClient = (id: string) => clients.find(c => c.id === id);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">案件パイプライン</h2>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus size={18} /> 新規案件
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex h-full gap-6 min-w-[1200px]">
          {DEAL_STAGES.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage);
            const stageValue = stageDeals.reduce((sum, d) => sum + d.amount, 0);

            return (
              <div key={stage} className="w-80 flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200/60">
                {/* Column Header */}
                <div className="p-4 border-b border-slate-200/60 bg-slate-50/50 rounded-t-xl">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{stage}</h3>
                    <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">{stageDeals.length}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    ¥{stageValue.toLocaleString()}
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {stageDeals.map(deal => {
                    const client = getClient(deal.clientId);
                    return (
                      <div 
                        key={deal.id}
                        onClick={() => onDealClick(deal)}
                        className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                            確度 {deal.probability}%
                          </span>
                          <button 
                            className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Simple cycle to next stage for demo purposes
                              const nextStageIdx = (DEAL_STAGES.indexOf(stage) + 1) % DEAL_STAGES.length;
                              onDealStageChange(deal.id, DEAL_STAGES[nextStageIdx]);
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                        <h4 className="font-semibold text-slate-800 text-sm mb-1 leading-tight">{deal.title}</h4>
                        <p className="text-xs text-slate-500 mb-3">{client?.company}</p>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-2">
                           <span className="font-bold text-slate-700 text-sm">¥{deal.amount.toLocaleString()}</span>
                           {client && (
                             <img src={client.avatarUrl} alt={client.name} className="w-6 h-6 rounded-full border border-white shadow-sm" />
                           )}
                        </div>
                      </div>
                    );
                  })}
                  {stageDeals.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                      なし
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Kanban;