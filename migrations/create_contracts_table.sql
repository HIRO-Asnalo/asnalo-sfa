-- 顧客の複数契約管理テーブル
-- Supabase SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS contracts (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_name     text,
  contract_date    date,
  contract_end_date date,
  contract_amount  integer,
  status           text DEFAULT 'active',  -- active / ended
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
