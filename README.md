# PlayNow

Minijuegos rápidos al estilo PlayUs, pero para jugar cuando quieras: sin grupo, sin cuentas y sin esperar al día siguiente.

- 14 minijuegos (Reflejos, Para el crono, Memoria, Diana, Toques locos, Torre, Cálculo rápido, ¿Qué color?, El distinto, Del 1 al 16, Topos, Flechas, Cuenta rápida, Casillas)
- Cada resultado se convierte en 0–1000 puntos
- **Reto exprés**: 3 juegos aleatorios seguidos, máximo 3000 puntos, con botón de compartir
- Récords e historial en `localStorage` (solo en el dispositivo)

Web estática sin build: `index.html`, `style.css`, `games.js`, `app.js`.

```sh
python3 -m http.server 8000   # http://localhost:8000
```

Para añadir un minijuego, añade un objeto a `GAMES` en `games.js` con `id`, `code`, `cat`, `color`, `name`, `emoji`, `desc`, `format`, `points` y `start(stage, finish)`.
