/* Hero level: a payment (coin) runs a Lode Runner stage, fraud falls into a pit. */
(function () {
  const canvas = document.getElementById('level');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const fxLayer = document.getElementById('levelFx');
  const { MAPS, draw } = window.SPR;

  const COLS = 32, ROWS = 16, T = 8, W = COLS * T, H = ROWS * T;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const C = {
    sky: '#12081f', star: '#cdb8ff', far: '#1f0f36', farHi: '#2b1749', farLo: '#170a29',
    mortar: '#2a1247', brick: '#6a35a6', brickHi: '#9a62e0',
    steel: '#3d2c59', steelHi: '#6f5b90', steelLo: '#21152f',
    ladder: '#ffb627', ladderLo: '#b8690b', rope: '#e9d8ff',
    moon: '#d9c9ff', moonLo: '#a68fe6', moonHi: '#f3edff', spark: '#fff1a8',
  };

  /* ---------- map ---------- */
  const E = 0, BRICK = 1, STEEL = 2, LADDER = 3, ROPE = 4, EXIT = 5;
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill(E));
  const row = (r, a, b, v) => { for (let c = a; c <= b; c++) g[r][c] = v; };
  const col = (c, a, b, v) => { for (let r = a; r <= b; r++) g[r][c] = v; };

  row(15, 0, 31, STEEL);
  row(14, 0, 31, BRICK);
  row(10, 4, 21, BRICK); col(10, 10, 13, LADDER);
  col(18, 5, 9, LADDER); row(4, 19, 26, ROPE);
  row(10, 23, 31, BRICK);
  row(6, 0, 7, BRICK); col(2, 6, 13, LADDER);
  row(11, 13, 14, STEEL);
  col(30, 0, 9, EXIT);

  const PIT = { c: 21, r: 14 };

  /* ---------- coin path ---------- */
  const SPEED = { walk: 5, climb: 4, rope: 4.5, fall: 10 };
  const pts = [
    { x: 1, y: 13 },
    { x: 10, y: 13, m: 'walk', s: 'REQUEST' },
    { x: 10, y: 9, m: 'climb', s: 'ROUTE' },
    { x: 18, y: 9, m: 'walk', s: 'ROUTE' },
    { x: 18, y: 4, m: 'climb', s: 'ISSUED' },
    { x: 26, y: 4, m: 'rope', s: 'ISSUED' },
    { x: 26, y: 9, m: 'fall', s: 'DONE' },
    { x: 30, y: 9, m: 'walk', s: 'DONE' },
    { x: 30, y: -1.5, m: 'climb', s: 'CALLBACK' },
    { x: 30, y: -1.5, m: 'wait', d: 1.8, s: 'BALANCE' },
  ];
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const dur = b.m === 'wait' ? b.d : Math.hypot(b.x - a.x, b.y - a.y) / SPEED[b.m];
    segs.push({ a, b, t0: total, t1: total + dur, m: b.m, s: b.s });
    total += dur;
  }

  const GOLD = [
    { x: 6, y: 13, label: '+1 000 RUB', usd: 12.16 },
    { x: 15, y: 9, label: '+4 250 TRY', usd: 98.12 },
    { x: 28, y: 9, label: '+56 000 KZT', usd: 108.70 },
  ];
  const DECOR_GOLD = [{ x: 5, y: 5 }, { x: 0, y: 13 }];

  function coinAt(t) {
    for (const s of segs) {
      if (t <= s.t1) {
        const k = s.t1 === s.t0 ? 1 : (t - s.t0) / (s.t1 - s.t0);
        return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k, seg: s };
      }
    }
    const last = segs[segs.length - 1];
    return { x: last.b.x, y: last.b.y, seg: last };
  }

  /* ---------- enemy cycle ---------- */
  const EP = 7.4;
  const EN = { spawn: 0, walk0: 0.5, walkSpeed: 3, dig0: 2.0, dig1: 2.6, refill0: 5.8, refill1: 6.3 };
  EN.arrive = EN.walk0 + (31 - PIT.c) / EN.walkSpeed;
  EN.fallEnd = EN.arrive + 0.18;

  /* ---------- background ---------- */
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 38 }, () => ({ x: Math.floor(rnd() * W), y: Math.floor(rnd() * 70), p: rnd() * 6 }));
  const pillars = [[12, 1, 3, 9], [21, 5, 4, 9], [27, 2, 3, 12], [3, 1, 2, 5]];

  function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  function drawFarBricks(cx, cy, cw, ch) {
    const x0 = cx * T, y0 = cy * T, w = cw * T, h = ch * T;
    px(x0, y0, w, h, C.farLo);
    for (let y = 0; y < h; y += 4) {
      const off = (y / 4) % 2 ? 4 : 0;
      for (let x = -off; x < w; x += 8) {
        const bx = Math.max(x0, x0 + x), bw = Math.min(x0 + x + 7, x0 + w) - bx;
        if (bw > 0) { px(bx, y0 + y, bw, 3, C.far); px(bx, y0 + y, bw, 1, C.farHi); }
      }
    }
  }

  function drawMoon(t) {
    const cx = 132, cy = 24, r = 11;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d = x * x + y * y;
        if (d > r * r) continue;
        let c = C.moon;
        if (x + y > 6) c = C.moonLo;
        if (x + y < -10) c = C.moonHi;
        px(cx + x, cy + y, 1, 1, c);
      }
    }
    [[-4, -3, 3], [3, 2, 2], [-2, 5, 2], [5, -5, 1]].forEach(([x, y, s]) => px(cx + x, cy + y, s, s, C.moonLo));
    const glow = Math.floor(t * 2) % 2;
    ctx.globalAlpha = 0.18;
    px(cx - r - 2, cy - 2, 1, 4 + glow, C.moon);
    px(cx + r + 1, cy - 2, 1, 4 + glow, C.moon);
    ctx.globalAlpha = 1;
  }

  function drawBrick(x, y, rows) {
    rows = rows == null ? 2 : rows;
    px(x, y, T, T, C.mortar);
    if (rows >= 1) {
      px(x, y + 4, 3, 3, C.brick); px(x + 4, y + 4, 4, 3, C.brick);
      px(x, y + 4, 3, 1, C.brickHi); px(x + 4, y + 4, 4, 1, C.brickHi);
    }
    if (rows >= 2) {
      px(x, y, 7, 3, C.brick); px(x, y, 7, 1, C.brickHi);
    }
  }

  function drawSteel(x, y) {
    px(x, y, T, T, C.steel);
    px(x, y, T, 1, C.steelHi); px(x, y, 1, T, C.steelHi);
    px(x, y + T - 1, T, 1, C.steelLo); px(x + T - 1, y, 1, T, C.steelLo);
    px(x + 3, y + 3, 2, 2, C.steelLo);
  }

  function drawLadder(x, y) {
    px(x + 1, y, 1, T, C.ladder); px(x + 6, y, 1, T, C.ladder);
    px(x + 1, y + 1, 6, 1, C.ladder); px(x + 1, y + 5, 6, 1, C.ladder);
    px(x + 2, y + 2, 4, 1, C.ladderLo); px(x + 2, y + 6, 4, 1, C.ladderLo);
  }

  function drawRope(x, y) { px(x, y + 1, T, 1, C.rope); }

  /* ---------- fx (HTML overlay) ---------- */
  function popup(x, y, text, cls) {
    if (!fxLayer) return;
    const el = document.createElement('span');
    el.className = 'pop ' + (cls || '');
    el.textContent = text;
    el.style.left = (x * T + 4) / W * 100 + '%';
    el.style.top = (y * T) / H * 100 + '%';
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  const hud = {
    paid: document.getElementById('hudPaid'),
    gold: document.getElementById('hudGold'),
    stage: document.getElementById('hudStage'),
    fraud: document.getElementById('hudFraud'),
  };
  let paid = 0, fraud = 0, lastStage = '';
  const pad = (n, l) => String(n).padStart(l, '0');
  const beep = (...a) => window.LR_beep && window.LR_beep(...a);

  /* ---------- state per loop ---------- */
  let loopIdx = -1, eLoopIdx = -1, collected = [], gotGold = 0, exitShownAt = Infinity, creditedFx = false, fraudFx = false;

  function frame(now) {
    const t = now / 1000;
    const lt = t % total;
    const li = Math.floor(t / total);
    if (li !== loopIdx) {
      loopIdx = li; collected = GOLD.map(() => false); gotGold = 0;
      exitShownAt = Infinity; creditedFx = false;
      if (hud.gold) hud.gold.textContent = '0/3';
    }
    const et = t % EP;
    const ei = Math.floor(t / EP);
    if (ei !== eLoopIdx) { eLoopIdx = ei; fraudFx = false; }

    const coin = coinAt(lt);

    GOLD.forEach((gd, i) => {
      if (!collected[i] && Math.abs(coin.x - gd.x) < 0.45 && Math.abs(coin.y - gd.y) < 0.45) {
        collected[i] = true; gotGold++;
        paid += gd.usd;
        popup(gd.x, gd.y - 1, gd.label, 'pop-gold');
        beep([988, 1319], 0.06);
        if (hud.gold) hud.gold.textContent = gotGold + '/3';
        if (hud.paid) hud.paid.textContent = pad(Math.round(paid) % 1e6, 6);
        if (gotGold === GOLD.length) exitShownAt = lt;
      }
    });

    if (coin.seg.m === 'wait' && !creditedFx) {
      creditedFx = true;
      popup(27, 1, '+218.98 USDT', 'pop-ok');
      beep([784, 988, 1175, 1568], 0.07);
    }

    const stage = coin.seg.s;
    if (stage !== lastStage && hud.stage) { hud.stage.textContent = stage; lastStage = stage; }

    /* --- paint --- */
    px(0, 0, W, H, C.sky);
    stars.forEach((s) => {
      if (Math.floor(t * 1.5 + s.p) % 5 !== 0) px(s.x, s.y, 1, 1, C.star);
    });
    drawMoon(t);
    pillars.forEach((p) => drawFarBricks(...p));

    const exitRows = exitShownAt === Infinity ? 0 : Math.min(10, Math.floor((lt - exitShownAt) / 0.04));

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = g[r][c], x = c * T, y = r * T;
        if (v === BRICK) {
          if (c === PIT.c && r === PIT.r) drawPit(x, y, et);
          else drawBrick(x, y);
        } else if (v === STEEL) drawSteel(x, y);
        else if (v === LADDER) drawLadder(x, y);
        else if (v === ROPE) drawRope(x, y);
        else if (v === EXIT && 9 - r < exitRows) drawLadder(x, y);
      }
    }

    DECOR_GOLD.concat(GOLD.filter((_, i) => !collected[i])).forEach((gd) => {
      draw(ctx, MAPS.gold, gd.x * T, gd.y * T);
      if (Math.floor(t * 4 + gd.x) % 7 === 0) px(gd.x * T + 3, gd.y * T + 2, 1, 1, '#ffffff');
    });

    drawEnemy(et, t);

    const fi = coin.seg.m === 'wait' ? 0 : Math.floor(t * 10) % 4;
    if (coin.y > -1.2) draw(ctx, MAPS.coinFrames[fi], Math.round(coin.x * T), Math.round(coin.y * T));
  }

  function drawPit(x, y, et) {
    if (et < EN.dig0) return drawBrick(x, y);
    if (et < EN.dig1) {
      const k = (et - EN.dig0) / (EN.dig1 - EN.dig0);
      drawBrick(x, y, k < 0.5 ? 1 : 0);
      if (Math.floor(et * 20) % 2) {
        px(x + 1, y - 2, 1, 1, C.spark); px(x + 6, y - 3, 1, 1, C.spark); px(x + 3, y - 1, 1, 1, '#ffffff');
      }
      if (k >= 0.5) px(x, y, T, 4, C.sky);
      return;
    }
    if (et < EN.refill0) { px(x, y, T, T, C.sky); return; }
    if (et < EN.refill1) {
      const k = (et - EN.refill0) / (EN.refill1 - EN.refill0);
      px(x, y, T, T, C.sky);
      drawBrick(x, y, k < 0.5 ? 1 : 2);
      return;
    }
    drawBrick(x, y);
  }

  function drawEnemy(et, t) {
    if (et >= EN.refill1 + 0.05) return;
    let x, y, map = Math.floor(t * 6) % 2 ? MAPS.enemy : MAPS.enemy2;
    if (et < EN.walk0) {
      if (Math.floor(et * 12) % 2) return;
      x = 31; y = 13;
    } else if (et < EN.arrive) {
      x = 31 - (et - EN.walk0) * EN.walkSpeed; y = 13;
    } else if (et < EN.fallEnd) {
      x = PIT.c; y = 13 + (et - EN.arrive) / (EN.fallEnd - EN.arrive);
    } else {
      x = PIT.c; y = 14;
      if (!fraudFx) {
        fraudFx = true; fraud++;
        if (hud.fraud) hud.fraud.textContent = pad(fraud % 100, 2);
        popup(PIT.c, 12, 'FRAUD X', 'pop-bad');
        beep([330, 220, 147], 0.08, 'triangle');
      }
      if (et > EN.refill0 && Math.floor(et * 16) % 2) return;
      x += Math.floor(et * 14) % 2 ? 0.12 : -0.12;
    }
    draw(ctx, map, Math.round(x * T), Math.round(y * T), null, false);
  }

  /* ---------- sizing & loop ---------- */
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(1, Math.ceil(canvas.clientWidth * dpr / W));
    canvas.width = W * k; canvas.height = H * k;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  let lastT = reduce ? total * 0.42 * 1000 : 0;
  resize();
  window.addEventListener('resize', () => { resize(); frame(lastT); });

  if (reduce) {
    loopIdx = 0; eLoopIdx = 0; collected = [true, false, false];
    frame(lastT);
    return;
  }

  let visible = true, running = false, start = performance.now(), pausedAt = 0;
  function loop(now) {
    if (!visible) { running = false; return; }
    lastT = now - start;
    frame(lastT);
    requestAnimationFrame(loop);
  }
  function run() {
    if (running) return;
    running = true;
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !visible) start += performance.now() - pausedAt;
    if (!e.isIntersecting && visible) pausedAt = performance.now();
    visible = e.isIntersecting;
    if (visible) run();
  }).observe(canvas);
  frame(0);
  run();
})();
