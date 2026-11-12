import { supabase } from './supabase';

export async function getRows(table, configure) {
  let query = supabase.from(table).select('*');
  if (configure) query = configure(query);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function saveRow(table, values, idField, id) {
  const query = id == null
    ? supabase.from(table).insert(values).select().single()
    : supabase.from(table).update(values).eq(idField, id).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function deleteRow(table, idField, id) {
  const { error } = await supabase.from(table).delete().eq(idField, id);
  if (error) throw error;
}

export async function loginWithCode(code) {
  const base = process.env.REACT_APP_AUTH_API_URL;
  if (!base) throw new Error('REACT_APP_AUTH_API_URL을 설정해 주세요.');

  const response = await fetch(`${base.replace(/\/$/, '')}/pbp-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', code })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '접속 코드를 확인해 주세요.');

  const { error } = await supabase.auth.verifyOtp({
    token_hash: result.token_hash,
    type: 'magiclink'
  });
  if (error) throw error;
}

export async function adminAuthAction(action, values = {}) {
  const base = process.env.REACT_APP_AUTH_API_URL;
  const { data: { session } } = await supabase.auth.getSession();
  if (!base || !session) throw new Error('관리자 로그인이 필요합니다.');

  const response = await fetch(`${base.replace(/\/$/, '')}/pbp-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ action, ...values })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '관리자 작업에 실패했습니다.');
  return result;
}

export async function adminRoomAction(action, values = {}) {
  const base = process.env.REACT_APP_AUTH_API_URL;
  if (!base) throw new Error('REACT_APP_AUTH_API_URL을 설정해 주세요.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('관리자 로그인이 필요합니다.');

  const response = await fetch(`${base.replace(/\/$/, '')}/pbp-rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ action, ...values })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '방 관리 작업에 실패했습니다.');

  return result;
}
