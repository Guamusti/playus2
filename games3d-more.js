// Más juegos 3D: Espiral, Penaltis y Salto. Usa los helpers de games3d.js.

// Mensaje grande superpuesto al canvas ("¡GOL!", "¡Centro!"…).
function overlayMsg(stage) {
  const m = el("div", { className: "three-msg" });
  stage.append(m);
  let timer;
  return (text, ms = 800) => {
    m.textContent = text;
    m.classList.remove("show"); void m.offsetWidth; m.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(() => m.classList.remove("show"), ms);
  };
}

GAMES.push(
  {
    id: "espiral", code: "HLX", cat: "Arcade", color: "#ff5a36", is3d: true,
    name: "Espiral 3D", icon: "helix",
    desc: "Arrastra para girar la torre y que la bola caiga por los huecos. Las zonas rojas te eliminan.",
    format: (n) => `${n} pisos`,
    points: (n) => clamp(n * 40),
    start(stage, finish) {
      const g = setup3D(stage);
      const hud = hudEl();
      stage.append(hud);
      const cam = new THREE.PerspectiveCamera(50, g.W / g.H, 0.1, 100);
      g.camera = cam;
      const SEG = 12, SEG_A = (Math.PI * 2) / SEG, GAP_Y = 3, RING_R = 2.6, THICK = 0.35, BALL_R = 0.3, BALL_Z = 1.9;
      const NORMALS = [0xffd84d, 0x8ff0c4, 0xa9c8ff, 0xc9b6ff];
      const DANGER = 0xff3b30;

      const tower = new THREE.Group();
      g.scene.add(tower);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 600, 20), new THREE.MeshLambertMaterial({ color: 0x14213d }));
      pole.position.y = -290;
      tower.add(pole);

      const levels = {};
      let built = 0;
      const makeLevel = (i) => {
        const grp = new THREE.Group();
        grp.position.y = -i * GAP_Y;
        const kinds = Array(SEG).fill(0); // 0 normal, 1 hueco, 2 peligro
        const gapLen = i < 6 ? 3 : 2;
        const gapAt = randInt(3, SEG - 3 - gapLen); // el primer piso nunca tiene hueco bajo la bola
        for (let k = 0; k < gapLen; k++) kinds[(gapAt + k) % SEG] = 1;
        let reds = i === 0 ? 0 : Math.min(4, 1 + Math.floor(i / 5));
        while (reds > 0) { const k = randInt(0, SEG - 1); if (kinds[k] === 0) { kinds[k] = 2; reds--; } }
        kinds.forEach((kind, k) => {
          if (kind === 1) return;
          const geo = new THREE.CylinderGeometry(RING_R, RING_R, THICK, 4, 1, false, k * SEG_A, SEG_A);
          const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: kind === 2 ? DANGER : NORMALS[i % NORMALS.length] }));
          m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: INK })));
          grp.add(m);
        });
        tower.add(grp);
        levels[i] = { grp, kinds };
      };

      const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 20, 14), new THREE.MeshLambertMaterial({ color: 0x2f6bff }));
      ball.position.set(0, 1.5, BALL_Z);
      g.scene.add(ball);

      let cur = 0, score = 0, vy = 0, over = false, camY = 1.5, keyDir = 0, squash = 0, endTimer;
      const ensureLevels = () => {
        while (built < cur + 8) makeLevel(built++);
        for (const k of Object.keys(levels)) {
          if (+k < cur - 2) { tower.remove(levels[k].grp); levels[k].grp.traverse((o) => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); delete levels[k]; }
        }
      };
      ensureLevels();
      setHud(hud, "0 pisos", "");

      g.update = (dt) => {
        tower.rotation.y += keyDir * 3.2 * dt;
        if (!over) {
          vy -= 24 * dt;
          ball.position.y += vy * dt;
          const top = -cur * GAP_Y + THICK / 2;
          if (ball.position.y - BALL_R <= top && vy < 0) {
            // Ángulo de la bola en coordenadas locales de la torre.
            const local = (((-tower.rotation.y) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const kind = levels[cur].kinds[Math.floor(local / SEG_A) % SEG];
            if (kind === 1) {
              cur++; score++;
              setHud(hud, `${score} pisos`, "");
              ensureLevels();
            } else if (kind === 2) {
              over = true;
              ball.material.color.set(DANGER);
              flash(stage, false);
              endTimer = setTimeout(() => finish(score), 900);
            } else {
              ball.position.y = top + BALL_R;
              vy = 8;
              squash = 1;
            }
          }
        }
        squash = Math.max(0, squash - dt * 6);
        ball.scale.set(1 + squash * 0.25, 1 - squash * 0.3, 1 + squash * 0.25);
        camY = Math.min(camY, ball.position.y);
        cam.position.set(0, camY + 4.8, 9.5);
        cam.lookAt(0, camY - 1.2, 0);
      };

      const canvas = g.renderer.domElement;
      let lastX = null;
      canvas.addEventListener("pointerdown", (e) => { lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener("pointermove", (e) => {
        if (lastX === null) return;
        tower.rotation.y += (e.clientX - lastX) * 0.013;
        lastX = e.clientX;
      });
      const release = () => { lastX = null; };
      canvas.addEventListener("pointerup", release);
      canvas.addEventListener("pointercancel", release);
      const onKey = (e) => {
        const d = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
        if (!d) return;
        e.preventDefault();
        keyDir = e.type === "keydown" ? d : 0;
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);
      g.loop();
      return () => {
        clearTimeout(endTimer);
        window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey);
        g.dispose();
      };
    },
  },

  {
    id: "penaltis", code: "PEN", cat: "Precisión", color: "#00a676", is3d: true,
    name: "Penaltis 3D", icon: "goal",
    desc: "Toca la portería donde quieras chutar. El portero intenta adivinarlo. 10 tiros.",
    format: (n) => `${n}/10 goles`,
    points: (n) => clamp(n * 100),
    start(stage, finish) {
      const g = setup3D(stage);
      const hud = hudEl();
      stage.append(hud);
      const say = overlayMsg(stage);
      const cam = new THREE.PerspectiveCamera(38, g.W / g.H, 0.1, 200);
      cam.position.set(0, 1.7, 5);
      cam.lookAt(0, 0.9, -12);
      g.camera = cam;
      const GW = 6.4, GH = 2.3, Z = -12;

      const grass = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: 0x8ff0c4 }));
      grass.rotation.x = -Math.PI / 2;
      grass.position.z = -10;
      g.scene.add(grass);
      for (let i = 0; i < 8; i++) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(80, 2.5), new THREE.MeshLambertMaterial({ color: 0x7fe6b6 }));
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, 0.005, 4 - i * 5);
        g.scene.add(stripe);
      }
      const line = boldBox(GW + 8, 0.02, 0.08, 0xffffff);
      line.position.set(0, 0.01, Z);
      g.scene.add(line);
      for (const x of [-GW / 2, GW / 2]) {
        const post = boldBox(0.16, GH, 0.16, 0xffffff);
        post.position.set(x, GH / 2, Z);
        g.scene.add(post);
      }
      const bar = boldBox(GW + 0.16, 0.16, 0.16, 0xffffff);
      bar.position.set(0, GH, Z);
      g.scene.add(bar);
      // Red: panel trasero con cuadrícula.
      const netPts = [];
      for (let x = -GW / 2; x <= GW / 2 + 0.01; x += 0.4) netPts.push(x, 0, Z - 1.2, x, GH, Z - 1.2);
      for (let y = 0; y <= GH + 0.01; y += 0.4) netPts.push(-GW / 2, y, Z - 1.2, GW / 2, y, Z - 1.2);
      const netGeo = new THREE.BufferGeometry();
      netGeo.setAttribute("position", new THREE.Float32BufferAttribute(netPts, 3));
      g.scene.add(new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: 0x9a948a })));
      const spot = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      spot.rotation.x = -Math.PI / 2;
      spot.position.set(0, 0.01, 0);
      g.scene.add(spot);

      const keeper = new THREE.Group();
      const body = boldBox(0.9, 1.5, 0.35, 0x14213d);
      body.position.y = 0.95;
      const head = boldBox(0.42, 0.42, 0.42, 0xffd84d);
      head.position.y = 1.95;
      const arms = boldBox(1.7, 0.22, 0.25, 0xff5a36);
      arms.position.y = 1.5;
      keeper.add(body, head, arms);
      keeper.position.set(0, 0, Z + 0.3);
      g.scene.add(keeper);

      const ballGeo = new THREE.IcosahedronGeometry(0.22, 1);
      const ball = new THREE.Mesh(ballGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
      ball.add(new THREE.LineSegments(new THREE.EdgesGeometry(ballGeo), new THREE.LineBasicMaterial({ color: INK })));
      g.scene.add(ball);

      let shot = 0, goals = 0, state = "aim", t = 0, flight = null, keeperGoal = 0, kSpeed = rand(1.2, 2.2), kPhase = 0, timer;
      const resetShot = () => {
        state = "aim";
        ball.position.set(0, 0.22, 0);
        ball.rotation.set(0, 0, 0);
        keeper.rotation.z = 0;
        keeper.position.y = 0;
        kSpeed = rand(1.2, 2.4);
        setHud(hud, `Tiro ${shot + 1}/10`, `${goals} goles`);
      };
      resetShot();

      const ray = new THREE.Raycaster();
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -Z);
      g.renderer.domElement.addEventListener("pointerdown", (e) => {
        if (state !== "aim") return;
        const r = g.renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, cam);
        const hit = new THREE.Vector3();
        if (!ray.ray.intersectPlane(plane, hit)) return;
        const target = new THREE.Vector3(hit.x, Math.max(0.22, hit.y), Z);
        const wide = Math.abs(target.x) > GW / 2 - 0.1 || target.y > GH - 0.1;
        // El portero adivina con error y se lanza tras un pequeño retraso.
        keeperGoal = Math.max(-GW / 2 + 0.5, Math.min(GW / 2 - 0.5, target.x + rand(-1.7, 1.7)));
        flight = { from: ball.position.clone(), to: wide ? target.clone().setZ(Z - 2) : target, wide, dur: 0.55 };
        state = "fly"; t = 0;
      });

      g.update = (dt) => {
        kPhase += dt * kSpeed;
        if (state === "aim") {
          keeper.position.x = Math.sin(kPhase) * 1.5;
        } else if (state === "fly") {
          t += dt;
          const k = Math.min(1, t / flight.dur);
          ball.position.lerpVectors(flight.from, flight.to, k);
          ball.position.y += Math.sin(Math.PI * k) * 0.5;
          ball.rotation.x -= dt * 14;
          if (t > 0.12) {
            const dx = keeperGoal - keeper.position.x;
            keeper.position.x += Math.sign(dx) * Math.min(Math.abs(dx), 6.5 * dt);
            if (Math.abs(dx) > 0.6) keeper.rotation.z = -Math.sign(dx) * Math.min(1.1, (t - 0.12) * 5);
            if (flight.to.y > 1.6) keeper.position.y = Math.min(0.45, (t - 0.12) * 2);
          }
          if (k >= 1) {
            const reach = Math.abs(keeper.rotation.z) > 0.5 ? 1.05 : 0.8;
            const saved = !flight.wide && Math.abs(keeper.position.x - flight.to.x) < reach && flight.to.y < 2.0 + keeper.position.y;
            let text;
            if (flight.wide) text = "¡Fuera!";
            else if (saved) text = "¡Parada!";
            else { text = "¡GOL!"; goals++; }
            flash(stage, text === "¡GOL!");
            say(text, 900);
            shot++;
            state = "result";
            setHud(hud, `Tiro ${Math.min(shot + 1, 10)}/10`, `${goals} goles`);
            timer = setTimeout(() => (shot >= 10 ? finish(goals) : resetShot()), 1100);
          }
        }
      };
      g.loop();
      return () => { clearTimeout(timer); g.dispose(); };
    },
  },

  {
    id: "salto", code: "JMP", cat: "Precisión", color: "#ffb000", is3d: true,
    name: "Salto 3D", icon: "jump",
    desc: "Mantén pulsado para cargar el salto y suelta para caer en la siguiente plataforma.",
    format: (n) => `${n} saltos`,
    points: (n) => clamp(n * 50),
    start(stage, finish) {
      const g = setup3D(stage);
      const hud = hudEl();
      stage.append(hud);
      const say = overlayMsg(stage);
      const VIEW = 9, aspect = g.W / g.H;
      const cam = new THREE.OrthographicCamera(-VIEW * aspect / 2, VIEW * aspect / 2, VIEW / 2, -VIEW / 2, 0.1, 200);
      g.camera = cam;
      const focus = new THREE.Vector3();
      const focusTarget = new THREE.Vector3();

      const makePlat = (x, z, s, color) => {
        const m = boldBox(s, 1, s, color);
        m.position.set(x, -0.5, z);
        g.scene.add(m);
        return { x, z, s, m };
      };
      let cur = makePlat(0, 0, 1.8, 0x14213d);
      let next;
      const newNext = () => {
        const alongX = Math.random() < 0.5;
        const d = rand(2.1, 4.3), s = rand(1.05, 1.8);
        next = makePlat(cur.x + (alongX ? d : 0), cur.z - (alongX ? 0 : d), s, PALETTE3D[randInt(0, PALETTE3D.length - 1)]);
        focusTarget.set((cur.x + next.x) / 2, 0, (cur.z + next.z) / 2);
      };
      newNext();
      focus.copy(focusTarget);

      const player = new THREE.Group();
      const body = boldBox(0.45, 0.8, 0.45, 0xffd84d);
      body.position.y = 0.4;
      player.add(body);
      g.scene.add(player);

      let state = "idle", charge = 0, t = 0, jump = null, score = 0, endTimer;
      const placeCam = () => { cam.position.set(focus.x + 8, 10, focus.z + 8); cam.lookAt(focus.x, 0, focus.z); };
      setHud(hud, "0 saltos", "");

      const press = () => { if (state === "idle") { state = "charge"; charge = 0; } };
      const releaseJump = () => {
        if (state !== "charge") return;
        const dist = Math.min(1.35, charge) * 4.4;
        const dir = new THREE.Vector3(next.x - player.position.x, 0, next.z - player.position.z).normalize();
        jump = { from: player.position.clone(), to: player.position.clone().addScaledVector(dir, dist), axis: new THREE.Vector3(dir.z, 0, -dir.x) };
        state = "jump"; t = 0;
        body.scale.y = 1; body.position.y = 0.4;
      };
      const on = (p) => Math.abs(player.position.x - p.x) <= p.s / 2 && Math.abs(player.position.z - p.z) <= p.s / 2;

      g.update = (dt) => {
        if (state === "charge") {
          charge += dt;
          const c = Math.min(1.35, charge);
          body.scale.y = 1 - c * 0.35;
          body.position.y = 0.4 * body.scale.y;
          cur.m.scale.y = 1 - c * 0.12;
        } else if (state === "jump") {
          t += dt;
          const k = Math.min(1, t / 0.5);
          cur.m.scale.y = 1;
          player.position.lerpVectors(jump.from, jump.to, k);
          player.position.y = Math.sin(Math.PI * k) * 1.8;
          player.setRotationFromAxisAngle(jump.axis, -k * Math.PI * 2);
          if (k >= 1) {
            player.rotation.set(0, 0, 0);
            player.position.y = 0;
            if (on(next)) {
              const centre = Math.hypot(player.position.x - next.x, player.position.z - next.z) < 0.22;
              score++;
              if (centre) say("¡Centro!", 600);
              setHud(hud, `${score} saltos`, "");
              cur = next;
              newNext();
              state = "idle";
            } else if (on(cur)) state = "idle";
            else {
              state = "fall";
              flash(stage, false);
              endTimer = setTimeout(() => finish(score), 900);
            }
          }
        } else if (state === "fall") {
          player.position.y -= dt * 5;
          player.rotation.x += dt * 3;
        }
        focus.lerp(focusTarget, Math.min(1, dt * 3));
        placeCam();
      };
      const canvas = g.renderer.domElement;
      canvas.addEventListener("pointerdown", press);
      window.addEventListener("pointerup", releaseJump);
      window.addEventListener("pointercancel", releaseJump);
      const onKey = (e) => {
        if (e.key !== " ") return;
        e.preventDefault();
        if (e.type === "keydown" && !e.repeat) press();
        if (e.type === "keyup") releaseJump();
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);
      placeCam();
      g.loop();
      return () => {
        clearTimeout(endTimer);
        window.removeEventListener("pointerup", releaseJump); window.removeEventListener("pointercancel", releaseJump);
        window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey);
        g.dispose();
      };
    },
  },
);
