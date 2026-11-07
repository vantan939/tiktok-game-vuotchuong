import { STR } from '../strings.js';
import { viewer } from '../core/viewer.js';
import { GIFTS } from '../sources/DemoSource.js';

// Panel debug nhỏ ở chế độ demo, ẩn/hiện bằng phím D. Là phần tử HTML nằm ngoài canvas.
export class DebugPanel {
  constructor(demo) {
    this.demo = demo;
    this.root = document.createElement('div');
    this.root.style.cssText =
      'position:fixed;left:8px;top:8px;z-index:10;width:220px;padding:10px;border-radius:10px;' +
      'background:rgba(20,12,60,.88);color:#fff;font:13px "Segoe UI",Arial,sans-serif;';

    const title = document.createElement('div');
    title.textContent = STR.debug.title;
    title.style.cssText = 'font-weight:700;margin-bottom:6px';

    this.input = document.createElement('input');
    this.input.placeholder = STR.debug.namePlaceholder;
    this.input.setAttribute('list', 'debug-users');
    this.input.style.cssText = 'width:100%;box-sizing:border-box;margin-bottom:6px;padding:4px';
    const list = document.createElement('datalist');
    list.id = 'debug-users';
    demo.users.forEach((u) => list.append(new Option(u.nickname)));

    this.root.append(title, this.input, list);
    this.addButton(STR.debug.join, (u) => demo.chat(u, 'join'));
    this.addButton(STR.debug.like, (u) => demo.like(u, 5));
    this.addButton(STR.debug.gift, (u) => demo.gift(u, GIFTS[1]));
    this.addButton(STR.debug.midGift, (u) => demo.gift(u, GIFTS[4]));
    this.addButton(STR.debug.bigGift, (u) => demo.gift(u, GIFTS[5]));

    const hint = document.createElement('div');
    hint.textContent = STR.debug.hint;
    hint.style.cssText = 'margin-top:6px;opacity:.7;font-size:11px';
    this.root.append(hint);

    document.body.append(this.root);
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key.toLowerCase() === 'd') this.root.hidden = !this.root.hidden;
    });
  }

  addButton(label, action) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'margin:0 4px 4px 0;padding:4px 8px;cursor:pointer';
    b.onclick = () => {
      const name = this.input.value.trim();
      if (!name) return;
      const user = this.demo.userByName(name);
      viewer.userId = user.userId; // thao tác như ai thì camera đuổi theo người đó (góc người chơi)
      action(user);
    };
    this.root.append(b);
  }
}
