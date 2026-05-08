-- リードテーブル（アタックリスト）
CREATE TABLE IF NOT EXISTS leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    text NOT NULL,
  industry        text,
  employee_count  text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  status          text DEFAULT '未対応',
  score           integer,
  source          text,
  notion_id       text,
  assigned_user   text,
  memo            text,
  deal_id         text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- リサイクルリードテーブル（失注案件の再アプローチ管理）
CREATE TABLE IF NOT EXISTS recycle_leads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name        text NOT NULL,
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  lost_reason         text,
  lost_date           date,
  assigned_user       text,
  recycle_status      text DEFAULT '塩漬け',
  next_approach_date  date,
  deal_id             text,
  memo                text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
