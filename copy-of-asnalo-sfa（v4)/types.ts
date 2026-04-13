export type DealStage = '初回接触' | 'ヒアリング' | '提案中' | '見積提示' | '成約' | '失注';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  avatarUrl: string;
}

export interface Activity {
  id: string;
  type: '電話' | 'メール' | '商談' | 'メモ';
  date: string;
  content: string;
}

export interface Deal {
  id: string;
  title: string;
  amount: number;
  grossProfit: number; // 粗利
  stage: DealStage;
  clientId: string;
  probability: number;
  expectedCloseDate: string;
  activities: Activity[];
  notes: string;
  nextAction?: string;
  nextActionDate?: string;
}

export interface SalesMetric {
  label: string;
  value: string;
  trend: number; // Percentage change
  trendUp: boolean;
}