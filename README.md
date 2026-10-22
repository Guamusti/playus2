# PlayNow

Minijuegos rápidos al estilo PlayUs, pero para jugar cuando quieras: sin grupo, sin cuentas y sin esperar al día siguiente.

- 17 minijuegos: Reflejos, Para el crono, Memoria, Diana, Toques locos, Cálculo rápido, ¿Qué color?, El distinto, Del 1 al 16, Topos, Flechas, Cuenta rápida, Casillas, Parejas y tres en 3D (Torre 3D, Carril 3D, Meteoritos)
- Iconos SVG propios en `icons.js` (sin emojis)
- Los juegos 3D usan Three.js (r128, cdnjs), que se descarga solo al abrir uno
- Cada resultado se convierte en 0–1000 puntos
- **Reto exprés**: 3 juegos aleatorios seguidos, máximo 3000 puntos, con botón de compartir
- Récords e historial en `localStorage` (solo en el dispositivo)

Web estática sin build: `index.html`, `style.css`, `icons.js`, `games.js`, `games3d.js`, `app.js`.

```sh
python3 -m http.server 8000   # http://localhost:8000
```

Para añadir un minijuego, añade un objeto a `GAMES` en `games.js` con `id`, `code`, `cat`, `color`, `name`, `icon`, `desc`, `format`, `points` y `start(stage, finish)`.

Los juegos 3D van en `games3d.js` con `is3d: true`; `setup3D()` y `boldBox()` montan la escena con el estilo de bloques.
