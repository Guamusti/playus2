# PlayNow

Minijuegos rápidos al estilo PlayUs, pero para jugar cuando quieras: sin grupo, sin cuentas y sin esperar al día siguiente.

- 30 minijuegos (6 en 3D). Ver la portada o los ficheros `games*.js`
- Iconos SVG propios en `icons.js` (sin emojis)
- Los juegos 3D usan Three.js (r128, cdnjs), que se descarga solo al abrir uno
- Cada resultado se convierte en 0–1000 puntos
- **Reto exprés**: 3 juegos aleatorios seguidos, máximo 3000 puntos, con botón de compartir
- Récords e historial en `localStorage` (solo en el dispositivo)

Web estática sin build:

- `games.js`: juegos de interfaz originales
- `games-arcade.js`: arcade en canvas 2D (Aleteo, Rebote, Atrapa, Corta, Serpiente)
- `games-quick.js`: rápidos de mente/memoria (En la zona, ¿Verdad o mentira?, Recuerda el número, Anagramas, Suma 10)
- `games3d.js` y `games3d-more.js`: 3D con Three.js (Torre, Carril, Meteoritos, Espiral, Penaltis, Salto)
- `icons.js`, `app.js`, `style.css`, `index.html`

```sh
python3 -m http.server 8000   # http://localhost:8000
```

Para añadir un minijuego, añade un objeto a `GAMES` en `games.js` con `id`, `code`, `cat`, `color`, `name`, `icon`, `desc`, `format`, `points` y `start(stage, finish)`.

Los juegos 3D van en `games3d.js` con `is3d: true`; `setup3D()` y `boldBox()` montan la escena con el estilo de bloques.
