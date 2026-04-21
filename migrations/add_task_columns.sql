-- activitiesテーブルにタスク機能用カラムを追加
-- Supabase SQL Editor で実行してください

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS due_date    date,
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS status      text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_task     boolean DEFAULT false;

-- 期日・担当者でのクエリ高速化
CREATE INDEX IF NOT EXISTS idx_activities_due_date    ON activities(due_date);
CREATE INDEX IF NOT EXISTS idx_activities_is_task     ON activities(is_task);
CREATE INDEX IF NOT EXISTS idx_activities_assigned_to ON activities(assigned_to);
