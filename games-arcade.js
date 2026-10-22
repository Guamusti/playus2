// Juegos arcade en canvas 2D: Aleteo, Rebote, Atrapa, Cortar y Serpiente.

const C = {
  ink: "#121212", paper: "#fffcf5", line: "#d9d2c4", navy: "#14213d",
  tomato: "#ff5a36", butter: "#ffd84d", mint: "#8ff0c4", good: "#00a676",
  PAL: ["#ff5a36", "#ffb000", "#00a676", "#2f6bff", "#8a5cff", "#e8448f", "#00a3c4"],
};

function setupCanvas(stage, H = 460) {
  const W = stage.clientWidth;
  const dpr = window.devicePixelRatio || 1;
  const cv = el("canvas", { className: "arcade" });
  cv.width = W * dpr; cv.height = H * dpr;
  cv.style.width = W + "px"; cv.style.height = H + "px";
  const ctx = cv.getContext("2d");
  ctx.scale(dpr, dpr);
  stage.append(cv);
  return { cv, ctx, W, H };
}

// Bucle con dt en segundos; si update devuelve false, se para.
function gameLoop(update) {
  let raf, last = now(), on = true;
  const tick = (t) => {
    if (!on) return;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (update(dt) === false) return;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { on = false; cancelAnimationFrame(raf); };
}

const localPoint = (cv, e) => {
  const r = cv.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};

function boldRect(ctx, x, y, w, h, fill, r = 4) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink; ctx.stroke();
}

function boldCircle(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink; ctx.stroke();
}

function bigText(ctx, text, x, y, size = 44) {
  ctx.fillStyle = C.ink;
  ctx.font = `400 ${size}px 'DM Serif Display', serif`;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
}

// Teclas -> acciones, con limpieza.
function bindKeys(map) {
  const onKey = (e) => { if (e.key in map) { e.preventDefault(); map[e.key](); } };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

GAMES.push(
  {
    id: "aleteo", code: "FLP", cat: "Arcade", color: "#ffb000",
    name: "Aleteo", icon: "bird",
    desc: "Toca para aletear y cuela el pájaro entre las columnas. Un roce y se acabó.",
    format: (n) => `${n} columnas`,
    points: (n) => clamp(n * 70),
    start(stage, finish) {
      const { cv, ctx, W, H } = setupCanvas(stage);
      const GROUND = H - 30, R = 14, PW = 62;
      const bird = { x: W * 0.28, y: H * 0.42, vy: 0 };
      const pipes = [];
      let started = false, over = false, score = 0, speed = 165, gap = 160, endTimer;
      const addPipe = (x) => pipes.push({ x, top: rand(70, GROUND - gap - 50), gap, passed: false });
      const flap = () => {
        if (over) return;
        if (!started) { started = true; addPipe(W + 40); }
        bird.vy = -430;
      };
      cv.addEventListener("pointerdown", flap);
      const unkeys = bindKeys({ " ": flap, ArrowUp: flap });
      const die = () => { over = true; flash(stage, false); endTimer = setTimeout(() => finish(score), 900); };

      const stop = gameLoop((dt) => {
        if (started) {
          bird.vy += 1500 * dt;
          bird.y += bird.vy * dt;
        } else bird.y = H * 0.42 + Math.sin(now() / 200) * 6;
        if (started && !over) {
          for (const p of pipes) {
            p.x -= speed * dt;
            if (!p.passed && p.x + PW < bird.x) { p.passed = true; score++; speed += 4; gap = Math.max(118, gap - 3); }
            const inX = bird.x + R > p.x && bird.x - R < p.x + PW;
            if (inX && (bird.y - R < p.top || bird.y + R > p.top + p.gap)) die();
          }
          if (pipes.length && pipes[pipes.length - 1].x < W - 220) addPipe(W + 20);
          if (pipes[0] && pipes[0].x < -PW - 10) pipes.shift();
          if (bird.y + R > GROUND || bird.y - R < 0) die();
        }
        bird.y = Math.min(bird.y, GROUND - R);

        ctx.clearRect(0, 0, W, H);
        for (const p of pipes) {
          boldRect(ctx, p.x, -10, PW, p.top + 10, C.good, 6);
          boldRect(ctx, p.x, p.top + p.gap, PW, GROUND - p.top - p.gap + 4, C.good, 6);
        }
        boldRect(ctx, -10, GROUND, W + 20, 40, C.butter, 0);
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(Math.max(-0.5, Math.min(1.2, bird.vy / 600)));
        boldCircle(ctx, 0, 0, R, C.tomato);
        boldCircle(ctx, 5, -4, 4.5, C.paper);
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(6.5, -4, 2, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(12, 1); ctx.lineTo(20, 4); ctx.lineTo(12, 7); ctx.closePath();
        ctx.fillStyle = C.butter; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        bigText(ctx, String(score), W / 2, 64);
        if (!started) {
          ctx.font = "700 13px 'Space Grotesk', sans-serif"; ctx.fillStyle = C.ink;
          ctx.fillText("TOCA PARA EMPEZAR", W / 2, H * 0.62);
        }
      });
      return () => { clearTimeout(endTimer); unkeys(); stop(); };
    },
  },

  {
    id: "rebote", code: "BRK", cat: "Arcade", color: "#2f6bff",
    name: "Rebote", icon: "bricks",
    desc: "Mueve la pala y rompe todos los ladrillos que puedas. Tienes 3 bolas.",
    format: (n) => `${n} ladrillos`,
    points: (n) => clamp(n * 28),
    start(stage, finish) {
      const { cv, ctx, W, H } = setupCanvas(stage);
      const COLS = 6, ROWS = 5, TOP = 60, BH = 20, GAP = 6, PW = 86, PY = H - 34, R = 8;
      let bricks = [], pad = W / 2, ball, lives = 3, score = 0, speed = 300, over = false, endTimer, keyDir = 0;
      const wall = () => {
        const bw = (W - 24 - GAP * (COLS - 1)) / COLS;
        bricks = [];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          bricks.push({ x: 12 + c * (bw + GAP), y: TOP + r * (BH + GAP), w: bw, h: BH, col: C.PAL[r % C.PAL.length] });
        }
      };
      const resetBall = () => { ball = { x: pad, y: PY - R - 2, vx: 0, vy: 0, stuck: true }; };
      const launch = () => {
        if (!ball.stuck || over) return;
        const a = rand(-0.5, 0.5);
        ball.stuck = false; ball.vx = Math.sin(a) * speed; ball.vy = -Math.cos(a) * speed;
      };
      wall(); resetBall();
      const movePad = (e) => { pad = Math.max(PW / 2, Math.min(W - PW / 2, localPoint(cv, e).x)); };
      cv.addEventListener("pointerdown", (e) => { movePad(e); launch(); });
      cv.addEventListener("pointermove", movePad);
      const onKey = (e) => {
        if (e.key === "ArrowLeft") keyDir = e.type === "keydown" ? -1 : 0;
        else if (e.key === "ArrowRight") keyDir = e.type === "keydown" ? 1 : 0;
        else if (e.key === " " && e.type === "keydown") launch();
        else return;
        e.preventDefault();
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);

      const stop = gameLoop((dt) => {
        pad = Math.max(PW / 2, Math.min(W - PW / 2, pad + keyDir * 420 * dt));
        if (ball.stuck) { ball.x = pad; ball.y = PY - R - 2; }
        else if (!over) {
          ball.x += ball.vx * dt; ball.y += ball.vy * dt;
          if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx); }
          if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }
          if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); }
          // Pala: el ángulo de salida depende de dónde golpea.
          if (ball.vy > 0 && ball.y + R > PY && ball.y < PY + 12 && Math.abs(ball.x - pad) < PW / 2 + R) {
            const a = ((ball.x - pad) / (PW / 2)) * 1.05;
            ball.vx = Math.sin(a) * speed; ball.vy = -Math.cos(a) * speed;
          }
          for (let i = bricks.length - 1; i >= 0; i--) {
            const b = bricks[i];
            if (ball.x + R < b.x || ball.x - R > b.x + b.w || ball.y + R < b.y || ball.y - R > b.y + b.h) continue;
            const ox = Math.min(ball.x + R - b.x, b.x + b.w - (ball.x - R));
            const oy = Math.min(ball.y + R - b.y, b.y + b.h - (ball.y - R));
            if (ox < oy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
            bricks.splice(i, 1);
            score++;
            speed = Math.min(560, speed + 5);
            break;
          }
          if (!bricks.length) { wall(); resetBall(); }
          if (ball.y > H + R) {
            lives--;
            flash(stage, false);
            if (lives <= 0) { over = true; endTimer = setTimeout(() => finish(score), 600); }
            else resetBall();
          }
        }
        ctx.clearRect(0, 0, W, H);
        for (const b of bricks) boldRect(ctx, b.x, b.y, b.w, b.h, b.col, 3);
        boldRect(ctx, pad - PW / 2, PY, PW, 14, C.navy, 7);
        if (!over) boldCircle(ctx, ball.x, ball.y, R, C.butter);
        ctx.font = "700 13px 'Space Grotesk', sans-serif"; ctx.textAlign = "left"; ctx.fillStyle = C.ink;
        ctx.fillText(`${score} LADRILLOS`, 14, 32);
        ctx.textAlign = "right"; ctx.fillStyle = C.tomato;
        ctx.fillText("●".repeat(Math.max(0, lives)), W - 14, 32);
        if (ball.stuck && !over) {
          ctx.textAlign = "center"; ctx.fillStyle = C.ink;
          ctx.fillText("TOCA PARA LANZAR", W / 2, PY - 40);
        }
      });
      return () => {
        clearTimeout(endTimer); stop();
        window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey);
      };
    },
  },

  {
    id: "atrapa", code: "CTH", cat: "Arcade", color: "#00a676",
    name: "Atrapa", icon: "basket",
    desc: "Mueve la cesta y atrapa todo lo que cae durante 30 s. Las bombas restan 3.",
    format: (n) => `${n} atrapadas`,
    points: (n) => clamp(n * 22),
    start(stage, finish) {
      const { cv, ctx, W, H } = setupCanvas(stage);
      const BW = 78, BY = H - 44;
      let basket = W / 2, score = 0, t0 = now(), spawnIn = 0, keyDir = 0, popText = null;
      const items = [];
      const move = (e) => { basket = Math.max(BW / 2, Math.min(W - BW / 2, localPoint(cv, e).x)); };
      cv.addEventListener("pointerdown", move);
      cv.addEventListener("pointermove", move);
      const onKey = (e) => {
        if (e.key === "ArrowLeft") keyDir = e.type === "keydown" ? -1 : 0;
        else if (e.key === "ArrowRight") keyDir = e.type === "keydown" ? 1 : 0;
        else return;
        e.preventDefault();
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);

      let ended = false;
      const stop = gameLoop((dt) => {
        const elapsed = (now() - t0) / 1000;
        const left = Math.max(0, 30 - elapsed);
        if (left <= 0) {
          if (!ended) { ended = true; finish(score); }
          return false;
        }
        basket = Math.max(BW / 2, Math.min(W - BW / 2, basket + keyDir * 460 * dt));
        if ((spawnIn -= dt) <= 0) {
          spawnIn = Math.max(0.28, 0.8 - elapsed * 0.018);
          const bomb = Math.random() < 0.2;
          items.push({ x: rand(20, W - 20), y: -20, vy: rand(160, 220) + elapsed * 7, r: bomb ? 15 : rand(11, 15), bomb, col: C.PAL[randInt(0, 6)] });
        }
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.y += it.vy * dt;
          if (it.y + it.r > BY && it.y < BY + 20 && Math.abs(it.x - basket) < BW / 2) {
            items.splice(i, 1);
            if (it.bomb) { score = Math.max(0, score - 3); flash(stage, false); popText = { t: "-3", x: it.x, life: 0.6 }; }
            else { score++; popText = { t: "+1", x: it.x, life: 0.4 }; }
          } else if (it.y > H + 30) items.splice(i, 1);
        }
        ctx.clearRect(0, 0, W, H);
        for (const it of items) {
          if (it.bomb) {
            boldCircle(ctx, it.x, it.y, it.r, C.ink);
            ctx.strokeStyle = C.tomato; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(it.x + 8, it.y - 10); ctx.lineTo(it.x + 13, it.y - 17); ctx.stroke();
          } else boldCircle(ctx, it.x, it.y, it.r, it.col);
        }
        // Cesta
        ctx.beginPath();
        ctx.moveTo(basket - BW / 2, BY); ctx.lineTo(basket + BW / 2, BY);
        ctx.lineTo(basket + BW / 2 - 9, BY + 30); ctx.lineTo(basket - BW / 2 + 9, BY + 30); ctx.closePath();
        ctx.fillStyle = C.butter; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(basket - BW / 2 + 6, BY + 12); ctx.lineTo(basket + BW / 2 - 6, BY + 12); ctx.lineWidth = 2; ctx.stroke();
        if (popText && (popText.life -= dt) > 0) bigText(ctx, popText.t, popText.x, BY - 20, 26);
        ctx.font = "700 13px 'Space Grotesk', sans-serif"; ctx.fillStyle = C.ink;
        ctx.textAlign = "left"; ctx.fillText(`${score} ATRAPADAS`, 14, 32);
        ctx.textAlign = "right"; ctx.fillText(`${left.toFixed(1)} S`, W - 14, 32);
      });
      return () => { stop(); window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey); };
    },
  },

  {
    id: "cortar", code: "SLC", cat: "Arcade", color: "#e8448f",
    name: "Corta", icon: "slice",
    desc: "Desliza el dedo para cortar las bolas que saltan. Si se te caen 3, o cortas una bomba, se acabó.",
    format: (n) => `${n} cortes`,
    points: (n) => clamp(n * 20),
    start(stage, finish) {
      const { cv, ctx, W, H } = setupCanvas(stage);
      const G = 520;
      const items = [], halves = [];
      let trail = [], down = false, score = 0, lives = 3, spawnIn = 0.4, elapsed = 0, over = false, endTimer;
      const end = () => { over = true; endTimer = setTimeout(() => finish(score), 800); };
      const spawn = () => {
        const n = elapsed > 12 ? randInt(1, 3) : randInt(1, 2);
        for (let i = 0; i < n; i++) {
          const x = rand(W * 0.2, W * 0.8);
          items.push({
            x, y: H + 20, vx: (W / 2 - x) * rand(0.2, 0.6), vy: -rand(560, 680), r: rand(20, 26),
            bomb: elapsed > 4 && Math.random() < 0.15, col: C.PAL[randInt(0, 6)],
          });
        }
      };
      const distToSeg = (p, a, b) => {
        const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
        return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
      };
      const cut = (a, b) => {
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          if (distToSeg(it, a, b) > it.r) continue;
          items.splice(i, 1);
          if (it.bomb) { flash(stage, false); end(); return; }
          score++;
          halves.push({ ...it, vx: it.vx - 90, side: 0 }, { ...it, vx: it.vx + 90, side: 1 });
        }
      };
      cv.addEventListener("pointerdown", (e) => { down = true; trail = [{ ...localPoint(cv, e), t: now() }]; });
      cv.addEventListener("pointermove", (e) => {
        if (!down || over) return;
        const p = { ...localPoint(cv, e), t: now() };
        cut(trail[trail.length - 1], p);
        trail.push(p);
      });
      const up = () => { down = false; };
      window.addEventListener("pointerup", up);

      const stop = gameLoop((dt) => {
        elapsed += dt;
        if (!over && (spawnIn -= dt) <= 0) { spawn(); spawnIn = Math.max(0.6, 1.4 - elapsed * 0.025); }
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.vy += G * dt; it.x += it.vx * dt; it.y += it.vy * dt;
          if (it.y > H + 40 && it.vy > 0) {
            items.splice(i, 1);
            if (!it.bomb && !over) { lives--; flash(stage, false); if (lives <= 0) end(); }
          }
        }
        for (let i = halves.length - 1; i >= 0; i--) {
          const h = halves[i];
          h.vy += G * dt; h.x += h.vx * dt; h.y += h.vy * dt;
          if (h.y > H + 40) halves.splice(i, 1);
        }
        trail = trail.filter((p) => now() - p.t < 140);

        ctx.clearRect(0, 0, W, H);
        for (const it of items) {
          if (it.bomb) {
            boldCircle(ctx, it.x, it.y, it.r, C.ink);
            ctx.fillStyle = C.tomato; ctx.font = "700 18px 'Space Grotesk', sans-serif"; ctx.textAlign = "center";
            ctx.fillText("✕", it.x, it.y + 6);
          } else boldCircle(ctx, it.x, it.y, it.r, it.col);
        }
        for (const h of halves) {
          ctx.beginPath();
          const a0 = h.side ? -Math.PI / 2 : Math.PI / 2;
          ctx.arc(h.x, h.y, h.r, a0, a0 + Math.PI);
          ctx.closePath();
          ctx.fillStyle = h.col; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink; ctx.stroke();
        }
        if (trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(trail[0].x, trail[0].y);
          for (const p of trail) ctx.lineTo(p.x, p.y);
          ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.strokeStyle = C.ink; ctx.lineWidth = 9; ctx.stroke();
          ctx.strokeStyle = C.butter; ctx.lineWidth = 5; ctx.stroke();
        }
        ctx.font = "700 13px 'Space Grotesk', sans-serif"; ctx.fillStyle = C.ink;
        ctx.textAlign = "left"; ctx.fillText(`${score} CORTES`, 14, 32);
        ctx.textAlign = "right"; ctx.fillStyle = C.tomato;
        ctx.fillText("●".repeat(Math.max(0, lives)), W - 14, 32);
      });
      return () => { clearTimeout(endTimer); stop(); window.removeEventListener("pointerup", up); };
    },
  },

  {
    id: "serpiente", code: "SNK", cat: "Arcade", color: "#8a5cff",
    name: "Serpiente", icon: "snake",
    desc: "Come y crece sin chocar con las paredes ni contigo. Desliza el dedo o usa las flechas.",
    format: (n) => `${n} manzanas`,
    points: (n) => clamp(n * 50),
    start(stage, finish) {
      const { cv, ctx, W, H } = setupCanvas(stage);
      const N = 15;
      const cell = Math.floor(Math.min(W - 24, H - 70) / N);
      const ox = Math.floor((W - cell * N) / 2), oy = 52;
      let snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
      let dir = { x: 1, y: 0 }, queue = [], food, score = 0, acc = 0, stepT = 0.15, over = false, started = false, endTimer;
      const placeFood = () => {
        do { food = { x: randInt(0, N - 1), y: randInt(0, N - 1) }; }
        while (snake.some((s) => s.x === food.x && s.y === food.y));
      };
      placeFood();
      const turn = (dx, dy) => {
        started = true; // no se mueve hasta el primer gesto
        const last = queue.length ? queue[queue.length - 1] : dir;
        if (last.x === -dx && last.y === -dy) return; // no se puede dar media vuelta
        if (last.x === dx && last.y === dy) return;
        if (queue.length < 3) queue.push({ x: dx, y: dy });
      };
      const unkeys = bindKeys({
        ArrowUp: () => turn(0, -1), ArrowDown: () => turn(0, 1), ArrowLeft: () => turn(-1, 0), ArrowRight: () => turn(1, 0),
        w: () => turn(0, -1), s: () => turn(0, 1), a: () => turn(-1, 0), d: () => turn(1, 0),
      });
      // Deslizar; un toque simple gira hacia el lado tocado respecto a la cabeza.
      let start = null;
      cv.addEventListener("pointerdown", (e) => { start = localPoint(cv, e); });
      cv.addEventListener("pointermove", (e) => {
        if (!start) return;
        const p = localPoint(cv, e), dx = p.x - start.x, dy = p.y - start.y;
        if (Math.hypot(dx, dy) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0); else turn(0, Math.sign(dy));
        start = p;
      });
      cv.addEventListener("pointerup", (e) => {
        if (!start) return;
        const p = localPoint(cv, e);
        if (Math.hypot(p.x - start.x, p.y - start.y) < 10) {
          const hx = ox + (snake[0].x + 0.5) * cell, hy = oy + (snake[0].y + 0.5) * cell;
          const dx = p.x - hx, dy = p.y - hy;
          if (dir.x !== 0) turn(0, Math.sign(dy) || 1); else turn(Math.sign(dx) || 1, 0);
        }
        start = null;
      });

      const stop = gameLoop((dt) => {
        if (!over && started && (acc += dt) >= stepT) {
          acc = 0;
          if (queue.length) dir = queue.shift();
          const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
          const hitSelf = snake.slice(0, -1).some((s) => s.x === head.x && s.y === head.y);
          if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || hitSelf) {
            over = true; flash(stage, false);
            endTimer = setTimeout(() => finish(score), 800);
          } else {
            snake.unshift(head);
            if (head.x === food.x && head.y === food.y) { score++; stepT = Math.max(0.07, stepT - 0.004); placeFood(); }
            else snake.pop();
          }
        }
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#efe9de";
        ctx.fillRect(ox, oy, cell * N, cell * N);
        ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink; ctx.strokeRect(ox, oy, cell * N, cell * N);
        boldCircle(ctx, ox + (food.x + 0.5) * cell, oy + (food.y + 0.5) * cell, cell * 0.36, C.tomato);
        snake.forEach((s, i) => boldRect(ctx, ox + s.x * cell + 1, oy + s.y * cell + 1, cell - 2, cell - 2, i === 0 ? C.navy : "#8a5cff", 4));
        ctx.font = "700 13px 'Space Grotesk', sans-serif"; ctx.fillStyle = C.ink;
        ctx.textAlign = "left"; ctx.fillText(`${score} MANZANAS`, 14, 32);
        if (!started) {
          ctx.textAlign = "center";
          ctx.fillText("DESLIZA O TOCA PARA EMPEZAR", W / 2, oy + cell * N + 14 > H ? H - 10 : oy + cell * 3);
        }
      });
      return () => { clearTimeout(endTimer); unkeys(); stop(); };
    },
  },
);
