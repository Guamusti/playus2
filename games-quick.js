// Juegos rápidos de interfaz: Zona, Verdadero o falso, Número, Anagramas y Suma 10.

const WORDS = [
  "PLAYA", "MONTE", "CIELO", "FUEGO", "LIBRO", "PERRO", "MUNDO", "NUBES", "CAMPO", "PIANO",
  "SILLA", "RELOJ", "BARCO", "TIGRE", "LIMON", "FRESA", "MANGO", "PLUMA", "NIEVE", "TECLA",
  "VERDE", "NEGRO", "BLUSA", "HUEVO", "LECHE", "QUESO", "PIZZA", "TORRE", "PUNTO", "JUEGO",
  "RATON", "PATIO", "CALOR", "CIRCO", "DADOS", "ARBOL", "LAPIZ", "HOJAS", "BOTAS", "GLOBO",
  "TRUCO", "VIAJE", "MARCO", "CEBRA", "CABRA", "PULPO", "ROBOT", "MAGIA", "RUEDA", "FALDA",
];

GAMES.push(
  {
    id: "zona", code: "ZNA", cat: "Precisión", color: "#d94a2b",
    name: "En la zona", icon: "zone",
    desc: "Para la barra dentro de la zona marcada. 8 rondas, cada vez más rápida y estrecha.",
    format: (n) => `${n}% de precisión`,
    points: (n) => clamp(n * 10),
    start(stage, finish) {
      const ROUNDS = 8;
      let round = 0, total = 0, pos = 0, dir = 1, speed, zone, raf, moving = false, alive = true;
      const hud = hudEl();
      const track = el("div", { className: "zone-track" });
      const z = el("div", { className: "zone-hit" });
      const cur = el("div", { className: "zone-cursor" });
      const msg = el("div", { className: "big", style: "margin-top:26px;min-height:1.2em" });
      const btn = el("button", { className: "btn dark", textContent: "¡PARA!", style: "margin-top:16px" });
      track.append(z, cur);
      stage.append(hud, track, msg, btn);
      const next = () => {
        if (round >= ROUNDS) return finish(Math.round(total / ROUNDS));
        round++;
        const w = Math.max(7, 22 - round * 2);
        zone = { c: rand(w / 2 + 5, 95 - w / 2), w };
        z.style.left = zone.c - w / 2 + "%"; z.style.width = w + "%";
        speed = 55 + round * 14;
        pos = 0; dir = 1; moving = true; msg.textContent = "";
        setHud(hud, `Ronda ${round}/${ROUNDS}`, `${round > 1 ? Math.round(total / (round - 1)) : 0}%`);
      };
      let last = now();
      const loop = () => {
        const t = now(), dt = (t - last) / 1000; last = t;
        if (moving) {
          pos += dir * speed * dt;
          if (pos > 100) { pos = 100; dir = -1; }
          if (pos < 0) { pos = 0; dir = 1; }
          cur.style.left = pos + "%";
        }
        raf = requestAnimationFrame(loop);
      };
      const stopBar = () => {
        if (!moving) return;
        moving = false;
        const off = Math.abs(pos - zone.c);
        const acc = off <= zone.w / 2 ? Math.round(100 - (off / (zone.w / 2)) * 40) : 0;
        total += acc;
        msg.textContent = acc ? `${acc}%` : "Fuera";
        flash(stage, acc > 0);
        setTimeout(() => alive && next(), 700);
      };
      btn.addEventListener("pointerdown", stopBar);
      const unkeys = bindKeys({ " ": stopBar, Enter: stopBar });
      next(); loop();
      return () => { alive = false; cancelAnimationFrame(raf); unkeys(); };
    },
  },

  {
    id: "vof", code: "VOF", cat: "Mente", color: "#00a676",
    name: "¿Verdad o mentira?", icon: "truefalse",
    desc: "¿La operación está bien? Responde todas las que puedas en 25 segundos.",
    format: (n) => `${n} aciertos`,
    points: (n) => clamp(n * 45),
    start(stage, finish) {
      let score = 0, t0 = now(), truth;
      const hud = hudEl();
      const q = el("div", { className: "big" });
      const row = el("div", { className: "tf-row" });
      const yes = el("button", { className: "tf yes", innerHTML: `${icon("check", 28)} Verdad` });
      const no = el("button", { className: "tf no", innerHTML: `${icon("close", 28)} Mentira` });
      row.append(yes, no);
      stage.append(hud, q, row);
      const gen = () => {
        const lvl = Math.min(3, Math.floor(score / 5));
        const op = ["+", "−", "×"][randInt(0, lvl ? 2 : 1)];
        let a = randInt(3, 12 + lvl * 8), b = randInt(2, 9 + lvl * 4);
        if (op === "−" && b > a) [a, b] = [b, a];
        const real = op === "+" ? a + b : op === "−" ? a - b : a * b;
        truth = Math.random() < 0.5;
        const shown = truth ? real : real + (Math.random() < 0.5 ? -1 : 1) * randInt(1, op === "×" ? 6 : 3);
        q.textContent = `${a} ${op} ${b} = ${shown}`;
      };
      const answer = (v) => {
        const ok = v === truth;
        if (ok) score++; else { score = Math.max(0, score - 1); t0 -= 1000; }
        flash(stage, ok);
        gen();
      };
      yes.addEventListener("pointerdown", () => answer(true));
      no.addEventListener("pointerdown", () => answer(false));
      const unkeys = bindKeys({ ArrowLeft: () => answer(true), ArrowRight: () => answer(false), v: () => answer(true), m: () => answer(false) });
      gen();
      const stop = countdown(25000, () => t0,
        (left) => setHud(hud, `${icon("check", 14)} ${score}`, `${(left / 1000).toFixed(1)} s`),
        () => { row.replaceChildren(); unkeys(); finish(score); });
      return () => { unkeys(); stop(); };
    },
  },

  {
    id: "numero", code: "NUM", cat: "Memoria", color: "#2f6bff",
    name: "Recuerda el número", icon: "digits",
    desc: "Memoriza el número y escríbelo. Cada acierto añade una cifra. 2 vidas.",
    format: (n) => `${n} cifras`,
    points: (n) => clamp((n - 2) * 110),
    start(stage, finish) {
      let digits = 3, best = 0, lives = 2, target = "", typed = "", accepting = false, timer;
      const hud = hudEl();
      const show = el("div", { className: "big mono num-show" });
      const pad = el("div", { className: "numpad" });
      stage.append(hud, show, pad);
      const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "←", "0", "OK"];
      pad.append(...keys.map((k) => {
        const b = el("button", { textContent: k });
        if (k === "OK") b.className = "ok";
        b.addEventListener("pointerdown", () => press(k));
        return b;
      }));
      const render = () => { show.textContent = typed.padEnd(target.length, "·"); };
      const round = () => {
        setHud(hud, `${digits} cifras`, `<span class="hearts">${icon("heart", 16).repeat(lives)}</span>`);
        target = Array.from({ length: digits }, (_, i) => String(randInt(i ? 0 : 1, 9))).join("");
        typed = ""; accepting = false;
        show.textContent = target;
        pad.classList.add("off");
        timer = setTimeout(() => { accepting = true; pad.classList.remove("off"); render(); }, 700 + digits * 350);
      };
      const press = (k) => {
        if (!accepting) return;
        if (k === "←") typed = typed.slice(0, -1);
        else if (k === "OK") return check();
        else if (typed.length < target.length) typed += k;
        render();
        if (typed.length === target.length) check();
      };
      const check = () => {
        accepting = false;
        const ok = typed === target;
        flash(stage, ok);
        if (ok) { best = digits; digits++; }
        else { lives--; show.textContent = target; }
        timer = setTimeout(() => (lives <= 0 ? finish(Math.max(best, 2)) : round()), ok ? 400 : 1200);
      };
      const onKey = (e) => {
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === "Backspace") press("←");
        else if (e.key === "Enter") press("OK");
      };
      window.addEventListener("keydown", onKey);
      round();
      return () => { clearTimeout(timer); window.removeEventListener("keydown", onKey); };
    },
  },

  {
    id: "anagramas", code: "ANA", cat: "Mente", color: "#8a5cff",
    name: "Anagramas", icon: "letters",
    desc: "Ordena las letras para formar la palabra. 45 segundos. Saltar cuesta 3 s.",
    format: (n) => `${n} palabras`,
    points: (n) => clamp(n * 125),
    start(stage, finish) {
      let score = 0, t0 = now(), word, picked = [], tiles = [];
      const pool = shuffleArr(WORDS);
      const hud = hudEl();
      const slots = el("div", { className: "ana-slots" });
      const letters = el("div", { className: "ana-tiles" });
      const row = el("div", { className: "row", style: "margin-top:22px;justify-content:center" });
      const undo = el("button", { className: "btn ghost", innerHTML: `${icon("arrowLeft")} Borrar` });
      const skip = el("button", { className: "btn ghost", innerHTML: `Saltar ${icon("arrowRight")}` });
      row.append(undo, skip);
      stage.append(hud, slots, letters, row);
      const render = () => {
        slots.replaceChildren(...[...word].map((_, i) => el("div", { className: "ana-slot", textContent: picked[i] != null ? tiles[picked[i]] : "" })));
        letters.replaceChildren(...tiles.map((ch, i) => {
          const b = el("button", { textContent: ch, disabled: picked.includes(i) });
          b.addEventListener("pointerdown", () => pick(i));
          return b;
        }));
      };
      const next = () => {
        word = pool.pop() || shuffleArr(WORDS)[0];
        do { tiles = shuffleArr([...word]); } while (tiles.join("") === word);
        picked = [];
        render();
      };
      const pick = (i) => {
        if (picked.includes(i)) return;
        picked.push(i);
        render();
        if (picked.length < word.length) return;
        if (picked.map((j) => tiles[j]).join("") === word) { score++; flash(stage, true); next(); }
        else { flash(stage, false); setTimeout(() => { picked = []; render(); }, 250); }
      };
      undo.addEventListener("click", () => { picked.pop(); render(); });
      skip.addEventListener("click", () => { t0 -= 3000; next(); });
      next();
      return countdown(45000, () => t0,
        (left) => setHud(hud, `${icon("check", 14)} ${score}`, `${(left / 1000).toFixed(1)} s`),
        () => { row.replaceChildren(); letters.replaceChildren(); slots.replaceChildren(el("div", { className: "big", textContent: word })); finish(score); });
    },
  },

  {
    id: "suma10", code: "S10", cat: "Mente", color: "#ffb000",
    name: "Suma 10", icon: "sum",
    desc: "Toca parejas de números que sumen 10. Se reponen solos. 30 segundos.",
    format: (n) => `${n} parejas`,
    points: (n) => clamp(n * 50),
    start(stage, finish) {
      let score = 0, t0 = now(), sel = null;
      const hud = hudEl();
      const grid = el("div", { className: "sum-grid" });
      stage.append(hud, grid);
      const vals = Array.from({ length: 16 }, () => randInt(1, 9));
      const hasPair = () => vals.some((v, i) => vals.some((w, j) => i !== j && v + w === 10));
      const ensure = () => { while (!hasPair()) vals[randInt(0, 15)] = randInt(1, 9); };
      const render = () => grid.replaceChildren(...vals.map((v, i) => {
        const b = el("button", { textContent: v, className: sel === i ? "sel" : "" });
        b.addEventListener("pointerdown", () => tap(i));
        return b;
      }));
      const tap = (i) => {
        if (sel === null) { sel = i; return render(); }
        if (sel === i) { sel = null; return render(); }
        if (vals[sel] + vals[i] === 10) {
          score++;
          vals[sel] = randInt(1, 9); vals[i] = randInt(1, 9);
          ensure();
          flash(stage, true);
        } else { t0 -= 1500; flash(stage, false); }
        sel = null;
        render();
      };
      ensure(); render();
      return countdown(30000, () => t0,
        (left) => setHud(hud, `${icon("check", 14)} ${score}`, `${(left / 1000).toFixed(1)} s`),
        () => { grid.replaceChildren(); finish(score); });
    },
  },
);
