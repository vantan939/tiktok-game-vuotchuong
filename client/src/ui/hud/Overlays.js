import { CONFIG } from '../../config.js';
import { STR } from '../../strings.js';
import { createAvatar } from './avatar.js';
import { createFrame, el } from './Frame.js';
import { iconSvg } from './svgIcons.js';

const title = (text, cls = '') => `<span class="title-text ${cls}" data-text="${text}"><span>${text}</span></span>`;
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Cắt tên quá dài. */
function shortName(name, max = 18) {
  const chars = [...String(name ?? '').trim()];
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : chars.join('');
}

/** Nhãn tên trên đầu các nhân vật đứng đầu (HTML, sắc nét). Dùng pool cố định. */
export class NameTags {
  constructor(parent, count = CONFIG.topNamesShown) {
    this.tags = Array.from({ length: count }, () => {
      const node = createFrame({ variant: 'blue', className: 'nametag is-hidden' });
      parent.append(node);
      return { node, text: '' };
    });
  }

  /** Đặt nhãn i tại (x, y) màn hình (đỉnh đầu), s là tỉ lệ phối cảnh. */
  show(i, name, x, y, s) {
    const tag = this.tags[i];
    if (!tag) return;
    if (tag.text !== name) {
      tag.text = name;
      tag.node.textContent = shortName(name, 14);
    }
    tag.node.classList.remove('is-hidden');
    const k = Math.max(0.85, Math.min(1.25, 0.55 + 0.95 * s));
    tag.node.style.transform = `translate(${x}px, ${y - 8}px) translate(-50%, -100%) scale(${k})`;
  }

  hideFrom(i) {
    for (let j = i; j < this.tags.length; j++) this.tags[j].node.classList.add('is-hidden');
  }
}

/** Dải chữ "TẠM DỪNG" giữa màn hình khi streamer bấm phím tạm dừng. */
export class PauseBadge {
  constructor(parent) {
    this.node = el('div', 'pausebadge is-hidden');
    this.node.innerHTML = `${title(STR.paused)}<div class="pausebadge__sub">${STR.pausedHint}</div>`;
    parent.append(this.node);
  }

  set(on) {
    this.node.classList.toggle('is-hidden', !on);
  }
}

/**
 * Chữ nổi ngắn bay lên từ đầu nhân vật ("Né hoàn hảo!", "Choáng!", "Bay vút!", tên người tặng quà).
 * Pool node cố định, mỗi chữ chạy một animation CSS rồi tự ẩn; không tạo node mới giữa trận.
 */
export class FloatTexts {
  constructor(parent, count = CONFIG.fx.floatTextPool) {
    this.items = Array.from({ length: count }, () => {
      const node = el('div', 'floattext is-hidden');
      node.style.setProperty('--dur', `${CONFIG.fx.floatTextSeconds}s`);
      node.addEventListener('animationend', () => node.classList.add('is-hidden'));
      parent.append(node);
      return node;
    });
    this.next = 0;
  }

  /** tone: good | bad | boost | gift. (x, y) là đỉnh đầu trên màn hình, s là tỉ lệ phối cảnh. */
  show(text, tone, x, y, s) {
    const node = this.items[this.next++ % this.items.length];
    node.className = `floattext floattext--${tone}`;
    node.innerHTML = title(text);
    node.style.setProperty('--x', `${Math.round(x)}px`);
    node.style.setProperty('--y', `${Math.round(y - 20)}px`);
    node.style.setProperty('--k', String(Math.max(0.8, Math.min(1.25, 0.5 + 0.9 * s)).toFixed(2)));
    void node.offsetWidth; // khởi động lại animation khi tái sử dụng node
    node.classList.add('is-playing');
  }
}

/** Thông báo ngắn xếp dọc ở góc dưới phải, mỗi cái tự biến mất sau vài giây. */
export class Toasts {
  constructor(parent, { max = 3, seconds = 2.8 } = {}) {
    this.box = el('div', 'toasts');
    parent.append(this.box);
    this.max = max;
    this.ms = seconds * 1000;
  }

  /** message: { text, kind: 'ok' | 'queue' | 'warn' } */
  show(message) {
    const node = createFrame({ variant: 'purple', className: `toast toast--${message.kind ?? 'ok'}` });
    node.append(el('span', 'toast__dot'), document.createTextNode(message.text));
    this.box.append(node);
    while (this.box.children.length > this.max) this.box.firstElementChild.remove(); // đầy thì bỏ cái cũ nhất
    setTimeout(() => node.classList.add('is-out'), this.ms);
    setTimeout(() => node.remove(), this.ms + 400);
  }
}

/** Thông báo to giữa màn hình cho quà lớn ("X tặng Y, bay vút!"), hiện lần lượt. */
export class GiftBanner {
  constructor(parent) {
    this.parent = parent;
    this.queue = [];
    this.active = false;
  }

  show(text) {
    this.queue.push(text);
    if (this.queue.length > 3) this.queue.shift();
    if (!this.active) this.next();
  }

  next() {
    const text = this.queue.shift();
    if (!text) {
      this.active = false;
      return;
    }
    this.active = true;
    const node = createFrame({ variant: 'title', className: 'abs giftbanner' });
    node.style.setProperty('--tx', '-50%');
    node.innerHTML = title(text);
    this.parent.append(node);
    const ms = CONFIG.giftBannerSeconds * 1000;
    setTimeout(() => node.classList.add('is-out'), ms - 400);
    setTimeout(() => {
      node.remove();
      this.next();
    }, ms);
  }
}

/**
 * Lớp phủ theo trạng thái lượt: tên lượt (chờ), số đếm ngược, "XUẤT PHÁT!" và màn kết quả
 * (avatar người thắng phóng to, vương miện, tên, thời gian, đếm ngược sang lượt mới).
 * Chỉ dựng lại khi trạng thái đổi; riêng số đếm và dòng "Lượt mới sau N giây" cập nhật theo giá trị.
 */
export class RoundOverlay {
  constructor(parent) {
    this.layer = el('div', 'round');
    parent.append(this.layer);
    this.lastKey = '';
    this.footer = null;
  }

  update(m) {
    const key = this.keyFor(m);
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.render(m);
    }
    if (m.state === 'result' && this.footer) {
      const text = STR.nextRound(Math.max(1, Math.ceil(m.cfg.resultSeconds - m.stateTime)));
      if (this.footer.textContent !== text) this.footer.textContent = text;
    }
  }

  keyFor(m) {
    if (m.state === 'countdown') return `c${m.round}-${m.countdownValue}`;
    if (m.state === 'race') return m.raceTime < 0.9 ? `go${m.round}` : 'race';
    return `${m.state}${m.round}`;
  }

  render(m) {
    const L = this.layer;
    this.footer = null;
    L.parentElement.classList.toggle('is-result', m.state === 'result'); // màn kết quả làm mờ HUD phía sau
    if (m.state === 'wait') {
      L.innerHTML = `<div class="round__big is-word pop">${title(STR.round(m.round))}</div>
        <div class="round__sub pop">${STR.getReady}</div>`;
    } else if (m.state === 'countdown') {
      L.innerHTML = `<div class="round__big countnum">${title(String(m.countdownValue))}</div>`;
    } else if (m.state === 'race' && m.raceTime < 0.9) {
      L.innerHTML = `<div class="round__big is-go go">${title(STR.go)}</div>`;
    } else if (m.state === 'result' && m.result) {
      this.renderResult(m.result);
    } else {
      L.innerHTML = '';
    }
  }

  renderResult({ winner, finished, raceSeconds }) {
    const L = this.layer;
    const percent = Math.floor(Math.min(100, Math.max(0, (winner.dist / CONFIG.trackLength) * 100)));
    L.innerHTML = `<div class="result">
      ${title(STR.winnerTitle, 'result__title')}
      <div class="result__crown">${iconSvg('crown')}</div>
      <div class="result__name-wrap"></div>
    </div>`;
    const box = L.querySelector('.result');
    box.insertBefore(createAvatar(winner.userId, winner.avatarUrl, 420, 'result__avatar'), box.querySelector('.result__name-wrap'));
    const wrap = box.querySelector('.result__name-wrap');
    wrap.outerHTML = `${title(shortName(winner.nickname, 16), 'result__name')}
      <div class="result__detail">${finished ? STR.finishedIn(mmss(raceSeconds)) : STR.leadedWith(percent)}</div>`;
    const footer = createFrame({ variant: 'purple', className: 'result__footer' });
    box.append(footer);
    this.footer = footer;
  }
}
