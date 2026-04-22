/**
 * 新規開拓AI API
 * POST /api/ai-prospect
 * body: { company_name: string }
 *
 * Brave Search API でリアルタイム調査 → Claude で分析・営業文生成
 * BRAVE_API_KEY が未設定の場合は Claude の学習データのみで生成
 */

const https = require('https');
const { requireAuth } = require('./_auth');
const { response } = require('./_db');

/* ── Web検索（Brave Search API） ── */
function braveSearch(query, apiKey) {
  return new Promise((resolve) => {
    const params = new URLSearchParams({ q: query, count: '5', search_lang: 'ja', country: 'JP' });
    const req = https.request({
      hostname: 'api.search.brave.com',
      path: `/res/v1/web/search?${params}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try {
          const buf = Buffer.concat(chunks);
          resolve(JSON.parse(buf.toString()));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/* ── Claude API 呼び出し ── */
function callClaude(prompt, maxTokens = 3000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString());
          if (json.error) reject(new Error(json.error.message));
          else resolve(json.content[0].text);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/* ── 検索結果をテキストに整形 ── */
function formatSearchResults(results) {
  if (!results || !results.web || !results.web.results) return '';
  return results.web.results.slice(0, 4)
    .map(r => `・${r.title}\n  ${r.description || ''}`)
    .join('\n');
}

/* ── Claude へのプロンプト ── */
function buildPrompt(companyName, searchContext) {
  const hasContext = searchContext.trim().length > 0;
  return `あなたは株式会社アスナロの営業戦略エキスパートです。
以下の情報をもとに、${companyName}への営業資料を生成してください。

${hasContext ? `## Web検索結果（リアルタイム情報）\n${searchContext}\n` : '## ※ Web検索なし（学習データで推定）\n'}

## アスナロのサービス情報
- サービス名: フルサポ採用 Scout（DR代行・スカウト代行）
- 料金: ライト40万(800通) / スタンダード60万(1,500通) / ボリューム90万(2,500通)
- 強み: AI×人のハイブリッド・追いかけメッセージ込み・累計250社・承認率業界平均2倍・OfferBox公認パートナー
- 担当: 株式会社アスナロ 代表 中川

## ICPスコア基準
- マイナビ新卒出稿あり: +30点
- OfferBox出稿あり: +25点
- 採用ページ直近更新: +20点
- 資金調達シグナル: +15点
- 採用担当求人あり: +10点
- 70点以上→即アプローチ / 40〜69点→ウォッチ / 39点以下→対象外

## 出力形式
必ず以下のJSON形式のみで出力してください（コードブロック不要）:
{
  "research": {
    "industry": "業種",
    "employee_count": "従業員数",
    "location": "所在地",
    "overview": "事業概要（2〜3文）",
    "signals": ["採用シグナル1", "採用シグナル2"],
    "challenges": ["採用課題1", "採用課題2", "採用課題3"],
    "icp_score": 数値,
    "icp_judgment": "即アプローチ または ウォッチリスト または 対象外",
    "recommended_plan": "推奨プラン名と金額"
  },
  "approach_mail": [
    {
      "pattern": "A",
      "angle": "アプローチ角度（一言）",
      "subject": "件名",
      "body": "本文（250〜350字）"
    },
    {
      "pattern": "B",
      "angle": "アプローチ角度（一言）",
      "subject": "件名",
      "body": "本文（250〜350字）"
    }
  ],
  "form_message": {
    "short": "200字以内のフォーム文",
    "standard": "400字以内のフォーム文"
  }
}`;
}

/* ── ハンドラー ── */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  const auth = requireAuth(event);
  if (auth.error) return auth;
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method Not Allowed' });

  try {
    const { company_name } = JSON.parse(event.body || '{}');
    if (!company_name) return response(400, { error: '企業名が必要です' });

    /* Web検索（Brave API キーがある場合のみ） */
    let searchContext = '';
    const braveKey = process.env.BRAVE_API_KEY;
    if (braveKey) {
      const [general, recruit] = await Promise.all([
        braveSearch(`${company_name} 会社概要 従業員数 事業内容`, braveKey),
        braveSearch(`${company_name} 採用 求人 新卒 中途 マイナビ`, braveKey),
      ]);
      searchContext = [
        formatSearchResults(general),
        formatSearchResults(recruit),
      ].filter(Boolean).join('\n');
    }

    /* Claude で分析 + 文章生成 */
    const raw = await callClaude(buildPrompt(company_name, searchContext), 3500);

    /* JSON パース（Claudeが余分なテキストを出力した場合も対応） */
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return response(500, { error: '生成結果のパースに失敗しました', raw });
    const result = JSON.parse(jsonMatch[0]);

    return response(200, {
      company_name,
      realtime: !!braveKey,
      ...result,
    });
  } catch (err) {
    console.error('ai-prospect error:', err);
    return response(500, { error: err.message });
  }
};
