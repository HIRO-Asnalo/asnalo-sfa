"""
FS案件CSVデータ.csv → Supabase deals テーブル インポートスクリプト
実行: python3 scripts/fs_import.py
"""

import csv, io, json, urllib.request, urllib.error, ssl, sys, re
from datetime import datetime

# macOS Python の SSL 証明書問題を回避（一時インポートスクリプトのみ）
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

# ── 設定 ──────────────────────────────────────────────────
CSV_PATH   = '/Users/nakagawahiroyuki/Desktop/【AI】アスナロ/_inbox/FS案件CSVデータ.csv'
SUPABASE_URL = 'https://yycyzsxuesnnleyahbjw.supabase.co'
SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5Y3l6c3h1ZXNubmxleWFoYmp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA4ODY2NywiZXhwIjoyMDkxNjY0NjY3fQ.1hPywOM9oS-eyyBnoNS5e8QR6332QhE7AECAGzI37HY'
BATCH_SIZE   = 100
DRY_RUN      = '--dry-run' in sys.argv  # python3 fs_import.py --dry-run で試し実行

# ── フェーズマッピング ────────────────────────────────────
PHASE_MAP = {
    'Closed won':           '受注',
    '内定承諾（Closed won）': '受注',
    '内定':                 '受注',
    '失注':                 '失注',
    '辞退':                 '失注',
    '不合格':               '失注',
    'アポイント取り消し':   '失注',
    '認知商談':             '認知商談',
    '説明会設定':           '認知商談',
    '説明会参加':           '認知商談',
    '案件訪問（案件商談の合意）': '認知商談',
    '一次選考設定':         'ヒアリング',
    '一次選考通過':         'ヒアリング',
    '二次選考設定':         'ヒアリング',
    '三次選考設定':         'ヒアリング',
    '問題の確認と課題の訴求': 'ヒアリング',
    '課題の合意':           'ヒアリング',
    '提案内容の提示':       '提案',
    '交渉&商談':           'クロージング',
    '意思決定者商談':       'クロージング',
    '意思決定者の合意':     'クロージング',
    '最終選考設定':         'クロージング',
    '最終1個前選考通過':    'クロージング',
    '価値の合意':           'クロージング',
}

def parse_date(s):
    """受注予定日等を date 文字列に変換。空文字はNone。"""
    if not s or not s.strip():
        return None
    s = s.strip()
    # "2021/11/4 16:00" or "2021-11-04 16:47:42"
    for fmt in ('%Y/%m/%d %H:%M', '%Y-%m-%d %H:%M:%S', '%Y/%m/%d', '%Y-%m-%d'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            pass
    return None

def parse_amount(s):
    """受注額など数値文字列を int に変換。失敗時 None。"""
    if not s or not s.strip():
        return None
    s = s.strip().replace(',', '')
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return None

def supabase_insert(rows):
    """Supabase REST API で一括 INSERT。"""
    url = f'{SUPABASE_URL}/rest/v1/deals'
    data = json.dumps(rows).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': f'Bearer {SERVICE_KEY}',
            'Prefer': 'return=minimal',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=_ssl_ctx) as res:
            return res.status, res.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# ── メイン処理 ────────────────────────────────────────────
def main():
    with open(CSV_PATH, 'rb') as f:
        raw = f.read()
    text = raw.decode('cp932')
    reader = csv.reader(io.StringIO(text))
    rows_iter = iter(reader)
    headers = next(rows_iter)  # skip header

    records = []
    skipped = 0
    for row in rows_iter:
        if not any(c.strip() for c in row):
            continue  # skip blank rows

        company = row[2].strip() if len(row) > 2 else ''
        deal_name = row[4].strip() if len(row) > 4 else ''

        # company_name が空なら skip
        if not company:
            skipped += 1
            continue

        raw_phase = row[6].strip() if len(row) > 6 else ''
        phase = PHASE_MAP.get(raw_phase, '認知商談')  # 未知フェーズは認知商談

        assigned_user = row[3].strip() if len(row) > 3 else ''
        expected_close = parse_date(row[10]) if len(row) > 10 else None
        expected_amount = parse_amount(row[46]) if len(row) > 46 else None
        created_at_raw = row[84].strip() if len(row) > 84 else ''
        created_at = parse_date(created_at_raw)

        # memo に FS側の追加情報をまとめる
        memo_parts = []
        if row[5].strip():  memo_parts.append(f'フェーズカテゴリ: {row[5].strip()}')
        if raw_phase:       memo_parts.append(f'FS元フェーズ: {raw_phase}')
        if len(row) > 42 and row[42].strip(): memo_parts.append(f'メモ: {row[42].strip()}')
        if len(row) > 41 and row[41].strip(): memo_parts.append(f'申し送り: {row[41].strip()}')
        if len(row) > 35 and row[35].strip(): memo_parts.append(f'失注理由: {row[35].strip()}')

        now_iso = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S+00:00')
        rec = {
            'deal_name':          deal_name or company,
            'company_name':       company,
            'phase':              phase,
            'assigned_user':      assigned_user or None,
            'expected_close_date': expected_close or None,
            'expected_amount':    expected_amount or None,
            'research_summary':   '\n'.join(memo_parts) if memo_parts else None,
            'created_at':         (created_at + 'T00:00:00+09:00') if created_at else now_iso,
            'updated_at':         (created_at + 'T00:00:00+09:00') if created_at else now_iso,
        }
        records.append(rec)

    print(f'インポート対象: {len(records)}件 / スキップ: {skipped}件')

    if DRY_RUN:
        print('[DRY RUN] 実際のINSERTは行いません。最初の3件をプレビュー:')
        for r in records[:3]:
            print(json.dumps(r, ensure_ascii=False, indent=2))
        return

    # バッチ送信
    success = 0
    errors  = []
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i+BATCH_SIZE]
        status, body = supabase_insert(batch)
        if status in (200, 201):
            success += len(batch)
            print(f'  [{i+len(batch)}/{len(records)}] OK')
        else:
            errors.append((i, status, body[:200]))
            print(f'  [{i+len(batch)}/{len(records)}] ERROR {status}: {body[:200]}')

    print(f'\n完了: 成功 {success}件 / エラー {len(errors)}バッチ')
    if errors:
        print('エラー詳細:')
        for idx, st, body in errors:
            print(f'  batch starting at {idx}: HTTP {st} — {body}')

if __name__ == '__main__':
    main()
