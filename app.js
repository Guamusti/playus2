// Navegación, puntuaciones y "Reto exprés". Todo se guarda en localStorage.

const STORE_KEY = "playnow:v1";
const app = document.getElementById("app");
let cleanup = null;

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
};
const data = Object.assign({ best: {}, plays: [], total: 0, bestChallenge: 0 }, load());
const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {} };

const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
const isBetter = (g, a, b) => b == null || (g.lowerIsBetter ? a < b : a > b);
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const medal = (pts) => (pts >= 850 ? "🥇" : pts >= 600 ? "🥈" : pts >= 350 ? "🥉" : "💪");

function record(g, raw) {
  const pts = g.points(raw);
  const prev = data.best[g.id];
  const newBest = isBetter(g, raw, prev);
  if (newBest) data.best[g.id] = raw;
  data.plays.unshift({ id: g.id, raw, pts, at: Date.now() });
  data.plays = data.plays.slice(0, 50);
  data.total += pts;
  save();
  renderTotal();
  return { pts, newBest, hadPrev: prev != null };
}

function renderTotal() {
  document.getElementById("total-pts").textContent = data.total.toLocaleString("es");
}

function teardown() {
  if (cleanup) { cleanup(); cleanup = null; }
}

function html(strings, ...vals) {
  const t = document.createElement("template");
  t.innerHTML = strings.reduce((acc, s, i) => acc + s + (vals[i] ?? ""), "");
  return t.content;
}

// ---------- Pantallas ----------

function home() {
  teardown();
  const cards = GAMES.map((g) => {
    const b = data.best[g.id];
    return `<button class="game-card" data-game="${g.id}">
      <span class="emoji">${g.emoji}</span>
      <span class="name">${g.name}</span>
      <span class="best">${b != null ? "Récord: " + g.format(b) : "Sin jugar"}</span>
    </button>`;
  }).join("");
  const recent = data.plays.slice(0, 5).map((p) => {
    const g = byId[p.id];
    return g ? `<div class="item"><span>${g.emoji} ${g.name}</span><span class="l">${g.format(p.raw)} · <b>${p.pts}</b> pts</span></div>` : "";
  }).join("");

  app.replaceChildren(html`
    <section class="hero">
      <h1>Juega ya. Sin esperar.</h1>
      <p>Minijuegos de 30 segundos cuando quieras. Sin grupo, sin cuentas, sin límite de intentos.</p>
      <div class="row">
        <button class="btn" data-nav="challenge">🔥 Reto exprés (3 juegos)</button>
      </div>
    </section>
    <div class="row" style="margin-top:12px">
      <button class="btn secondary" data-nav="random">🎲 Juego aleatorio</button>
    </div>
    <h2>Minijuegos</h2>
    <div class="grid">${cards}</div>
    ${recent ? `<h2>Últimas partidas</h2><div class="list">${recent}</div>` : ""}
    ${data.bestChallenge ? `<p class="footer-note">Mejor Reto exprés: <b>${data.bestChallenge}</b> / 3000 pts</p>` : ""}
    <p class="footer-note">Tus récords se guardan solo en este dispositivo.</p>
  `);
}

// Muestra intro → juego → resultado. `ctx` opcional para el modo reto.
function play(g, ctx = null) {
  teardown();
  const head = `<div class="play-head">
      <button class="btn secondary" data-nav="home" style="padding:10px 14px">←</button>
      <div style="flex:1">
        <div class="title">${g.emoji} ${g.name}</div>
        <div class="meta">${ctx ? `Reto exprés · ${ctx.i + 1}/3` : (data.best[g.id] != null ? "Récord: " + g.format(data.best[g.id]) : "¡Primera partida!")}</div>
      </div>
    </div>
    ${ctx ? `<div class="challenge-bar">${[0, 1, 2].map((i) => `<div class="${i < ctx.i ? "done" : i === ctx.i ? "cur" : ""}"></div>`).join("")}</div>` : ""}`;
  app.replaceChildren(html`${head}<div class="stage" id="stage"></div>`);
  const stage = document.getElementById("stage");

  stage.replaceChildren(html`<div class="intro">
    <div class="emoji">${g.emoji}</div>
    <h1>${g.name}</h1>
    <p>${g.desc}</p>
    <button class="btn" id="go">¡Jugar!</button>
  </div>`);
  stage.querySelector("#go").addEventListener("click", () => {
    stage.replaceChildren();
    let finished = false;
    cleanup = g.start(stage, (raw) => {
      if (finished) return;
      finished = true;
      teardown();
      stage.className = "stage";
      const res = record(g, raw);
      if (ctx) return ctx.onDone(res.pts, raw);
      showResult(stage, g, raw, res);
    });
  });
}

function showResult(stage, g, raw, { pts, newBest, hadPrev }) {
  stage.replaceChildren(html`<div class="result">
    <div class="medal">${medal(pts)}</div>
    <div class="pts">${pts}</div>
    <div class="hint">puntos</div>
    <div class="raw">${g.format(raw)}</div>
    ${newBest && hadPrev ? `<div class="tag">¡Nuevo récord!</div>` : newBest ? `<div class="tag">Primer récord</div>` : `<div class="hint" style="margin:8px 0 18px">Récord: ${g.format(data.best[g.id])}</div>`}
    <div class="row">
      <button class="btn" id="again">↻ Otra vez</button>
      <button class="btn secondary" data-nav="random">🎲 Otro</button>
    </div>
  </div>`);
  stage.querySelector("#again").addEventListener("click", () => play(g));
}

function challenge() {
  const picks = shuffle(GAMES).slice(0, 3);
  const results = [];
  const step = (i) => play(picks[i], {
    i,
    onDone(pts, raw) {
      results.push({ g: picks[i], pts, raw });
      if (i < 2) {
        const stage = document.getElementById("stage");
        stage.replaceChildren(html`<div class="result">
          <div class="pts">${pts}</div><div class="hint">puntos en ${picks[i].name}</div>
          <p class="hint" style="margin:20px 0">Siguiente: ${picks[i + 1].emoji} ${picks[i + 1].name}</p>
          <button class="btn" id="next">Continuar →</button>
        </div>`);
        stage.querySelector("#next").addEventListener("click", () => step(i + 1));
      } else challengeResult(results);
    },
  });
  step(0);
}

function challengeResult(results) {
  const total = results.reduce((a, r) => a + r.pts, 0);
  const newBest = total > (data.bestChallenge || 0);
  if (newBest) { data.bestChallenge = total; save(); }
  const rows = results.map((r) => `<div class="item"><span>${r.g.emoji} ${r.g.name}</span><span class="l">${r.g.format(r.raw)} · <b>${r.pts}</b></span></div>`).join("");
  const stage = document.getElementById("stage");
  document.querySelectorAll(".challenge-bar div").forEach((d) => (d.className = "done"));
  stage.replaceChildren(html`<div class="result" style="width:100%">
    <div class="medal">${medal(total / 3)}</div>
    <div class="pts">${total}</div>
    <div class="hint">de 3000 puntos</div>
    ${newBest ? `<div class="tag">¡Mejor reto!</div>` : `<div class="hint" style="margin:8px 0 18px">Mejor: ${data.bestChallenge}</div>`}
    <div class="list" style="margin-bottom:18px;text-align:left">${rows}</div>
    <div class="row">
      <button class="btn" data-nav="challenge">🔥 Otro reto</button>
      <button class="btn secondary" id="share">📤 Compartir</button>
    </div>
  </div>`);
  stage.querySelector("#share").addEventListener("click", async () => {
    const text = `🎮 PlayNow · Reto exprés: ${total}/3000\n` +
      results.map((r) => `${r.g.emoji} ${r.g.name}: ${r.pts}`).join("\n") + `\n${location.origin}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); stage.querySelector("#share").textContent = "✅ Copiado"; }
    } catch {}
  });
}

// ---------- Router simple ----------

document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-nav]");
  const card = e.target.closest("[data-game]");
  if (nav) {
    const to = nav.dataset.nav;
    if (to === "home") home();
    else if (to === "random") play(GAMES[Math.floor(Math.random() * GAMES.length)]);
    else if (to === "challenge") challenge();
  } else if (card) play(byId[card.dataset.game]);
});

renderTotal();
home();
