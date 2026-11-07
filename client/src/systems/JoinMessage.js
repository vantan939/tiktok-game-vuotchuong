import { STR } from '../strings.js';

const MAX_NAME_CHARS = 18;

/** Cắt tên quá dài cho vừa thông báo. */
export function shortName(name, max = MAX_NAME_CHARS) {
  const chars = [...String(name ?? '').trim()];
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : chars.join('');
}

/** Thông báo ngắn cho kết quả join: { text, kind: 'ok' | 'queue' | 'warn' }. result là kết quả của RaceManager.join. */
export function joinMessage(result, nickname) {
  const name = shortName(nickname);
  if (result.status === 'racing') return { text: result.late ? STR.joinRacingNext(name) : STR.joinRacing(name), kind: 'ok' };
  if (result.status === 'queued') return { text: STR.joinQueued(name, result.queuePosition), kind: 'queue' };
  return { text: STR.joinDuplicate(name), kind: 'warn' };
}
