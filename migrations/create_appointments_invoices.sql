-- =============================================
-- 商談カレンダー + 見積書・請求書 テーブル追加
-- Supabase Dashboard > SQL Editor で実行
-- =============================================

-- ===== 商談アポイントメント =====
CREATE TABLE IF NOT EXISTS appointments (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id      uuid REFERENCES deals(id) ON DELETE SET NULL,
  customer_id  uuid REFERENCES customers(id) ON DELETE SET NULL,
  title        text NOT NULL,
  start_at     timestamptz NOT NULL,
  end_at       timestamptz,
  location     text,
  notes        text,
  assigned_to  text,
  created_by   text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_start_at    ON appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_deal_id     ON appointments(deal_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON appointments(assigned_to);

-- ===== 見積書・請求書 =====
CREATE TABLE IF NOT EXISTS invoices (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id      uuid REFERENCES deals(id) ON DELETE SET NULL,
  customer_id  uuid REFERENCES customers(id) ON DELETE SET NULL,
  type         text NOT NULL DEFAULT 'quote',   -- 'quote'=見積書 / 'invoice'=請求書
  number       text,                            -- 見積番号・請求番号（例: QT-2026-001）
  status       text NOT NULL DEFAULT 'draft',   -- draft / sent / accepted / paid / cancelled
  items        jsonb DEFAULT '[]'::jsonb,       -- [{name, qty, unit_price, amount}]
  subtotal     integer DEFAULT 0,
  tax_rate     integer DEFAULT 10,              -- %
  tax_amount   integer DEFAULT 0,
  total        integer DEFAULT 0,
  issued_date  date,
  due_date     date,
  notes        text,
  created_by   text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_deal_id     ON invoices(deal_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type        ON invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON invoices(status);
