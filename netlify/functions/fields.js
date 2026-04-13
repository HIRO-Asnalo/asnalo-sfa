/**
 * フィールド設定 CRUD API
 * GET    /api/fields?entity=deal → entity のフィールド一覧（初回は自動シード）
 * POST   /api/fields             → フィールド追加
 * PUT    /api/fields             → フィールド更新
 * DELETE /api/fields?id=xxx      → フィールド削除
 */

const { getRows, insertRow, insertRows, updateRow, deleteRow, response } = require('./_db');
const { requireAuth } = require('./_auth');

const TABLE = 'fields';

const DEFAULT_DEAL_FIELDS = [
  { field_key: 'deal_name',           label: 'FS案件名',                      type: 'text',        required: 'true',  options: '' },
  { field_key: 'pattern',             label: 'パターン選択',                   type: 'select',      required: 'false', options: 'フルサポ採用,CLUTCH Agent,その他' },
  { field_key: 'phase',               label: 'フェーズ',                       type: 'select',      required: 'true',  options: '認知商談,ヒアリング,提案,クロージング,受注,失注' },
  { field_key: 'expected_close_date', label: '受注予定日',                     type: 'date',        required: 'true',  options: '' },
  { field_key: 'channel',             label: '販路',                           type: 'select',      required: 'true',  options: '直販,代理店,紹介,Web' },
  { field_key: 'checklist',           label: 'チェックリスト',                 type: 'multiselect', required: 'false', options: '初回訪問済み,提案書送付済み,見積送付済み,稟議通過' },
  { field_key: 'appointment_date',    label: 'アポイント取得日',               type: 'date',        required: 'false', options: '' },
  { field_key: 'appointment_bg',      label: 'アポイント取得の背景',           type: 'textarea',    required: 'false', options: '' },
  { field_key: 'first_visit_date',    label: '初回訪問日',                     type: 'date',        required: 'true',  options: '' },
  { field_key: 'proposal_date',       label: '提案日',                         type: 'date',        required: 'false', options: '' },
  { field_key: 'meeting3',            label: '商談（3回目）',                  type: 'date',        required: 'false', options: '' },
  { field_key: 'meeting4',            label: '商談（4回目）',                  type: 'date',        required: 'false', options: '' },
  { field_key: 'budget',              label: 'Budget（予算）',                 type: 'text',        required: 'false', options: '' },
  { field_key: 'authority',           label: 'Authority（決裁者・決裁ルート）',type: 'text',        required: 'false', options: '' },
  { field_key: 'needs',               label: 'Needs（顕在化ニーズ）',          type: 'textarea',    required: 'false', options: '' },
  { field_key: 'timeframe',           label: 'Timeframe（決定時期）',          type: 'text',        required: 'false', options: '' },
  { field_key: 'competitor',          label: 'Competitor（競合状況）',         type: 'text',        required: 'false', options: '' },
  { field_key: 'human_resources',     label: 'Human resources（組織体制）',    type: 'text',        required: 'false', options: '' },
  { field_key: 'hire_count',          label: '採用人数',                       type: 'text',        required: 'false', options: '' },
  { field_key: 'job_types',           label: '募集職種',                       type: 'text',        required: 'false', options: '' },
  { field_key: 'hire_target',         label: '採用ターゲット',                 type: 'textarea',    required: 'false', options: '' },
  { field_key: 'past_results',        label: '過去の成果・実績',               type: 'textarea',    required: 'false', options: '' },
  { field_key: 'identify_pain',       label: 'Identify pain（顧客ペイン）',    type: 'textarea',    required: 'false', options: '' },
  { field_key: 'pain_assumption',     label: '感じられた課題感（弊社仮説）',   type: 'textarea',    required: 'false', options: '' },
  { field_key: 'red_flag',            label: 'Red flag（失注可能性）',         type: 'textarea',    required: 'false', options: '' },
  { field_key: 'selection_month',     label: '選考実施月',                     type: 'text',        required: 'false', options: '' },
  { field_key: 'joy_seeds',           label: '喜びの種',                       type: 'textarea',    required: 'false', options: '' },
  { field_key: 'grip_point',          label: 'グリップポイント',               type: 'textarea',    required: 'false', options: '' },
  { field_key: 'loss_reason',         label: '失注理由',                       type: 'textarea',    required: 'false', options: '' },
  { field_key: 'screen2_fail',        label: '2次選考不合格',                  type: 'text',        required: 'false', options: '' },
  { field_key: 'screen3_fail',        label: '3次選考不合格',                  type: 'text',        required: 'false', options: '' },
  { field_key: 'screen4_fail',        label: '4次選考不合格',                  type: 'text',        required: 'false', options: '' },
  { field_key: 'resign_reason',       label: '辞退及び落選理由',               type: 'select',      required: 'false', options: '候補者辞退,不合格,条件不一致,その他' },
  { field_key: 'final_fail',          label: '最終1個前選考不合格',            type: 'text',        required: 'false', options: '' },
  { field_key: 'next_action',         label: '次回商談への申し送り',           type: 'textarea',    required: 'false', options: '' },
  { field_key: 'assigned_user',       label: '担当ユーザー',                   type: 'user',        required: 'true',  options: '' },
  { field_key: 'contact_person',      label: '担当者',                         type: 'text',        required: 'false', options: '' },
  { field_key: 'agency',              label: '代理店',                         type: 'text',        required: 'false', options: '' },
  { field_key: 'tags',                label: 'FS案件タグ',                     type: 'multiselect', required: 'true',  options: '重点顧客,既存深耕,新規,要フォロー' },
  { field_key: 'memo',                label: 'メモ',                           type: 'textarea',    required: 'false', options: '' },
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    switch (event.httpMethod) {
      case 'GET': {
        const entity = event.queryStringParameters?.entity || 'deal';
        let rows = await getRows(TABLE, { entity });

        // 初回のみデフォルトフィールドを一括投入
        if (entity === 'deal' && rows.length === 0) {
          const now = new Date().toISOString();
          const seeds = DEFAULT_DEAL_FIELDS.map((f, i) => ({
            entity: 'deal', visible: 'true',
            sort_order: i + 1, created_at: now, ...f,
          }));
          rows = await insertRows(TABLE, seeds);
          rows.sort((a, b) => a.sort_order - b.sort_order);
        } else {
          rows.sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
        }

        return response(200, rows);
      }

      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        const allRows = await getRows(TABLE, { entity: body.entity || 'deal' });
        const maxOrder = allRows.reduce((m, r) => Math.max(m, Number(r.sort_order) || 0), 0);
        const result = await insertRow(TABLE, {
          entity:     body.entity    || 'deal',
          field_key:  body.field_key || `custom_${Date.now()}`,
          label:      body.label     || '新しい項目',
          type:       body.type      || 'text',
          options:    body.options   || '',
          required:   body.required  || 'false',
          visible:    'true',
          sort_order: maxOrder + 1,
          created_at: new Date().toISOString(),
        });
        return response(201, result);
      }

      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        if (!body.id) return response(400, { error: 'id が必要です' });
        const { id, ...rest } = body;
        await updateRow(TABLE, id, rest);
        return response(200, { success: true });
      }

      case 'DELETE': {
        const id = event.queryStringParameters?.id;
        if (!id) return response(400, { error: 'id が必要です' });
        await deleteRow(TABLE, id);
        return response(200, { success: true });
      }

      default:
        return response(405, { error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('fields error:', err);
    return response(500, { error: err.message });
  }
};
