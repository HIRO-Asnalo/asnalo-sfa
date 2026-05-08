-- 見積書・請求書に顧客名（宛先）カラムを追加
-- Supabase Dashboard > SQL Editor で実行

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_name text;
