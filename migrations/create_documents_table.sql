-- ドキュメント管理テーブル
CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'その他',
  file_type    TEXT,
  file_size    BIGINT,
  storage_path TEXT NOT NULL,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  deal_id      UUID REFERENCES deals(id) ON DELETE SET NULL,
  uploaded_by  TEXT,
  memo         TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_deal     ON documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_created  ON documents(created_at DESC);

-- Supabase Storage バケット「documents」を事前に作成してください
-- Dashboard → Storage → New bucket → Name: documents, Public: OFF
