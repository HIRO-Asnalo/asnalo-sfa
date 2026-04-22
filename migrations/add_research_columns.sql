-- SFA deals テーブルにリサーチカラムを追加
-- 実行場所: Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/yycyzsxuesnnleyahbjw/editor

ALTER TABLE deals ADD COLUMN IF NOT EXISTS research_summary TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_plan TEXT;

-- 確認クエリ
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'deals'
  AND column_name IN ('research_summary', 'recommended_plan');
