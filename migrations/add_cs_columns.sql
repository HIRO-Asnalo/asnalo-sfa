-- customersテーブルにCS管理・顧客コンディション用カラムを追加
-- 実行場所: Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/yycyzsxuesnnleyahbjw/editor

ALTER TABLE customers
  -- 契約情報
  ADD COLUMN IF NOT EXISTS fiscal_month           text,
  ADD COLUMN IF NOT EXISTS contract_start_date    date,
  ADD COLUMN IF NOT EXISTS contract_end_date      date,

  -- 顧客コンディション
  ADD COLUMN IF NOT EXISTS key_person             text,
  ADD COLUMN IF NOT EXISTS key_person_role        text,
  ADD COLUMN IF NOT EXISTS key_person_needs       text,
  ADD COLUMN IF NOT EXISTS relationship           text,
  ADD COLUMN IF NOT EXISTS performance            text,
  ADD COLUMN IF NOT EXISTS last_contact_date      date,
  ADD COLUMN IF NOT EXISTS condition_detail       text,
  ADD COLUMN IF NOT EXISTS last_contact_content   text,

  -- Closed won に向けたアクション
  ADD COLUMN IF NOT EXISTS next_proposal_timing   text,
  ADD COLUMN IF NOT EXISTS next_proposal_content  text,
  ADD COLUMN IF NOT EXISTS upsell_story           text,
  ADD COLUMN IF NOT EXISTS action1_item           text,
  ADD COLUMN IF NOT EXISTS action1_detail         text,
  ADD COLUMN IF NOT EXISTS action1_due            date,
  ADD COLUMN IF NOT EXISTS action2_item           text,
  ADD COLUMN IF NOT EXISTS action2_detail         text,
  ADD COLUMN IF NOT EXISTS action2_due            date,
  ADD COLUMN IF NOT EXISTS action3_item           text,
  ADD COLUMN IF NOT EXISTS action3_detail         text,
  ADD COLUMN IF NOT EXISTS action3_due            date,

  -- その他CS
  ADD COLUMN IF NOT EXISTS churn_risk             text,
  ADD COLUMN IF NOT EXISTS renewal_flag           text,
  ADD COLUMN IF NOT EXISTS support_notes          text;

-- 確認クエリ
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customers'
  AND column_name IN (
    'fiscal_month','contract_start_date','contract_end_date',
    'key_person','key_person_role','key_person_needs',
    'relationship','performance','last_contact_date',
    'condition_detail','last_contact_content',
    'next_proposal_timing','next_proposal_content','upsell_story',
    'action1_item','action1_detail','action1_due',
    'action2_item','action2_detail','action2_due',
    'action3_item','action3_detail','action3_due',
    'churn_risk','renewal_flag','support_notes'
  )
ORDER BY column_name;
