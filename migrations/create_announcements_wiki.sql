-- お知らせ/掲示板テーブル
CREATE TABLE IF NOT EXISTS announcements (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL,
  content    text,
  author     text,
  pinned     boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 社内Wikiテーブル
CREATE TABLE IF NOT EXISTS wiki_pages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL,
  content    text,
  category   text DEFAULT 'その他',
  author     text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_pinned    ON announcements(pinned);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_category     ON wiki_pages(category);
