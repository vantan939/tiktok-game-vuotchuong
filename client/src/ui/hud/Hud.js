import { CONFIG } from '../../config.js';
import { STR } from '../../strings.js';
import { createAvatar } from './avatar.js';
import { createBanner } from './Banner.js';
import { createFrame, el } from './Frame.js';
import { iconSvg } from './svgIcons.js';

const TOP_ROWS = CONFIG.topShown;
const ROW_H = 46;

const abs = (node, x, y) => {
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  return node;
};

function setHtml(node, html) {
  if (node.__html !== html) {
    node.__html = html;
    node.innerHTML = html;
  }
}

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

/**
 * HUD HTML/CSS đặt chồng lên canvas: banner tiêu đề, ĐANG ĐUA, THỜI GIAN, ba thẻ hướng dẫn, TOP 10,
 * hàng đợi, thẻ thể lệ. Mọi khung đều dùng component createFrame (kiểu dáng ở theme.js).
 * Hud chỉ vẽ dữ liệu được đưa vào update(); không chứa logic game.
 */
export class Hud {
  constructor(parent) {
    const H = STR.hud;
    this.parent = parent;

    const banner = createBanner();

    // ĐANG ĐUA và THỜI GIAN
    this.racingValue = el('div', 'stat__value num txt');
    const racing = createFrame({ variant: 'blue', className: 'stat', rect: { x: 101, y: 301, w: 287, h: 92 } });
    racing.append(el('div', 'stat__icon', iconSvg('people')));
    const racingBody = el('div');
    racingBody.append(el('div', 'stat__label', H.racing), this.racingValue);
    racing.append(racingBody);

    this.timeValue = el('div', 'stat__value num txt');
    this.timeFrame = createFrame({ variant: 'blue', className: 'stat stat--time', rect: { x: 652, y: 301, w: 364, h: 92 } });
    this.timeFrame.append(el('div', 'stat__icon', iconSvg('stopwatch')));
    const timeBody = el('div');
    timeBody.append(el('div', 'stat__label', H.time), this.timeValue);
    this.timeFrame.append(timeBody);

    // Ba thẻ bên trái
    this.camPill = el('div', 'toggle');
    const camCard = createFrame({ variant: 'purple', className: 'card card--cam', rect: { x: 14, y: 435, w: 266, h: 158 } });
    const camRow = el('div', 'row');
    camRow.append(
      el('div', 'card__icon', iconSvg('lock')),
      el('div', 'card__text txt', `${H.camTitle}<br><em>${H.camHint}</em>`),
    );
    camCard.append(camRow, this.camPill);
    const heartCard = createFrame({ variant: 'purple', className: 'card', rect: { x: 14, y: 610, w: 266, h: 88 } });
    heartCard.append(el('div', 'card__icon', iconSvg('heart')), el('div', 'card__text txt', `${H.heartLine1}<br>${H.heartLine2}`));
    const giftCard = createFrame({ variant: 'purple', className: 'card', rect: { x: 14, y: 712, w: 266, h: 112 } });
    giftCard.append(el('div', 'card__icon', iconSvg('gift')), el('div', 'card__text txt', `${H.giftLine1}<br>${H.giftLine2}<br>${H.giftLine3}`));

    // Bảng xếp hạng TOP N (CONFIG.topShown)
    this.top10List = el('div', 'top10__list');
    this.top10List.style.height = `${TOP_ROWS * ROW_H}px`;
    const top10 = createFrame({ variant: 'blue', className: 'top10', rect: { x: 730, y: 416, w: 340, h: 88 + TOP_ROWS * ROW_H } });
    const head = el('div', 'top10__head');
    head.append(el('div', 'crown', iconSvg('crown')), el('div', 'top10__title', H.top(TOP_ROWS)));
    top10.append(head, this.top10List);

    const autoY = 416 + 88 + TOP_ROWS * ROW_H + 14;
    // Thẻ nhắc luật ngay dưới bảng xếp hạng: nhân vật tự né, người xem chỉ cần tăng tốc
    const autoCard = createFrame({ variant: 'purple', className: 'card card--hint', rect: { x: 730, y: autoY, w: 340, h: 104 } });
    autoCard.append(el('div', 'card__text txt', `${H.autoLine1}<br>${H.autoLine2} <em>${H.autoLine3}</em>`));

    // Dòng chỉ dẫn gõ join, cùng cột bên phải với bảng xếp hạng
    const joinCard = createFrame({ variant: 'purple', className: 'card card--join', rect: { x: 730, y: autoY + 104 + 12, w: 340, h: 92 } });
    joinCard.append(el('div', 'card__text txt', `${H.joinHint1} <em>join</em> ${H.joinHint2}`));
    this.rows = new Map(); // userId -> phần tử hàng

    // Hàng đợi và thẻ thể lệ
    this.queueCount = el('em');
    this.queueList = el('div', 'queue__list');
    this.queueItems = new Map(); // userId -> phần tử avatar
    this.queueEmpty = el('div', 'queue__empty txt', STR.hud.queueEmpty);
    this.queueMore = el('div', 'queue__more', '›');
    const queue = createFrame({ variant: 'purple', className: 'queue', rect: { x: 25, y: 1725, w: 712, h: 117 } });
    const qText = el('div', 'queue__text txt');
    qText.append(document.createTextNode(H.queue), this.queueCount);
    queue.append(el('div', 'queue__icon', iconSvg('people')), qText, el('div', 'queue__sep'), this.queueList, this.queueEmpty, this.queueMore);
    const minutes = Math.round(CONFIG.roundSeconds / 60);
    const rule = createFrame({ variant: 'gold', className: 'rule', rect: { x: 752, y: 1725, w: 304, h: 117 } });
    rule.append(
      el('div', 'rule__icon', iconSvg('hourglass')),
      el('div', 'rule__text', `${H.ruleRound(minutes)}<br>${H.ruleMax(CONFIG.maxPlayers)}`),
    );

    parent.append(banner, racing, this.timeFrame, camCard, heartCard, giftCard, joinCard, top10, autoCard, queue, rule);
    this.queueKey = '';
  }

  /**
   * model: { racing, max, time, total, low, cams: { used, max }, top: [{ id, name, avatarUrl, percent }],
   *          queueTotal, queueFirst: [{ id, avatarUrl }], queueBase }
   */
  update(m) {
    setHtml(this.racingValue, `${m.racing} <small>/ ${m.max}</small>`);
    setHtml(this.timeValue, `<b>${m.time}</b> <small>/ ${m.total}</small>`);
    this.timeFrame.classList.toggle('is-low', m.low);

    setText(this.camPill, `${m.cams.used}/${m.cams.max}`);
    this.camPill.classList.toggle('is-off', m.cams.used === 0);

    this.updateTop(m.top);
    this.updateQueue(m);
  }

  updateTop(top) {
    const seen = new Set();
    top.slice(0, TOP_ROWS).forEach((entry, i) => {
      seen.add(entry.id);
      let row = this.rows.get(entry.id);
      if (!row) {
        row = this.makeRow(entry);
        this.rows.set(entry.id, row);
        this.top10List.append(row.node);
        row.node.style.transition = 'none'; // hàng mới vào đúng chỗ, không trượt từ đầu
        row.node.style.transform = `translateY(${i * ROW_H}px)`;
        row.node.getBoundingClientRect();
        row.node.style.transition = '';
      }
      row.node.style.transform = `translateY(${i * ROW_H}px)`;
      row.node.classList.toggle('is-first', i === 0);
      if (row.rank !== i + 1) {
        row.rank = i + 1;
        row.badge.textContent = String(i + 1);
        row.badge.className = `row__rank ${i < 3 ? `r${i + 1}` : ''}`;
      }
      setText(row.pct, `${Math.floor(entry.percent)}%`);
      row.cam.style.display = entry.cam ? '' : 'none';
    });
    for (const [id, row] of this.rows) {
      if (!seen.has(id)) {
        // Rời bảng: trượt xuống và mờ dần rồi mới bỏ
        this.rows.delete(id);
        row.node.classList.add('is-leaving');
        setTimeout(() => row.node.remove(), 400);
      }
    }
  }

  makeRow(entry) {
    const node = el('div', 't10row');
    const badge = el('div', 'row__rank');
    const name = el('div', 'row__name');
    const label = el('span', 'row__label');
    label.textContent = entry.name;
    name.append(label);
    const pct = el('div', 'row__pct');
    const cam = el('span', 'row__cam', iconSvg('camera')); // dấu hiệu đang bật camera cận
    cam.style.display = 'none';
    name.append(cam);
    node.append(badge, createAvatar(entry.id, entry.avatarUrl, 40), name, pct);
    return { node, badge, pct, cam, rank: 0 };
  }

  // Hàng đợi: 5 người đầu theo dữ liệu thật. Giữ phần tử theo userId để người mới vào mờ hiện, người rời đi trượt ra
  updateQueue(m) {
    setText(this.queueCount, STR.hud.queueCount(m.queueTotal));
    this.queueMore.style.visibility = m.queueTotal > m.queueFirst.length ? 'visible' : 'hidden'; // còn người phía sau
    this.queueEmpty.style.display = m.queueFirst.length ? 'none' : '';

    const key = m.queueFirst.map((q) => `${q.id}${q.late ? 'L' : ''}${q.n ?? ''}`).join('|') + `#${m.queueBase}`;
    if (key === this.queueKey) return;
    this.queueKey = key;

    const seen = new Set();
    m.queueFirst.forEach((q, i) => {
      seen.add(q.id);
      let item = this.queueItems.get(q.id);
      if (!item) {
        const node = el('div', 'queue__item txt is-new');
        const label = document.createTextNode('');
        node.append(createAvatar(q.id, q.avatarUrl, 56), label);
        item = { node, label };
        this.queueItems.set(q.id, item);
      }
      const text = q.late ? '✓' : `#${q.n ?? m.queueBase + i + 1}`; // ✓: đã có suất, vào đua từ lượt sau
      if (item.label.textContent !== text) item.label.textContent = text;
      if (this.queueList.children[i] !== item.node) this.queueList.insertBefore(item.node, this.queueList.children[i] ?? null);
    });
    for (const [id, item] of this.queueItems) {
      if (!seen.has(id)) {
        this.queueItems.delete(id);
        item.node.classList.add('is-leaving');
        setTimeout(() => item.node.remove(), 350);
      }
    }
  }
}
