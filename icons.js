// Iconos SVG de trazo (24×24, currentColor). icon(nombre, tamaño) devuelve el markup.

const ICONS = {
  // Juegos
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  stopwatch: '<circle cx="12" cy="14" r="8"/><path d="M12 10v4l2.5 2M10 2h4M12 2v4"/>',
  simon: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  tap: '<circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="7"/><path d="M12 1v2M12 21v2M1 12h2M21 12h2"/>',
  tower: '<path d="M12 2 3 6.5 12 11l9-4.5z"/><path d="m3 11.5 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18.5h8"/>',
  drop: '<path d="M12 2.5s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 9.5 12 2.5 12 2.5z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  mole: '<path d="M3 20h18"/><path d="M6 20v-6a6 6 0 0 1 12 0v6"/><circle cx="10" cy="13" r=".8" fill="currentColor"/><circle cx="14" cy="13" r=".8" fill="currentColor"/><path d="M11 16h2"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  dots: '<circle cx="7" cy="8" r="2"/><circle cx="16" cy="6" r="2"/><circle cx="12" cy="14" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="17" r="2"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  cards: '<rect x="3" y="6" width="11" height="15" rx="2"/><path d="M10 3h9a2 2 0 0 1 2 2v12"/>',
  road: '<path d="M8 3 4 21M16 3l4 18M12 4v3M12 11v3M12 18v3"/>',
  meteor: '<circle cx="15" cy="15" r="5"/><path d="M3 3l7 7M8 2l4 4M2 8l4 4"/>',
  cube: '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
  bird: '<path d="M3 13c2-5 8-7 12-4l5-2-1.5 4.5C18 16 14.5 19 10 19c-3 0-5.5-1.5-7-6z"/><circle cx="14.5" cy="10.5" r=".9" fill="currentColor"/><path d="M8 13.5l3.5 1.5"/>',
  bricks: '<rect x="3" y="4" width="8" height="4" rx="1"/><rect x="13" y="4" width="8" height="4" rx="1"/><rect x="8" y="10" width="8" height="4" rx="1"/><path d="M8 20h8"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/>',
  basket: '<path d="M3 10h18l-2 10H5z"/><path d="M8 10l3-6M16 10l-3-6M9 14v3M15 14v3M12 14v3"/>',
  slice: '<path d="M11 3.1a9 9 0 0 0 0 17.8z"/><path d="M14 3.5a9 9 0 0 1 0 17"/><path d="M3 21 21 3"/>',
  snake: '<path d="M4 18h9a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h9"/><circle cx="18" cy="6" r="1.6" fill="currentColor"/>',
  zone: '<rect x="2" y="9" width="20" height="6" rx="2"/><path d="M10 9v6M14 9v6M12 3v4M12 17v4"/>',
  truefalse: '<path d="m2.5 12 3 3 5-6"/><path d="m14 8.5 7 7M21 8.5l-7 7"/>',
  digits: '<path d="M4 8l2-1.5V18M10 9a2.5 2.5 0 0 1 4.5 1.5L10 18h5M17.5 6.5H21l-2.5 4a2.5 2.5 0 1 1-1.5 4.5"/>',
  letters: '<path d="M3 19 7 6l4 13M4.3 15h5.4"/><path d="M14 6h3.5a3 3 0 0 1 0 6H14zM14 12h4a3.5 3.5 0 0 1 0 7h-4z"/>',
  sum: '<path d="M3 12h6M6 9v6M13 7.5l2.5-1.5V18"/><rect x="18" y="6" width="4" height="12" rx="2"/>',
  helix: '<ellipse cx="12" cy="6" rx="8" ry="2.5"/><ellipse cx="12" cy="12" rx="8" ry="2.5"/><ellipse cx="12" cy="18" rx="8" ry="2.5"/><path d="M12 3.5v17"/>',
  goal: '<path d="M2 19V5h20v14"/><path d="M2 9.5h20M7 5v4.5M12 5v4.5M17 5v4.5"/><circle cx="12" cy="16" r="2.5"/>',
  jump: '<path d="M2 20h7M15 20h7"/><path d="M5.5 16C7 8 14 6 18.5 13"/><path d="m18.5 13 .5-3.5M18.5 13l-3.5-.5"/>',
  // Interfaz
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor"/>',
  heart: '<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" fill="currentColor"/>',
  arrowUR: '<path d="M7 17 17 7M8 7h9v9"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowUp: '<path d="M12 20V4M5 11l7-7 7 7"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  shuffle: '<path d="M3 7h3c5 0 7 10 12 10h3M3 17h3c2 0 3.5-1.6 4.8-3.6M14 7.6c1-.4 2.5-.6 4-.6h3M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="16" cy="16" r="1.3" fill="currentColor"/>',
  share: '<path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
};

function icon(name, size = 18, extra = "") {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICONS[name] || ""}</svg>`;
}

// Ilustraciones a color para el juego de los topos.
const MOLE_SVG = `<svg viewBox="0 0 48 48" width="70%" height="70%" aria-hidden="true"><ellipse cx="24" cy="27" rx="15" ry="16" fill="#8a5a3b" stroke="#121212" stroke-width="2.5"/><ellipse cx="24" cy="33" rx="8" ry="5.5" fill="#f3c9a8" stroke="#121212" stroke-width="2"/><circle cx="18" cy="23" r="2.4" fill="#121212"/><circle cx="30" cy="23" r="2.4" fill="#121212"/><ellipse cx="24" cy="30" rx="3.2" ry="2.2" fill="#ff5a36" stroke="#121212" stroke-width="1.5"/></svg>`;
const BOMB_SVG = `<svg viewBox="0 0 48 48" width="70%" height="70%" aria-hidden="true"><circle cx="22" cy="28" r="14" fill="#121212"/><path d="M31 17l5-5" stroke="#121212" stroke-width="4"/><path d="M37 9l3-3M39 13h4M36 5V2" stroke="#ff5a36" stroke-width="2.5" stroke-linecap="round"/><circle cx="17" cy="23" r="3" fill="#fff" opacity=".45"/></svg>`;
