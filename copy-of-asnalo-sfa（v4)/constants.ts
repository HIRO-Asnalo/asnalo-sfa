import { Client, Deal, DealStage } from './types';

export const DEAL_STAGES: DealStage[] = [
  '初回接触',
  'ヒアリング',
  '提案中',
  '見積提示',
  '成約',
  '失注'
];

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: '佐藤 健一',
    email: 'k.sato@techcorp.jp',
    phone: '03-1234-5678',
    company: 'テックコープ株式会社',
    role: 'CTO',
    avatarUrl: 'https://picsum.photos/100/100?random=1'
  },
  {
    id: 'c2',
    name: '田中 美咲',
    email: 'm.tanaka@innovate.co.jp',
    phone: '03-9876-5432',
    company: 'イノベート・ジャパン',
    role: '製品開発部長',
    avatarUrl: 'https://picsum.photos/100/100?random=2'
  },
  {
    id: 'c3',
    name: '鈴木 大輔',
    email: 'd.suzuki@enterprise-net.jp',
    phone: '06-4567-8901',
    company: 'エンタープライズ・ネット',
    role: 'IT本部長',
    avatarUrl: 'https://picsum.photos/100/100?random=3'
  },
  {
    id: 'c4',
    name: '高橋 優子',
    email: 'y.takahashi@startupscale.com',
    phone: '090-2222-3333',
    company: 'スタートアップスケール',
    role: '代表取締役',
    avatarUrl: 'https://picsum.photos/100/100?random=4'
  }
];

// Helper to generate dates relative to today
const getRelativeDate = (monthOffset: number, day: number): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + monthOffset);
  date.setDate(day);
  
  // Format YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${d}`;
};

export const MOCK_DEALS: Deal[] = [
  {
    id: 'd1',
    title: '全社クラウド移行プロジェクト',
    amount: 12500000,
    grossProfit: 5000000,
    stage: '見積提示',
    clientId: 'c1',
    probability: 80,
    expectedCloseDate: getRelativeDate(0, 25), // This month
    activities: [
      { id: 'a1', type: '商談', date: getRelativeDate(-1, 20), content: 'セキュリティ要件についての詳細詰め。' },
      { id: 'a2', type: 'メール', date: getRelativeDate(0, 2), content: '提案書v2を送付済み。' }
    ],
    notes: '移行中のダウンタイムを懸念している。ゼロダウンタイム保証を強調する必要あり。',
    nextAction: '最終見積もりの承認確認',
    nextActionDate: getRelativeDate(0, 10)
  },
  {
    id: 'd2',
    title: 'Q4 ソフトウェアライセンス更新',
    amount: 4500000,
    grossProfit: 900000,
    stage: '提案中',
    clientId: 'c3',
    probability: 60,
    expectedCloseDate: getRelativeDate(0, 28), // This month
    activities: [
      { id: 'a3', type: '電話', date: getRelativeDate(0, 5), content: 'ユーザー数増加に伴うプラン変更の打診。' }
    ],
    notes: '競合X社が20%引きを提示中。サポート品質で差別化を図る。',
    nextAction: '比較資料の作成と送付',
    nextActionDate: getRelativeDate(0, 12)
  },
  {
    id: 'd3',
    title: 'AI分析ツール導入',
    amount: 8500000,
    grossProfit: 3500000,
    stage: 'ヒアリング',
    clientId: 'c2',
    probability: 40,
    expectedCloseDate: getRelativeDate(1, 15), // Next month
    activities: [],
    notes: '予測モデリング機能に強い関心あり。',
    nextAction: 'デモ日程の調整',
    nextActionDate: getRelativeDate(0, 20)
  },
  {
    id: 'd4',
    title: '2025年度 コンサルティング契約',
    amount: 2400000,
    grossProfit: 2000000,
    stage: '成約',
    clientId: 'c4',
    probability: 100,
    expectedCloseDate: getRelativeDate(-1, 15), // Last month
    activities: [],
    notes: '契約締結済み。請求書送付完了。'
  },
  {
    id: 'd5',
    title: 'カスタムERPモジュール開発',
    amount: 6000000,
    grossProfit: 2500000,
    stage: '初回接触',
    clientId: 'c1',
    probability: 20,
    expectedCloseDate: getRelativeDate(2, 10), // 2 months later
    activities: [],
    notes: 'Webフォームからの問い合わせ。'
  }
];