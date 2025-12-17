import React, { useState } from 'react';
import { Deal, Client, Activity, DealStage } from '../types';
import { generateEmailDraft, analyzeDealHealth, summarizeActivityLog } from '../services/geminiService';
import { X, Mail, Sparkles, Calendar, FileText, CheckCircle2, AlertCircle, Send, ArrowRight } from 'lucide-react';

interface DealModalProps {
  deal: Deal;
  client: Client;
  onClose: () => void;
  onUpdate: (updatedDeal: Deal) => void;
}

const DealModal: React.FC<DealModalProps> = ({ deal, client, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'ai' | 'report'>('details');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [dealHealth, setDealHealth] = useState<{healthScore: number, analysis: string, suggestedNextSteps: string[]} | null>(null);
  
  // Daily Report State
  const [rawNote, setRawNote] = useState('');
  const [generatedActivity, setGeneratedActivity] = useState<{
    summary: string;
    type: '電話' | 'メール' | '商談' | 'メモ';
    next_action: string;
    due_date: string;
    suggested_phase?: string | null;
  } | null>(null);

  const handleGenerateEmail = async () => {
    setIsGenerating(true);
    setAiResponse(null);
    const draft = await generateEmailDraft(deal, client, "前回の会話のフォローアップと、次回デモの調整");
    setAiResponse(draft);
    setIsGenerating(false);
  };

  const handleAnalyzeDeal = async () => {
    setIsGenerating(true);
    setAiResponse(null);
    const analysis = await analyzeDealHealth(deal, client);
    setDealHealth(analysis);
    setIsGenerating(false);
  };

  const handleSummarizeActivity = async () => {
    if (!rawNote.trim()) return;
    setIsGenerating(true);
    setGeneratedActivity(null);
    const result = await summarizeActivityLog(rawNote, deal);
    setGeneratedActivity(result);
    setIsGenerating(false);
  };

  const handleSaveActivity = () => {
    if (!generatedActivity) return;

    const newActivity: Activity = {
      id: Date.now().toString(),
      type: generatedActivity.type,
      date: new Date().toISOString().split('T')[0],
      content: generatedActivity.summary
    };

    const updatedDeal: Deal = {
      ...deal,
      activities: [newActivity, ...deal.activities],
      nextAction: generatedActivity.next_action,
      nextActionDate: generatedActivity.due_date,
      stage: (generatedActivity.suggested_phase as DealStage) || deal.stage
    };

    onUpdate(updatedDeal);
    setRawNote('');
    setGeneratedActivity(null);
    setActiveTab('details');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold 
                ${deal.stage === '成約' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {deal.stage}
              </span>
              <span className="text-sm text-slate-500">ID: {deal.id}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{deal.title}</h2>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <span className="font-medium text-slate-900">¥{deal.amount.toLocaleString()}</span> • {client.company}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar Navigation */}
          <div className="w-64 bg-slate-50 border-r border-slate-100 p-4 space-y-2">
            <button 
              onClick={() => setActiveTab('details')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'details' ? 'bg-white shadow-sm text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <FileText size={18} /> 詳細・履歴
            </button>
            <button 
              onClick={() => setActiveTab('report')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'report' ? 'bg-white shadow-sm text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Send size={18} /> 日報・活動入力
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'ai' ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-medium border border-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Sparkles size={18} /> AI アシスタント
            </button>
          </div>

          {/* Main Panel */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase">担当者情報</p>
                    <div className="flex items-center gap-3">
                      <img src={client.avatarUrl} alt={client.name} className="w-10 h-10 rounded-full bg-slate-200" />
                      <div>
                        <p className="font-medium text-slate-900">{client.name}</p>
                        <p className="text-sm text-slate-500">{client.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase">案件情報</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">確度</p>
                        <p className="font-medium text-slate-900">{deal.probability}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">完了予定日</p>
                        <p className="font-medium text-slate-900">{deal.expectedCloseDate}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {deal.nextAction && (
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-amber-600 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-bold text-amber-800">ネクストアクション</p>
                      <p className="text-sm text-amber-700 mt-1">{deal.nextAction}</p>
                      <p className="text-xs text-amber-600 mt-1">期限: {deal.nextActionDate}</p>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="font-semibold text-slate-900 mb-4">活動履歴</h3>
                  <div className="space-y-4">
                    {deal.activities.length > 0 ? deal.activities.map(activity => (
                      <div key={activity.id} className="flex gap-4">
                        <div className="mt-1">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold uppercase">
                            {activity.type[0]}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {activity.type}
                            <span className="text-slate-400 font-normal mx-2">•</span> 
                            <span className="text-slate-500 font-normal">{activity.date}</span>
                          </p>
                          <p className="text-sm text-slate-600 mt-1">{activity.content}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-400 italic">活動履歴はありません。</p>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                   <h3 className="font-semibold text-slate-900 mb-2">メモ</h3>
                   <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 border border-slate-100">
                     {deal.notes}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'report' && (
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <h3 className="font-semibold text-slate-900 mb-2">日報・活動入力</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    商談や連絡のメモをそのまま入力してください。AIが要約し、ネクストアクションを提案します。
                  </p>
                  <textarea
                    value={rawNote}
                    onChange={(e) => setRawNote(e.target.value)}
                    placeholder="例: 本日A社を訪問。担当の佐藤さんと面談。予算は100万程度で、来月末には決めたいとのこと。次は見積もりを送る約束をした。"
                    className="w-full h-32 p-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                  ></textarea>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleSummarizeActivity}
                      disabled={isGenerating || !rawNote.trim()}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? <Sparkles className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      AIで要約＆アクション抽出
                    </button>
                  </div>
                </div>

                {generatedActivity && (
                  <div className="animate-in slide-in-from-bottom-2 space-y-4">
                    <div className="bg-white border-2 border-indigo-100 rounded-xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                          <CheckCircle2 className="text-indigo-600" size={20} />
                          生成結果プレビュー
                        </h4>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                          {generatedActivity.type}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase">活動要約</label>
                          <p className="text-sm text-slate-800 mt-1">{generatedActivity.summary}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                            <label className="text-xs font-semibold text-amber-600 uppercase">ネクストアクション</label>
                            <p className="text-sm font-medium text-amber-900 mt-1">{generatedActivity.next_action}</p>
                          </div>
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                             <label className="text-xs font-semibold text-amber-600 uppercase">期限</label>
                             <p className="text-sm font-medium text-amber-900 mt-1">{generatedActivity.due_date}</p>
                          </div>
                        </div>

                        {generatedActivity.suggested_phase && generatedActivity.suggested_phase !== deal.stage && (
                          <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100">
                            <ArrowRight size={16} />
                            フェーズ更新提案: 
                            <span className="font-bold line-through text-blue-400 mx-2">{deal.stage}</span>
                            →
                            <span className="font-bold ml-2">{generatedActivity.suggested_phase}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                        <button 
                          onClick={() => setGeneratedActivity(null)}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                        >
                          キャンセル
                        </button>
                        <button 
                          onClick={handleSaveActivity}
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200"
                        >
                          活動ログに保存
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                    <Sparkles className="text-indigo-600" size={20} /> 
                    Gemini セールスアシスタント
                  </h3>
                  <p className="text-sm text-indigo-700 mb-6">
                    AIを活用して案件を加速させましょう。メールの作成やリスク分析を瞬時に行います。
                  </p>

                  <div className="flex gap-3 flex-wrap">
                    <button 
                      onClick={handleGenerateEmail}
                      disabled={isGenerating}
                      className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50"
                    >
                      <Mail size={16} /> フォローアップメール作成
                    </button>
                    <button 
                      onClick={handleAnalyzeDeal}
                      disabled={isGenerating}
                      className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} /> 案件健全性分析
                    </button>
                  </div>
                </div>

                {isGenerating && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500 animate-pulse">
                    <Sparkles size={32} className="mb-3 text-indigo-400" />
                    <p>Geminiが思考中...</p>
                  </div>
                )}

                {!isGenerating && aiResponse && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-in slide-in-from-bottom-2">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center justify-between">
                      生成されたコンテンツ
                      <button 
                        onClick={() => navigator.clipboard.writeText(aiResponse)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        コピー
                      </button>
                    </h4>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                      {aiResponse}
                    </pre>
                  </div>
                )}

                {!isGenerating && dealHealth && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" 
                            strokeDasharray={226} 
                            strokeDashoffset={226 - (226 * dealHealth.healthScore) / 100} 
                            className={`${dealHealth.healthScore > 70 ? 'text-emerald-500' : dealHealth.healthScore > 40 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`} 
                          />
                        </svg>
                        <span className="absolute text-xl font-bold text-slate-800">{dealHealth.healthScore}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">案件健全性スコア</h4>
                        <p className="text-sm text-slate-600 mt-1">{dealHealth.analysis}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                      <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <AlertCircle size={18} className="text-indigo-600" /> 推奨アクション
                      </h4>
                      <ul className="space-y-2">
                        {dealHealth.suggestedNextSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealModal;