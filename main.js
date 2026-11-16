import { createAudio } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

const WEDDING = { d: 26, m: 7, y: 2017 }; // month is 0-based
const STORE_KEY = 'anyuta-quest-v2';
const HEART_PATH = 'M12 21s-7.5-4.6-10-9.3C.3 8.4 2.2 4 6.3 4c2.3 0 3.9 1.3 5.7 3.4C13.8 5.3 15.4 4 17.7 4 21.8 4 23.7 8.4 22 11.7 19.5 16.4 12 21 12 21z';
const QUESTIONS = 2;
const DATE = 2;
const FINAL = 3;

const audio = createAudio();
let scene = null;

import('./scene.js')
  .then((m) => { scene = m.createScene($('#gl')); scene.setMode(modeFor(step)); })
  .catch((err) => { console.warn('WebGL scene unavailable:', err); document.body.classList.add('no-gl'); });

/* ---------------- storage ---------------- */
const store = {
  get() { try { return parseInt(localStorage.getItem(STORE_KEY) || '0', 10) || 0; } catch { return 0; } },
  set(v) { try { localStorage.setItem(STORE_KEY, String(v)); } catch { /* ignore */ } },
  clear() { try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ } },
};

/* ---------------- navigation ---------------- */
const screens = $$('.screen');
let step = 0;
let reached = Math.min(store.get(), FINAL);
const entered = new Set();

function modeFor(n) { return n === 0 ? 'intro' : n === FINAL ? 'final' : 'quest'; }

function go(n) {
  screens.forEach((s) => s.classList.toggle('active', +s.dataset.step === n));
  step = n;
  const scr = screens[n];
  scr.scrollTop = 0;
  if (n > reached) { reached = n; store.set(n); }
  document.body.classList.toggle('in-quest', n > 0 && n < FINAL);
  renderProgress();
  scene?.setMode(modeFor(n));
  if (n !== DATE) scene?.setWarmth(n === 0 ? 0 : 0.08);
  if (!entered.has(n)) { entered.add(n); ENTER[n]?.(scr); }
}

function renderProgress() {
  const nav = $('#progress');
  if (!nav.children.length) {
    nav.innerHTML = Array.from({ length: QUESTIONS }, () => `<svg viewBox="0 0 24 24"><path d="${HEART_PATH}"/></svg>`).join('');
  }
  [...nav.children].forEach((el, i) => {
    const q = i + 1;
    el.classList.toggle('done', q < step || solved.has(q));
    el.classList.toggle('current', q === step && !solved.has(q));
  });
}

const solved = new Set();
function solve(n, message) {
  if (solved.has(n)) return;
  solved.add(n);
  renderProgress();
  const scr = screens[n];
  const fb = $('.feedback', scr);
  if (message) say(fb, message, true);
  audio.chime();
  scene?.pulse(1);
  const r = fb.getBoundingClientRect();
  burst(innerWidth / 2, r.top + r.height / 2 || innerHeight / 2, 26);
  const next = $('.next', scr);
  setTimeout(() => { next.hidden = false; }, 650);
}

function say(el, text, good = false) {
  el.textContent = text;
  el.classList.toggle('good', good);
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

/* ---------------- heart bursts ---------------- */
const BURST_COLORS = ['#ff6f9c', '#ff9ab9', '#ffd59a', '#ff4f80', '#ffc2d4'];
function burst(x, y, count = 12) {
  const host = $('#bursts');
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'b';
    s.textContent = '❤︎';
    const a = Math.random() * Math.PI * 2;
    const d = 50 + Math.random() * 130;
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d - 40 + 'px');
    s.style.setProperty('--r', (Math.random() * 80 - 40) + 'deg');
    s.style.setProperty('--s', (12 + Math.random() * 18) + 'px');
    s.style.setProperty('--c', BURST_COLORS[(Math.random() * BURST_COLORS.length) | 0]);
    s.style.setProperty('--t', (1 + Math.random() * 0.7) + 's');
    host.appendChild(s);
    setTimeout(() => s.remove(), 1900);
  }
}

document.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, input, .wheel, .card')) return;
  burst(e.clientX, e.clientY, 8);
  scene?.pulse(0.35);
});

/* ---------------- sound ---------------- */
const soundBtn = $('#soundBtn');
function setSound(on) {
  if (on) on = audio.start(); else audio.stop();
  soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
}
soundBtn.addEventListener('click', () => setSound(!audio.playing));

/* ---------------- global actions ---------------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action], .next');
  if (!btn) return;
  if (btn.classList.contains('next')) { go(step + 1); return; }
  if (btn.dataset.action === 'start') {
    setSound(true);
    go(reached > 0 ? reached : 1);
  }
  if (btn.dataset.action === 'restart') {
    store.clear();
    location.reload();
  }
});

if (reached > 0) $('#startLabel').textContent = reached >= FINAL ? 'Снова открыть письмо' : 'Продолжить путешествие';

/* ======================================================
   QUESTIONS
   ====================================================== */
const ENTER = {};

/* ---- 1. Name from hearts ---- */
ENTER[1] = (scr) => {
  const target = ['А', 'Н', 'Ю', 'Т', 'А'];
  const letters = shuffle(['А', 'Н', 'Ю', 'Т', 'А', 'Я', 'Л', 'М']);
  const field = $('#heartField', scr);
  const slots = $$('#nameSlots span', scr);
  const fb = $('#nameFb', scr);
  let idx = 0;
  let misses = 0;

  // 4×2 grid with jitter so hearts never overlap
  letters.forEach((ch, i) => {
    const col = i % 4, row = (i / 4) | 0;
    const x = 13 + col * 24.5 + (Math.random() * 6 - 3);
    const y = 26 + row * 48 + (Math.random() * 10 - 5);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lheart';
    b.style.left = x + '%';
    b.style.top = y + '%';
    b.setAttribute('aria-label', 'Буква ' + ch);
    b.innerHTML = `<span class="fl" style="animation-delay:${-Math.random() * 4}s"><span class="bd">
      <svg viewBox="0 0 24 24"><defs><linearGradient id="lg${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9fbf"/><stop offset="1" stop-color="#ff3f78"/></linearGradient></defs><path fill="url(#lg${i})" d="${HEART_PATH}"/></svg>
      <span class="ltr">${ch}</span></span></span>`;
    b.addEventListener('click', () => pick(b, ch));
    field.appendChild(b);
  });

  const wrongLines = ['Не то сердечко 🙈', 'Почти! Попробуй другое', 'Это сердечко — для кого-то другого 😉', 'Ищи дальше, любимая'];

  function pick(b, ch) {
    if (idx >= target.length) return;
    const bd = $('.bd', b);
    if (ch === target[idx]) {
      bd.classList.add('got');
      b.disabled = true;
      slots[idx].textContent = ch;
      slots[idx].classList.add('filled');
      const r = b.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 7);
      scene?.pulse(0.4);
      idx++;
      misses = 0;
      const steps = ['Красивое начало…', 'Ещё, ещё… ❤', 'Уже почти! 🥰', 'Осталась одна буква…'];
      if (idx < target.length) say(fb, steps[idx - 1]);
      else {
        $$('.lheart', field).forEach((h) => { h.disabled = true; h.style.transition = 'opacity .8s'; h.style.opacity = '.25'; });
        solve(1, 'Анюта ❤ Какая ты умница — справилась с заданием! А теперь — последний вопрос…');
      }
    } else {
      misses++;
      bd.classList.remove('no'); void bd.offsetWidth; bd.classList.add('no');
      audio.soft();
      if (idx === 0 && misses >= 2) say(fb, 'Подсказка: первая буква — как в слове «Ангел» 😇');
      else if (idx > 0 && misses >= 2) say(fb, 'Подсказка: ' + 'АНЮТА'.slice(0, idx) + '… — дальше буква «' + target[idx] + '» 😉');
      else say(fb, wrongLines[misses % wrongLines.length]);
    }
  }
};

/* ---- 2. The happiest day ---- */
ENTER[DATE] = (scr) => {
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const today = new Date();
  const Y_MIN = 2005, Y_MAX = today.getFullYear() + 1;
  const val = { d: today.getDate(), m: today.getMonth(), y: today.getFullYear() };
  const fb = $('#dateFb', scr);
  const warmthEl = $('#warmth', scr);
  const bar = $('#warmth i', scr);
  const rings = $('#rings', scr);
  const check = $('#dateCheck', scr);
  let attempts = 0;
  let live = false;

  const dim = (m, y) => new Date(y, m + 1, 0).getDate();
  const wrap = (v, lo, hi) => (v < lo ? hi : v > hi ? lo : v);
  const fmt = {
    d: (v) => String(v),
    m: (v) => MONTHS[v],
    y: (v) => String(v),
  };
  const range = {
    d: () => [1, dim(val.m, val.y)],
    m: () => [0, 11],
    y: () => [Y_MIN, Y_MAX],
  };

  const wheels = {};
  $$('.wheel', scr).forEach((w) => {
    const part = w.dataset.part;
    wheels[part] = w;
    const win = $('.win', w);
    const bump = (dir) => {
      if (solved.has(DATE)) return;
      const [lo, hi] = range[part]();
      val[part] = wrap(val[part] + dir, lo, hi);
      if (part !== 'd') val.d = Math.min(val.d, dim(val.m, val.y));
      render();
      win.classList.remove('tick'); void win.offsetWidth; win.classList.add('tick');
    };
    $('.up', w).addEventListener('click', () => bump(1));
    $('.down', w).addEventListener('click', () => bump(-1));

    // drag / swipe on the value window
    let startY = null, acc = 0;
    win.addEventListener('pointerdown', (e) => { startY = e.clientY; acc = 0; win.setPointerCapture(e.pointerId); });
    win.addEventListener('pointermove', (e) => {
      if (startY === null) return;
      acc += startY - e.clientY;
      startY = e.clientY;
      while (Math.abs(acc) >= 26) { bump(acc > 0 ? 1 : -1); acc -= 26 * Math.sign(acc); }
    });
    const end = () => { startY = null; };
    win.addEventListener('pointerup', end);
    win.addEventListener('pointercancel', end);
    w.addEventListener('wheel', (e) => { e.preventDefault(); bump(e.deltaY < 0 ? 1 : -1); }, { passive: false });
  });

  function warmth() {
    const a = Date.UTC(val.y, val.m, val.d);
    const b = Date.UTC(WEDDING.y, WEDDING.m, WEDDING.d);
    const days = Math.abs(a - b) / 86400000;
    return Math.max(0, 1 - Math.log10(days + 1) / Math.log10(3000));
  }

  function render() {
    for (const part of ['d', 'm', 'y']) {
      const [lo, hi] = range[part]();
      const vs = $$('.v', wheels[part]);
      vs[0].textContent = fmt[part](wrap(val[part] + 1, lo, hi));
      vs[1].textContent = fmt[part](val[part]);
      vs[2].textContent = fmt[part](wrap(val[part] - 1, lo, hi));
      wheels[part].classList.toggle('right', live && val[part] === WEDDING[part]);
    }
    if (live) {
      const w = warmth();
      bar.style.setProperty('--w', w.toFixed(3));
      rings.style.setProperty('--w', w.toFixed(3));
      rings.classList.toggle('hot', w > 0.85);
      scene?.setWarmth(0.3 + w * 0.7);
    }
  }

  const HINTS = [
    'Хороший день… но был один — ещё счастливее. Подсказка: это было летом ☀️',
    'В тот день на тебе было самое красивое белое платье 🤍',
    'Мы тогда сказали друг другу «да» 💍',
    'Это было в конце лета, в августе 🌾',
    'Год, когда всё началось по-настоящему: 2017 ✨',
    'Наше число — 26 💛',
  ];

  check.addEventListener('click', () => {
    if (solved.has(DATE)) return;
    const okD = val.d === WEDDING.d, okM = val.m === WEDDING.m, okY = val.y === WEDDING.y;
    if (okD && okM && okY) {
      live = true; render();
      check.hidden = true;
      rings.style.setProperty('--w', '1');
      rings.classList.add('hot');
      bar.style.setProperty('--w', '1');
      scene?.setWarmth(1);
      solve(DATE, 'Да. 26 августа 2017 — наша свадьба. Самый счастливый день в моей жизни 💍');
      return;
    }
    attempts++;
    if (!live) { live = true; warmthEl.classList.add('on'); }
    render();
    audio.soft();
    scene?.pulse(0.3);

    const sel = new Date(val.y, val.m, val.d);
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let msg;
    if (okM && okD) msg = 'Да, это наш день в календаре! 💛 А какой был год?';
    else if (okY && okM) msg = 'Совсем горячо! 🔥 Осталось только число…';
    else if (okY && okD) msg = 'Год и число верные! А месяц — конец лета 🌾';
    else if (sel > t0) msg = 'Этот день ещё впереди — и он тоже будет счастливым 😊 Но я про тот, что уже был.';
    else if (sel.getTime() === t0.getTime()) msg = 'Сегодня тоже хороший день — ты проходишь мою игру ❤ Но самый счастливый был раньше.';
    else if (val.m === 1 && val.d === 14) msg = 'День всех влюблённых — красиво, но у нас есть свой собственный праздник 💕';
    else if (okY) msg = 'Год угадала! ✨ Теперь месяц…';
    else msg = HINTS[Math.min(attempts - 1, HINTS.length - 1)];
    say(fb, msg);
    if (attempts === 1) say(fb, msg + ' Шкала подскажет: холодно или горячо.');
  });

  render();
};

/* ---- 7. Final ---- */
ENTER[FINAL] = async (scr) => {
  audio.finale();
  scene?.pulse(1);
  await sleep(scene ? 4200 : 1200);
  scr.classList.add('revealed');
  $$('.lp', scr).forEach((p, i) => { p.style.transitionDelay = (0.5 + i * 0.55) + 's'; });
  startCounter();
  setTimeout(() => burst(innerWidth / 2, innerHeight * 0.3, 30), 600);
};

function plural(n, forms) {
  const a = n % 100, b = n % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b === 1) return forms[0];
  if (b >= 2 && b <= 4) return forms[1];
  return forms[2];
}

function startCounter() {
  const el = $('#counter');
  const since = new Date(WEDDING.y, WEDDING.m, WEDDING.d, 0, 0, 0);
  const parts = [
    ['days', ['день', 'дня', 'дней']],
    ['h', ['час', 'часа', 'часов']],
    ['m', ['минута', 'минуты', 'минут']],
    ['s', ['секунда', 'секунды', 'секунд']],
  ];
  el.innerHTML = parts.map(([k]) => `<div class="${k}"><b></b><span></span></div>`).join('');
  const cells = $$('div', el);
  const tick = () => {
    let diff = Math.max(0, Math.floor((Date.now() - since.getTime()) / 1000));
    const days = Math.floor(diff / 86400); diff -= days * 86400;
    const h = Math.floor(diff / 3600); diff -= h * 3600;
    const m = Math.floor(diff / 60);
    const s = diff - m * 60;
    [days, h, m, s].forEach((v, i) => {
      $('b', cells[i]).textContent = i === 0 ? v.toLocaleString('ru-RU') : String(v).padStart(2, '0');
      $('span', cells[i]).textContent = plural(v, parts[i][1]);
    });
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------------- boot ---------------- */
renderProgress();
go(0);
