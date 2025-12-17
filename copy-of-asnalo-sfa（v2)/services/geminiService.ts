import { GoogleGenAI, Type } from "@google/genai";
import { Deal, Client } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_FLASH = 'gemini-3-flash-preview';
const MODEL_PRO = 'gemini-3-pro-preview';

// Helper to handle AI responses safely
const safeGenerate = async (prompt: string, systemInstruction?: string) => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    return response.text || "応答が生成されませんでした。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "エラー: コンテンツを生成できませんでした。APIキーの設定を確認してください。";
  }
};

export const generateEmailDraft = async (deal: Deal, client: Client, intent: string) => {
  const prompt = `
    コンテキスト:
    あなたはプロフェッショナルな営業アシスタントです。
    顧客: ${client.company} ${client.name}様 (${client.role})
    案件: "${deal.title}" (金額: ¥${deal.amount.toLocaleString()})
    現在のフェーズ: ${deal.stage}
    ユーザーの意図: ${intent}

    タスク:
    ユーザーの意図に基づいて、顧客への簡潔かつ説得力のあるビジネスメールを作成してください。
    件名を含めてください。日本語で出力してください。
  `;

  return await safeGenerate(prompt, "あなたは熟練したセールスコピーライターです。トーン：プロフェッショナル、温かみがあり、アクションを促すもの。");
};

export const analyzeDealHealth = async (deal: Deal, client: Client) => {
  const activitySummary = deal.activities.map(a => `- ${a.date} [${a.type}]: ${a.content}`).join('\n');
  
  const prompt = `
    以下の営業案件を多角的に分析し、成約確度を高めるためのアドバイスを提供してください:
    
    顧客: ${client.company} (担当: ${client.name})
    案件: ${deal.title} (金額: ¥${deal.amount})
    フェーズ: ${deal.stage}
    確度: ${deal.probability}%
    完了予定日: ${deal.expectedCloseDate}
    メモ: ${deal.notes}
    
    最近の活動ログ:
    ${activitySummary}

    以下のJSON構造でレスポンスを返してください:
    {
      "healthScore": 数値 (0-100),
      "analysis": "文字列 (スコアの理由、リスク、現状の洞察)",
      "suggestedNextSteps": ["推奨アクション1", "推奨アクション2", "推奨アクション3"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_PRO, // 高度な分析にはProモデルを使用
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthScore: { type: Type.NUMBER },
            analysis: { type: Type.STRING },
            suggestedNextSteps: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["healthScore", "analysis", "suggestedNextSteps"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error(e);
    return {
      healthScore: 0,
      analysis: "分析に失敗しました。APIキーまたはネットワークを確認してください。",
      suggestedNextSteps: ["API設定を再確認する"]
    };
  }
};

export const summarizeActivityLog = async (rawNote: string, deal: Deal) => {
  const prompt = `
    あなたは優秀な営業SFAアシスタントです。営業担当者が入力した以下の「活動メモ」から情報を抽出し、整理してください。

    案件名: ${deal.title}
    現在のフェーズ: ${deal.stage}

    入力テキスト:
    "${rawNote}"

    以下のJSON形式で出力してください:
    {
      "summary": "活動の要約（簡潔なビジネス文章で）",
      "type": "活動タイプ ('電話', 'メール', '商談', 'メモ' のいずれか)",
      "next_action": "次に行うべき具体的なアクション",
      "due_date": "YYYY-MM-DD形式の日付",
      "suggested_phase": "活動内容から判断される推奨フェーズ（変更不要なら現在のフェーズを返す）"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['電話', 'メール', '商談', 'メモ'] },
            next_action: { type: Type.STRING },
            due_date: { type: Type.STRING },
            suggested_phase: { type: Type.STRING }
          },
          required: ["summary", "type", "next_action", "due_date", "suggested_phase"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const generateSalesReport = async (deals: Deal[]) => {
  const summaryData = deals.map(d => ({
    title: d.title,
    amount: d.amount,
    stage: d.stage,
    prob: d.probability,
    closeDate: d.expectedCloseDate
  }));

  const prompt = `
    以下の案件データに基づいて、現在の営業状況の「エグゼクティブ・サマリー」を作成してください。

    データ:
    ${JSON.stringify(summaryData, null, 2)}

    要件:
    1. 全体的なパイプライン状況の要約
    2. リスクの高い案件と、早期成約が見込まれる案件の指摘
    3. 売上目標達成に向けた具体的な戦略アドバイス

    出力は日本語で見やすく構造化されたマークダウン形式にしてください。
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_PRO, // レポート作成にはProモデルを使用
      contents: prompt
    });
    return response.text || "レポートを生成できませんでした。";
  } catch (error) {
    console.error(error);
    return "分析エラーが発生しました。";
  }
};