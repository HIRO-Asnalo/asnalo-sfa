#!/usr/bin/env python3
"""
SFA新規案件リサーチエージェント
- Supabase deals テーブルの新規案件を検知
- 企業リサーチ（マイナビ求人・Google News）
- SFA案件に research_summary / recommended_plan を書き戻し
- Slack通知
- SQLite で処理済み管理
"""

import os
import sys
import json
import sqlite3
import ssl
import urllib.parse
import urllib.request
import urllib.error
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

# macOS system certs / cert.pem フォールバック
_SSL_CTX = ssl.create_default_context()
for cert_path in ["/etc/ssl/cert.pem", "/usr/local/etc/openssl/cert.pem"]:
    if os.path.exists(cert_path):
        _SSL_CTX.load_verify_locations(cert_path)
        break


# ── 環境変数 ──────────────────────────────────────────
def get_env(key: str) -> str:
    val = os.environ.get(key, "").strip()
    if not val:
        # Netlify CLI から取得（ローカル実行時フォールバック）
        try:
            result = subprocess.run(
                ["netlify", "env:get", key],
                capture_output=True, text=True,
                cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            )
            val = result.stdout.strip()
        except Exception:
            pass
    return val


SUPABASE_URL = get_env("SUPABASE_URL")
SUPABASE_KEY = get_env("SUPABASE_SERVICE_KEY")
SLACK_WEBHOOK = get_env("SLACK_WEBHOOK_URL")
DB_PATH = os.path.expanduser("~/scripts/agent_logs.db")
LOOKBACK_MINUTES = 30


# ── SQLite ────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS processed_events (
            id TEXT PRIMARY KEY,
            event_type TEXT,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            result TEXT
        )
    """)
    conn.commit()
    return conn


def is_processed(conn, deal_id: str) -> bool:
    row = conn.execute(
        "SELECT id FROM processed_events WHERE id=? AND event_type='sfa_research'",
        (deal_id,)
    ).fetchone()
    return row is not None


def mark_processed(conn, deal_id: str, result: str):
    conn.execute(
        "INSERT OR IGNORE INTO processed_events (id, event_type, result) VALUES (?,?,?)",
        (deal_id, "sfa_research", result)
    )
    conn.commit()


# ── Supabase ──────────────────────────────────────────
def supabase_request(method: str, path: str, body: Optional[dict] = None) -> Any:
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
    )
    with urllib.request.urlopen(req, timeout=15, context=_SSL_CTX) as resp:
        content = resp.read().decode()
        return json.loads(content) if content else {}


def get_new_deals() -> list:
    threshold = (datetime.now(timezone.utc) - timedelta(minutes=LOOKBACK_MINUTES)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    path = (
        f"deals?select=id,company_name,phase,expected_amount,created_at"
        f"&created_at=gte.{threshold}&order=created_at.desc"
    )
    return supabase_request("GET", path)


def update_deal(deal_id: str, summary: str, plan: str):
    supabase_request(
        "PATCH",
        f"deals?id=eq.{deal_id}",
        {"research_summary": summary, "recommended_plan": plan}
    )


# ── リサーチ ──────────────────────────────────────────
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def fetch_url(url: str, timeout: int = 10) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CTX) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        return f"ERROR: {e}"


def check_mynavi(company_name: str) -> str:
    encoded = urllib.parse.quote(company_name)
    url = f"https://tenshoku.mynavi.jp/list/?searchWord={encoded}"
    html = fetch_url(url)
    if "ERROR" in html:
        return "取得失敗"
    if company_name in html or "件" in html:
        return "マイナビ掲載あり"
    return "マイナビ掲載なし"


def get_news(company_name: str) -> str:
    q = urllib.parse.quote(f'"{company_name}" 採用 OR 事業拡大 OR 成長')
    url = f"https://news.google.com/rss/search?q={q}&hl=ja&gl=JP&ceid=JP:ja"
    xml_text = fetch_url(url)
    if "ERROR" in xml_text:
        return "ニュース取得失敗"
    try:
        root = ET.fromstring(xml_text)
        items = root.findall(".//item/title")
        if items:
            return items[0].text[:50] if items[0].text else "記事タイトル取得失敗"
        return "関連ニュースなし"
    except ET.ParseError:
        return "XMLパース失敗"


def decide_plan(expected_amount: Optional[int]) -> str:
    if not expected_amount:
        return "スタンダード60万"
    if expected_amount >= 900000:
        return "ボリューム90万"
    elif expected_amount >= 600000:
        return "スタンダード60万"
    return "ライト40万"


def research_company(deal: dict) -> tuple:
    name = deal.get("company_name", "不明")
    mynavi = check_mynavi(name)
    news = get_news(name)
    plan = decide_plan(deal.get("expected_amount"))

    pain = "採用課題あり（求人掲載中・拡大シグナル検知）" if "あり" in mynavi else "採用状況不明"
    summary = f"{pain}。{mynavi}。直近:{news[:30]}"[:100]
    return summary, plan


# ── Slack ─────────────────────────────────────────────
def send_slack(company: str, summary: str, plan: str, mynavi: str, news: str):
    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": f"■ 新規案件リサーチ完了（{company}）"}},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*推定課題*: {summary}\n"
                    f"*採用状況*: {mynavi}\n"
                    f"*推奨プラン*: {plan}\n"
                    f"*直近ニュース*: {news}"
                )
            }
        }
    ]
    payload = json.dumps({"blocks": blocks}).encode()
    req = urllib.request.Request(
        SLACK_WEBHOOK, data=payload, method="POST",
        headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req, timeout=10, context=_SSL_CTX)
    except Exception as e:
        print(f"  Slack通知失敗: {e}")


# ── メイン ────────────────────────────────────────────
def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_KEY が未設定")
        sys.exit(1)

    conn = init_db()

    # Step 1: 新規案件取得
    try:
        deals = get_new_deals()
    except Exception as e:
        print(f"ERROR: Supabase取得失敗: {e}")
        sys.exit(1)

    # 未処理フィルタ
    targets = [d for d in deals if not is_processed(conn, d["id"])]
    print(f"新規案件: {len(deals)}件 / 処理対象: {len(targets)}件")

    if not targets:
        print("処理対象なし。終了。")
        return

    processed_count = 0
    for deal in targets:
        company = deal.get("company_name", "不明")
        deal_id = deal["id"]
        print(f"\n■ リサーチ中: {company}")

        # Step 2: リサーチ
        mynavi = check_mynavi(company)
        news = get_news(company)
        plan = decide_plan(deal.get("expected_amount"))
        pain = "採用課題あり" if "あり" in mynavi else "採用状況不明"
        summary = f"{pain}。{mynavi}。直近:{news[:30]}"[:100]

        print(f"  採用状況: {mynavi}")
        print(f"  ニュース: {news}")
        print(f"  推奨プラン: {plan}")
        print(f"  サマリー: {summary}")

        # Step 3: SFA更新
        try:
            update_deal(deal_id, summary, plan)
            print("  SFA更新: 完了")
        except Exception as e:
            print(f"  SFA更新失敗: {e}")

        # Step 4: 処理済み記録
        mark_processed(conn, deal_id, plan)

        # Step 5: Slack通知
        if SLACK_WEBHOOK:
            send_slack(company, summary, plan, mynavi, news)
            print("  Slack通知: 送信済み")

        processed_count += 1

    print(f"\n完了: {processed_count}件処理")


if __name__ == "__main__":
    main()
