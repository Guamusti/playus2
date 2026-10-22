// Juegos 3D con Three.js. La librería se descarga solo al abrir uno de estos
// juegos (loadThree), así la portada sigue cargando rápido.

const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
let threePromise = null;
function loadThree() {
  if (window.THREE) return Promise.resolve();
  if (!threePromise) {
    threePromise = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = THREE_URL;
      s.onload = res;
      s.onerror = () => { threePromise = null; rej(new Error("No se pudo cargar Three.js")); };
      document.head.append(s);
    });
  }
  return threePromise;
}

const INK = 0x121212;
const CARD_BG = 0xfffcf5;
const PALETTE3D = [0xff5a36, 0xffb000, 0x00a676, 0x2f6bff, 0x8a5cff, 0xe8448f, 0x00a3c4];

// Monta renderer + escena dentro del stage. Se asigna api.camera y api.update(dt)
// y se llama a api.loop(). dispose() libera el contexto WebGL.
function setup3D(stage, height = 460) {
  const W = stage.clientWidth, H = height;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W, H);
  renderer.setClearColor(CARD_BG);
  renderer.domElement.className = "three";
  stage.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.62));
  const sun = new THREE.DirectionalLight(0xffffff, 0.75);
  sun.position.set(5, 10, 7);
  scene.add(sun);
  let raf, last = performance.now(), running = true;
  const api = {
    W, H, scene, renderer, camera: null, update: null,
    loop() {
      const tick = (t) => {
        if (!running) return;
        const dt = Math.min(0.05, (t - last) / 1000);
        last = t;
        if (api.update) api.update(dt);
        renderer.render(scene, api.camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
  return api;
}

// Caja con contorno negro, a juego con el estilo de bloques de la web.
function boldBox(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: INK })));
  return mesh;
}

// Pulsación por toque/clic en el canvas + teclas. Devuelve la función que quita los listeners.
function bindInput(canvas, onPointer, keys) {
  const onKey = (e) => { if (e.key in keys) { e.preventDefault(); keys[e.key](); } };
  canvas.addEventListener("pointerdown", onPointer);
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

GAMES.push(
  {
    id: "torre", code: "TRR", cat: "Precisión", color: "#8a5cff", is3d: true,
    name: "Torre 3D", icon: "tower",
    desc: "Apila bloques en 3D. Lo que sobresale se corta. Toca (o pulsa espacio) para soltar.",
    format: (n) => `${n} pisos`,
    points: (n) => clamp(n * 45),
    start(stage, finish) {
      const g = setup3D(stage);
      const hud = hudEl();
      stage.append(hud);
      const BH = 0.6, RANGE = 4.4, VIEW = 12;
      const aspect = g.W / g.H;
      const cam = new THREE.OrthographicCamera(-VIEW * aspect / 2, VIEW * aspect / 2, VIEW / 2, -VIEW / 2, 0.1, 200);
      g.camera = cam;
      let camY = 0;
      const placeCam = () => { cam.position.set(10, camY + 11, 10); cam.lookAt(0, camY + 1, 0); };

      const base = boldBox(3, BH * 6, 3, 0x14213d);
      base.position.y = -BH * 3;
      g.scene.add(base);

      const color = (i) => PALETTE3D[i % PALETTE3D.length];
      const stack = [{ x: 0, z: 0, w: 3, d: 3 }];
      const falling = [];
      let level = 0, axis = "x", t = 0, speed = 0.9, over = false, mover, endTimer;
      const yOf = (lvl) => (lvl + 0.5) * BH;

      const newMover = () => {
        const top = stack[stack.length - 1];
        axis = level % 2 === 0 ? "x" : "z";
        t = 0;
        mover = { ...top, mesh: boldBox(top.w, BH, top.d, color(level)) };
        g.scene.add(mover.mesh);
      };

      const drop = () => {
        if (over) return;
        const top = stack[stack.length - 1];
        const size = axis === "x" ? "w" : "d";
        let delta = mover[axis] - top[axis];
        if (Math.abs(delta) < 0.12) delta = 0; // casi perfecto: encaja
        const overlap = top[size] - Math.abs(delta);
        const y = yOf(level);
        if (overlap <= 0) {
          over = true;
          falling.push({ mesh: mover.mesh, vy: 0 });
          flash(stage, false);
          endTimer = setTimeout(() => finish(level), 1100);
          return;
        }
        g.scene.remove(mover.mesh);
        const placed = { x: top.x, z: top.z, w: top.w, d: top.d };
        placed[size] = overlap;
        placed[axis] = top[axis] + delta / 2;
        const mesh = boldBox(placed.w, BH, placed.d, color(level));
        mesh.position.set(placed.x, y, placed.z);
        g.scene.add(mesh);
        if (delta !== 0) {
          const cut = { ...placed };
          cut[size] = Math.abs(delta);
          cut[axis] = placed[axis] + Math.sign(delta) * (overlap + Math.abs(delta)) / 2;
          const cm = boldBox(cut.w, BH, cut.d, color(level));
          cm.position.set(cut.x, y, cut.z);
          g.scene.add(cm);
          falling.push({ mesh: cm, vy: 0 });
        } else flash(stage, true);
        stack.push(placed);
        level++;
        speed = Math.min(2.2, speed + 0.05);
        setHud(hud, `${level} pisos`, delta === 0 ? "¡Perfecto!" : "");
        newMover();
      };

      g.update = (dt) => {
        if (!over) {
          t += dt * speed;
          const p = t % 4;
          const tri = p < 2 ? p - 1 : 3 - p; // va y vuelve de -1 a 1
          const top = stack[stack.length - 1];
          mover[axis] = top[axis] + tri * RANGE;
          mover.mesh.position.set(mover.x, yOf(level), mover.z);
        }
        for (let i = falling.length - 1; i >= 0; i--) {
          const f = falling[i];
          f.vy -= 22 * dt;
          f.mesh.position.y += f.vy * dt;
          f.mesh.rotation.x += dt * 1.5;
          if (f.mesh.position.y < camY - 25) { g.scene.remove(f.mesh); falling.splice(i, 1); }
        }
        camY += (level * BH - camY) * Math.min(1, dt * 4);
        placeCam();
      };

      setHud(hud, "0 pisos", "");
      newMover();
      placeCam();
      g.loop();
      const unbind = bindInput(g.renderer.domElement, drop, { " ": drop, Enter: drop });
      return () => { clearTimeout(endTimer); unbind(); g.dispose(); };
    },
  },

  {
    id: "carril", code: "RUN", cat: "Reflejos", color: "#00a3c4", is3d: true,
    name: "Carril 3D", icon: "road",
    desc: "Esquiva los bloques cambiando de carril. Toca a izquierda o derecha (o usa las flechas).",
    format: (m) => `${Math.round(m)} m`,
    points: (m) => clamp(m * 1.4),
    start(stage, finish) {
      const g = setup3D(stage);
      const hud = hudEl();
      stage.append(hud);
      g.scene.fog = new THREE.Fog(CARD_BG, 28, 70);
      const cam = new THREE.PerspectiveCamera(60, g.W / g.H, 0.1, 200);
      cam.position.set(0, 3.4, 6.5);
      cam.lookAt(0, 0.4, -6);
      g.camera = cam;

      const LANES = [-1.8, 0, 1.8];
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(7, 200), new THREE.MeshLambertMaterial({ color: 0xefe9de }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.z = -80;
      g.scene.add(ground);
      for (const x of [-3.6, 3.6]) {
        const rail = boldBox(0.3, 0.5, 200, 0x14213d);
        rail.position.set(x, 0.25, -80);
        g.scene.add(rail);
      }
      const dashes = [];
      for (let i = 0; i < 30; i++) {
        for (const x of [-0.9, 0.9]) {
          const d = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 1.4), new THREE.MeshBasicMaterial({ color: INK }));
          d.position.set(x, 0.01, 6 - i * 4);
          g.scene.add(d);
          dashes.push(d);
        }
      }
      const player = boldBox(0.9, 0.9, 0.9, 0xffb000);
      player.position.set(0, 0.45, 0);
      g.scene.add(player);

      const obstacles = [];
      let lane = 1, dist = 0, speed = 13, nextSpawn = 20, over = false, endTimer;
      const spawn = () => {
        const blocked = Math.random() < 0.35 ? shuffleArr([0, 1, 2]).slice(0, 2) : [randInt(0, 2)];
        for (const l of blocked) {
          const h = rand(0.8, 1.9);
          const o = boldBox(1.3, h, 1.0, PALETTE3D[randInt(0, PALETTE3D.length - 1)]);
          o.position.set(LANES[l], h / 2, -62);
          g.scene.add(o);
          obstacles.push(o);
        }
      };
      const move = (d) => { if (!over) lane = Math.max(0, Math.min(2, lane + d)); };
      const onPointer = (e) => {
        const r = g.renderer.domElement.getBoundingClientRect();
        move(e.clientX - r.left < r.width / 2 ? -1 : 1);
      };

      g.update = (dt) => {
        if (over) {
          player.rotation.x -= dt * 6;
          player.position.y += dt * 2;
          return;
        }
        speed = Math.min(34, speed + dt * 0.45);
        const step = speed * dt;
        dist += step;
        if (dist >= nextSpawn) { spawn(); nextSpawn = dist + Math.max(8, 17 - speed * 0.25); }
        for (const d of dashes) { d.position.z += step; if (d.position.z > 6) d.position.z -= 120; }
        const tx = LANES[lane];
        player.position.x += (tx - player.position.x) * Math.min(1, dt * 14);
        player.rotation.z = (player.position.x - tx) * 0.25;
        for (let i = obstacles.length - 1; i >= 0; i--) {
          const o = obstacles[i];
          o.position.z += step;
          if (Math.abs(o.position.z) < 0.95 && Math.abs(o.position.x - player.position.x) < 1.05) {
            over = true;
            flash(stage, false);
            endTimer = setTimeout(() => finish(dist), 900);
          }
          if (o.position.z > 8) { g.scene.remove(o); obstacles.splice(i, 1); }
        }
        setHud(hud, `${Math.round(dist)} m`, `${Math.round(speed * 3.6)} km/h`);
      };

      g.loop();
      const unbind = bindInput(g.renderer.domElement, onPointer, {
        ArrowLeft: () => move(-1), ArrowRight: () => move(1), a: () => move(-1), d: () => move(1),
      });
      return () => { clearTimeout(endTimer); unbind(); g.dispose(); };
    },
  },

  {
    id: "meteoritos", code: "MTR", cat: "Precisión", color: "#e8448f", is3d: true,
    name: "Meteoritos", icon: "meteor",
    desc: "Toca las rocas para destruirlas antes de que te alcancen. Si se te escapan 3, se acabó.",
    format: (n) => `${n} rocas`,
    points: (n) => clamp(n * 22),
    start(stage, finish) {
      const g = setup3D(stage);
      const hud = hudEl();
      stage.append(hud);
      const FOV = 60;
      const cam = new THREE.PerspectiveCamera(FOV, g.W / g.H, 0.1, 200);
      cam.position.set(0, 0, 6);
      g.camera = cam;
      g.scene.fog = new THREE.Fog(CARD_BG, 30, 60);

      const starPos = [];
      for (let i = 0; i < 300; i++) starPos.push(rand(-40, 40), rand(-30, 30), rand(-60, -20));
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
      g.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: INK, size: 0.18 })));

      // Zona visible a la profundidad del jugador, para que las rocas acaben en pantalla.
      const halfH = 6 * Math.tan((FOV / 2) * Math.PI / 180);
      const halfW = halfH * (g.W / g.H);
      const rocks = [];
      let score = 0, lives = 3, spawnIn = 0.6, elapsed = 0, over = false, endTimer;

      const spawn = () => {
        const r = rand(0.55, 0.9);
        const geo = new THREE.IcosahedronGeometry(r, 0);
        const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: PALETTE3D[randInt(0, PALETTE3D.length - 1)], flatShading: true }));
        m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: INK })));
        // tx/ty: punto de la pantalla (a la distancia z=0) donde se ve la roca todo el rato.
        const tx = rand(-halfW + 0.9, halfW - 0.9), ty = rand(-halfH + 1.2, halfH - 1.2);
        m.position.set(tx * 51 / 6, ty * 51 / 6, -45);
        m.userData = { tx, ty, r, v: rand(9, 12) + elapsed * 0.35, spin: [rand(-2, 2), rand(-2, 2), rand(-2, 2)], dying: -1 };
        g.scene.add(m);
        rocks.push(m);
      };
      const hudUpd = () => setHud(hud, `${icon("check", 14)} ${score}`, `<span class="hearts">${icon("heart", 16).repeat(lives)}</span>`);

      // Acierto si el toque cae cerca de la proyección en pantalla de la roca.
      const onPointer = (e) => {
        if (over) return;
        const rect = g.renderer.domElement.getBoundingClientRect();
        const px = e.clientX - rect.left, py = e.clientY - rect.top;
        let best = null, bestD = Infinity;
        for (const m of rocks) {
          if (m.userData.dying >= 0) continue;
          const v = m.position.clone().project(cam);
          const sx = (v.x + 1) / 2 * rect.width, sy = (1 - v.y) / 2 * rect.height;
          const depth = cam.position.z - m.position.z;
          const rad = m.userData.r / (depth * Math.tan((FOV / 2) * Math.PI / 180)) * (rect.height / 2) + 12;
          const d = Math.hypot(px - sx, py - sy);
          if (d < rad && d < bestD) { best = m; bestD = d; }
        }
        if (best) { best.userData.dying = 0; best.material.color.set(0xffffff); score++; hudUpd(); }
      };

      g.update = (dt) => {
        elapsed += dt;
        if (!over && (spawnIn -= dt) <= 0) { spawn(); spawnIn = Math.max(0.32, 1.1 - elapsed * 0.022); }
        for (let i = rocks.length - 1; i >= 0; i--) {
          const m = rocks[i], u = m.userData;
          if (u.dying >= 0) {
            u.dying += dt;
            m.scale.setScalar(1 + u.dying * 6);
            m.material.opacity = 1 - u.dying * 4;
            m.material.transparent = true;
            if (u.dying > 0.25) { g.scene.remove(m); rocks.splice(i, 1); }
            continue;
          }
          m.position.z += u.v * dt;
          const k = (6 - m.position.z) / 6; // mantiene la roca en el mismo punto de la pantalla
          m.position.x = u.tx * k;
          m.position.y = u.ty * k;
          m.rotation.x += u.spin[0] * dt; m.rotation.y += u.spin[1] * dt; m.rotation.z += u.spin[2] * dt;
          if (m.position.z > 5.5) {
            g.scene.remove(m); rocks.splice(i, 1);
            if (over) continue;
            lives--;
            flash(stage, false);
            hudUpd();
            if (lives <= 0) { over = true; endTimer = setTimeout(() => finish(score), 700); }
          }
        }
      };

      hudUpd();
      g.loop();
      const unbind = bindInput(g.renderer.domElement, onPointer, {});
      return () => { clearTimeout(endTimer); unbind(); g.dispose(); };
    },
  },
);
