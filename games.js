// Cada minijuego: start(stage, finish) monta el juego en `stage` y llama a
// finish(raw) al acabar. Devuelve una función de limpieza.
// points(raw) normaliza el resultado a 0–1000 para que todos sean comparables.
// code/cat/color se usan en las tarjetas de la portada.

const clamp = (v, a = 0, b = 1000) => Math.max(a, Math.min(b, Math.round(v)));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const now = () => performance.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffleArr = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const el = (tag, props = {}, children = []) => {
  const n = document.createElement(tag);
  Object.assign(n, props);
  for (const c of [].concat(children)) n.append(c);
  return n;
};
const flash = (stage, ok) => {
  stage.classList.remove("flash-good", "flash-bad");
  void stage.offsetWidth;
  stage.classList.add(ok ? "flash-good" : "flash-bad");
};
const hudEl = () => el("div", { className: "hud" });
const setHud = (hud, l, r) => { hud.innerHTML = `<span>${l}</span><span>${r}</span>`; };

// Bucle de cuenta atrás compartido por los juegos contrarreloj.
// getT0 permite que las penalizaciones muevan el inicio.
function countdown(dur, getT0, onTick, onEnd) {
  let raf;
  const loop = () => {
    const left = Math.max(0, dur - (now() - getT0()));
    onTick(left);
    if (left <= 0) return onEnd();
    raf = requestAnimationFrame(loop);
  };
  loop();
  return () => cancelAnimationFrame(raf);
}

const GAMES = [
  {
    id: "reflejos", code: "RFX", cat: "Reflejos", color: "#ff5a36",
    name: "Reflejos", emoji: "⚡",
    desc: "Toca en cuanto la pantalla se ponga verde. Cinco rondas, cuenta la media.",
    lowerIsBetter: true,
    format: (ms) => `${Math.round(ms)} ms`,
    points: (ms) => clamp(((550 - ms) / (550 - 170)) * 1000),
    start(stage, finish) {
      const ROUNDS = 5;
      const times = [];
      let timer, goAt = 0, state = "wait";
      const box = el("div", { className: "reaction" });
      const hud = hudEl();
      stage.append(box, hud);
      const set = (cls, html) => { box.className = "reaction " + cls; box.innerHTML = html; };
      const done = () => finish(times.reduce((a, b) => a + b, 0) / times.length);
      const next = () => {
        state = "wait";
        setHud(hud, `Ronda ${times.length + 1}/${ROUNDS}`, "");
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
          set("shown", `<div class="big">${Math.round(t)} ms</div>`);
          setTimeout(() => (times.length >= ROUNDS ? done() : next()), 800);
        }
      });
      next();
      return () => clearTimeout(timer);
    },
  },

  {
    id: "crono", code: "CRN", cat: "Precisión", color: "#2f6bff",
    name: "Para el crono", emoji: "⏱️",
    desc: "Para el reloj en 5,000 segundos exactos. A los dos segundos se oculta.",
    lowerIsBetter: true,
    format: (ms) => `${Math.round(ms)} ms de error`,
    points: (ms) => clamp(1000 - ms * 1.6),
    start(stage, finish) {
      const TARGET = 5000;
      let t0 = 0, raf, running = false;
      const disp = el("div", { className: "big mono", textContent: "0.000" });
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
    id: "memoria", code: "SMN", cat: "Memoria", color: "#00a676",
    name: "Memoria", emoji: "🧠",
    desc: "Repite la secuencia de colores. Cada ronda añade un paso más.",
    format: (n) => `Nivel ${n}`,
    points: (n) => clamp(n * 75),
    start(stage, finish) {
      const seq = [];
      let idx = 0, accepting = false, alive = true;
      const hud = hudEl();
      const grid = el("div", { className: "simon" });
      const pads = [0, 1, 2, 3].map((i) => el("button", { ariaLabel: `color ${i + 1}` }));
      grid.append(...pads);
      stage.append(hud, grid);
      const light = async (i, ms) => { pads[i].classList.add("on"); await sleep(ms); pads[i].classList.remove("on"); };
      const round = async () => {
        seq.push(randInt(0, 3));
        setHud(hud, `Nivel ${seq.length}`, "Mira…");
        accepting = false;
        await sleep(600);
        const speed = Math.max(220, 520 - seq.length * 25);
        for (const s of seq) { if (!alive) return; await light(s, speed); await sleep(140); }
        idx = 0; accepting = true;
        setHud(hud, `Nivel ${seq.length}`, "¡Tu turno!");
      };
      pads.forEach((p, i) => p.addEventListener("pointerdown", () => {
        if (!accepting) return;
        light(i, 150);
        if (i !== seq[idx]) { accepting = false; flash(stage, false); setTimeout(() => finish(seq.length - 1), 500); return; }
        idx++;
        if (idx === seq.length) { accepting = false; flash(stage, true); setTimeout(round, 300); }
      }));
      round();
      return () => { alive = false; };
    },
  },

  {
    id: "diana", code: "DNA", cat: "Precisión", color: "#e8448f",
    name: "Diana", emoji: "🎯",
    desc: "Revienta 15 dianas lo más rápido posible. Cada fallo suma medio segundo.",
    lowerIsBetter: true,
    format: (ms) => `${(ms / 1000).toFixed(2)} s`,
    points: (ms) => clamp(((22000 - ms) / (22000 - 7000)) * 1000),
    start(stage, finish) {
      const TOTAL = 15;
      let hits = 0, penalty = 0, t0 = 0, raf;
      const hud = hudEl();
      stage.append(hud);
      const upd = () => {
        setHud(hud, `${hits}/${TOTAL}`, `${t0 ? ((now() - t0 + penalty) / 1000).toFixed(2) : "0.00"} s`);
        raf = requestAnimationFrame(upd);
      };
      const spawn = () => {
        const r = stage.getBoundingClientRect();
        const tg = el("div", { className: "target" });
        tg.style.left = rand(40, r.width - 40) + "px";
        tg.style.top = rand(80, r.height - 40) + "px";
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
        flash(stage, false);
      });
      spawn(); upd();
      return () => cancelAnimationFrame(raf);
    },
  },

  {
    id: "toques", code: "TAP", cat: "Velocidad", color: "#ffb000",
    name: "Toques locos", emoji: "👆",
    desc: "Machaca el botón todas las veces que puedas en 5 segundos.",
    format: (n) => `${n} toques`,
    points: (n) => clamp((n - 10) * 30),
    start(stage, finish) {
      const DUR = 5000;
      let taps = 0, t0 = 0, raf;
      const hud = hudEl();
      const btn = el("button", { className: "tap-btn", textContent: "¡TOCA!" });
      stage.append(hud, btn);
      const upd = () => {
        const left = t0 ? Math.max(0, DUR - (now() - t0)) : DUR;
        setHud(hud, `${taps} toques`, `${(left / 1000).toFixed(1)} s`);
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
    id: "torre", code: "TRR", cat: "Precisión", color: "#8a5cff",
    name: "Torre", emoji: "🧱",
    desc: "Apila bloques. Lo que sobresale se corta y la torre se estrecha.",
    format: (n) => `${n} pisos`,
    points: (n) => clamp(n * 45),
    start(stage, finish) {
      const cv = el("canvas", { className: "stack" });
      stage.append(cv);
      const ctx = cv.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const W = stage.clientWidth, H = 440, BH = 26;
      cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
      const PAL = ["#ff5a36", "#ffb000", "#00a676", "#2f6bff", "#8a5cff", "#e8448f", "#00a3c4"];
      const col = (i) => PAL[i % PAL.length];
      const blocks = [{ x: W / 2 - 80, w: 160 }];
      let cur = { x: 0, w: 160, dir: 1 }, speed = 2.6, over = false, raf, cut = null;
      const rect = (x, y, w, c) => {
        ctx.fillStyle = c; ctx.fillRect(x, y, w, BH - 3);
        ctx.strokeStyle = "#121212"; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, BH - 5);
      };
      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        const n = blocks.length;
        const off = Math.max(0, (n + 1) * BH - H * 0.6);
        blocks.forEach((b, i) => rect(b.x, H - (i + 1) * BH + off, b.w, col(i)));
        if (cut) {
          cut.y += cut.vy; cut.vy += 0.5;
          ctx.globalAlpha = 0.6; rect(cut.x, cut.y + off, cut.w, cut.c); ctx.globalAlpha = 1;
          if (cut.y > H + 100) cut = null;
        }
        if (!over) {
          cur.x += cur.dir * speed;
          if (cur.x + cur.w > W || cur.x < 0) cur.dir *= -1;
          rect(cur.x, H - (n + 1) * BH + off, cur.w, col(n));
        }
        ctx.fillStyle = "#121212"; ctx.font = "400 44px 'DM Serif Display', serif"; ctx.textAlign = "center";
        ctx.fillText(String(n - 1), W / 2, 64);
        raf = requestAnimationFrame(draw);
      };
      const drop = () => {
        if (over) return;
        const top = blocks[blocks.length - 1];
        const l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w);
        const w = r - l;
        const y = H - (blocks.length + 1) * BH;
        if (w <= 0) {
          over = true;
          cut = { x: cur.x, w: cur.w, y, vy: 0, c: col(blocks.length) };
          setTimeout(() => finish(blocks.length - 1), 900);
          return;
        }
        if (cur.w - w > 0.5) cut = { x: cur.x < top.x ? cur.x : r, w: cur.w - w, y, vy: 0, c: col(blocks.length) };
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
    id: "mates", code: "CLC", cat: "Mente", color: "#00a3c4",
    name: "Cálculo rápido", emoji: "➗",
    desc: "Resuelve todas las operaciones que puedas en 25 segundos. Fallar quita tiempo.",
    format: (n) => `${n} aciertos`,
    points: (n) => clamp(n * 60),
    start(stage, finish) {
      let score = 0, t0 = now(), answer;
      const hud = hudEl();
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
        ch.replaceChildren(...shuffleArr([...opts]).map((v) => {
          const b2 = el("button", { textContent: v });
          b2.addEventListener("pointerdown", () => {
            if (v === answer) score++;
            else { score = Math.max(0, score - 1); t0 -= 1500; }
            flash(stage, v === answer);
            gen();
          });
          return b2;
        }));
      };
      gen();
      return countdown(25000, () => t0,
        (left) => setHud(hud, `✓ ${score}`, `${(left / 1000).toFixed(1)} s`),
        () => { ch.replaceChildren(); finish(score); });
    },
  },

  {
    id: "colores", code: "STR", cat: "Mente", color: "#ff5a36",
    name: "¿Qué color?", emoji: "🎨",
    desc: "Elige el color de la tinta, no la palabra escrita. 25 segundos.",
    format: (n) => `${n} aciertos`,
    points: (n) => clamp(n * 55),
    start(stage, finish) {
      const COLORS = [["ROJO", "#ff3b30"], ["VERDE", "#00a676"], ["AZUL", "#2f6bff"], ["AMARILLO", "#ffb000"]];
      let score = 0, t0 = now(), ink;
      const hud = hudEl();
      const word = el("div", { className: "big" });
      const ch = el("div", { className: "choices" });
      stage.append(hud, word, el("div", { style: "height:24px" }), ch);
      const gen = () => {
        const w = randInt(0, 3);
        do { ink = randInt(0, 3); } while (Math.random() < 0.75 && ink === w);
        word.textContent = COLORS[w][0];
        word.style.color = COLORS[ink][1];
      };
      ch.append(...COLORS.map(([name], i) => {
        const b = el("button", { textContent: name });
        b.style.fontSize = "1rem";
        b.addEventListener("pointerdown", () => {
          if (i === ink) score++; else score = Math.max(0, score - 1);
          flash(stage, i === ink);
          gen();
        });
        return b;
      }));
      gen();
      return countdown(25000, () => t0,
        (left) => setHud(hud, `✓ ${score}`, `${(left / 1000).toFixed(1)} s`),
        () => { ch.replaceChildren(); finish(score); });
    },
  },

  {
    id: "distinto", code: "ODD", cat: "Percepción", color: "#00a676",
    name: "El distinto", emoji: "👁️",
    desc: "Encuentra la casilla de otro tono. Cada vez hay más y se parecen más. 30 s.",
    format: (n) => `${n} encontrados`,
    points: (n) => clamp(n * 45),
    start(stage, finish) {
      let score = 0, t0 = now();
      const hud = hudEl();
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
            else { t0 -= 2000; flash(stage, false); }
          });
          return b;
        }));
      };
      gen();
      return countdown(30000, () => t0,
        (left) => setHud(hud, `✓ ${score}`, `${(left / 1000).toFixed(1)} s`),
        () => { grid.replaceChildren(); finish(score); });
    },
  },

  // ---------- Nuevos ----------

  {
    id: "orden", code: "ORD", cat: "Percepción", color: "#2f6bff",
    name: "Del 1 al 16", emoji: "🔢",
    desc: "Toca los números del 1 al 16 en orden lo más rápido que puedas.",
    lowerIsBetter: true,
    format: (ms) => `${(ms / 1000).toFixed(2)} s`,
    points: (ms) => clamp(((30000 - ms) / (30000 - 9000)) * 1000),
    start(stage, finish) {
      const N = 16;
      let next = 1, t0 = 0, penalty = 0, raf;
      const hud = hudEl();
      const grid = el("div", { className: "num-grid" });
      stage.append(hud, grid);
      grid.append(...shuffleArr(Array.from({ length: N }, (_, i) => i + 1)).map((n) => {
        const b = el("button", { textContent: n });
        b.addEventListener("pointerdown", () => {
          if (!t0) t0 = now();
          if (n === next) {
            b.classList.add("done"); next++;
            if (next > N) { cancelAnimationFrame(raf); finish(now() - t0 + penalty); }
          } else { penalty += 1000; flash(stage, false); }
        });
        return b;
      }));
      const upd = () => {
        setHud(hud, `Busca el ${Math.min(next, N)}`, `${t0 ? ((now() - t0 + penalty) / 1000).toFixed(2) : "0.00"} s`);
        raf = requestAnimationFrame(upd);
      };
      upd();
      return () => cancelAnimationFrame(raf);
    },
  },

  {
    id: "topos", code: "TOP", cat: "Reflejos", color: "#d94a2b",
    name: "Topos", emoji: "🐹",
    desc: "Atrapa todos los topos que puedas en 25 s. ¡Ojo con las bombas!",
    format: (n) => `${n} topos`,
    points: (n) => clamp(n * 40),
    start(stage, finish) {
      let score = 0, t0 = now(), timer, alive = true;
      const hud = hudEl();
      const grid = el("div", { className: "mole-grid" });
      const holes = Array.from({ length: 9 }, () => el("button", { className: "hole" }));
      grid.append(...holes);
      stage.append(hud, grid);
      holes.forEach((h) => h.addEventListener("pointerdown", () => {
        const what = h.dataset.what;
        if (!what) return;
        h.dataset.what = ""; h.textContent = "";
        if (what === "mole") { score++; h.classList.add("hit"); setTimeout(() => h.classList.remove("hit"), 150); }
        else { score = Math.max(0, score - 3); flash(stage, false); }
      }));
      const pop = () => {
        if (!alive) return;
        const free = holes.filter((h) => !h.dataset.what);
        if (free.length) {
          const h = free[randInt(0, free.length - 1)];
          const bomb = Math.random() < 0.18;
          h.dataset.what = bomb ? "bomb" : "mole";
          h.textContent = bomb ? "💣" : "🐹";
          const life = Math.max(550, 1100 - score * 20);
          setTimeout(() => { if (h.dataset.what) { h.dataset.what = ""; h.textContent = ""; } }, life);
        }
        timer = setTimeout(pop, Math.max(280, 650 - score * 12));
      };
      pop();
      const stop = countdown(25000, () => t0,
        (left) => setHud(hud, `🐹 ${score}`, `${(left / 1000).toFixed(1)} s`),
        () => { alive = false; clearTimeout(timer); finish(score); });
      return () => { alive = false; clearTimeout(timer); stop(); };
    },
  },

  {
    id: "flechas", code: "FLC", cat: "Mente", color: "#ffb000",
    name: "Flechas", emoji: "🧭",
    desc: "Flecha negra: pulsa su dirección. Flecha roja: la contraria. 20 s. (También con el teclado.)",
    format: (n) => `${n} aciertos`,
    points: (n) => clamp(n * 40),
    start(stage, finish) {
      const DIRS = ["↑", "→", "↓", "←"];
      const OPP = [2, 3, 0, 1];
      let score = 0, t0 = now(), dir, red;
      const hud = hudEl();
      const arrow = el("div", { className: "arrow" });
      const pad = el("div", { className: "dpad" });
      stage.append(hud, arrow, pad);
      const gen = () => {
        dir = randInt(0, 3); red = Math.random() < 0.45;
        arrow.textContent = DIRS[dir];
        arrow.classList.toggle("red", red);
      };
      const answer = (i) => {
        const ok = i === (red ? OPP[dir] : dir);
        if (ok) score++; else score = Math.max(0, score - 1);
        flash(stage, ok);
        gen();
      };
      ["up", "right", "down", "left"].forEach((cls, i) => {
        const b = el("button", { className: cls, textContent: DIRS[i] });
        b.addEventListener("pointerdown", () => answer(i));
        pad.append(b);
      });
      const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
      const onKey = (e) => { if (e.key in KEYS) { e.preventDefault(); answer(KEYS[e.key]); } };
      window.addEventListener("keydown", onKey);
      gen();
      const stop = countdown(20000, () => t0,
        (left) => setHud(hud, `✓ ${score}`, `${(left / 1000).toFixed(1)} s`),
        () => { window.removeEventListener("keydown", onKey); pad.replaceChildren(); finish(score); });
      return () => { window.removeEventListener("keydown", onKey); stop(); };
    },
  },

  {
    id: "cuenta", code: "CNT", cat: "Percepción", color: "#e8448f",
    name: "Cuenta rápida", emoji: "🔴",
    desc: "Aparecen puntos durante un instante. ¿Cuántos había? 10 rondas.",
    format: (n) => `${n}/10 aciertos`,
    points: (n) => clamp(n * 100),
    start(stage, finish) {
      const ROUNDS = 10;
      let round = 0, score = 0, alive = true;
      const hud = hudEl();
      const field = el("div", { className: "dot-field" });
      const ch = el("div", { className: "choices" });
      stage.append(hud, field, ch);
      const play = async () => {
        if (!alive) return;
        if (round >= ROUNDS) return finish(score);
        round++;
        setHud(hud, `Ronda ${round}/${ROUNDS}`, `✓ ${score}`);
        ch.replaceChildren();
        const n = randInt(4 + round, 9 + round);
        field.replaceChildren();
        await sleep(400);
        const placed = [];
        for (let i = 0; i < n; i++) {
          let x, y, tries = 0;
          do { x = rand(8, 92); y = rand(10, 90); tries++; } while (tries < 50 && placed.some((p) => Math.hypot(p[0] - x, p[1] - y) < 11));
          placed.push([x, y]);
          const d = el("div", { className: "cdot" });
          d.style.left = x + "%"; d.style.top = y + "%";
          field.append(d);
        }
        await sleep(Math.max(450, 1000 - round * 50));
        if (!alive) return;
        field.replaceChildren(el("div", { className: "big", textContent: "?" }));
        const opts = new Set([n]);
        while (opts.size < 4) { const d = n + randInt(-3, 3); if (d > 0) opts.add(d); }
        ch.replaceChildren(...[...opts].sort((a, b) => a - b).map((v) => {
          const b = el("button", { textContent: v });
          b.addEventListener("pointerdown", () => {
            if (v === n) score++;
            flash(stage, v === n);
            field.replaceChildren(el("div", { className: "big", textContent: n }));
            ch.replaceChildren();
            setTimeout(play, 500);
          });
          return b;
        }));
      };
      play();
      return () => { alive = false; };
    },
  },

  {
    id: "ruta", code: "RTA", cat: "Memoria", color: "#8a5cff",
    name: "Casillas", emoji: "🟪",
    desc: "Se iluminan unas casillas: memorízalas y tócalas. Tienes 3 vidas.",
    format: (n) => `Nivel ${n}`,
    points: (n) => clamp(n * 90),
    start(stage, finish) {
      let level = 1, lives = 3, alive = true, accepting = false, targets, found;
      const hud = hudEl();
      const grid = el("div", { className: "mem-grid" });
      stage.append(hud, grid);
      const play = async () => {
        if (!alive) return;
        const size = level < 4 ? 4 : level < 8 ? 5 : 6;
        const k = Math.min(size * size - 2, 2 + level);
        setHud(hud, `Nivel ${level}`, "❤️".repeat(lives));
        grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        targets = new Set(shuffleArr(Array.from({ length: size * size }, (_, i) => i)).slice(0, k));
        found = new Set();
        const cells = Array.from({ length: size * size }, (_, i) => {
          const b = el("button");
          b.addEventListener("pointerdown", () => {
            if (!accepting || found.has(i)) return;
            if (targets.has(i)) {
              found.add(i); b.classList.add("on");
              if (found.size === targets.size) { accepting = false; level++; flash(stage, true); setTimeout(play, 500); }
            } else {
              b.classList.add("miss"); accepting = false; lives--;
              flash(stage, false);
              cells.forEach((c, j) => targets.has(j) && c.classList.add("on"));
              setTimeout(() => (lives <= 0 ? finish(level - 1) : play()), 900);
            }
          });
          return b;
        });
        grid.replaceChildren(...cells);
        await sleep(400);
        cells.forEach((c, j) => targets.has(j) && c.classList.add("on"));
        await sleep(900 + k * 80);
        if (!alive) return;
        cells.forEach((c) => c.classList.remove("on"));
        accepting = true;
      };
      play();
      return () => { alive = false; };
    },
  },
];
