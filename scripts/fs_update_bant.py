"""
FS案件CSVデータ → deals テーブル 8フィールド更新スクリプト
対象: budget / authority / needs / hire_count / job_types / hire_target /
      pain_assumption / memo
実行: python3 scripts/fs_update_bant.py
"""

import csv, io, json, urllib.request, urllib.error, ssl, sys
from datetime import datetime, timezone, timedelta
from collections import defaultdict

CSV_PATH   = '/Users/nakagawahiroyuki/Desktop/【AI】アスナロ/_inbox/FS案件CSVデータ.csv'
SUPABASE_URL = 'https://yycyzsxuesnnleyahbjw.supabase.co'
SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5Y3l6c3h1ZXNubmxleWFoYmp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA4ODY2NywiZXhwIjoyMDkxNjY0NjY3fQ.1hPywOM9oS-eyyBnoNS5e8QR6332QhE7AECAGzI37HY'
BATCH_SIZE   = 50
DRY_RUN      = '--dry-run' in sys.argv

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode    = ssl.CERT_NONE
JST = timezone(timedelta(hours=9))

def parse_date(s):
    if not s or not s.strip(): return None
    s = s.strip()
    for fmt in ('%Y/%m/%d %H:%M', '%Y-%m-%d %H:%M:%S', '%Y/%m/%d', '%Y-%m-%d'):
        try: return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except: pass
    return None

def req_get(path):
    r = urllib.request.Request(SUPABASE_URL + path,
        headers={'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY})
    with urllib.request.urlopen(r, timeout=30, context=ctx) as res:
        return json.loads(res.read())

def req_patch(path, data_dict):
    body = json.dumps(data_dict).encode()
    r = urllib.request.Request(SUPABASE_URL + path, data=body, method='PATCH',
        headers={'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY,
                 'Content-Type': 'application/json', 'Prefer': 'return=minimal'})
    with urllib.request.urlopen(r, timeout=30, context=ctx) as res:
        return res.status

# ── Step1: DB の全 deals を取得 ─────────────────────────────
print('Step1: DB deals を取得中...')
all_db = []
offset  = 0
while True:
    chunk = req_get(f'/rest/v1/deals?select=id,company_name,deal_name,created_at&limit=1000&offset={offset}')
    all_db.extend(chunk)
    if len(chunk) < 1000: break
    offset += 1000

print(f'  DB 取得完了: {len(all_db)}件')

# DB ルックアップ: (company_name, deal_name, date_jst) → [id, ...]
def db_date_jst(created_at_str):
    """UTC timestamptz → JST date 文字列 (YYYY-MM-DD)"""
    if not created_at_str: return ''
    for fmt in ('%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%dT%H:%M:%S.%f%z'):
        try:
            dt = datetime.strptime(created_at_str.replace('+00:00','Z').replace('+09:00','+0900'), fmt)
            return dt.astimezone(JST).strftime('%Y-%m-%d')
        except: pass
    return created_at_str[:10]

db_lookup = defaultdict(list)
for d in all_db:
    key = (d['company_name'], d['deal_name'], db_date_jst(d['created_at']))
    db_lookup[key].append(d['id'])

# ── Step2: CSV 読み込み ─────────────────────────────────────
print('Step2: CSV 読み込み中...')
with open(CSV_PATH, 'rb') as f:
    text = f.read().decode('cp932')
rows = list(csv.reader(io.StringIO(text)))[1:]

# ── Step3: マッチング & 更新データ生成 ──────────────────────
print('Step3: マッチング中...')
updates   = []  # [(id, fields_dict), ...]
no_match  = []

for row in rows:
    if not any(c.strip() for c in row): continue
    company    = row[2].strip()
    deal_name  = row[4].strip() or company
    date_key   = parse_date(row[84]) if len(row) > 84 else None

    key = (company, deal_name, date_key or '')
    ids = db_lookup.get(key, [])

    # date_key がない場合は company + deal_name のみで検索
    if not ids and date_key is None:
        for (c, d, _), id_list in db_lookup.items():
            if c == company and d == deal_name:
                ids = id_list
                break

    if not ids:
        no_match.append((company, deal_name))
        continue

    fields = {
        'budget':         row[19].strip() if len(row) > 19 else None,
        'authority':      row[20].strip() if len(row) > 20 else None,
        'needs':          row[21].strip() if len(row) > 21 else None,
        'hire_count':     row[25].strip() if len(row) > 25 else None,
        'job_types':      row[26].strip() if len(row) > 26 else None,
        'hire_target':    row[27].strip() if len(row) > 27 else None,
        'pain_assumption':row[30].strip() if len(row) > 30 else None,
        'memo':           row[42].strip() if len(row) > 42 else None,
    }
    # 全部空ならスキップ
    if not any(v for v in fields.values()): continue
    # None を除去
    fields = {k: v for k, v in fields.items() if v}

    for db_id in ids:
        updates.append((db_id, fields))

print(f'  更新対象: {len(updates)}件 / 未マッチ: {len(no_match)}件')
if no_match[:3]:
    print(f'  未マッチ例: {no_match[:3]}')

if DRY_RUN:
    print('[DRY RUN] 最初の3件プレビュー:')
    for db_id, flds in updates[:3]:
        print(f'  {db_id}: {json.dumps(flds, ensure_ascii=False)[:120]}')
    sys.exit(0)

# ── Step4: バッチ PATCH ──────────────────────────────────────
print('Step4: DB 更新中...')
success = 0
errors  = []

for i in range(0, len(updates), BATCH_SIZE):
    batch = updates[i:i+BATCH_SIZE]
    # 同一 fields のものをまとめて1回の PATCH にする
    by_fields = defaultdict(list)
    for db_id, flds in batch:
        by_fields[json.dumps(flds, sort_keys=True)].append(db_id)

    for fields_json, ids in by_fields.items():
        ids_str = ','.join(ids)
        try:
            status = req_patch(f'/rest/v1/deals?id=in.({ids_str})', json.loads(fields_json))
            success += len(ids)
        except urllib.error.HTTPError as e:
            errors.append((ids[:2], e.code, e.read().decode()[:100]))

    if (i // BATCH_SIZE) % 10 == 0:
        print(f'  [{i+len(batch)}/{len(updates)}] 処理中...')

print(f'\n完了: 成功 {success}件 / エラー {len(errors)}')
if errors:
    for ids, code, msg in errors[:3]:
        print(f'  ERROR {code}: {msg} (ids={ids})')
