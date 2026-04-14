/**
 * AI生成 API
 * POST /api/ai-generate
 * body: { type: 'deal_proposal' | 'deal_action' | 'cs_analysis' | 'cs_renewal', data: {...} }
 */

const https = require('https');
const { requireAuth } = require('./_auth');
const { response } = require('./_db');

function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
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
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(json.error.message));
          else resolve(json.content[0].text);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function buildPrompt(type, data) {
  switch (type) {

    case 'deal_proposal':
      return `あなたは株式会社アスナロのトップ営業です。以下の案件情報をもとに、次回商談での提案内容を作成してください。

【案件情報】
- 企業名: ${data.company_name || '—'}
- 案件名: ${data.deal_name || '—'}
- フェーズ: ${data.phase || '—'}
- 受注予定日: ${data.expected_close_date || '—'}
- Budget（予算）: ${data.budget || '未確認'}
- Authority（決裁者）: ${data.authority || '未確認'}
- Needs（ニーズ）: ${data.needs || '未確認'}
- Timeframe（決定時期）: ${data.timeframe || '未確認'}
- 競合状況: ${data.competitor || '未確認'}
- 採用人数: ${data.hire_count || '未確認'}
- 募集職種: ${data.job_types || '未確認'}
- 顧客ペイン: ${data.identify_pain || '未確認'}
- 課題感（仮説）: ${data.pain_assumption || '未確認'}
- グリップポイント: ${data.grip_point || '未確認'}
- Red flag: ${data.red_flag || 'なし'}
- 次回商談への申し送り: ${data.next_action || 'なし'}

以下の形式で出力してください：

## 提案の方向性
（2〜3行で方針を説明）

## 提案ポイント①
（具体的な提案内容）

## 提案ポイント②
（具体的な提案内容）

## 想定される反論と切り返し
（反論と切り返し方）

## クロージングに向けた一言
（締めの言葉）`;

    case 'deal_action':
      return `あなたは株式会社アスナロのトップ営業マネージャーです。以下の案件情報から、受注に向けた具体的なネクストアクションを3つ提案してください。

【案件情報】
- 企業名: ${data.company_name || '—'}
- フェーズ: ${data.phase || '—'}
- Needs（ニーズ）: ${data.needs || '未確認'}
- Red flag（リスク）: ${data.red_flag || 'なし'}
- 課題感（仮説）: ${data.pain_assumption || '未確認'}
- 現在の申し送り: ${data.next_action || 'なし'}
- 競合状況: ${data.competitor || '未確認'}

以下の形式で出力してください：

## アクション①
**内容:** （具体的なアクション）
**期限:** （目安の期限）
**目的:** （このアクションの目的）

## アクション②
**内容:** （具体的なアクション）
**期限:** （目安の期限）
**目的:** （このアクションの目的）

## アクション③
**内容:** （具体的なアクション）
**期限:** （目安の期限）
**目的:** （このアクションの目的）`;

    case 'cs_analysis':
      return `あなたは株式会社アスナロのCSマネージャーです。以下の顧客情報をもとに、アップセル・継続率向上に向けた戦略を分析してください。

【顧客情報】
- 企業名: ${data.company_name || '—'}
- 契約サービス: ${data.service_name || '—'}
- 稼働状況: ${data.operation_status || '—'}
- キーパーソン: ${data.key_person || '—'}（${data.key_person_role || '—'}）
- キーパーソンニーズ: ${data.key_person_needs || '—'}
- 関係性: ${data.relationship || '—'}
- 成果: ${data.performance || '—'}
- コンディション詳細: ${data.condition_detail || '—'}
- 最新接触内容: ${data.last_contact_content || '—'}
- チャーンリスク: ${data.churn_risk || '—'}

以下の形式で出力してください：

## 顧客状態の総合評価
（現状の評価を2〜3行で）

## 関係性強化のポイント
（キーパーソンのニーズに基づいた具体的アプローチ）

## アップセル機会
（どのサービス・タイミングでアップセルが狙えるか）

## リスク要因と対策
（チャーンリスクへの具体的な対処法）`;

    case 'cs_renewal':
      return `あなたは株式会社アスナロのCSです。以下の顧客情報をもとに、契約更新の提案メール文を作成してください。

【顧客情報】
- 企業名: ${data.company_name || '—'}
- キーパーソン: ${data.key_person || '—'}さん
- 契約サービス: ${data.service_name || '—'}
- 関係性: ${data.relationship || '—'}
- 成果: ${data.performance || '—'}
- アップセルストーリー: ${data.upsell_story || '—'}
- 来期提案内容: ${data.next_proposal_content || '—'}

件名と本文をメール形式で作成してください。アスナロらしい温かみのある文体で、押しつけにならない自然な提案にしてください。`;

    default:
      throw new Error('不明なタイプです');
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  const auth = requireAuth(event);
  if (auth.error) return auth;

  if (event.httpMethod !== 'POST') return response(405, { error: 'Method Not Allowed' });

  try {
    const { type, data } = JSON.parse(event.body || '{}');
    if (!type || !data) return response(400, { error: 'type と data が必要です' });

    const prompt = buildPrompt(type, data);
    const text = await callClaude(prompt);
    return response(200, { text });
  } catch (err) {
    console.error('ai-generate error:', err);
    return response(500, { error: err.message });
  }
};
