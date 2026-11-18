(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- sprites ---------- */
  $$('.spr').forEach((el) => {
    const m = window.SPR.MAPS[el.dataset.spr];
    if (m) el.innerHTML = window.SPR.svg(m);
  });

  /* ---------- cursor ---------- */
  const ARROW = [
    'k...........',
    'kk..........',
    'kwk.........',
    'kwwk........',
    'kwwwk.......',
    'kwwwwk......',
    'kwwwwwk.....',
    'kwwwwwwk....',
    'kwwwwwwwk...',
    'kwwwwwwwwk..',
    'kwwwwwwwwwk.',
    'kwwwwwkkkkkk',
    'kwwkwwk.....',
    'kwkkwwk.....',
    'kk..kwwk....',
    'k...kwwk....',
    '.....kwwk...',
    '.....kwwk...',
    '......kk....',
  ];
  function cursorUrl(fill) {
    const s = window.SPR.svg(ARROW, { k: '#12081f', w: fill })
      .replace('<svg ', '<svg width="24" height="38" ');
    return `url("data:image/svg+xml,${encodeURIComponent(s)}") 0 0`;
  }
  root.style.setProperty('--cur', cursorUrl('#cdb8ff') + ', auto');
  root.style.setProperty('--cur-hand', cursorUrl('#ffb627') + ', pointer');

  /* ---------- sound ---------- */
  let soundOn = localStorage.getItem('lr-sound') === '1';
  let ac = null;
  window.LR_beep = function (freqs, dur, type, vol) {
    if (!soundOn) return;
    dur = dur || 0.05; vol = vol || 0.04;
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'square';
      o.frequency.value = f;
      g.gain.setValueAtTime(vol, t + i * dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (i + 1) * dur);
      o.connect(g).connect(ac.destination);
      o.start(t + i * dur);
      o.stop(t + (i + 1) * dur + 0.02);
    });
  };
  const beep = window.LR_beep;
  const unlockAudio = () => { if (ac && ac.state === 'suspended') ac.resume(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach((t) => addEventListener(t, unlockAudio, { passive: true }));
  const sndBtn = $('#sndBtn');
  function paintSound() {
    sndBtn.querySelector('b').textContent = soundOn ? 'ON' : 'OFF';
    sndBtn.setAttribute('aria-pressed', String(soundOn));
  }
  sndBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    localStorage.setItem('lr-sound', soundOn ? '1' : '0');
    paintSound();
    beep([523, 659, 784], 0.06);
  });
  paintSound();

  $$('.menu a, .btn, .cart, .w:not(.w-lock), .map-nodes button, .chip, summary').forEach((el) => {
    el.addEventListener('mouseenter', () => beep([1760], 0.025, 'square', 0.02));
  });
  $$('.btn, .map-nodes button, summary').forEach((el) => {
    el.addEventListener('click', () => beep([988, 1319], 0.05));
  });

  /* ---------- language ---------- */
  const TITLES = {
    ru: 'LODERUNNER — платёжная инфраструктура',
    en: 'LODERUNNER — payment infrastructure',
  };
  const LEVEL_LABEL = {
    ru: 'Анимация: монета-платёж проходит уровень, фрод проваливается в яму',
    en: 'Animation: a payment coin clears the level while fraud falls into a pit',
  };
  let lang = localStorage.getItem('lr-lang') || 'en';
  function setLang(l) {
    lang = l;
    root.dataset.lang = l;
    root.lang = l;
    document.title = TITLES[l];
    localStorage.setItem('lr-lang', l);
    $$('[data-ph-ru]').forEach((el) => { el.placeholder = el.dataset['ph' + (l === 'ru' ? 'Ru' : 'En')]; });
    $('#level').setAttribute('aria-label', LEVEL_LABEL[l]);
    if (mapStarted) showStage(stageIdx, true);
    if (termStarted) { clearInterval(termTimer); termCode.innerHTML = code(termKey); }
  }
  $('#langBtn').addEventListener('click', () => setLang(lang === 'ru' ? 'en' : 'ru'));

  /* ---------- header ---------- */
  const top = $('.top');
  const onScroll = () => top.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const delay = Math.max(0, $$('.reveal', el.parentElement).indexOf(el)) * 90;
      const settle = () => { el.classList.remove('in'); el.classList.add('shown'); el.style.animationDelay = ''; };
      el.style.animationDelay = delay + 'ms';
      el.classList.add('in');
      el.addEventListener('animationend', function done(ev) {
        if (ev.target !== el) return;
        el.removeEventListener('animationend', done);
        settle();
      });
      setTimeout(settle, delay + 900);
      io.unobserve(el);
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------- ticker ---------- */
  const tk = $('#ticker');
  tk.innerHTML += tk.innerHTML;

  /* ---------- typewriter ---------- */
  function typeInto(el, text, speed, done) {
    if (el._timer) clearInterval(el._timer);
    if (reduce || !speed) { el.textContent = text; done && done(); return; }
    const t0 = performance.now();
    let shown = 0;
    el.textContent = '';
    el._timer = setInterval(() => {
      const i = Math.min(text.length, Math.floor((performance.now() - t0) / speed) + 1);
      if (i === shown) return;
      shown = i;
      el.textContent = text.slice(0, i);
      if (i % 3 === 0) beep([1200 + (i % 5) * 60], 0.015, 'square', 0.012);
      if (i >= text.length) { clearInterval(el._timer); el._timer = null; done && done(); }
    }, speed);
  }

  /* ---------- map / dialog ---------- */
  const STAGES = [
    { n: 'REQUEST', ru: 'POST /v1/orders/: сумма целым числом, order_type (sbp, c2c…) и ваш external_id. Курс сделки приходит в поле rate ответа — считайте только по нему.', en: 'POST /v1/orders/: an integer amount, order_type (sbp, c2c…) and your external_id. The deal rate comes back in the rate field — calculate by it only.' },
    { n: 'ROUTE', ru: 'Мы предлагаем заявку исполнителям по стратегии направления: waterfall, fanout, weighted или round_robin. Никто не взял — 502 no_provider_accepted, повтор через минуту.', en: 'We offer the order to providers by your route\'s strategy: waterfall, fanout, weighted or round_robin. Nobody took it — 502 no_provider_accepted, retry in a minute.' },
    { n: 'ISSUED', ru: 'Статус issued: покажите клиенту card (карта или телефон для СБП), bank_name и fio. Реквизиты живут до expired_at, потом заявка станет expired.', en: 'Status issued: show the customer card (a card number or SBP phone), bank_name and fio. Requisites live until expired_at, then the order becomes expired.' },
    { n: 'DONE', ru: 'done — оплачено, деньги ваши, состояние конечное. Спор идёт в статусе appeal. Это ещё не отказ: итог будет done или canceled.', en: 'done means paid, the money is yours, and the state is final. A dispute runs as appeal. That isn\'t a decline yet: it ends as done or canceled.' },
    { n: 'CALLBACK', ru: 'На callback_url приходит POST с вашим секретом в X-Webhook-Signature, при done — с merchant_amount и rate. До 8 попыток: разбирайте по паре order_id + status.', en: 'Your callback_url gets a POST with your secret in X-Webhook-Signature, and on done — merchant_amount and rate. Up to 8 attempts: dedupe by order_id + status.' },
    { n: 'BALANCE', ru: 'merchant_amount уже на балансе в USDT — сверяйтесь по нему. Остаток: GET /v1/users/balance/. Уровень пройден.', en: 'merchant_amount is already on your USDT balance — reconcile by it. Balance: GET /v1/users/balance/. Level cleared.' },
  ];
  let stageIdx = 0, autoTimer = null, userTouched = false;
  const nodes = $$('#mapNodes button');
  const token = $('#mapToken');
  const dlgText = $('#dlgText');
  const dlgTitle = $('#dlgTitle');

  function placeToken() {
    const b = nodes[stageIdx];
    const map = $('#map');
    const r = b.getBoundingClientRect(), m = map.getBoundingClientRect();
    const x = r.left - m.left + map.scrollLeft + r.width / 2 - token.offsetWidth / 2;
    token.style.transform = `translate(${x}px, ${r.top - m.top - token.offsetHeight - 6}px)`;
  }

  function showStage(i, instant) {
    stageIdx = (i + STAGES.length) % STAGES.length;
    nodes.forEach((b, j) => {
      b.classList.toggle('on', j === stageIdx);
      b.classList.toggle('done', j < stageIdx);
    });
    placeToken();
    const s = STAGES[stageIdx];
    dlgTitle.textContent = `LEVEL ${stageIdx + 1} · ${s.n}`;
    $('#dlgGhost').textContent = STAGES.reduce((a, b) => (b[lang].length > a.length ? b[lang] : a), '') + ' __';
    typeInto(dlgText, s[lang], instant ? 0 : 22, scheduleAuto);
  }
  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (userTouched || reduce) return;
    autoTimer = setTimeout(() => showStage(stageIdx + 1), 2600);
  }
  nodes.forEach((b) => b.addEventListener('click', () => { userTouched = true; showStage(+b.dataset.i); }));
  $('#dlgPrev').addEventListener('click', () => { userTouched = true; showStage(stageIdx - 1); });
  $('#dlgNext').addEventListener('click', () => { userTouched = true; showStage(stageIdx + 1); });
  window.addEventListener('resize', placeToken);

  let mapStarted = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !mapStarted) { mapStarted = true; showStage(0); }
  }, { threshold: 0.4 }).observe($('#map'));

  /* ---------- terminal ---------- */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const raw = (v) => ({ raw: v });
  function json(obj, more, pad) {
    pad = pad || '';
    const inner = pad + '  ';
    const lines = Object.entries(obj).map(([k, v]) => {
      let val;
      if (typeof v === 'string') val = `<span class="c-s">"${esc(v)}"</span>`;
      else if (v && v.raw) val = `<span class="c-n">${v.raw}</span>`;
      else if (v && typeof v === 'object') val = json(v, false, inner);
      else val = `<span class="c-n">${v}</span>`;
      return `${inner}<span class="c-k">"${k}"</span>: ${val}`;
    });
    if (more) lines.push(`${inner}<span class="c-c">…</span>`);
    return '{\n' + lines.join(',\n') + '\n' + pad + '}';
  }
  const hdr = (k, v) => `<span class="c-k">${k}:</span> ${esc(v)}`;
  const ORDER_ID = '2d0d9186d64df5782b24196400a29282';
  const HOOK_URL = 'https://shop.example/lr/callback/';

  function code(key) {
    const secret = lang === 'ru' ? '<секрет из кабинета>' : '<secret from your dashboard>';
    switch (key) {
      case 'req': return [
        '<span class="c-m">POST</span> /v1/orders/',
        hdr('Authorization', 'Bearer 3f9a…c41e'),
        '',
        json({ amount: 500000, currency: 'UZS', order_type: 'c2c', external_id: 'ORD-2048', client_id: 'user-77', callback_url: HOOK_URL }),
      ].join('\n');
      case 'res': return [
        '<span class="c-ok">201 Created</span>',
        '',
        json({
          success: true, id: ORDER_ID, amount: '500000.00',
          amount_crypto: '39.525692', merchant_amount: '38.932806', rate: raw('12650.0'),
          status_const: 'issued', card: '8600 •••• •••• 4417', expired_at: '2026-09-12 12:15:00',
        }, true),
      ].join('\n');
      case 'hook': return [
        `<span class="c-m">POST</span> ${HOOK_URL}`,
        hdr('X-Webhook-Signature', secret),
        '',
        json({ order_id: ORDER_ID, integrator_order_id: 'ORD-2048', amount: '500000.00', merchant_amount: '38.932806', rate: raw('12650.0'), status: 'done' }, true),
      ].join('\n');
      case 'dup': return [
        '<span class="c-bad">409 Conflict</span>',
        '',
        json({ success: false, error: { code: 'duplicate_external_id' } }, true),
      ].join('\n');
    }
  }

  const termCode = $('#termCode');
  let termTimer = null, termKey = 'req';
  function typeCode(key) {
    termKey = key;
    clearInterval(termTimer);
    const html = code(key);
    if (reduce) { termCode.innerHTML = html; return; }
    // reveal by visible characters while keeping markup intact
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const full = tmp.textContent.length;
    const t0 = performance.now();
    termTimer = setInterval(() => {
      const n = Math.floor((performance.now() - t0) / 16) * 3 + 3;
      termCode.innerHTML = cutHTML(html, n);
      if (n >= full) clearInterval(termTimer);
    }, 16);
  }
  function cutHTML(html, n) {
    let out = '', count = 0, i = 0, open = 0;
    while (i < html.length && count < n) {
      if (html[i] === '<') {
        const j = html.indexOf('>', i);
        const tag = html.slice(i, j + 1);
        open += tag[1] === '/' ? -1 : 1;
        out += tag; i = j + 1;
      } else if (html[i] === '&') {
        const j = html.indexOf(';', i);
        out += html.slice(i, j + 1); i = j + 1; count++;
      } else { out += html[i++]; count++; }
    }
    return out + '</span>'.repeat(Math.max(0, open));
  }
  $$('.term-tabs button').forEach((b) => b.addEventListener('click', () => {
    $$('.term-tabs button').forEach((x) => x.classList.toggle('on', x === b));
    typeCode(b.dataset.tab);
    beep([660], 0.04);
  }));
  let termStarted = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !termStarted) { termStarted = true; typeCode('req'); }
  }, { threshold: 0.3 }).observe($('.term'));

  /* ---------- high scores count-up ---------- */
  new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      $$('[data-count]', e.target).forEach((td, k) => {
        const to = parseFloat(td.dataset.count), dec = +(td.dataset.dec || 0);
        const pre = td.dataset.prefix || '', suf = td.dataset.suffix || '';
        if (reduce) return;
        setTimeout(() => {
          const t0 = performance.now();
          const tick = (now) => {
            const p = Math.min(1, (now - t0) / 1100);
            td.textContent = pre + (to * (1 - Math.pow(1 - p, 3))).toFixed(dec) + suf;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, k * 180);
      });
    });
  }, { threshold: 0.5 }).observe($('.scores'));

  /* ---------- continue countdown ---------- */
  const cd = $('#countdown');
  let cdVal = 9, cdIv = null;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !cdIv && !reduce) {
      cdIv = setInterval(() => {
        cdVal = cdVal <= 0 ? 9 : cdVal - 1;
        cd.textContent = cdVal;
        cd.classList.toggle('zero', cdVal === 0);
        if (cdVal <= 3) beep([cdVal === 0 ? 1568 : 880], 0.05, 'square', 0.02);
      }, 1000);
    } else if (!e.isIntersecting && cdIv) { clearInterval(cdIv); cdIv = null; }
  }).observe(cd);

  /* ---------- form ---------- */
  const TG_USER = 'Rick_LodeRunner';
  $('#leadForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const company = f.company.value.trim();
    f.classList.remove('err');
    if (!company) {
      f.classList.add('err');
      beep([220, 165], 0.09, 'square', 0.03);
      f.company.focus();
      return;
    }
    const geo = $$('input[name="geo"]:checked', f).map((i) => i.value).join(', ') || '—';
    const text = lang === 'ru'
      ? `Привет! Хочу подключиться к LODERUNNER.\nКомпания / проект: ${company}\nГео: ${geo}`
      : `Hi! I'd like to connect to LODERUNNER.\nCompany / project: ${company}\nGeo: ${geo}`;
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    window.open(`https://t.me/${TG_USER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    beep([523, 659, 784, 1047], 0.08);
  });

  /* ---------- konami ---------- */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
  let kPos = 0;
  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    const key = e.key;
    kPos = key === KONAMI[kPos] ? kPos + 1 : (key === KONAMI[0] ? 1 : 0);
    if (kPos === KONAMI.length) { kPos = 0; goldRain(); }
  });
  function goldRain() {
    const rain = $('#rain');
    const svg = window.SPR.svg(window.SPR.MAPS.coin);
    beep([523, 659, 784, 1047, 784, 1047, 1319], 0.07);
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('i');
      c.innerHTML = svg;
      c.style.left = Math.random() * 100 + 'vw';
      c.style.animationDelay = Math.random() * 1.6 + 's';
      c.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
      const s = 16 + Math.floor(Math.random() * 3) * 8;
      c.style.width = c.style.height = s + 'px';
      rain.appendChild(c);
    }
    setTimeout(() => { rain.innerHTML = ''; }, 4600);
  }

  /* ---------- pixel Ё / Й ---------- */
  // Press Start 2P draws Ё and Й as shrunken letters; rebuild them from Е / И plus pixel marks
  const PIX = { 'Ё': 'yo', 'ё': 'yo', 'Й': 'yi', 'й': 'yi' };
  function pixLetters(scope) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const hits = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const p = n.parentElement;
      if (!/[ЁёЙй]/.test(n.data) || p.classList.contains('yo') || p.classList.contains('yi')) continue;
      const cs = getComputedStyle(p);
      if (!cs.fontFamily.includes('Press Start')) continue;
      hits.push([n, cs.textTransform === 'uppercase' ? /[ЁёЙй]/g : /[ЁЙ]/g]);
    }
    hits.forEach(([n, re]) => {
      const text = n.data;
      const frag = document.createDocumentFragment();
      let last = 0;
      text.replace(re, (ch, i) => {
        frag.append(text.slice(last, i));
        const s = document.createElement('span');
        s.className = PIX[ch];
        s.textContent = ch;
        frag.append(s);
        last = i + 1;
      });
      if (!last) return;
      frag.append(text.slice(last));
      n.replaceWith(frag);
    });
  }
  pixLetters(document.body);

  setLang(lang);
})();
