/* =====================================================
   PRODUCT MOCKUP IMAGE GENERATOR

   Har product ke liye real vector mockup SVG banata hai.
   Output: ../frontend/public/products/<id>-front.svg
           ../frontend/public/products/<id>-back.svg

   Run: node generateProductImages.js
===================================================== */

const fs = require("fs");
const path = require("path");

const OUT = path.join(
  __dirname,
  "..",
  "frontend",
  "public",
  "products"
);

/* ---------- helpers ---------- */

const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f7fb"/>
      <stop offset="1" stop-color="#e4eaf2"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e8ecf1"/>
      <stop offset=".5" stop-color="#f8fafc"/>
      <stop offset="1" stop-color="#c9d1dc"/>
    </linearGradient>
  </defs>
  <rect width="600" height="500" fill="url(#bg)"/>
  <ellipse cx="300" cy="432" rx="215" ry="26" fill="#000" opacity="0.1"/>
  ${inner}
</svg>`;

const lines = (x, y, w, n, gap, c = "#c8d2de", h = 5) =>
  Array.from({ length: n })
    .map(
      (_, i) =>
        `<rect x="${x}" y="${y + i * gap}" width="${w * (1 - i * 0.08)}" height="${h}" rx="${h / 2}" fill="${c}"/>`
    )
    .join("");

const brand = (x, y, s = 1, c = "#1d3252") =>
  `<circle cx="${x}" cy="${y}" r="${14 * s}" fill="none" stroke="${c}" stroke-width="${3 * s}"/>
   <text x="${x}" y="${y + 5 * s}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${14 * s}" fill="${c}">A</text>`;

/* ---------- templates ---------- */

const T = {
  /* --- business card --- */
  card: (v) => `
    <g transform="rotate(-6 300 250)">
      <rect x="135" y="160" width="330" height="190" rx="10" fill="${v.dark}"/>
      <rect x="135" y="160" width="330" height="190" rx="10" fill="none" stroke="#00000022"/>
      <rect x="135" y="160" width="8" height="190" fill="${v.accent}"/>
      ${brand(200, 220, 1.1, "#ffffff")}
      <rect x="240" y="200" width="150" height="12" rx="3" fill="#ffffff" opacity=".9"/>
      <rect x="240" y="222" width="100" height="8" rx="3" fill="#ffffff" opacity=".6"/>
      ${lines(175, 285, 250, 4, 16, "#ffffff", 5)}
      <rect x="175" y="285" width="250" height="70" fill="none"/>
    </g>`,
  cardBack: (v) => `
    <g transform="rotate(-6 300 250)">
      <rect x="135" y="160" width="330" height="190" rx="10" fill="${v.accent}"/>
      <rect x="135" y="160" width="330" height="190" rx="10" fill="none" stroke="#00000022"/>
      ${brand(300, 235, 1.6, "#ffffff")}
      <rect x="230" y="285" width="140" height="9" rx="3" fill="#ffffff" opacity=".85"/>
    </g>`,

  /* --- letterhead --- stacked A4 sheets, corporate header */
  letterhead: (v) => `
    <defs>
      <linearGradient id="lhHdr" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${v.accent}"/>
        <stop offset="1" stop-color="#0f2038"/>
      </linearGradient>
    </defs>
    <g transform="rotate(-4 300 230)">
      <rect x="195" y="72" width="230" height="330" rx="4" fill="#e7ecf3" stroke="#d5dce6"/>
    </g>
    <g transform="rotate(-1.5 300 230)">
      <rect x="190" y="66" width="230" height="330" rx="4" fill="#f2f5f9" stroke="#d8dfe8"/>
    </g>
    <rect x="185" y="60" width="230" height="330" rx="4" fill="#ffffff" stroke="#d3dae4" filter="drop-shadow(0 4px 8px rgba(15,32,56,.12))"/>
    <path d="M185 60 L415 60 L415 112 L185 112 Z" fill="url(#lhHdr)"/>
    <path d="M185 112 L415 112 L405 118 L195 118 Z" fill="#c9a24b" opacity=".9"/>
    <circle cx="214" cy="86" r="14" fill="#ffffff" opacity=".14"/>
    <circle cx="214" cy="86" r="10" fill="none" stroke="#ffffff" stroke-width="2.4"/>
    <text x="214" y="90" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="11" fill="#ffffff">A</text>
    <rect x="238" y="74" width="105" height="9" rx="3" fill="#ffffff"/>
    <rect x="238" y="89" width="72" height="6" rx="3" fill="#ffffff" opacity=".6"/>
    <rect x="345" y="74" width="56" height="4.5" rx="2" fill="#ffffff" opacity=".55"/>
    <rect x="345" y="84" width="56" height="4.5" rx="2" fill="#ffffff" opacity=".45"/>
    <rect x="345" y="94" width="40" height="4.5" rx="2" fill="#ffffff" opacity=".45"/>
    ${lines(215, 150, 170, 8, 27)}
    <rect x="215" y="368" width="170" height="1.6" fill="#dfe5ec"/>
    <rect x="215" y="376" width="52" height="4" rx="2" fill="${v.accent}"/>
    <rect x="275" y="376" width="52" height="4" rx="2" fill="#c8d2de"/>
    <rect x="335" y="376" width="52" height="4" rx="2" fill="#c8d2de"/>`,
  letterheadBack: (v) => `
    <g transform="rotate(2 300 230)">
      <rect x="195" y="72" width="230" height="330" rx="4" fill="#e7ecf3" stroke="#d5dce6"/>
    </g>
    <rect x="185" y="60" width="230" height="330" rx="4" fill="#f7f9fc" stroke="#d3dae4" filter="drop-shadow(0 4px 8px rgba(15,32,56,.1))"/>
    <rect x="185" y="60" width="230" height="6" fill="${v.accent}"/>
    ${brand(300, 218, 1.5, v.accent)}
    <rect x="240" y="252" width="120" height="9" rx="3" fill="${v.accent}" opacity=".8"/>
    <rect x="262" y="268" width="76" height="6" rx="3" fill="#94a3b8"/>
    <rect x="250" y="360" width="100" height="1.6" fill="#dfe5ec"/>`,

  /* --- spiral notebook --- coil rings, elastic band, depth */
  notebook: (v) => `
    <defs>
      <linearGradient id="nbCover" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${v.dark}"/>
        <stop offset="1" stop-color="#0d1826"/>
      </linearGradient>
    </defs>
    <rect x="222" y="86" width="235" height="330" rx="8" fill="#e9edf3" stroke="#d5dce6"/>
    <rect x="218" y="80" width="235" height="330" rx="8" fill="#ffffff" stroke="#dde3ea"/>
    <rect x="208" y="70" width="235" height="330" rx="8" fill="url(#nbCover)" stroke="#00000033" filter="drop-shadow(0 5px 10px rgba(15,32,56,.18))"/>
    <rect x="208" y="70" width="235" height="330" rx="8" fill="none" stroke="#ffffff" opacity=".06"/>
    <rect x="208" y="70" width="7" height="330" fill="${v.accent}"/>
    <rect x="418" y="70" width="10" height="330" fill="${v.accent}" opacity=".28"/>
    ${Array.from({ length: 13 })
      .map(
        (_, i) =>
          `<circle cx="206" cy="${86 + i * 24}" r="4.4" fill="#00000033"/><path d="M206 ${86 + i * 24} a7.5 7.5 0 1 1 -0.01 0" fill="none" stroke="url(#metal)" stroke-width="4.6"/>`
      )
      .join("")}
    <circle cx="320" cy="162" r="26" fill="none" stroke="${v.txt}" stroke-width="1.4" opacity=".35"/>
    ${brand(320, 162, 1.35, v.txt)}
    <rect x="255" y="208" width="130" height="11" rx="3" fill="${v.txt}" opacity=".9"/>
    <rect x="277" y="228" width="86" height="7" rx="3" fill="${v.txt}" opacity=".5"/>
    <rect x="233" y="330" width="174" height="2.5" fill="${v.accent}"/>
    <rect x="250" y="344" width="140" height="7" rx="3" fill="${v.txt}" opacity=".38"/>`,
  notebookBack: (v) => `
    <rect x="218" y="80" width="235" height="330" rx="8" fill="#ffffff" stroke="#dde3ea"/>
    <rect x="208" y="70" width="235" height="330" rx="8" fill="${v.dark}" stroke="#00000033" filter="drop-shadow(0 5px 10px rgba(15,32,56,.18))"/>
    ${Array.from({ length: 13 })
      .map(
        (_, i) =>
          `<circle cx="206" cy="${86 + i * 24}" r="4.4" fill="#00000033"/><path d="M206 ${86 + i * 24} a7.5 7.5 0 1 1 -0.01 0" fill="none" stroke="url(#metal)" stroke-width="4.6"/>`
      )
      .join("")}
    <rect x="240" y="330" width="160" height="46" rx="6" fill="#ffffff" opacity=".08"/>
    ${brand(300, 340, 0.9, v.txt)}
    <rect x="262" y="358" width="76" height="6" rx="3" fill="${v.txt}" opacity=".5"/>`,

  /* --- envelope --- DL envelope, folded flap, stamp, postmark */
  envelope: (v) => `
    <defs>
      <linearGradient id="envBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset="1" stop-color="#eef2f7"/>
      </linearGradient>
    </defs>
    <rect x="140" y="170" width="320" height="180" rx="9" fill="url(#envBody)" stroke="#d3dae4" filter="drop-shadow(0 5px 10px rgba(15,32,56,.14))"/>
    <path d="M141 262 L284 344 L141 344 Z" fill="#00000005"/>
    <path d="M459 262 L316 344 L459 344 Z" fill="#00000005"/>
    <path d="M140 178 L300 272 L460 178" fill="none" stroke="#dde4ec" stroke-width="2.4"/>
    <path d="M140 178 L300 272 L460 178 L460 170 L140 170 Z" fill="${v.accent}" opacity=".1"/>
    <rect x="160" y="192" width="26" height="26" rx="5" fill="${v.accent}"/>
    <text x="173" y="210" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="14" fill="#ffffff">A</text>
    <rect x="196" y="196" width="88" height="8" rx="3" fill="#1d3252"/>
    <rect x="196" y="210" width="62" height="5.5" rx="2.5" fill="#94a3b8"/>
    <rect x="236" y="288" width="128" height="6" rx="3" fill="#5b6472"/>
    <rect x="236" y="302" width="104" height="6" rx="3" fill="#94a3b8"/>
    <rect x="236" y="316" width="76" height="6" rx="3" fill="#94a3b8"/>
    <rect x="404" y="188" width="38" height="44" fill="#f7f9fc" stroke="#c9d2de" stroke-dasharray="4 3"/>
    <rect x="410" y="196" width="26" height="28" fill="${v.accent}" opacity=".2"/>
    <circle cx="428" cy="222" r="17" fill="none" stroke="#94a3b8" stroke-width="1.6" opacity=".7"/>
    <path d="M414 218 q14 -6 28 0 M414 226 q14 6 28 0" stroke="#94a3b8" stroke-width="1.4" fill="none" opacity=".7"/>
    <rect x="160" y="330" width="90" height="5" rx="2.5" fill="${v.accent}"/>`,
  envelopeBack: (v) => `
    <rect x="140" y="170" width="320" height="180" rx="9" fill="#f7f9fc" stroke="#d3dae4" filter="drop-shadow(0 5px 10px rgba(15,32,56,.12))"/>
    <path d="M140 176 L300 92 L460 176 Z" fill="${v.accent}" opacity=".18" stroke="#d3dae4" stroke-width="2"/>
    <path d="M140 176 L300 92 L460 176" fill="none" stroke="#dde4ec" stroke-width="2.4"/>
    <path d="M141 262 L284 344 L141 344 Z" fill="#00000005"/>
    <path d="M459 262 L316 344 L459 344 Z" fill="#00000005"/>
    <path d="M140 350 L300 262 L460 350" fill="none" stroke="#dde4ec" stroke-width="2.4"/>
    ${brand(300, 150, 0.8, v.accent)}`,

  /* --- flyer --- */
  flyer: (v) => `
    <rect x="195" y="70" width="210" height="330" rx="6" fill="#ffffff" stroke="#d8dfe8"/>
    <rect x="195" y="70" width="210" height="120" fill="${v.accent}"/>
    ${brand(300, 130, 1.2, "#ffffff")}
    <rect x="215" y="210" width="150" height="12" rx="3" fill="#1d3252"/>
    ${lines(215, 238, 170, 5, 20)}
    <rect x="215" y="360" width="80" height="22" rx="11" fill="${v.accent}"/>`,
  flyerBack: (v) => `
    <rect x="195" y="70" width="210" height="330" rx="6" fill="#ffffff" stroke="#d8dfe8"/>
    ${lines(215, 100, 170, 8, 26)}
    <rect x="215" y="330" width="170" height="50" rx="6" fill="${v.accent}" opacity=".15"/>
    ${brand(300, 355, 0.8, v.accent)}`,

  /* --- brochure trifold --- */
  brochure: (v) => `
    <g transform="rotate(-4 300 250)">
      <rect x="140" y="150" width="106" height="210" rx="4" fill="#f1f4f9" stroke="#d8dfe8"/>
      <rect x="247" y="150" width="106" height="210" rx="4" fill="#ffffff" stroke="#d8dfe8"/>
      <rect x="354" y="150" width="106" height="210" rx="4" fill="${v.accent}" opacity=".9"/>
      ${brand(194, 200, 0.9, v.accent)}
      ${lines(160, 235, 75, 4, 18)}
      ${lines(267, 180, 70, 6, 26)}
      ${brand(407, 230, 1.0, "#ffffff")}
      <rect x="375" y="280" width="64" height="8" rx="3" fill="#ffffff" opacity=".8"/>
    </g>`,
  brochureBack: (v) => `
    <g transform="rotate(4 300 250)">
      <rect x="140" y="150" width="106" height="210" rx="4" fill="${v.accent}" opacity=".9"/>
      <rect x="247" y="150" width="106" height="210" rx="4" fill="#ffffff" stroke="#d8dfe8"/>
      <rect x="354" y="150" width="106" height="210" rx="4" fill="#f1f4f9" stroke="#d8dfe8"/>
      ${lines(160, 180, 70, 6, 26, "#ffffff")}
      ${lines(267, 180, 70, 6, 26)}
      ${brand(407, 250, 0.9, v.accent)}
    </g>`,

  /* --- poster --- */
  poster: (v) => `
    <rect x="180" y="50" width="240" height="360" rx="6" fill="#ffffff" stroke="#d8dfe8"/>
    <rect x="180" y="50" width="240" height="150" fill="${v.dark}"/>
    ${brand(300, 125, 1.4, "#ffffff")}
    <rect x="205" y="225" width="190" height="14" rx="3" fill="#1d3252"/>
    ${lines(205, 258, 190, 5, 22)}
    <rect x="205" y="380" width="95" height="24" rx="12" fill="${v.accent}"/>`,
  posterBack: (v) => `
    <rect x="180" y="50" width="240" height="360" rx="6" fill="${v.accent}" opacity=".92"/>
    ${brand(300, 200, 1.6, "#ffffff")}
    <rect x="220" y="255" width="160" height="12" rx="3" fill="#ffffff"/>
    ${lines(220, 285, 160, 3, 24, "#ffffff", 6)}`,

  /* --- die-cut label --- */
  label: (v) => `
    <rect x="170" y="150" width="260" height="160" rx="24" fill="#ffffff" stroke="#d8dfe8" stroke-width="2" stroke-dasharray="8 6"/>
    <rect x="182" y="162" width="236" height="136" rx="18" fill="${v.accent}" opacity=".12"/>
    ${brand(300, 215, 1.2, v.accent)}
    <rect x="235" y="255" width="130" height="9" rx="3" fill="#1d3252"/>
    <rect x="255" y="272" width="90" height="6" rx="3" fill="#94a3b8"/>`,
  labelBack: (v) => `
    <circle cx="300" cy="240" r="105" fill="#ffffff" stroke="#d8dfe8" stroke-width="2" stroke-dasharray="8 6"/>
    <circle cx="300" cy="240" r="88" fill="${v.accent}" opacity=".12"/>
    ${brand(300, 228, 1.1, v.accent)}
    <rect x="245" y="262" width="110" height="8" rx="3" fill="#1d3252"/>`,

  /* --- sticker (round, peeled corner) --- */
  sticker: (v) => `
    <circle cx="300" cy="240" r="110" fill="#ffffff" stroke="#d8dfe8" stroke-width="2"/>
    <circle cx="300" cy="240" r="95" fill="${v.accent}"/>
    ${brand(300, 225, 1.5, "#ffffff")}
    <rect x="240" y="272" width="120" height="9" rx="3" fill="#ffffff" opacity=".9"/>
    <path d="M388 160 a110 110 0 0 1 18 48 l-40 -20 z" fill="#dfe6ee"/>`,
  stickerBack: (v) => `
    <circle cx="300" cy="240" r="110" fill="#f4f6f9" stroke="#d8dfe8" stroke-width="2"/>
    <circle cx="300" cy="240" r="95" fill="#e7ecf3"/>
    <text x="300" y="245" text-anchor="middle" font-family="Arial" font-size="16" fill="#9aa5b3">ADHESIVE</text>`,

  /* --- paper bag --- */
  paperbag: (v) => `
    <path d="M190 160 Q300 140 410 160 L430 410 Q300 425 170 410 Z" fill="${v.kraft || "#c8a56b"}" stroke="#a5854e"/>
    <path d="M190 160 Q300 140 410 160 L412 180 Q300 162 188 180 Z" fill="#a5854e" opacity=".5"/>
    <path d="M240 165 Q245 120 275 120" fill="none" stroke="#8a6d3f" stroke-width="6"/>
    <path d="M360 165 Q355 120 325 120" fill="none" stroke="#8a6d3f" stroke-width="6"/>
    ${brand(300, 260, 1.4, "#5a4526")}
    <rect x="245" y="300" width="110" height="8" rx="3" fill="#5a4526" opacity=".7"/>`,
  paperbagBack: (v) => `
    <path d="M190 160 Q300 140 410 160 L430 410 Q300 425 170 410 Z" fill="#b8935a" stroke="#a5854e"/>
    <path d="M190 160 Q300 140 410 160 L412 180 Q300 162 188 180 Z" fill="#a5854e" opacity=".5"/>
    ${lines(240, 240, 120, 4, 26, "#8a6d3f")}`,

  /* --- shipping box --- */
  box: (v) => `
    <path d="M170 190 L300 140 L430 190 L430 360 L300 415 L170 360 Z" fill="${v.kraft || "#d2b48c"}" stroke="#b08d57"/>
    <path d="M170 190 L300 240 L430 190 L300 140 Z" fill="#c4a06a"/>
    <path d="M170 190 L300 240 L300 415 L170 360 Z" fill="#bfa070" opacity=".9"/>
    <path d="M285 150 L315 150 L315 385 L285 385 L285 150" fill="#e8dcc8" opacity=".85"/>
    ${brand(245, 300, 1.1, "#6b4f2a")}
    <rect x="200" y="330" width="90" height="7" rx="3" fill="#6b4f2a" opacity=".6"/>`,
  boxBack: (v) => `
    <path d="M170 190 L300 140 L430 190 L430 360 L300 415 L170 360 Z" fill="#c9ab7d" stroke="#b08d57"/>
    <path d="M170 190 L300 240 L430 190 L300 140 Z" fill="#b8946a"/>
    <path d="M430 190 L300 240 L300 415 L430 360 Z" fill="#b08d57" opacity=".5"/>`,

  /* --- t-shirt --- */
  tshirt: (v) => `
    <g transform="translate(300 235) scale(1.35) translate(-200 -215)">
      <path d="M165 90 L230 90 L248 108 L310 140 L285 195 L248 180 L248 335 L152 335 L152 180 L115 195 L90 140 L152 108 Z" fill="${v.dark}" stroke="#00000022"/>
      <path d="M165 90 Q200 118 230 90 Q200 106 165 90" fill="#00000018"/>
      ${brand(200, 200, 1.1, v.txt)}
      <rect x="150" y="235" width="100" height="9" rx="3" fill="${v.txt}" opacity=".8"/>
      <rect x="168" y="253" width="64" height="6" rx="3" fill="${v.txt}" opacity=".5"/>
    </g>`,
  tshirtBack: (v) => `
    <g transform="translate(300 235) scale(1.35) translate(-200 -215)">
      <path d="M165 90 L230 90 L248 108 L310 140 L285 195 L248 180 L248 335 L152 335 L152 180 L115 195 L90 140 L152 108 Z" fill="${v.dark}" stroke="#00000022"/>
      <rect x="170" y="150" width="60" height="7" rx="3" fill="${v.txt}" opacity=".55"/>
      ${brand(200, 280, 0.8, v.txt)}
    </g>`,

  /* --- tote bag --- */
  totebag: (v) => `
    <rect x="195" y="170" width="210" height="220" rx="10" fill="${v.canvas || "#efe6d8"}" stroke="#d8c9ac"/>
    <path d="M235 170 Q235 105 300 105 Q365 105 365 170" fill="none" stroke="#c4b090" stroke-width="9"/>
    <rect x="195" y="170" width="210" height="18" fill="#d8c9ac" opacity=".7"/>
    ${brand(300, 270, 1.4, "#7a6a4d")}
    <rect x="250" y="310" width="100" height="8" rx="3" fill="#7a6a4d" opacity=".7"/>`,
  totebagBack: (v) => `
    <rect x="195" y="170" width="210" height="220" rx="10" fill="#e6dcc8" stroke="#d8c9ac"/>
    <path d="M235 170 Q235 105 300 105 Q365 105 365 170" fill="none" stroke="#c4b090" stroke-width="9"/>
    ${lines(250, 260, 100, 3, 24, "#7a6a4d")}`,

  /* --- cap --- */
  cap: (v) => `
    <path d="M190 260 Q190 150 300 150 Q410 150 410 260 Z" fill="${v.dark}"/>
    <path d="M190 260 Q300 235 445 258 Q470 264 465 280 Q455 300 420 292 Q300 268 190 268 Z" fill="${v.dark}" stroke="#00000033"/>
    <path d="M300 150 L300 258" stroke="#00000022" stroke-width="3"/>
    ${brand(255, 215, 0.9, v.txt)}`,
  capBack: (v) => `
    <path d="M190 260 Q190 150 300 150 Q410 150 410 260 Z" fill="${v.dark}" opacity=".93"/>
    <path d="M190 260 Q300 235 445 258 Q470 264 465 280 Q455 300 420 292 Q300 268 190 268 Z" fill="${v.dark}" stroke="#00000033"/>
    <rect x="280" y="255" width="45" height="12" rx="6" fill="#00000055"/>`,

  /* --- mug --- */
  mug: (v) => `
    <path d="M215 150 L215 360 Q215 390 255 390 L325 390 Q365 390 365 360 L365 150 Z" fill="${v.mug || "#ffffff"}" stroke="#d8dfe8"/>
    <ellipse cx="290" cy="150" rx="75" ry="14" fill="#e8edf3" stroke="#d8dfe8"/>
    <path d="M365 200 Q440 210 430 275 Q420 330 365 330" fill="none" stroke="#d8dfe8" stroke-width="16"/>
    ${brand(290, 260, 1.3, v.accent)}
    <rect x="235" y="300" width="110" height="8" rx="3" fill="${v.accent}" opacity=".7"/>`,
  mugBack: (v) => `
    <path d="M235 150 L235 360 Q235 390 275 390 L345 390 Q385 390 385 360 L385 150 Z" fill="${v.mug || "#ffffff"}" stroke="#d8dfe8"/>
    <ellipse cx="310" cy="150" rx="75" ry="14" fill="#e8edf3" stroke="#d8dfe8"/>
    <path d="M235 200 Q160 210 170 275 Q180 330 235 330" fill="none" stroke="#d8dfe8" stroke-width="16"/>
    <rect x="255" y="280" width="110" height="8" rx="3" fill="${v.accent}" opacity=".7"/>`,

  /* --- gift set --- */
  giftset: (v) => `
    <rect x="180" y="220" width="240" height="160" rx="10" fill="${v.dark}" stroke="#00000022"/>
    <rect x="180" y="220" width="240" height="16" fill="#00000022"/>
    <rect x="195" y="250" width="90" height="60" rx="6" fill="#ffffff" opacity=".14"/>
    ${brand(240, 280, 0.8, "#ffffff")}
    <rect x="300" y="255" width="40" height="90" rx="4" fill="#ffffff" opacity=".14"/>
    <rect x="355" y="255" width="40" height="90" rx="4" fill="#ffffff" opacity=".14"/>
    ${brand(375, 300, 0.6, "#ffffff")}
    <rect x="180" y="360" width="240" height="8" rx="3" fill="${v.accent}"/>`,
  giftsetBack: (v) => `
    <rect x="180" y="220" width="240" height="160" rx="10" fill="#232f45" stroke="#00000022"/>
    ${brand(300, 290, 1.3, "#ffffff")}
    <rect x="235" y="325" width="130" height="9" rx="3" fill="#ffffff" opacity=".85"/>`,

  /* --- pen --- */
  pen: (v) => `
    <g transform="rotate(-18 300 250)">
      <rect x="130" y="232" width="300" height="26" rx="13" fill="${v.dark}"/>
      <rect x="130" y="232" width="300" height="10" rx="5" fill="#ffffff" opacity=".18"/>
      <rect x="395" y="236" width="55" height="18" rx="9" fill="url(#metal)"/>
      <rect x="105" y="236" width="35" height="18" rx="9" fill="url(#metal)"/>
      ${brand(220, 245, 0.65, v.txt)}
      <rect x="248" y="241" width="90" height="7" rx="3" fill="${v.txt}" opacity=".8"/>
    </g>`,
  penBack: (v) => `
    <g transform="rotate(14 300 250)">
      <rect x="130" y="232" width="300" height="26" rx="13" fill="${v.accent}"/>
      <rect x="130" y="232" width="300" height="10" rx="5" fill="#ffffff" opacity=".22"/>
      <rect x="395" y="236" width="55" height="18" rx="9" fill="url(#metal)"/>
      <rect x="105" y="236" width="35" height="18" rx="9" fill="url(#metal)"/>
      <rect x="210" y="241" width="130" height="7" rx="3" fill="#ffffff" opacity=".8"/>
    </g>`,

  /* --- bottle --- */
  bottle: (v) => `
    <rect x="255" y="95" width="90" height="30" rx="8" fill="${v.dark}"/>
    <path d="M255 125 L255 150 Q230 170 230 205 L230 380 Q230 410 260 410 L340 410 Q370 410 370 380 L370 205 Q370 170 345 150 L345 125 Z" fill="${v.accent}" stroke="#00000022"/>
    <rect x="230" y="240" width="140" height="70" rx="8" fill="#ffffff" opacity=".9"/>
    ${brand(300, 268, 0.8, v.accent)}
    <rect x="262" y="288" width="76" height="6" rx="3" fill="#94a3b8"/>`,
  bottleBack: (v) => `
    <rect x="255" y="95" width="90" height="30" rx="8" fill="${v.dark}"/>
    <path d="M255 125 L255 150 Q230 170 230 205 L230 380 Q230 410 260 410 L340 410 Q370 410 370 380 L370 205 Q370 170 345 150 L345 125 Z" fill="#33455f" stroke="#00000022"/>
    ${lines(255, 250, 90, 4, 20, "#ffffff")}`,
};

/* ---------- product → template + variant ---------- */

const NAVY = { dark: "#1d3252", accent: "#2878df", txt: "#ffffff" };

const PRODUCTS = [
  { id: 1, t: "card", v: NAVY },
  { id: 2, t: "card", v: { dark: "#20242c", accent: "#c9a24b", txt: "#fff" } },
  { id: 3, t: "card", v: { dark: "#111111", accent: "#e0b13c", txt: "#fff" } },
  { id: 4, t: "card", v: { dark: "#2b4a73", accent: "#4f8fe8", txt: "#fff" } },
  { id: 5, t: "card", v: { dark: "#3a2f4b", accent: "#9a7bd0", txt: "#fff" } },
  { id: 6, t: "card", v: { dark: "#1f4d3f", accent: "#3fae86", txt: "#fff" } },
  { id: 7, t: "card", v: { dark: "#4a1f2e", accent: "#d45a7c", txt: "#fff" } },
  { id: 8, t: "card", v: { dark: "#f4f5f7", accent: "#1d3252", txt: "#1d3252" } },
  { id: 9, t: "letterhead", v: { accent: "#1d3252" } },
  { id: 10, t: "notebook", v: NAVY },
  { id: 11, t: "envelope", v: { accent: "#2878df" } },
  { id: 12, t: "flyer", v: { accent: "#e1523d" } },
  { id: 13, t: "brochure", v: { accent: "#1d3252" } },
  { id: 14, t: "poster", v: { dark: "#1d3252", accent: "#f59e0b" } },
  { id: 15, t: "label", v: { accent: "#2878df" } },
  { id: 16, t: "sticker", v: { accent: "#1d3252" } },
  { id: 17, t: "paperbag", v: {} },
  { id: 18, t: "box", v: {} },
  { id: 19, t: "tshirt", v: { dark: "#ffffff", txt: "#1d3252" } },
  { id: 20, t: "totebag", v: {} },
  { id: 21, t: "cap", v: { dark: "#1d3252", txt: "#ffffff" } },
  { id: 22, t: "mug", v: { accent: "#2878df" } },
  { id: 23, t: "mug", v: { mug: "#1d3252", accent: "#2878df" } },
  { id: 24, t: "giftset", v: { dark: "#1d3252", accent: "#c9a24b" } },
  { id: 25, t: "pen", v: { dark: "#1d3252", accent: "#2878df", txt: "#ffffff" } },
  { id: 26, t: "pen", v: { dark: "#334155", accent: "#64748b", txt: "#ffffff" } },
  { id: 27, t: "bottle", v: { dark: "#1d3252", accent: "#2878df" } },
  { id: 28, t: "tshirt", v: { dark: "#1d3252", txt: "#ffffff" } },
  { id: 29, t: "tshirt", v: { dark: "#075c51", txt: "#ffffff" } },
  { id: 30, t: "tshirt", v: { dark: "#d92132", txt: "#ffffff" } },
];

/* ---------- generate ---------- */

if (!fs.existsSync(OUT)) {
  fs.mkdirSync(OUT, { recursive: true });
}

let count = 0;

for (const p of PRODUCTS) {
  const front = T[p.t](p.v);
  const backKey = `${p.t}Back`;
  const back = T[backKey] ? T[backKey](p.v) : front;

  fs.writeFileSync(
    path.join(OUT, `${p.id}-front.svg`),
    wrap(front)
  );
  fs.writeFileSync(
    path.join(OUT, `${p.id}-back.svg`),
    wrap(back)
  );
  count += 2;
}

console.log(`Generated ${count} product mockup images in ${OUT}`);
