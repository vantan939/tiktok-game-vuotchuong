import { CONFIG } from '../config.js';
import { STR } from '../strings.js';
import { shortName } from './JoinMessage.js';

/** Thông báo ngắn cho kết quả lệnh s ({ text, kind } hoặc null khi không cần báo: bật, tắt). */
export function camMessage(result, nickname, cfg = CONFIG) {
  const name = shortName(nickname);
  switch (result.status) {
    case 'full':
      return { text: STR.camFull(name, cfg.maxCloseCams), kind: 'warn' };
    case 'not-joined':
      return { text: STR.camNotJoined(name), kind: 'warn' };
    case 'next-round':
      return { text: STR.camNextRound(name), kind: 'queue' };
    case 'idle':
      return { text: STR.camIdle(name), kind: 'queue' };
    default:
      return null;
  }
}
