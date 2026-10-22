// Navegación, puntuaciones y "Reto exprés". Todo se guarda en localStorage.

const STORE_KEY = "playnow:v1";
const NEW_GAMES = new Set(["orden", "topos", "flechas", "cuenta", "ruta"]);
const app = document.getElementById("app");
let cleanup = null;
let filter = "Todos";
let challengePicks = null;

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
};
const data = Object.assign({ best: {}, plays: [], total: 0, bestChallenge: 0, count: 0 }, load());
data.count = data.count || data.plays.length;
const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {} };

const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
const CATS = ["Todos", ...new Set(GAMES.map((g) => g.cat))];
const isBetter = (g, a, b) => b == null || (g.lowerIsBetter ? a < b : a > b);
const bestPts = (g) => (data.best[g.id] != null ? g.points(data.best[g.id]) : null);
const verdict = (pts) => (pts >= 850 ? "Leyenda." : pts >= 600 ? "Muy fino." : pts >= 350 ? "Nada mal." : "Calentando motores.");
const pickChallenge = () => shuffleArr(GAMES).slice(0, 3);

function record(g, raw) {
  const pts = g.points(raw);
  const prev = data.best[g.id];
  const newBest = isBetter(g, raw, prev);
  if (newBest) data.best[g.id] = raw;
  data.plays.unshift({ id: g.id, raw, pts, at: Date.now() });
  data.plays = data.plays.slice(0, 50);
  data.total += pts;
  data.count++;
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

// ---------- Portada ----------

function gameCard(g) {
  const bp = bestPts(g);
  return `<button class="block gcard" data-game="${g.id}">
    <div class="stripe" style="background:${g.color}"></div>
    <div class="body">
      <div class="tags">
        <span class="label" style="color:${g.color}">● ${g.code} · ${g.cat}</span>
        ${NEW_GAMES.has(g.id) ? `<span class="pill new">NUEVO</span>` : ""}
      </div>
      <h3>${g.name}</h3>
      <div class="meta">${g.desc}</div>
      <div class="score">${bp ?? "—"}</div>
      <div class="foot">
        <div><div class="label" style="color:var(--muted)">Récord</div><div class="rec">${data.best[g.id] != null ? g.format(data.best[g.id]) : "—"}</div></div>
        <span class="play">↗</span>
      </div>
      <div class="mini"><i style="width:${(bp ?? 0) / 10}%;background:${g.color}"></i></div>
      <div class="wm" style="color:${g.color}">${g.code}</div>
    </div>
  </button>`;
}

function home() {
  teardown();
  window.scrollTo(0, 0);
  challengePicks = challengePicks || pickChallenge();
  const played = GAMES.filter((g) => data.best[g.id] != null).length;
  const last10 = data.plays.slice(0, 10);
  const avg = last10.length ? Math.round(last10.reduce((a, p) => a + p.pts, 0) / last10.length) : null;
  const visible = GAMES.filter((g) => filter === "Todos" || g.cat === filter);
  const recent = data.plays.slice(0, 6).map((p) => {
    const g = byId[p.id];
    return g ? `<div class="item"><span>${g.emoji} ${g.name}</span><span class="l">${g.format(p.raw)} · <b style="color:var(--ink)">${p.pts}</b> pts</span></div>` : "";
  }).join("");

  app.replaceChildren(html`
    <div class="top-grid">
      <section class="block hero">
        <div class="label">Temporada libre · sin esperas</div>
        <h1>Juega ahora.<br><em>Sin esperar</em> a nadie.</h1>
        <p>${GAMES.length} minijuegos de medio minuto. Sin grupo, sin cuentas y sin límite de intentos. Bate tus récords cuando te apetezca.</p>
        <div class="row">
          <button class="btn" data-nav="challenge">Reto exprés →</button>
          <button class="btn ghost" data-nav="random">Juego aleatorio</button>
        </div>
        <div class="meter">
          <div class="meter-head"><span>Juegos descubiertos</span><b>${played} de ${GAMES.length}</b></div>
          <div class="bar"><i style="width:${(played / GAMES.length) * 100}%"></i></div>
        </div>
        <div class="watermark">PLAY</div>
      </section>
      <div class="block stat butter">
        <div class="label">Puntos totales</div>
        <div class="num">${data.total.toLocaleString("es")}</div>
        <div class="cap">acumulados en todas tus partidas</div>
      </div>
      <div class="block stat sky">
        <div class="label">Partidas</div>
        <div class="num">${data.count}</div>
        <div class="cap">jugadas en este dispositivo</div>
      </div>
      <div class="block stat pink">
        <div class="label">Mejor reto</div>
        <div class="num">${data.bestChallenge || "—"}</div>
        <div class="cap">sobre 3000 puntos posibles</div>
      </div>
      <div class="block stat">
        <div class="label">Forma actual</div>
        <div class="num">${avg ?? "—"}</div>
        <div class="cap">media de tus últimas 10 partidas</div>
      </div>
    </div>

    <section class="block panel">
      <div class="panel-head">
        <div>
          <div class="label">Reto exprés · 3 juegos seguidos</div>
          <h2>Tu reto de ahora</h2>
        </div>
        <div class="row">
          <button class="btn ghost" id="reshuffle">↻ Barajar</button>
          <button class="btn dark" data-nav="challenge">Empezar reto</button>
        </div>
      </div>
      <div class="slots">
        ${challengePicks.map((g, i) => `<div class="slot">
          <div class="label">Prueba ${i + 1}</div>
          <div class="t">${g.emoji} ${g.name}</div>
          <div class="s">${g.cat} · récord ${data.best[g.id] != null ? g.format(data.best[g.id]) : "—"}</div>
        </div>`).join("")}
        <div class="slot">
          <div class="label">Objetivo</div>
          <div class="t">Superar ${data.bestChallenge || 0}</div>
          <div class="s">${data.bestChallenge ? "Tu mejor marca en el reto" : "Aún no has hecho ningún reto"}</div>
        </div>
      </div>
    </section>

    <div class="section-head">
      <div class="label">Todos los minijuegos</div>
      <div class="chips">${CATS.map((c) => `<button data-filter="${c}" class="${c === filter ? "on" : ""}">${c}</button>`).join("")}</div>
    </div>
    <div class="games">${visible.map(gameCard).join("")}</div>

    ${recent ? `<div class="section-head"><div class="label">Últimas partidas</div></div><div class="block history">${recent}</div>` : ""}
    <p class="footer-note">Tus récords se guardan solo en este dispositivo.</p>
  `);

  app.querySelector("#reshuffle").addEventListener("click", () => { challengePicks = pickChallenge(); home(); });
  app.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => {
    filter = b.dataset.filter;
    home();
    app.querySelector(".section-head").scrollIntoView({ block: "start" });
  }));
}

// ---------- Partida ----------

// Muestra intro → juego → resultado. `ctx` opcional para el modo reto.
function play(g, ctx = null) {
  teardown();
  window.scrollTo(0, 0);
  const rec = data.best[g.id] != null ? `Récord: <b>${g.format(data.best[g.id])}</b>` : "¡Primera partida!";
  app.replaceChildren(html`<div class="play-wrap">
    <div class="play-head">
      <button class="back" data-nav="home" aria-label="Volver">←</button>
      <div>
        <div class="label">${ctx ? `Reto exprés · ${ctx.i + 1} de 3` : `${g.code} · ${g.cat}`}</div>
        <div class="title">${g.name}</div>
      </div>
    </div>
    ${ctx ? `<div class="challenge-bar">${[0, 1, 2].map((i) => `<div class="${i < ctx.i ? "done" : i === ctx.i ? "cur" : ""}"></div>`).join("")}</div>` : ""}
    <div class="stage-stripe" style="background:${g.color}"></div>
    <div class="block stage" id="stage"></div>
  </div>`);
  const stage = document.getElementById("stage");

  stage.replaceChildren(html`<div class="intro">
    <div class="emoji">${g.emoji}</div>
    <h1>${g.name}</h1>
    <p>${g.desc}</p>
    <div class="rec">${rec}</div>
    <button class="btn dark" id="go">¡Jugar!</button>
  </div>`);
  stage.querySelector("#go").addEventListener("click", () => {
    stage.replaceChildren();
    let finished = false;
    cleanup = g.start(stage, (raw) => {
      if (finished) return;
      finished = true;
      teardown();
      stage.className = "block stage";
      const res = record(g, raw);
      if (ctx) return ctx.onDone(res.pts, raw);
      showResult(stage, g, raw, res);
    });
  });
}

function showResult(stage, g, raw, { pts, newBest, hadPrev }) {
  stage.replaceChildren(html`<div class="result">
    <div class="verdict">${verdict(pts)}</div>
    <div class="pts">${pts}</div>
    <div class="label" style="margin-top:8px">puntos de 1000</div>
    <div class="raw">${g.format(raw)}</div>
    ${newBest && hadPrev ? `<div class="tag">★ ¡Nuevo récord!</div>` : newBest ? `<div class="tag">Primer récord</div>` : `<div class="hint" style="margin:10px 0 22px">Récord: ${g.format(data.best[g.id])}</div>`}
    <div class="row">
      <button class="btn dark" id="again">↻ Otra vez</button>
      <button class="btn ghost" data-nav="random">Otro juego</button>
    </div>
  </div>`);
  stage.querySelector("#again").addEventListener("click", () => play(g));
}

// ---------- Reto exprés ----------

function challenge() {
  const picks = challengePicks || pickChallenge();
  challengePicks = null; // el siguiente reto será otro
  const results = [];
  const step = (i) => play(picks[i], {
    i,
    onDone(pts, raw) {
      results.push({ g: picks[i], pts, raw });
      if (i < 2) {
        const stage = document.getElementById("stage");
        stage.replaceChildren(html`<div class="result">
          <div class="verdict">${verdict(pts)}</div>
          <div class="pts">${pts}</div>
          <div class="label" style="margin-top:8px">puntos en ${picks[i].name}</div>
          <p class="hint" style="margin:22px 0">Siguiente: <b style="color:var(--ink)">${picks[i + 1].emoji} ${picks[i + 1].name}</b></p>
          <button class="btn dark" id="next">Continuar →</button>
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
  const rows = results.map((r) => `<div class="item"><span>${r.g.emoji} ${r.g.name}</span><span><span class="hint">${r.g.format(r.raw)} ·</span> <b>${r.pts}</b></span></div>`).join("");
  const stage = document.getElementById("stage");
  document.querySelectorAll(".challenge-bar div").forEach((d) => (d.className = "done"));
  document.querySelector(".play-head .label").textContent = "Reto exprés · completado";
  stage.replaceChildren(html`<div class="result">
    <div class="verdict">${verdict(total / 3)}</div>
    <div class="pts">${total}</div>
    <div class="label" style="margin-top:8px">de 3000 puntos</div>
    ${newBest ? `<div class="tag">★ ¡Mejor reto!</div>` : `<div class="hint" style="margin:10px 0 22px">Tu mejor reto: ${data.bestChallenge}</div>`}
    <div class="list">${rows}</div>
    <div class="row">
      <button class="btn dark" data-nav="challenge">Otro reto</button>
      <button class="btn ghost" id="share">Compartir</button>
    </div>
  </div>`);
  stage.querySelector("#share").addEventListener("click", async () => {
    const text = `PlayNow · Reto exprés: ${total}/3000\n` +
      results.map((r) => `${r.g.emoji} ${r.g.name}: ${r.pts}`).join("\n") + `\n${location.origin}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); stage.querySelector("#share").textContent = "✓ Copiado"; }
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
