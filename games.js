// Cada minijuego: start(stage, finish) monta el juego en `stage` y llama a
// finish(raw) al acabar. Devuelve una función de limpieza.
// points(raw) normaliza el resultado a 0–1000 para que todos sean comparables.

const clamp = (v, a = 0, b = 1000) => Math.max(a, Math.min(b, Math.round(v)));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const now = () => performance.now();
const el = (tag, props = {}, children = []) => {
  const n = document.createElement(tag);
  Object.assign(n, props);
  for (const c of [].concat(children)) n.append(c);
  return n;
};

const GAMES = [
  {
    id: "reflejos",
    name: "Reflejos",
    emoji: "⚡",
    desc: "Toca en cuanto se ponga verde. 5 rondas.",
    lowerIsBetter: true,
    format: (ms) => `${Math.round(ms)} ms`,
    points: (ms) => clamp(((550 - ms) / (550 - 170)) * 1000),
    start(stage, finish) {
      const ROUNDS = 5;
      const times = [];
      let timer, goAt = 0, state = "wait";
      const box = el("div", { className: "reaction" });
      const hud = el("div", { className: "hud" });
      stage.append(box, hud);
      const set = (cls, html) => { box.className = "reaction " + cls; box.innerHTML = html; };
      const next = () => {
        state = "wait";
        hud.innerHTML = `<span>Ronda ${times.length + 1}/${ROUNDS}</span><span></span>`;
        set("wait", `<div class="big">Espera…</div><div>No toques todavía</div>`);
        timer = setTimeout(() => {
          state = "go"; goAt = now();
          set("go", `<div class="big">¡YA!</div>`);
        }, rand(1200, 3500));
      };
      box.addEventListener("pointerdown", () => {
        if (state === "wait") {
          clearTimeout(timer);
          state = "early";
          times.push(700); // penalización
          set("early", `<div class="big">¡Muy pronto!</div><div>+700 ms de penalización</div>`);
          setTimeout(() => (times.length >= ROUNDS ? done() : next()), 1000);
        } else if (state === "go") {
          state = "shown";
          const t = now() - goAt;
          times.push(t);
          set("", `<div class="big">${Math.round(t)} ms</div>`);
          setTimeout(() => (times.length >= ROUNDS ? done() : next()), 800);
        }
      });
      const done = () => finish(times.reduce((a, b) => a + b, 0) / times.length);
      next();
      return () => clearTimeout(timer);
    },
  },

  {
    id: "crono",
    name: "Para el crono",
    emoji: "⏱️",
    desc: "Para el reloj en 5,000 s exactos. Se oculta a mitad.",
    lowerIsBetter: true,
    format: (ms) => `${Math.round(ms)} ms de error`,
    points: (ms) => clamp(1000 - ms * 1.6),
    start(stage, finish) {
      const TARGET = 5000;
      let t0 = 0, raf, running = false;
      const disp = el("div", { className: "big", textContent: "0.000" });
      const hint = el("div", { className: "hint", textContent: "Objetivo: 5.000 s" });
      const btn = el("button", { className: "btn", textContent: "Empezar" });
      stage.append(disp, hint, el("div", { style: "height:24px" }), btn);
      const tick = () => {
        const t = now() - t0;
        disp.textContent = t < 2000 ? (t / 1000).toFixed(3) : "?.???";
        raf = requestAnimationFrame(tick);
      };
      btn.addEventListener("pointerdown", () => {
        if (!running) {
          running = true; t0 = now(); btn.textContent = "¡PARA!"; tick();
        } else {
          cancelAnimationFrame(raf);
          const t = now() - t0;
          disp.textContent = (t / 1000).toFixed(3);
          btn.disabled = true;
          setTimeout(() => finish(Math.abs(t - TARGET)), 900);
        }
      });
      return () => cancelAnimationFrame(raf);
    },
  },

  {
    id: "memoria",
    name: "Memoria",
    emoji: "🧠",
    desc: "Repite la secuencia de colores. Cada vez más larga.",
    format: (n) => `Nivel ${n}`,
    points: (n) => clamp(n * 75),
    start(stage, finish) {
      const seq = [];
      let idx = 0, accepting = false, alive = true;
      const hud = el("div", { className: "hud" });
      const grid = el("div", { className: "simon" });
      const pads = [0, 1, 2, 3].map((i) => el("button", { ariaLabel: `color ${i + 1}` }));
      grid.append(...pads);
      stage.append(hud, grid);
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const flash = async (i, ms) => { pads[i].classList.add("on"); await sleep(ms); pads[i].classList.remove("on"); };
      const round = async () => {
        seq.push(randInt(0, 3));
        hud.innerHTML = `<span>Nivel ${seq.length}</span><span>Mira…</span>`;
        accepting = false;
        await sleep(600);
        const speed = Math.max(220, 520 - seq.length * 25);
        for (const s of seq) { if (!alive) return; await flash(s, speed); await sleep(140); }
        idx = 0; accepting = true;
        hud.innerHTML = `<span>Nivel ${seq.length}</span><span>¡Tu turno!</span>`;
      };
      pads.forEach((p, i) => p.addEventListener("pointerdown", () => {
        if (!accepting) return;
        flash(i, 150);
        if (i !== seq[idx]) { accepting = false; stage.classList.add("flash-bad"); setTimeout(() => finish(seq.length - 1), 500); return; }
        idx++;
        if (idx === seq.length) { accepting = false; stage.classList.add("flash-good"); setTimeout(() => { stage.classList.remove("flash-good"); round(); }, 300); }
      }));
      round();
      return () => { alive = false; };
    },
  },

  {
    id: "diana",
    name: "Diana",
    emoji: "🎯",
    desc: "Revienta 15 dianas lo más rápido posible. Fallar suma tiempo.",
    lowerIsBetter: true,
    format: (ms) => `${(ms / 1000).toFixed(2)} s`,
    points: (ms) => clamp(((22000 - ms) / (22000 - 7000)) * 1000),
    start(stage, finish) {
      const TOTAL = 15;
      let hits = 0, penalty = 0, t0 = 0, raf;
      const hud = el("div", { className: "hud" });
      stage.append(hud);
      const upd = () => {
        hud.innerHTML = `<span>${hits}/${TOTAL}</span><span>${t0 ? ((now() - t0 + penalty) / 1000).toFixed(2) : "0.00"} s</span>`;
        raf = requestAnimationFrame(upd);
      };
      const spawn = () => {
        const r = stage.getBoundingClientRect();
        const tg = el("div", { className: "target" });
        tg.style.left = rand(40, r.width - 40) + "px";
        tg.style.top = rand(70, r.height - 40) + "px";
        tg.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          if (!t0) t0 = now();
          tg.remove(); hits++;
          if (hits >= TOTAL) { cancelAnimationFrame(raf); finish(now() - t0 + penalty); } else spawn();
        });
        stage.append(tg);
      };
      stage.addEventListener("pointerdown", () => {
        if (!t0) return;
        penalty += 500;
        stage.classList.remove("flash-bad"); void stage.offsetWidth; stage.classList.add("flash-bad");
      });
      spawn(); upd();
      return () => cancelAnimationFrame(raf);
    },
  },

  {
    id: "toques",
    name: "Toques locos",
    emoji: "👆",
    desc: "Toca el botón todas las veces que puedas en 5 segundos.",
    format: (n) => `${n} toques`,
    points: (n) => clamp((n - 10) * 30),
    start(stage, finish) {
      const DUR = 5000;
      let taps = 0, t0 = 0, raf;
      const hud = el("div", { className: "hud" });
      const btn = el("button", { className: "tap-btn", textContent: "¡TOCA!" });
      stage.append(hud, btn);
      const upd = () => {
        const left = t0 ? Math.max(0, DUR - (now() - t0)) : DUR;
        hud.innerHTML = `<span>${taps} toques</span><span>${(left / 1000).toFixed(1)} s</span>`;
        if (t0 && left <= 0) { btn.disabled = true; finish(taps); return; }
        raf = requestAnimationFrame(upd);
      };
      btn.addEventListener("pointerdown", () => {
        if (btn.disabled) return;
        if (!t0) t0 = now();
        taps++; btn.textContent = taps;
      });
      upd();
      return () => cancelAnimationFrame(raf);
    },
  },

  {
    id: "torre",
    name: "Torre",
    emoji: "🧱",
    desc: "Apila bloques. Lo que sobresale se corta. ¡Llega alto!",
    format: (n) => `${n} pisos`,
    points: (n) => clamp(n * 45),
    start(stage, finish) {
      const cv = el("canvas", { className: "stack" });
      stage.append(cv);
      const ctx = cv.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const W = stage.clientWidth, H = 420, BH = 24;
      cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
      const blocks = [{ x: W / 2 - 80, w: 160 }];
      let cur = { x: 0, w: 160, dir: 1 }, speed = 2.6, over = false, raf, cut = null;
      const hue = (i) => `hsl(${(260 + i * 14) % 360} 80% 62%)`;
      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        const n = blocks.length;
        const off = Math.max(0, (n + 1) * BH - H * 0.6);
        blocks.forEach((b, i) => {
          ctx.fillStyle = hue(i);
          ctx.fillRect(b.x, H - (i + 1) * BH + off, b.w, BH - 2);
        });
        if (cut) {
          cut.y += cut.vy; cut.vy += 0.5;
          ctx.fillStyle = cut.c; ctx.globalAlpha = 0.7;
          ctx.fillRect(cut.x, cut.y + off, cut.w, BH - 2); ctx.globalAlpha = 1;
          if (cut.y > H + 100) cut = null;
        }
        if (!over) {
          cur.x += cur.dir * speed;
          if (cur.x + cur.w > W || cur.x < 0) cur.dir *= -1;
          ctx.fillStyle = hue(n);
          ctx.fillRect(cur.x, H - (n + 1) * BH + off, cur.w, BH - 2);
        }
        ctx.fillStyle = "#fff"; ctx.font = "800 28px Outfit, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(String(n - 1), W / 2, 44);
        raf = requestAnimationFrame(draw);
      };
      const drop = () => {
        if (over) return;
        const top = blocks[blocks.length - 1];
        const l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w);
        const w = r - l;
        if (w <= 0) {
          over = true;
          cut = { x: cur.x, w: cur.w, y: H - (blocks.length + 1) * BH, vy: 0, c: hue(blocks.length) };
          setTimeout(() => finish(blocks.length - 1), 900);
          return;
        }
        const cx = cur.x < top.x ? cur.x : r;
        if (cur.w - w > 0.5) cut = { x: cx, w: cur.w - w, y: H - (blocks.length + 1) * BH, vy: 0, c: hue(blocks.length) };
        blocks.push({ x: l, w });
        speed = Math.min(7, speed + 0.18);
        cur = { x: cur.dir > 0 ? 0 : W - w, w, dir: cur.dir };
      };
      cv.addEventListener("pointerdown", drop);
      draw();
      return () => cancelAnimationFrame(raf);
    },
  },

  {
    id: "mates",
    name: "Cálculo rápido",
    emoji: "➗",
    desc: "Resuelve todas las operaciones que puedas en 25 segundos.",
    format: (n) => `${n} aciertos`,
    points: (n) => clamp(n * 60),
    start(stage, finish) {
      const DUR = 25000;
      let score = 0, t0 = now(), raf, answer;
      const hud = el("div", { className: "hud" });
      const q = el("div", { className: "big" });
      const ch = el("div", { className: "choices" });
      stage.append(hud, q, el("div", { style: "height:24px" }), ch);
      const gen = () => {
        const lvl = Math.min(4, Math.floor(score / 4));
        const op = ["+", "−", "×"][randInt(0, lvl >= 2 ? 2 : 1)];
        let a, b;
        if (op === "×") { a = randInt(2, 6 + lvl * 2); b = randInt(2, 9); answer = a * b; }
        else { a = randInt(5, 20 + lvl * 15); b = randInt(2, 10 + lvl * 10); if (op === "−" && b > a) [a, b] = [b, a]; answer = op === "+" ? a + b : a - b; }
        q.textContent = `${a} ${op} ${b}`;
        const opts = new Set([answer]);
        while (opts.size < 4) { const d = answer + randInt(-10, 10); if (d !== answer && d >= 0) opts.add(d); }
        ch.replaceChildren(...[...opts].sort(() => Math.random() - 0.5).map((v) => {
          const b2 = el("button", { textContent: v });
          b2.addEventListener("pointerdown", () => {
            stage.classList.remove("flash-good", "flash-bad"); void stage.offsetWidth;
            if (v === answer) { score++; stage.classList.add("flash-good"); }
            else { score = Math.max(0, score - 1); t0 -= 1500; stage.classList.add("flash-bad"); }
            gen();
          });
          return b2;
        }));
      };
      const upd = () => {
        const left = Math.max(0, DUR - (now() - t0));
        hud.innerHTML = `<span>✅ ${score}</span><span>${(left / 1000).toFixed(1)} s</span>`;
        if (left <= 0) { ch.replaceChildren(); finish(score); return; }
        raf = requestAnimationFrame(upd);
      };
      gen(); upd();
      return () => cancelAnimationFrame(raf);
    },
  },

  {
    id: "colores",
    name: "¿Qué color?",
    emoji: "🎨",
    desc: "Elige el COLOR de la tinta, no lo que pone. 25 segundos.",
    format: (n) => `${n} aciertos`,
    points: (n) => clamp(n * 55),
    start(stage, finish) {
      const DUR = 25000;
      const COLORS = [["ROJO", "#ff5470"], ["VERDE", "#2ed47a"], ["AZUL", "#3fa9ff"], ["AMARILLO", "#ffcc33"]];
      let score = 0, t0 = now(), raf, ink;
      const hud = el("div", { className: "hud" });
      const word = el("div", { className: "big" });
      const ch = el("div", { className: "choices" });
      stage.append(hud, word, el("div", { style: "height:24px" }), ch);
      ch.append(...COLORS.map(([name], i) => {
        const b = el("button", { textContent: name });
        b.style.fontSize = "1rem";
        b.addEventListener("pointerdown", () => {
          stage.classList.remove("flash-good", "flash-bad"); void stage.offsetWidth;
          if (i === ink) { score++; stage.classList.add("flash-good"); }
          else { score = Math.max(0, score - 1); stage.classList.add("flash-bad"); }
          gen();
        });
        return b;
      }));
      const gen = () => {
        const w = randInt(0, 3);
        do { ink = randInt(0, 3); } while (Math.random() < 0.75 && ink === w);
        word.textContent = COLORS[w][0];
        word.style.color = COLORS[ink][1];
      };
      const upd = () => {
        const left = Math.max(0, DUR - (now() - t0));
        hud.innerHTML = `<span>✅ ${score}</span><span>${(left / 1000).toFixed(1)} s</span>`;
        if (left <= 0) { ch.replaceChildren(); finish(score); return; }
        raf = requestAnimationFrame(upd);
      };
      gen(); upd();
      return () => cancelAnimationFrame(raf);
    },
  },

  {
    id: "distinto",
    name: "El distinto",
    emoji: "👁️",
    desc: "Encuentra la casilla de color diferente. Cada vez más difícil. 30 s.",
    format: (n) => `${n} encontrados`,
    points: (n) => clamp(n * 45),
    start(stage, finish) {
      const DUR = 30000;
      let score = 0, t0 = now(), raf;
      const hud = el("div", { className: "hud" });
      const grid = el("div", { className: "odd-grid" });
      stage.append(hud, grid);
      const gen = () => {
        const size = Math.min(8, 2 + Math.floor(score / 3));
        const diff = Math.max(4, 28 - score * 1.1);
        const h = randInt(0, 359), s = randInt(50, 80), l = randInt(40, 60);
        const odd = randInt(0, size * size - 1);
        grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        grid.replaceChildren(...Array.from({ length: size * size }, (_, i) => {
          const b = el("button");
          b.style.background = `hsl(${h} ${s}% ${i === odd ? l + diff : l}%)`;
          b.addEventListener("pointerdown", () => {
            if (i === odd) { score++; gen(); }
            else { t0 -= 2000; stage.classList.remove("flash-bad"); void stage.offsetWidth; stage.classList.add("flash-bad"); }
          });
          return b;
        }));
      };
      const upd = () => {
        const left = Math.max(0, DUR - (now() - t0));
        hud.innerHTML = `<span>✅ ${score}</span><span>${(left / 1000).toFixed(1)} s</span>`;
        if (left <= 0) { grid.replaceChildren(); finish(score); return; }
        raf = requestAnimationFrame(upd);
      };
      gen(); upd();
      return () => cancelAnimationFrame(raf);
    },
  },
];
