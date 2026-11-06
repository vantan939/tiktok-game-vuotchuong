import { CONFIG } from '../config.js';
import { STR } from '../strings.js';
import { Confetti } from '../entities/Confetti.js';

const FONT = '"Segoe UI", Arial, sans-serif';
const CX = CONFIG.width / 2;
const AVATAR_SIZE = 400;
const AVATAR_Y = 960;
const RAIN_PER_SECOND = 45;
const GO_SECONDS = 0.9; // "XUẤT PHÁT!" hiện bấy lâu sau khi đua bắt đầu

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const easeOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;

// Lớp phủ theo trạng thái lượt: tên lượt (chờ), số đếm ngược, "XUẤT PHÁT!" và màn kết quả
// (avatar người thắng phóng to, vương miện, tên, pháo hoa giấy, đếm ngược sang lượt mới).
export class RoundOverlay {
  constructor(scene, avatars) {
    this.scene = scene;
    this.avatars = avatars;
    const text = (y, size, color, stroke = 14) =>
      scene.add
        .text(CX, y, '', { fontFamily: FONT, fontStyle: 'bold', fontSize: `${size}px`, color, stroke: '#1b1450', strokeThickness: stroke, align: 'center' })
        .setOrigin(0.5)
        .setDepth(1050)
        .setVisible(false);

    this.dim = scene.add.rectangle(CX, CONFIG.height / 2, CONFIG.width, CONFIG.height, 0x0a0a30, 0).setDepth(1000);
    this.big = text(900, 380, '#ffffff', 22); // số đếm ngược, tên lượt, XUẤT PHÁT
    this.sub = text(1130, 76, '#bfe0ff');

    this.title = text(520, 84, '#ffc21a');
    this.crown = scene.add.image(CX, AVATAR_Y - AVATAR_SIZE / 2 - 4, 'crown').setOrigin(0.5, 1).setDepth(1052).setVisible(false);
    this.ring = scene.add.graphics().setDepth(1050).setVisible(false);
    this.ring.lineStyle(18, 0xffc21a, 1);
    this.ring.strokeCircle(0, 0, AVATAR_SIZE / 2 + 6);
    this.avatar = scene.add.image(CX, AVATAR_Y, 'avatar_default_0').setDepth(1051).setVisible(false);
    this.name = text(1230, 112, '#ffffff');
    this.detail = text(1340, 60, '#bfe0ff', 10);
    this.footer = text(1520, 64, '#ffffff', 10);
    this.resultItems = [this.title, this.crown, this.ring, this.avatar, this.name, this.detail, this.footer];

    this.confetti = new Confetti(scene);
    this.lastState = null;
    this.rainDebt = 0;
  }

  update(m, dt) {
    if (m.state !== this.lastState) this.enter(m);
    this.lastState = m.state;
    this.confetti.update(dt);

    switch (m.state) {
      case 'countdown': {
        const frac = m.stateTime % 1;
        this.big.setText(String(m.countdownValue)).setScale(1 + 0.5 * (1 - frac) ** 2).setAlpha(1 - frac * 0.35);
        break;
      }
      case 'race':
        if (m.raceTime < GO_SECONDS) {
          const f = m.raceTime / GO_SECONDS;
          this.big.setVisible(true).setText(STR.go).setFontSize(190).setScale(1 + 0.4 * (1 - f) ** 2).setAlpha(1 - f ** 3);
        } else this.big.setVisible(false);
        break;
      case 'result':
        this.updateResult(m, dt);
        break;
    }
  }

  enter(m) {
    this.big.setVisible(false).setFontSize(380).setScale(1).setAlpha(1);
    this.sub.setVisible(false);
    this.resultItems.forEach((o) => o.setVisible(false));
    this.dim.setFillStyle(0x0a0a30, 0);
    if (m.state !== 'result') this.confetti.clear();

    if (m.state === 'wait') {
      this.big.setVisible(true).setText(STR.round(m.round)).setFontSize(210);
      this.sub.setVisible(true).setText(STR.getReady);
    } else if (m.state === 'countdown') {
      this.big.setVisible(true);
    } else if (m.state === 'result') {
      this.showWinner(m.result);
      this.confetti.burst();
    }
  }

  showWinner({ winner, finished, raceSeconds }) {
    const key = this.avatars.request(winner.userId, winner.avatarUrl, (k) => this.avatar.setTexture(k));
    this.avatar.setTexture(key);
    this.title.setText(STR.winnerTitle);
    this.name.setText(winner.nickname);
    const percent = Math.floor(Math.min(100, Math.max(0, (winner.dist / CONFIG.trackLength) * 100)));
    this.detail.setText(finished ? STR.finishedIn(mmss(raceSeconds)) : STR.leadedWith(percent));
    this.resultItems.forEach((o) => o.setVisible(true).setAlpha(0));
    this.ring.setPosition(CX, AVATAR_Y);
  }

  updateResult(m, dt) {
    const t = m.stateTime;
    this.dim.setFillStyle(0x0a0a30, Math.min(0.62, t * 2));
    const fade = Math.min(1, t * 3);
    for (const o of this.resultItems) o.setAlpha(fade);

    // Avatar phóng to với hiệu ứng nảy, vương miện đậu trên đầu
    const e = easeOutBack(Math.min(1, t / 0.6));
    this.avatar.setDisplaySize(AVATAR_SIZE * e, AVATAR_SIZE * e);
    this.ring.setScale(e);
    const bob = Math.sin(t * 3) * 6;
    this.crown.setScale(1.9 * e).setPosition(CX, AVATAR_Y - (AVATAR_SIZE / 2) * e + 24 + bob);

    this.footer.setText(STR.nextRound(Math.max(1, Math.ceil(m.cfg.resultSeconds - t))));
    if (t < m.cfg.resultSeconds - 1) {
      this.rainDebt += dt * RAIN_PER_SECOND;
      for (; this.rainDebt >= 1; this.rainDebt--) this.confetti.rain(1);
    }
  }
}
