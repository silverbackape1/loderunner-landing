/* Pixel sprites shared by the level canvas and the inline UI icons. */
(function () {
  const PAL = {
    o: '#6b3304', // coin outline
    g: '#ffc83d',
    h: '#fff1a8',
    d: '#d98a12',
    r: '#e43b44',
    R: '#8e1f2c',
    w: '#ffffff',
    k: '#12081f',
    L: '#ffb627',
    l: '#b8690b',
    '#': '#ffc83d',
    '+': '#9a62e0',
  };

  function coinFrame(rx) {
    const rows = [];
    for (let y = 0; y < 8; y++) {
      let row = '';
      for (let x = 0; x < 8; x++) {
        const dx = (x + 0.5 - 4) / rx;
        const dy = (y + 0.5 - 4) / 3.6;
        const d = dx * dx + dy * dy;
        if (d > 1) { row += '.'; continue; }
        const ex = (x + 1.5 - 4) / rx, ex2 = (x - 0.5 - 4) / rx;
        const ey = (y + 1.5 - 4) / 3.6, ey2 = (y - 0.5 - 4) / 3.6;
        const edge = ex * ex + dy * dy > 1 || ex2 * ex2 + dy * dy > 1 ||
                     dx * dx + ey * ey > 1 || dx * dx + ey2 * ey2 > 1;
        if (edge) row += 'o';
        else if (x + 0.5 < 4 - rx * 0.25) row += 'h';
        else if (rx > 2 && Math.abs(x + 0.5 - 4) < 1 && y > 1 && y < 6) row += 'd';
        else row += 'g';
      }
      rows.push(row);
    }
    return rows;
  }

  const MAPS = {
    coin: coinFrame(3.6),
    coinFrames: [coinFrame(3.6), coinFrame(2.6), coinFrame(1.1), coinFrame(2.6)],
    enemy: [
      '.r....r.',
      '..r..r..',
      '.rrrrrr.',
      'rwkrrwkr',
      'rrrrrrrr',
      'rRrrrrRr',
      '.rr..rr.',
      '.r....r.',
    ],
    enemy2: [
      '..r..r..',
      '..r..r..',
      '.rrrrrr.',
      'rkwrrkwr',
      'rrrrrrrr',
      'rRrrrrRr',
      '.rr..rr.',
      'r......r',
    ],
    gold: [
      '........',
      '........',
      '...hh...',
      '..hggh..',
      '.hgggdo.',
      '.ggggdo.',
      'hgggggdo',
      'oooooooo',
    ],
    ladder: [
      'L......L',
      'LLLLLLLL',
      'L......L',
      'L......L',
      'L......L',
      'LLLLLLLL',
      'L......L',
      'L......L',
    ],
    p2p: [
      '.....#...',
      '......#..',
      '#########',
      '......#..',
      '.....#...',
      '...+.....',
      '..+......',
      '+++++++++',
      '..+......',
      '...+.....',
    ],
    api: [
      '#########',
      '#+++++++#',
      '#########',
      '#.......#',
      '#.#.....#',
      '#..#....#',
      '#.#..##.#',
      '#.......#',
      '#########',
    ],
    usdt: [
      '..+++++..',
      '.+#####+.',
      '+#######+',
      '+#.....#+',
      '+###.###+',
      '+###.###+',
      '+###.###+',
      '.+##.##+.',
      '..+++++..',
    ],
    payout: [
      '......#..',
      '.....###.',
      '....#####',
      '......#..',
      '.+++..#..',
      '+++++.#..',
      '.+++.....',
      '+++++....',
      '.+++.....',
      '+++++....',
    ],
    shield: [
      '#########',
      '#+++++++#',
      '#++++++.#',
      '#+++++..#',
      '#+.++..+#',
      '#+...+++#',
      '.#+.+++#.',
      '..#+++#..',
      '...###...',
    ],
    chart: [
      '#........',
      '#......++',
      '#......++',
      '#...##.++',
      '#...##.++',
      '#++.##.++',
      '#++.##.++',
      '#########',
    ],
  };

  function svg(map, pal) {
    pal = pal || PAL;
    const h = map.length, w = map[0].length;
    let rects = '';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = map[y][x];
        if (c === '.' || !pal[c]) continue;
        let run = 1;
        while (x + run < w && map[y][x + run] === c) run++;
        rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${pal[c]}"/>`;
        x += run - 1;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }

  function draw(ctx, map, x, y, pal, flip) {
    pal = pal || PAL;
    const w = map[0].length;
    for (let j = 0; j < map.length; j++) {
      for (let i = 0; i < w; i++) {
        const c = map[j][flip ? w - 1 - i : i];
        if (c === '.' || !pal[c]) continue;
        ctx.fillStyle = pal[c];
        ctx.fillRect(x + i, y + j, 1, 1);
      }
    }
  }

  window.SPR = { PAL, MAPS, svg, draw };
})();
