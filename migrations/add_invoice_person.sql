-- 見積書・請求書に担当者カラムを追加
-- Supabase Dashboard > SQL Editor で実行

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS person_in_charge text;
