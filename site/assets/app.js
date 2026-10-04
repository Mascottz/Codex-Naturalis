// small machines; the book interface. it reads the data and keeps each plate moving.

const domainOrder = ["sky", "earth", "living", "invisible", "structure"];
const domainNames = { sky: "The sky", earth: "The earth", living: "The living", invisible: "The invisible", structure: "The structure" };
const historicalCardEntries = new Set(["galaxy-rotation-curves", "three-body-problem", "jeans-mass", "eddington-luminosity", "schechter-luminosity-function", "rubiks-cube-group"]);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let activeAudioStop = null;

const escapeHtml = value => String(value).replace(/[&<>\"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
const prettyValue = value => Number.isInteger(Number(value)) ? Number(value).toLocaleString() : Number(value).toFixed(2);
const slugWords = value => String(value).replaceAll("-", " ");
const sentenceCase = value => { const text = String(value || ""); return text ? text[0].toLocaleUpperCase("en") + text.slice(1) : text; };

async function readData(options = {}) {
  const names = ["entries", "humans", "problems", "attempts", "solved"];
  if (options.desk) names.push("desk");
  if (options.computed) names.push("phyllotaxis", "lorenz", "galaxy-rotation", "three-body", "jeans-mass", "eddington", "schechter");
  const values = await Promise.all(names.map(async name => {
    const response = await fetch(`data/${name}.json`);
    if (!response.ok) throw new Error(`The ${name} pages could not be read.`);
    return response.json();
  }));
  return Object.fromEntries(names.map((name, index) => [name, values[index]]));
}

function scrollToCurrentHash() {
  if (!window.location.hash) return;
  let id = window.location.hash.slice(1);
  try { id = decodeURIComponent(id); } catch (_error) { /* keep the original fragment */ }
  window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" }), 80);
}

function originatorChips(entry, humansById) {
  return entry.originators.map(id => {
    const human = humansById[id];
    const name = human ? human.name : slugWords(id);
    return `<a class="originator-chip" href="humans.html#${escapeHtml(id)}">${escapeHtml(name)}</a>`;
  }).join("");
}

function soundMarkup(entry) {
  if (entry.id !== "lorenz-attractor" && entry.id !== "fourier-series") return "";
  const subject = entry.id === "lorenz-attractor" ? "the Lorenz attractor" : "the Fourier series";
  return `<div class="entry-sound">
    <p>The butterfly has a sound.</p>
    <button class="sound-toggle" type="button" aria-pressed="false" aria-label="Play ${escapeHtml(subject)}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z"></path><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"></path></svg>
      <span class="sound-label">Hear the equation</span>
    </button>
    <span class="sound-status" aria-live="polite"></span>
  </div>`;
}

function resourceLinksMarkup(sources, fallback = "") {
  const links = Array.isArray(sources) ? sources : [];
  if (links.length) return links.map(source => {
    const external = /^https?:\/\//.test(String(source.url));
    const target = external ? ' target="_blank" rel="noreferrer"' : "";
    return `<a href="${escapeHtml(source.url)}"${target}>${escapeHtml(source.title || "Source")} ↗</a>`;
  }).join(" · ");
  if (/^https?:\/\//.test(String(fallback))) return `<a href="${escapeHtml(fallback)}" target="_blank" rel="noreferrer">Open the source ↗</a>`;
  return escapeHtml(fallback || "No source recorded");
}

function machineMarkup(machine) {
  if (!machine) return "";
  const servedPath = String(machine.path || "").startsWith("scripts/") ? `machines/${machine.path.slice(8)}` : machine.path;
  return `<p class="entry-machine"><span>${escapeHtml(machine.title || "Take-home machine")}</span><a href="${escapeHtml(servedPath)}">Read the source ↗</a><code>${escapeHtml(machine.command || "")}</code></p>`;
}

function bookplateMarkup(entry) {
  const inputId = `bookplate-name-${entry.id}`;
  return `<details class="bookplate-maker">
    <summary>Make a bookplate</summary>
    <div class="bookplate-editor">
      <form class="bookplate-form">
        <label for="${escapeHtml(inputId)}">Reader's name</label>
        <input id="${escapeHtml(inputId)}" name="readerName" type="text" maxlength="64" autocomplete="name" required placeholder="A name for the bookplate">
        <button type="submit">Engrave this page</button>
      </form>
      <div class="bookplate-preview" aria-live="polite"></div>
    </div>
  </details>`;
}

function entryHistoryMarkup(entry) {
  if (!entry.story) return "";
  const story = escapeHtml(entry.story);
  if (!historicalCardEntries.has(entry.id)) return `<p class="human-story">${story}</p>`;
  return `<aside class="history-card" aria-label="Historical card"><span>History card · ${escapeHtml(entry.year)}</span><p>${story}</p></aside>`;
}

const RUBIK_FACES = [
  { face: "U", normal: [0, 1, 0], right: [1, 0, 0], down: [0, 0, 1] },
  { face: "D", normal: [0, -1, 0], right: [1, 0, 0], down: [0, 0, -1] },
  { face: "F", normal: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] },
  { face: "B", normal: [0, 0, -1], right: [-1, 0, 0], down: [0, -1, 0] },
  { face: "R", normal: [1, 0, 0], right: [0, 0, -1], down: [0, -1, 0] },
  { face: "L", normal: [-1, 0, 0], right: [0, 0, 1], down: [0, -1, 0] }
];
const RUBIK_COLORS = { U: "white", D: "yellow", F: "green", B: "blue", R: "red", L: "orange" };
const rubikStates = new WeakMap();
const rubikCounts = new WeakMap();
const rubikTimers = new WeakMap();

function rubikVectorKey(position, normal) {
  return `${position.join(",")}|${normal.join(",")}`;
}

function rubikStickerPosition(face, row, column) {
  return face.normal.map((value, index) => value + face.right[index] * (column - 1) + face.down[index] * (row - 1));
}

function solvedRubikState() {
  const state = new Map();
  RUBIK_FACES.forEach(face => {
    for (let row = 0; row < 3; row += 1) for (let column = 0; column < 3; column += 1) {
      state.set(rubikVectorKey(rubikStickerPosition(face, row, column), face.normal), face.face);
    }
  });
  return state;
}

function rubikDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function rubikCross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function rotateRubikVector(vector, axis, sign) {
  const cross = rubikCross(axis, vector);
  const parallel = axis.map(value => value * rubikDot(axis, vector));
  return parallel.map((value, index) => value + sign * cross[index]);
}

function turnRubikState(state, notation) {
  const face = RUBIK_FACES.find(item => item.face === notation[0]);
  if (!face) return state;
  const halfTurn = notation.includes("2");
  const direction = notation.includes("'") ? 1 : -1;
  const turns = halfTurn ? 2 : 1;
  const next = new Map();
  state.forEach((color, key) => {
    const [positionText, normalText] = key.split("|");
    let position = positionText.split(",").map(Number);
    let normal = normalText.split(",").map(Number);
    if (rubikDot(position, face.normal) === 1) {
      for (let turn = 0; turn < turns; turn += 1) {
        position = rotateRubikVector(position, face.normal, direction);
        normal = rotateRubikVector(normal, face.normal, direction);
      }
    }
    next.set(rubikVectorKey(position, normal), color);
  });
  return next;
}

function renderRubikCube(toy) {
  const state = rubikStates.get(toy);
  if (!state) return;
  toy.querySelectorAll(".rubik-face").forEach(faceElement => {
    const face = RUBIK_FACES.find(item => item.face === faceElement.dataset.face);
    faceElement.querySelectorAll(".rubik-sticker").forEach((sticker, index) => {
      const row = Math.floor(index / 3), column = index % 3;
      const color = state.get(rubikVectorKey(rubikStickerPosition(face, row, column), face.normal)) || face.face;
      sticker.className = `rubik-sticker color-${RUBIK_COLORS[color]}`;
    });
  });
  const count = rubikCounts.get(toy) || 0;
  const counter = toy.querySelector(".rubik-move-count");
  if (counter) counter.textContent = `${count} face ${count === 1 ? "turn" : "turns"} · half-turn metric`;
}

function rubikCubeMarkup(id, mode = "book") {
  const faces = RUBIK_FACES.map(face => `<div class="rubik-face rubik-face-${face.face}" data-face="${face.face}" aria-hidden="true">${"<span class=\"rubik-sticker\"></span>".repeat(9)}</div>`).join("");
  const faceButtons = mode === "book" ? `<div class="rubik-turns" aria-label="Legal clockwise quarter turns">${RUBIK_FACES.map(face => `<button type="button" data-face-turn="${face.face}" aria-label="Turn ${face.face} face clockwise">${face.face}</button>`).join("")}</div>` : "";
  const actions = mode === "desk"
    ? `<button class="rubik-choose" type="button">Scramble with the cube</button>`
    : `<div class="rubik-actions"><button class="rubik-scramble" type="button">Legal scramble</button><button class="rubik-reset" type="button">Reset cube</button></div>${faceButtons}`;
  return `<section class="rubik-toy" id="${escapeHtml(id)}" data-rubik-mode="${escapeHtml(mode)}" aria-label="Interactive Rubik's cube">
    <div class="rubik-scene"><div class="rubik-cube">${faces}</div></div>
    <div class="rubik-toy-details">
      <span class="rubik-kicker">A legal face-turn machine</span>
      <output class="rubik-move-count" aria-live="polite">0 face turns · half-turn metric</output>
      <p class="rubik-sequence" aria-live="polite">The cube is solved.</p>
      ${actions}
    </div>
  </section>`;
}

function applyRubikTurn(toy, notation) {
  rubikStates.set(toy, turnRubikState(rubikStates.get(toy), notation));
  rubikCounts.set(toy, (rubikCounts.get(toy) || 0) + 1);
  renderRubikCube(toy);
}

function cancelRubikScramble(toy) {
  (rubikTimers.get(toy) || []).forEach(timer => window.clearTimeout(timer));
  rubikTimers.delete(toy);
  toy.classList.remove("is-scrambling");
}

function scrambleRubikCube(toy, length = 25) {
  cancelRubikScramble(toy);
  const faces = RUBIK_FACES.map(face => face.face);
  const suffixes = ["", "2", "'"];
  const moves = [];
  let previousFace = "";
  while (moves.length < length) {
    const choices = faces.filter(face => face !== previousFace);
    const face = choices[Math.floor(Math.random() * choices.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    moves.push(`${face}${suffix}`);
    previousFace = face;
  }
  const sequence = toy.querySelector(".rubik-sequence");
  if (sequence) sequence.textContent = `Legal scramble: ${moves.join(" ")}`;
  toy.classList.add("is-scrambling");
  const timers = [];
  moves.forEach((move, index) => timers.push(window.setTimeout(() => {
    applyRubikTurn(toy, move);
    if (index === moves.length - 1) {
      timers.push(window.setTimeout(() => {
        toy.classList.remove("is-scrambling");
        rubikTimers.delete(toy);
      }, 180));
    }
  }, index * 42)));
  rubikTimers.set(toy, timers);
  return moves;
}

function wireRubikCubes(root, options = {}) {
  root.querySelectorAll(".rubik-toy").forEach(toy => {
    if (toy.dataset.rubikReady === "true") return;
    toy.dataset.rubikReady = "true";
    rubikStates.set(toy, solvedRubikState());
    rubikCounts.set(toy, 0);
    renderRubikCube(toy);
    toy.querySelector(".rubik-scramble")?.addEventListener("click", () => scrambleRubikCube(toy));
    toy.querySelector(".rubik-reset")?.addEventListener("click", () => {
      cancelRubikScramble(toy);
      rubikStates.set(toy, solvedRubikState());
      rubikCounts.set(toy, 0);
      renderRubikCube(toy);
      const sequence = toy.querySelector(".rubik-sequence");
      if (sequence) sequence.textContent = "The cube is solved.";
    });
    toy.querySelectorAll("[data-face-turn]").forEach(button => button.addEventListener("click", () => {
      const move = button.dataset.faceTurn;
      applyRubikTurn(toy, move);
      const sequence = toy.querySelector(".rubik-sequence");
      if (sequence) sequence.textContent = `Last face turn: ${move}`;
    }));
    toy.querySelector(".rubik-choose")?.addEventListener("click", () => options.onChoose?.(toy));
  });
}

function entryPlate(entry, humansById) {
  const controls = entry.controls || [entry.slider || { key: "parameter", label: "parameter", min: 0, max: 1, step: .01, value: .5 }];
  const status = entry.status === "live" ? " live" : "";
  const sources = entry.sources?.length ? resourceLinksMarkup(entry.sources) : escapeHtml(entry.source);
  const controlsMarkup = controls.map((control, index) => {
    const key = control.key || `control-${index}`;
    const inputId = `entry-control-${entry.id}-${key}`;
    return `<div class="entry-control">
      <label for="${escapeHtml(inputId)}">${escapeHtml(control.label)}</label>
      <input id="${escapeHtml(inputId)}" class="entry-slider" data-control="${escapeHtml(key)}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.value}" aria-label="${escapeHtml(control.label)} for ${escapeHtml(entry.title)}">
      <output class="slider-value" data-output="${escapeHtml(key)}">${prettyValue(control.value)}</output>
    </div>`;
  }).join("");
  return `
    <article class="entry-plate${status}" id="${escapeHtml(entry.id)}" data-domain="${escapeHtml(entry.domain)}" data-visual="${escapeHtml(entry.visualType)}" data-entry-id="${escapeHtml(entry.id)}">
      <div class="entry-aside">
        <div>
          <span class="entry-number">${String(entry.number).padStart(2, "0")} / ${escapeHtml(entry.year)}</span>
          <h3 class="entry-title">${escapeHtml(entry.title)}</h3>
          <p class="entry-formula"><code>${escapeHtml(entry.formula)}</code></p>
        </div>
        <p class="entry-source"><span>Source line</span>${sources}</p>
        ${machineMarkup(entry.machine)}
      </div>
      <div class="entry-copy">
        <p class="statement">${escapeHtml(entry.statement)}</p>
        <div class="readings">
          <div><span class="reading-label">The rigorous reading</span><p>${escapeHtml(entry.derivation || entry.statement)}</p></div>
          <div><span class="reading-label">The intuition</span><p>${escapeHtml(entry.intuition)}</p></div>
        </div>
        <div class="originators" aria-label="Originators">${originatorChips(entry, humansById)}</div>
        ${entryHistoryMarkup(entry)}
        ${soundMarkup(entry)}
        <div class="visual-shell">
          <canvas class="entry-canvas" aria-label="Interactive visualization for ${escapeHtml(entry.title)}"></canvas>
          <div class="visual-tools${controls.length > 1 ? " multiple-controls" : ""}">
            ${controlsMarkup}
            <button class="take-home" type="button">Take it home</button>
          </div>
          ${entry.caption ? `<p class="visual-caption">${escapeHtml(entry.caption)}</p>` : ""}
        </div>
        ${entry.id === "rubiks-cube-group" ? rubikCubeMarkup(`book-${entry.id}`, "book") : ""}
        ${bookplateMarkup(entry)}
        ${askMarkup(entry)}
      </div>
    </article>`;
}

function askMarkup(entry) {
  const number = String(entry.number).padStart(2, "0");
  const title = encodeURIComponent(`Plate ${number}; ${entry.title}`);
  const body = encodeURIComponent(`Asking about plate ${number}, ${entry.title}.\n\n${entry.formula}\n\nThe plate lives at https://naturaliis.vercel.app/#${entry.id}\n\n`);
  return `<p class="plate-ask"><a href="https://github.com/Mascottz/codex-naturalis/discussions/new?category=q-a&amp;title=${title}&amp;body=${body}" target="_blank" rel="noreferrer noopener">${escapeHtml(`Ask about plate ${number}`)} <span aria-hidden="true">↗</span></a></p>`;
}

function renderEntries(entries, humans, computed) {
  const mount = document.querySelector("#entries");
  const humansById = Object.fromEntries(humans.map(human => [human.id, human]));
  mount.innerHTML = domainOrder.map((domain, index) => {
    const domainEntries = entries.filter(entry => entry.domain === domain);
    return `<section class="domain-section" id="${domain}" aria-labelledby="${domain}-title">
      <div class="domain-divider"><h2 id="${domain}-title">${domainNames[domain]}</h2><span class="domain-number">${String(index + 1).padStart(2, "0")} / ${domainEntries.length} entries</span></div>
      ${domainEntries.map(entry => entryPlate(entry, humansById)).join("")}
    </section>`;
  }).join("");

  mount.querySelectorAll(".entry-plate").forEach(plate => {
    const entry = entries.find(item => item.id === plate.dataset.entryId);
    wirePlate(plate, entry, computed, humansById);
  });
  scrollToCurrentHash();
}

function canvasContext(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 640;
  const height = canvas.clientHeight || 210;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

function baseCanvas(context, width, height) {
  context.clearRect(0, 0, width, height);
  context.strokeStyle = "rgba(39,48,58,.15)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(16, height - 22); context.lineTo(width - 12, height - 22);
  context.moveTo(28, 16); context.lineTo(28, height - 12);
  context.stroke();
  context.fillStyle = "rgba(39,48,58,.48)";
  context.font = "10px SFMono-Regular, Consolas, monospace";
  context.fillText("computed field", 38, height - 8);
}

function drawGeneric(context, width, height, entry, value, time) {
  baseCanvas(context, width, height);
  const centerX = width * .53, centerY = height * .46;
  context.strokeStyle = "#a85c4c";
  context.fillStyle = "rgba(168,92,76,.14)";
  context.lineWidth = 2;
  context.beginPath();
  if (["wave", "action-potential", "information", "uncertainty"].includes(entry.visualType)) {
    for (let x = 0; x < width - 45; x += 2) {
      const phase = x / (width - 45) * Math.PI * (2 + Number(value)) + time;
      const y = centerY - Math.sin(phase) * (28 + Number(value) * 5) * Math.exp(-x / width * .12);
      x === 0 ? context.moveTo(x + 30, y) : context.lineTo(x + 30, y);
    }
    context.stroke();
  } else if (["flow", "field", "tide", "reaction", "gas"].includes(entry.visualType)) {
    for (let row = -3; row < 4; row++) {
      context.beginPath();
      for (let x = 0; x < width - 50; x += 4) {
        const y = centerY + row * 20 + Math.sin(x / 35 + row + time) * (5 + Number(value) * 5);
        x === 0 ? context.moveTo(x + 32, y) : context.lineTo(x + 32, y);
      }
      context.stroke();
    }
  } else if (["proof", "surface", "symmetry", "bayes"].includes(entry.visualType)) {
    const radius = 30 + Number(value) * 14;
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5 + time * .2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      context.beginPath(); context.arc(x, y, 18, 0, Math.PI * 2); context.fill(); context.stroke();
    }
    context.beginPath(); context.arc(centerX, centerY, 7, 0, Math.PI * 2); context.fillStyle = "#d7856f"; context.fill();
  } else if (entry.visualType === "spectrum") {
    const gradient = context.createLinearGradient(35, 0, width, 0);
    gradient.addColorStop(0, "#7e62a7"); gradient.addColorStop(.35, "#789bd4"); gradient.addColorStop(.62, "#d7a364"); gradient.addColorStop(1, "#bd625d");
    context.strokeStyle = gradient;
    context.beginPath();
    for (let x = 35; x < width - 15; x += 2) { const y = centerY - Math.sin(x / 23) * 18 - Math.cos(x / 11) * 9; x === 35 ? context.moveTo(x, y) : context.lineTo(x, y); }
    context.stroke();
  } else if (entry.visualType === "zeta") {
    context.fillStyle = "#b9a9dc";
    for (let i = 0; i < 22; i++) { const x = 45 + i * 17; const y = centerY + Math.sin(i * .8) * 26; context.fillRect(x, y, 4, 4); }
    context.setLineDash([4, 4]); context.strokeStyle = "#a85c4c"; context.beginPath(); context.moveTo(centerX, 18); context.lineTo(centerX, height - 26); context.stroke(); context.setLineDash([]);
  } else if (entry.visualType === "phase" || entry.visualType === "population") {
    context.beginPath();
    for (let i = 0; i < 180; i++) { const angle = i / 180 * Math.PI * 5; const r = 4 + i / 180 * 70; const x = centerX + Math.cos(angle) * r; const y = centerY + Math.sin(angle) * r * .52; i === 0 ? context.moveTo(x, y) : context.lineTo(x, y); }
    context.stroke();
  } else {
    context.beginPath(); context.arc(centerX, centerY, 44 + Number(value) * 6, 0, Math.PI * 2); context.stroke();
    context.beginPath(); context.arc(centerX, centerY, 16, 0, Math.PI * 2); context.fill();
  }
}

function chartBase(context, width, height, title) {
  context.clearRect(0, 0, width, height);
  const left = 44, right = width - 16, top = 24, bottom = height - 34;
  context.strokeStyle = "rgba(39,48,58,.18)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(left, top); context.lineTo(left, bottom); context.lineTo(right, bottom);
  context.stroke();
  context.fillStyle = "#27303a";
  context.font = "12px Baskerville, Georgia, serif";
  context.fillText(title, left, 16);
  return { left, right, top, bottom, plotWidth: right - left, plotHeight: bottom - top };
}

function drawGalaxyRotation(context, width, height, haloStrength, computed) {
  const data = computed.galaxyRotation || {};
  const radii = data.radiiKpc || [];
  const visible = data.visibleKms || [];
  const haloCurve = data.haloIncludedKms || [];
  const box = chartBase(context, width, height, "Circular speed by radius");
  const minLog = Math.log10(radii[0] || .1), maxLog = Math.log10(radii.at(-1) || 30);
  const maxSpeed = 280;
  const x = radius => box.left + (Math.log10(radius) - minLog) / (maxLog - minLog) * box.plotWidth;
  const y = speed => box.bottom - Number(speed) / maxSpeed * box.plotHeight;
  context.font = "9px SFMono-Regular, Consolas, monospace";
  context.fillStyle = "rgba(39,48,58,.62)";
  [0, 100, 200].forEach(speed => {
    const py = y(speed);
    context.strokeStyle = "rgba(39,48,58,.1)";
    context.beginPath(); context.moveTo(box.left, py); context.lineTo(box.right, py); context.stroke();
    context.fillText(String(speed), 7, py + 3);
  });
  [0.1, 1, 10, 30].forEach(radius => {
    const px = x(radius);
    context.strokeStyle = "rgba(39,48,58,.08)";
    context.beginPath(); context.moveTo(px, box.top); context.lineTo(px, box.bottom); context.stroke();
    context.fillText(String(radius), px - 7, box.bottom + 13);
  });
  const drawCurve = (values, color, dashed = false, strength = 1) => {
    context.beginPath();
    values.forEach((value, index) => {
      const px = x(radii[index]);
      const py = y(value);
      index ? context.lineTo(px, py) : context.moveTo(px, py);
    });
    context.strokeStyle = color;
    context.globalAlpha = strength;
    context.lineWidth = 2;
    context.setLineDash(dashed ? [4, 4] : []);
    context.stroke();
    context.setLineDash([]);
    context.globalAlpha = 1;
  };
  drawCurve(visible, "#42675e", true, .8);
  const strength = Math.max(0, Math.min(1, Number(haloStrength)));
  const mixed = visible.map((speed, index) => Math.sqrt(speed * speed + strength * Math.max(0, haloCurve[index] ** 2 - speed ** 2)));
  drawCurve(mixed, "#a85c4c");
  context.fillStyle = "#42675e"; context.fillRect(box.left + 4, box.top + 8, 11, 2);
  context.fillStyle = "#27303a"; context.font = "9px SFMono-Regular, Consolas, monospace";
  context.fillText("visible only", box.left + 19, box.top + 12);
  context.fillStyle = "#a85c4c"; context.fillRect(box.left + 101, box.top + 8, 11, 2);
  context.fillStyle = "#27303a";
  context.fillText(`halo ${Math.round(strength * 100)}%`, box.left + 116, box.top + 12);
  context.fillText("r (kpc)", box.right - 35, height - 5);
  context.fillText("km/s", 6, box.top - 6);
  for (let index = 64; index < radii.length; index += 5) {
    const px = x(radii[index]), py = y(mixed[index]);
    context.fillStyle = "#ddbd72";
    context.beginPath(); context.arc(px, py, 1.5, 0, Math.PI * 2); context.fill();
  }
}

function nearestScenario(scenarios, target) {
  return scenarios.reduce((best, item) => Math.abs(item.delta - target) < Math.abs(best.delta - target) ? item : best, scenarios[0]);
}

function drawThreeBody(context, width, height, perturbation, computed, time) {
  const scenarios = computed.threeBody?.scenarios || [];
  if (!scenarios.length) return drawGeneric(context, width, height, { visualType: "proof" }, .5, time);
  const reference = scenarios[0];
  const selected = nearestScenario(scenarios, Number(perturbation) / 1000);
  const baseFrames = reference.positions || [];
  const frames = selected.positions || [];
  const count = Math.min(baseFrames.length, frames.length);
  const index = Math.max(0, Math.min(count - 1, Math.floor(((time / 19) % 1) * (count - 1))));
  context.clearRect(0, 0, width, height);
  const cx = width * .43, cy = height * .47;
  const scale = Math.min(width * .33, height * .34);
  const point = p => ({ x: cx + p[0] * scale, y: cy - p[1] * scale });
  context.strokeStyle = "rgba(66,103,94,.57)"; context.lineWidth = 1.5;
  context.beginPath();
  baseFrames.forEach((frame, frameIndex) => {
    const p = point(frame[0]);
    frameIndex ? context.lineTo(p.x, p.y) : context.moveTo(p.x, p.y);
  });
  context.stroke();
  context.strokeStyle = "#a85c4c"; context.lineWidth = 1.5;
  context.beginPath();
  frames.slice(0, index + 1).forEach((frame, frameIndex) => {
    const p = point(frame[0]);
    frameIndex ? context.lineTo(p.x, p.y) : context.moveTo(p.x, p.y);
  });
  context.stroke();
  const colors = ["#a85c4c", "#42675e", "#75659b"];
  (frames[index] || []).forEach((position, bodyIndex) => {
    const p = point(position);
    context.fillStyle = colors[bodyIndex];
    context.beginPath(); context.arc(p.x, p.y, 4.2, 0, Math.PI * 2); context.fill();
  });
  const inset = { x: width - 137, y: height - 71, width: 118, height: 42 };
  context.fillStyle = "rgba(244,238,226,.88)"; context.fillRect(inset.x - 5, inset.y - 15, inset.width + 11, inset.height + 22);
  context.strokeStyle = "rgba(39,48,58,.18)"; context.strokeRect(inset.x - 5, inset.y - 15, inset.width + 11, inset.height + 22);
  context.fillStyle = "#27303a"; context.font = "8px SFMono-Regular, Consolas, monospace";
  context.fillText("separation from reference", inset.x - 1, inset.y - 5);
  const separations = frames.map((frame, frameIndex) => Math.sqrt(frame.reduce((sum, position, bodyIndex) => {
    const original = baseFrames[frameIndex]?.[bodyIndex] || position;
    return sum + (position[0] - original[0]) ** 2 + (position[1] - original[1]) ** 2;
  }, 0)));
  const maxLog = Math.max(-4, ...separations.map(value => Math.log10(Math.max(value, 1e-8))));
  context.beginPath();
  separations.forEach((distance, frameIndex) => {
    const px = inset.x + frameIndex / Math.max(1, separations.length - 1) * inset.width;
    const py = inset.y + inset.height - (Math.log10(Math.max(distance, 1e-8)) + 8) / (maxLog + 8) * inset.height;
    frameIndex ? context.lineTo(px, py) : context.moveTo(px, py);
  });
  context.strokeStyle = "#d7856f"; context.lineWidth = 1.3; context.stroke();
  context.fillStyle = "#27303a"; context.font = "10px Baskerville, Georgia, serif";
  context.fillText("A choreography, then a departure", 16, 18);
  context.font = "9px SFMono-Regular, Consolas, monospace";
  context.fillText(`δ = ${Number(selected.delta).toExponential(1)}`, 16, height - 8);
}

function interpolateGrid(axis, values, target) {
  if (target <= axis[0]) return values[0];
  if (target >= axis[axis.length - 1]) return values[values.length - 1];
  let index = 0;
  while (index < axis.length - 2 && axis[index + 1] < target) index += 1;
  const fraction = (target - axis[index]) / (axis[index + 1] - axis[index]);
  return values[index] * (1 - fraction) + values[index + 1] * fraction;
}

function jeansMassAt(data, temperature, logDensity) {
  const temperatures = data.temperatureKelvin || [];
  const densityAxis = data.log10NumberDensity || [];
  const rows = data.solarMasses || [];
  const byTemperature = rows.map(row => interpolateGrid(densityAxis, row, logDensity));
  return interpolateGrid(temperatures, byTemperature, temperature);
}

function drawJeansMass(context, width, height, temperature, logDensity, computed) {
  const data = computed.jeansMass || {};
  const densityAxis = data.log10NumberDensity || [];
  const box = chartBase(context, width, height, "Jeans threshold for a molecular cloud");
  const allMasses = (data.solarMasses || []).flat();
  const minLogMass = Math.floor(Math.log10(Math.min(...allMasses.filter(value => value > 0))));
  const maxLogMass = Math.ceil(Math.log10(Math.max(...allMasses)));
  const x = value => box.left + (Number(value) - 2) / 4 * box.plotWidth;
  const y = value => box.bottom - (Math.log10(Math.max(value, 1e-12)) - minLogMass) / (maxLogMass - minLogMass) * box.plotHeight;
  for (let power = minLogMass; power <= maxLogMass; power += 1) {
    const py = y(10 ** power);
    context.strokeStyle = "rgba(39,48,58,.1)"; context.beginPath(); context.moveTo(box.left, py); context.lineTo(box.right, py); context.stroke();
    context.fillStyle = "rgba(39,48,58,.62)"; context.font = "8px SFMono-Regular, Consolas, monospace"; context.fillText(`10^${power}`, 2, py + 3);
  }
  [2, 3, 4, 5, 6].forEach(power => {
    const px = x(power);
    context.strokeStyle = "rgba(39,48,58,.08)"; context.beginPath(); context.moveTo(px, box.top); context.lineTo(px, box.bottom); context.stroke();
    context.fillStyle = "rgba(39,48,58,.62)"; context.font = "8px SFMono-Regular, Consolas, monospace"; context.fillText(String(power), px - 2, box.bottom + 12);
  });
  context.beginPath();
  densityAxis.forEach((density, index) => {
    const mass = jeansMassAt(data, temperature, density);
    index ? context.lineTo(x(density), y(mass)) : context.moveTo(x(density), y(mass));
  });
  context.strokeStyle = "#42675e"; context.lineWidth = 2; context.stroke();
  const mass = jeansMassAt(data, temperature, logDensity);
  const px = x(logDensity), py = y(mass);
  context.fillStyle = "#a85c4c"; context.beginPath(); context.arc(px, py, 5, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#27303a"; context.font = "10px SFMono-Regular, Consolas, monospace";
  context.fillText(`T ${Number(temperature).toFixed(0)} K · n 10^${Number(logDensity).toFixed(1)} cm⁻³`, box.left + 4, box.top + 12);
  context.fillText(`M_J ≈ ${mass.toExponential(2)} M☉`, box.left + 4, box.top + 27);
  context.fillText("log₁₀ n (cm⁻³)", box.right - 83, height - 5);
}

function interpolateSeries(axis, values, target) {
  return interpolateGrid(axis, values, target);
}

function drawEddington(context, width, height, mass, inflow, computed) {
  const data = computed.eddington || {};
  const luminosity = interpolateSeries(data.massSolar || [], data.luminosityErgPerSecond || [], Number(mass));
  context.clearRect(0, 0, width, height);
  const cx = width * .34, cy = height * .45;
  context.fillStyle = "#151821";
  context.beginPath(); context.arc(cx, cy, 24, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "rgba(168,92,76,.72)"; context.lineWidth = 4;
  context.beginPath(); context.ellipse(cx, cy, 42, 13, -.18, 0, Math.PI * 2); context.stroke();
  context.strokeStyle = "rgba(215,133,111,.62)"; context.lineWidth = 2;
  context.beginPath(); context.ellipse(cx, cy, 57, 19, -.18, 0, Math.PI * 2); context.stroke();
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + (prefersReducedMotion ? 0 : timePhase(Date.now()));
    const r = 70 + (i % 3) * 13;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * .45;
    context.fillStyle = i % 2 ? "#ddbd72" : "#d7856f";
    context.beginPath(); context.arc(x, y, 2.2, 0, Math.PI * 2); context.fill();
  }
  const left = width * .61, right = width - 24, lineY = height * .54;
  const span = right - left;
  const x = value => left + Math.min(1.6, Number(value)) / 1.6 * span;
  context.fillStyle = "#27303a"; context.font = "11px Baskerville, Georgia, serif";
  context.fillText(`M = ${Number(mass).toFixed(0)} M☉`, left, 20);
  context.font = "9px SFMono-Regular, Consolas, monospace";
  context.fillText(`L_Edd ≈ ${luminosity.toExponential(2)} erg/s`, left, 35);
  context.strokeStyle = "rgba(39,48,58,.3)"; context.lineWidth = 2;
  context.beginPath(); context.moveTo(left, lineY); context.lineTo(right, lineY); context.stroke();
  context.fillStyle = "rgba(221,189,114,.38)"; context.fillRect(x(1), lineY - 12, Math.max(0, right - x(1)), 24);
  context.fillStyle = "#a85c4c"; context.fillRect(left, lineY - 5, Math.max(0, x(Math.min(Number(inflow), 1)) - left), 10);
  context.strokeStyle = "#ddbd72"; context.lineWidth = 2;
  context.beginPath(); context.moveTo(x(1), lineY - 21); context.lineTo(x(1), lineY + 23); context.stroke();
  const beadX = x(Math.min(Number(inflow), 1.6));
  context.fillStyle = Number(inflow) > 1 ? "#ddbd72" : "#d7856f";
  context.beginPath(); context.arc(beadX, lineY, 7, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#27303a";
  context.fillText("steady inflow", left, lineY + 42);
  context.fillText("L / L_Edd", right - 43, lineY + 42);
  context.font = "12px Baskerville, Georgia, serif";
  context.fillText(Number(inflow) > 1 ? "Radiation turns the excess back." : "The feed approaches balance.", left, height - 12);
}

function timePhase(timestamp) {
  return (timestamp / 1000) % (Math.PI * 2);
}

function drawSchechter(context, width, height, alpha, computed) {
  const data = computed.schechter || {};
  const alphas = data.alpha || [];
  const curves = data.phiOverPhiStar || [];
  const index = alphas.reduce((best, value, i) => Math.abs(value - Number(alpha)) < Math.abs(alphas[best] - Number(alpha)) ? i : best, 0);
  const xValues = data.luminosityOverLstar || [];
  const yValues = curves[index] || [];
  const box = chartBase(context, width, height, "Galaxy number density around L*");
  const minX = -2, maxX = 1, minY = -6, maxY = 4;
  const x = value => box.left + (Math.log10(value) - minX) / (maxX - minX) * box.plotWidth;
  const y = value => box.bottom - (Math.log10(Math.max(value, 1e-12)) - minY) / (maxY - minY) * box.plotHeight;
  [-6, -4, -2, 0, 2, 4].forEach(power => {
    const py = box.bottom - (power - minY) / (maxY - minY) * box.plotHeight;
    context.strokeStyle = "rgba(39,48,58,.1)"; context.beginPath(); context.moveTo(box.left, py); context.lineTo(box.right, py); context.stroke();
    context.fillStyle = "rgba(39,48,58,.62)"; context.font = "8px SFMono-Regular, Consolas, monospace"; context.fillText(`10^${power}`, 2, py + 3);
  });
  const lstarX = x(1);
  context.strokeStyle = "rgba(39,48,58,.35)"; context.setLineDash([3, 4]); context.beginPath(); context.moveTo(lstarX, box.top); context.lineTo(lstarX, box.bottom); context.stroke(); context.setLineDash([]);
  context.beginPath();
  yValues.forEach((value, pointIndex) => {
    const px = x(xValues[pointIndex]);
    const py = y(value);
    pointIndex ? context.lineTo(px, py) : context.moveTo(px, py);
  });
  context.strokeStyle = "#a85c4c"; context.lineWidth = 2; context.stroke();
  context.fillStyle = "#27303a"; context.font = "9px SFMono-Regular, Consolas, monospace";
  context.fillText(`α = ${Number(alpha).toFixed(1)}`, box.left + 6, box.top + 13);
  context.fillText("L / L*", box.right - 33, height - 5);
  context.fillText("φ / φ*", 4, box.top - 6);
  context.fillText("L*", lstarX + 3, box.top + 12);
}

function drawRubikCayley(context, width, height, selectedLayer) {
  context.clearRect(0, 0, width, height);
  const cx = width * .55, cy = height * .53;
  const maxRadius = Math.min(width * .4, height * .43);
  const layers = [
    { name: "G₀", count: 12, generators: "U D L R F B", color: "#42675e" },
    { name: "G₁", count: 10, generators: "U D L R quarter; F B half", color: "#75659b" },
    { name: "G₂", count: 8, generators: "U D quarter; L R F B half", color: "#a85c4c" },
    { name: "G₃", count: 6, generators: "all face turns half", color: "#c28a48" },
    { name: "G₄", count: 1, generators: "identity", color: "#27303a" }
  ];
  const points = layers.map((layer, layerIndex) => {
    const radius = layerIndex === layers.length - 1 ? 0 : maxRadius * (1 - layerIndex * .19);
    return Array.from({ length: layer.count }, (_unused, index) => {
      const angle = index / layer.count * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });
  });
  context.strokeStyle = "rgba(39,48,58,.22)"; context.lineWidth = 1;
  for (let layerIndex = 0; layerIndex < points.length - 1; layerIndex++) {
    points[layerIndex].forEach((point, index) => {
      const next = points[layerIndex][(index + 1) % points[layerIndex].length];
      context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(next.x, next.y); context.stroke();
      const inner = points[layerIndex + 1][Math.round(index * points[layerIndex + 1].length / points[layerIndex].length) % points[layerIndex + 1].length];
      context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(inner.x, inner.y); context.stroke();
    });
  }
  layers.forEach((layer, layerIndex) => {
    const radius = layerIndex === Number(selectedLayer) ? 4.4 : 3.1;
    context.fillStyle = layer.color;
    points[layerIndex].forEach(point => {
      context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2); context.fill();
    });
  });
  context.fillStyle = "#27303a"; context.font = "11px Baskerville, Georgia, serif";
  context.fillText("nested subgroups; schematic Cayley landscape", 12, 18);
  layers.forEach((layer, index) => {
    const y = 34 + index * 22;
    context.fillStyle = layer.color; context.beginPath(); context.arc(19, y, 4, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#27303a"; context.font = "9px SFMono-Regular, Consolas, monospace";
    context.fillText(`${layer.name}  ${layer.generators}`, 29, y + 3);
  });
  context.fillStyle = "#6e716f"; context.font = "8px SFMono-Regular, Consolas, monospace";
  context.fillText("vertices: positions   ·   edges: face turns", 12, height - 7);
}

function drawEuler(context, width, height, turns, time) {
  baseCanvas(context, width, height);
  const cx = width * .52, cy = height * .48, radius = Math.min(width, height) * .29;
  context.strokeStyle = "rgba(39,48,58,.3)"; context.lineWidth = 1;
  context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.stroke();
  context.strokeStyle = "#a85c4c"; context.lineWidth = 2;
  context.beginPath();
  const angle = Number(turns) * Math.PI * 2 + (prefersReducedMotion ? 0 : time * .18);
  for (let i = 0; i <= 140; i++) { const step = angle * i / 140; const x = cx + Math.cos(step) * radius; const y = cy - Math.sin(step) * radius; i === 0 ? context.moveTo(x, y) : context.lineTo(x, y); }
  context.stroke();
  context.fillStyle = "#d7856f"; context.beginPath(); context.arc(cx + Math.cos(angle) * radius, cy - Math.sin(angle) * radius, 5, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#27303a"; context.font = "15px Baskerville, Georgia, serif"; context.fillText("eⁱᵗ", cx - 14, cy - radius - 10);
}

function drawPhyllotaxis(context, width, height, degrees, computed) {
  baseCanvas(context, width, height);
  const points = computed.points || [];
  const radius = Math.min(width, height) * .39;
  const angle = Number(degrees) * Math.PI / 180;
  const cx = width * .52, cy = height * .45;
  points.forEach((point, index) => {
    const r = Math.hypot(point[0], point[1]);
    const a = index * angle;
    const x = cx + Math.cos(a) * r * radius;
    const y = cy + Math.sin(a) * r * radius;
    context.fillStyle = index % 8 === 0 ? "#a85c4c" : index % 3 === 0 ? "#b9a9dc" : "#42675e";
    context.beginPath(); context.arc(x, y, 1.6 + r * 2.2, 0, Math.PI * 2); context.fill();
  });
}

function lorenzCoordinates(point, width, height) {
  const scale = Math.min(width / 52, height / 48);
  return { x: width * .53 + point[0] * scale * .78, y: height * .52 - (point[2] - 25) * scale * .75 };
}

function drawLorenz(context, width, height, rho, computed, time) {
  baseCanvas(context, width, height);
  const points = computed.points || [];
  const scale = Math.min(width / 52, height / 48);
  const cx = width * .53, cy = height * .52;
  context.lineWidth = 1.15;
  context.beginPath();
  points.forEach((point, index) => {
    if (index % 2 !== 0) return;
    const x = cx + point[0] * scale * .78;
    const y = cy - (point[2] - 25) * scale * .75;
    index === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
  });
  context.strokeStyle = `hsl(${Number(rho) * 4 + 12} 42% 42%)`; context.stroke();
  if (points.length) {
    const index = Math.floor(time * 34) % points.length;
    const marker = lorenzCoordinates(points[index], width, height);
    context.fillStyle = "#d7856f"; context.beginPath(); context.arc(marker.x, marker.y, 4, 0, Math.PI * 2); context.fill();
  }
}

function squareWavePartial(angle, terms) {
  let sum = 0;
  for (let term = 1; term <= terms; term++) {
    const harmonic = 2 * term - 1;
    sum += Math.sin(harmonic * angle) / harmonic;
  }
  return (4 / Math.PI) * sum;
}

function drawFourier(context, width, height, terms, time) {
  baseCanvas(context, width, height);
  const left = 36, right = width - 18, mid = height * .48;
  const span = right - left;
  const count = Math.max(1, Number(terms));
  context.strokeStyle = "rgba(39,48,58,.25)"; context.lineWidth = 1;
  context.beginPath(); context.moveTo(left, mid); context.lineTo(right, mid); context.stroke();
  context.strokeStyle = "#a85c4c"; context.lineWidth = 2;
  context.beginPath();
  for (let pixel = 0; pixel <= span; pixel += 1.5) {
    const angle = (pixel / span) * Math.PI * 4;
    const x = left + pixel;
    const y = mid - squareWavePartial(angle, count) * 35;
    pixel === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
  }
  context.stroke();
  const phase = (time % 5) / 5;
  const cursorX = left + phase * span;
  const cursorAngle = phase * Math.PI * 4;
  const cursorY = mid - squareWavePartial(cursorAngle, count) * 35;
  context.fillStyle = "#d7856f"; context.beginPath(); context.arc(cursorX, cursorY, 4, 0, Math.PI * 2); context.fill();
}

function codeFor(entry) {
  if (entry.machine?.command) return entry.machine.command;
  if (entry.visualType === "lorenz") return `# lorenz; one small machine\nσ, ρ, β = 10.0, ${entry.slider.value}, 8 / 3\nx, y, z = 0.1, 0.0, 0.0\nfor step in 1:9000\n    x, y, z = x + .008 * σ * (y - x), y + .008 * (x * (ρ - z) - y), z + .008 * (x * y - β * z)\nend\nprintln((x, y, z))`;
  if (entry.visualType === "phyllotaxis") return `# phyllotaxis; one small machine\nφ = (1 + sqrt(5)) / 2\nangle = 2π * (1 - 1 / φ)\nfor i in 0:219\n    r = sqrt((i + .5) / 220)\n    println((r * cos(i * angle), r * sin(i * angle)))\nend`;
  return `# ${entry.title.toLowerCase()}\n# the formula stays close to its picture\nprintln(${JSON.stringify(entry.formula)})`;
}

function formatDate(isoDate) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? isoDate : new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(date);
}

function wireBookplate(plate, entry, humansById) {
  const form = plate.querySelector(".bookplate-form");
  const preview = plate.querySelector(".bookplate-preview");
  if (!form || !preview) return;
  form.addEventListener("submit", event => {
    event.preventDefault();
    const name = String(new FormData(form).get("readerName") || "").trim();
    if (!name) return;
    const date = new Date().toISOString().slice(0, 10);
    const originators = entry.originators.map(id => humansById[id]?.name || slugWords(id)).join(" · ");
    preview.innerHTML = `<article class="bookplate-sheet">
      <span class="bookplate-formula">${escapeHtml(entry.formula)}</span>
      <p class="bookplate-belongs">This page of the book of nature belongs to</p>
      <h4>${escapeHtml(name)}</h4>
      <p class="bookplate-originators">In honor of ${escapeHtml(originators)}</p>
      <time datetime="${date}">${escapeHtml(formatDate(date))}</time>
      <button class="bookplate-print" type="button">Print this bookplate</button>
    </article>`;
    const sheet = preview.querySelector(".bookplate-sheet");
    preview.querySelector(".bookplate-print").addEventListener("click", () => {
      document.querySelectorAll(".bookplate-print-target").forEach(item => item.remove());
      const printCopy = sheet.cloneNode(true);
      printCopy.classList.add("bookplate-print-target");
      document.body.append(printCopy);
      document.body.classList.add("printing-bookplate");
      const restore = () => {
        document.body.classList.remove("printing-bookplate");
        printCopy.remove();
      };
      window.addEventListener("afterprint", restore, { once: true });
      window.print();
      window.setTimeout(restore, 1800);
    });
  });
}

async function startLorenzSound(button, points) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio is unavailable in this browser.");
  const audio = new AudioContextClass();
  await audio.resume();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  gain.gain.setValueAtTime(0, audio.currentTime);
  gain.gain.linearRampToValueAtTime(.035, audio.currentTime + .16);
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start();
  let index = 0;
  const trajectory = points.length ? points : [[0, 0, 0], [0, 0, 20], [0, 0, 40]];
  const timer = window.setInterval(() => {
    const z = Number(trajectory[index % trajectory.length][2]);
    const frequency = 90 + Math.max(0, Math.min(60, z)) * 5.2;
    oscillator.frequency.setTargetAtTime(frequency, audio.currentTime, .08);
    index = (index + 3) % trajectory.length;
  }, 60);
  return () => {
    window.clearInterval(timer);
    gain.gain.setTargetAtTime(0, audio.currentTime, .07);
    window.setTimeout(() => { try { oscillator.stop(); } catch (_error) {} audio.close().catch(() => {}); }, 220);
  };
}

async function startFourierSound(harmonicCount) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio is unavailable in this browser.");
  const audio = new AudioContextClass();
  await audio.resume();
  const master = audio.createGain();
  master.gain.setValueAtTime(0, audio.currentTime);
  master.gain.linearRampToValueAtTime(.12, audio.currentTime + .16);
  master.connect(audio.destination);
  const oscillators = [];
  for (let term = 1; term <= Number(harmonicCount); term++) {
    const harmonic = 2 * term - 1;
    const oscillator = audio.createOscillator();
    const partial = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 110 * harmonic;
    partial.gain.value = 1 / harmonic;
    oscillator.connect(partial); partial.connect(master); oscillator.start();
    oscillators.push(oscillator);
  }
  return () => {
    master.gain.setTargetAtTime(0, audio.currentTime, .07);
    window.setTimeout(() => {
      oscillators.forEach(oscillator => { try { oscillator.stop(); } catch (_error) {} });
      audio.close().catch(() => {});
    }, 220);
  };
}

function wireAudioButton(button, entry, computed, slider) {
  if (!button) return;
  const status = button.parentElement.querySelector(".sound-status");
  let stopSound = null;
  const silence = () => {
    if (!stopSound) return;
    const stop = stopSound;
    stopSound = null;
    if (activeAudioStop === silence) activeAudioStop = null;
    stop();
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `Play ${entry.id === "lorenz-attractor" ? "the Lorenz attractor" : "the Fourier series"}`);
    button.querySelector(".sound-label").textContent = "Hear the equation";
    if (status) status.textContent = "The sound is quiet.";
  };
  const play = async () => {
    if (activeAudioStop && activeAudioStop !== silence) activeAudioStop();
    try {
      stopSound = entry.id === "lorenz-attractor"
        ? await startLorenzSound(button, computed.lorenz?.points || [])
        : await startFourierSound(slider.value);
      activeAudioStop = silence;
      button.setAttribute("aria-pressed", "true");
      button.setAttribute("aria-label", "Silence the equation");
      button.querySelector(".sound-label").textContent = "Silence";
      if (status) status.textContent = "The sound is playing.";
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  };
  button.addEventListener("click", () => stopSound ? silence() : play());
  return () => {
    if (entry.id === "fourier-series" && stopSound) {
      silence();
      play();
    }
  };
}

function controlOutput(entry, control, rawValue) {
  const value = Number(rawValue);
  if (control.key === "halo") return `${Math.round(value * 100)}%`;
  if (control.key === "perturbation") return `δ = ${(value / 1000).toExponential(1)}`;
  if (control.key === "temperature") return `${value.toFixed(0)} K`;
  if (control.key === "logDensity") return `10^${value.toFixed(1)} cm⁻³`;
  if (control.key === "mass") return `${value.toFixed(0)} M☉`;
  if (control.key === "inflow") return `${value.toFixed(2)} L/L_Edd`;
  if (control.key === "alpha") return `α = ${value.toFixed(1)}`;
  if (control.key === "layer") return `G${["₀", "₁", "₂", "₃", "₄"][Math.round(value)] || "₀"}`;
  return prettyValue(value);
}

function wirePlate(plate, entry, computed, humansById) {
  const canvas = plate.querySelector("canvas");
  const sliders = [...plate.querySelectorAll(".entry-slider")];
  const controls = entry.controls || [entry.slider || { key: "parameter" }];
  const takeHome = plate.querySelector(".take-home");
  const audioButton = plate.querySelector(".sound-toggle");
  const primarySlider = sliders[0];
  let frame;
  const draw = timestamp => {
    const { context, width, height } = canvasContext(canvas);
    const values = sliders.map(slider => Number(slider.value));
    const value = values[0];
    if (entry.visualType === "euler") drawEuler(context, width, height, value, timestamp / 1000);
    else if (entry.visualType === "phyllotaxis") drawPhyllotaxis(context, width, height, value, computed.phyllotaxis);
    else if (entry.visualType === "lorenz") drawLorenz(context, width, height, value, computed.lorenz, timestamp / 1000);
    else if (entry.id === "fourier-series") drawFourier(context, width, height, value, timestamp / 1000);
    else if (entry.visualType === "galaxy-rotation") drawGalaxyRotation(context, width, height, value, computed);
    else if (entry.visualType === "three-body") drawThreeBody(context, width, height, value, computed, timestamp / 1000);
    else if (entry.visualType === "jeans-mass") drawJeansMass(context, width, height, values[0], values[1], computed);
    else if (entry.visualType === "eddington") drawEddington(context, width, height, values[0], values[1], computed);
    else if (entry.visualType === "schechter") drawSchechter(context, width, height, value, computed);
    else if (entry.visualType === "rubik-cayley") drawRubikCayley(context, width, height, value);
    else drawGeneric(context, width, height, entry, value, timestamp / 1000);
    if (!prefersReducedMotion) frame = requestAnimationFrame(draw);
  };
  const restartAudio = wireAudioButton(audioButton, entry, computed, primarySlider);
  sliders.forEach((slider, index) => {
    const control = controls[index] || { key: slider.dataset.control };
    const output = plate.querySelector(`[data-output="${CSS.escape(control.key || slider.dataset.control)}"]`);
    if (output) {
      output.value = controlOutput(entry, control, slider.value);
      output.textContent = controlOutput(entry, control, slider.value);
    }
    slider.addEventListener("input", () => {
      const shown = controlOutput(entry, control, slider.value);
      if (output) { output.value = shown; output.textContent = shown; }
      if (prefersReducedMotion) draw(0);
      if (restartAudio) restartAudio();
    });
  });
  takeHome.addEventListener("click", async () => {
    const original = takeHome.textContent;
    try {
      await navigator.clipboard.writeText(codeFor(entry));
      takeHome.textContent = "Copied the machine";
    } catch (_error) {
      takeHome.textContent = "Select the machine in source";
    }
    window.setTimeout(() => { takeHome.textContent = original; }, 1800);
  });
  wireBookplate(plate, entry, humansById);
  draw(0);
  plate.addEventListener("remove", () => cancelAnimationFrame(frame));
}

function wireRandom(entries) {
  const button = document.querySelector("#random-entry");
  if (!button) return;
  button.addEventListener("click", () => {
    const entry = entries[Math.floor(Math.random() * entries.length)];
    window.location.hash = entry.id;
    window.setTimeout(() => document.getElementById(entry.id)?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" }), 40);
  });
}

async function startBook() {
  const data = await readData({ computed: true });
  const computed = {
    phyllotaxis: data.phyllotaxis,
    lorenz: data.lorenz,
    galaxyRotation: data["galaxy-rotation"],
    threeBody: data["three-body"],
    jeansMass: data["jeans-mass"],
    eddington: data.eddington,
    schechter: data.schechter
  };
  renderEntries(data.entries, data.humans, computed);
  wireRandom(data.entries);
  wireRubikCubes(document);
}

function effectiveProblemStatus(problem, attempts = []) {
  if (problem.status === "verified" || attempts.some(attempt => attempt.status === "verified")) return "verified";
  if (problem.status === "under review" || attempts.some(attempt => attempt.status === "under review")) return "under review";
  return problem.status;
}

function problemStatus(problem, attempts = []) {
  const status = effectiveProblemStatus(problem, attempts);
  const statusClass = status.replaceAll(" ", "-");
  return `<span class="status ${statusClass}">${escapeHtml(status)}</span>`;
}

function problemRow(problem, attempts = []) {
  const source = `${problem.kind === "codex" ? `<span class="problem-origin">The book</span>` : ""}${resourceLinksMarkup(problem.sources, problem.source)}`;
  return `<tr data-field="${escapeHtml(problem.field)}" data-millennium="${problem.millennium}" data-kind="${escapeHtml(problem.kind || "world")}">
    <td class="problem-number">${String(problem.number).padStart(2, "0")}</td>
    <td class="problem-title"><a href="solve.html?problem=${encodeURIComponent(problem.id)}">${escapeHtml(problem.title)}</a><small>${problem.kind === "codex" ? escapeHtml(problem.label || "Codex problem") : problem.millennium ? "Millennium problem" : "Open at the solving desk"}</small><a class="problem-details-link" href="#${escapeHtml(problem.id)}">Read the arena page</a></td>
    <td class="problem-summary">${escapeHtml(problem.summary)}</td>
    <td>${problemStatus(problem, attempts)}</td>
    <td class="problem-source-links">${source}</td>
  </tr>`;
}

function startProblemFilters(problems, attempts) {
  const filters = document.querySelector("#problem-filters");
  const list = document.querySelector("#problem-list");
  const count = document.querySelector("#open-count");
  const show = filter => {
    const visible = problems.filter(problem => {
      if (filter === "all") return true;
      if (filter === "millennium") return problem.millennium;
      if (filter === "book") return problem.kind === "codex";
      return problem.field === filter;
    });
    list.innerHTML = visible.map(problem => problemRow(problem, attempts.filter(attempt => attempt.problemId === problem.id))).join("");
    count.textContent = visible.filter(problem => ["open", "under review"].includes(effectiveProblemStatus(problem, attempts.filter(attempt => attempt.problemId === problem.id)))).length;
  };
  filters.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    filters.querySelectorAll("button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    show(button.dataset.filter);
  });
  show("all");
}

function statusStamp(status, date) {
  const classes = { attempted: "attempted", "under review": "under-review", verified: "verified", withdrawn: "withdrawn" };
  const className = classes[status] || "attempted";
  const label = status === "under review" ? `Under review, ${formatDate(date)}` : status === "verified" ? `Verified, ${formatDate(date)}` : status === "withdrawn" ? `Withdrawn, ${formatDate(date)}` : "Attempted";
  return `<span class="status-stamp ${className}">${escapeHtml(label)}</span>`;
}

function formatInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function markdownToHtml(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const output = [];
  let paragraph = [];
  let list = [];
  let code = [];
  let inCode = false;
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${paragraph.map(formatInlineMarkdown).join(" ")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) output.push(`<ul>${list.map(item => `<li>${formatInlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };
  lines.forEach(line => {
    if (/^\s*```/.test(line)) {
      flushParagraph(); flushList();
      if (inCode) {
        output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
      }
      inCode = !inCode;
      return;
    }
    if (inCode) { code.push(line); return; }
    if (!line.trim()) { flushParagraph(); flushList(); return; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const level = Math.min(heading[1].length + 2, 6);
      output.push(`<h${level}>${formatInlineMarkdown(heading[2])}</h${level}>`);
      return;
    }
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bullet) { flushParagraph(); list.push(bullet[1]); return; }
    flushList(); paragraph.push(line.trim());
  });
  flushParagraph(); flushList();
  if (inCode) output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return output.join("");
}

function submissionMarkup(attempt) {
  const isVerified = attempt.status === "verified";
  const verifiedRecord = isVerified ? `<div class="solution-inscription">
    <p><span>Solved by, recorded on</span> <strong>${escapeHtml(attempt.name)}</strong>, <time datetime="${escapeHtml(attempt.date)}">${escapeHtml(formatDate(attempt.date))}</time>.</p>
    ${attempt.verification ? `<p>${escapeHtml(attempt.verification)}</p>` : ""}
  </div>` : "";
  let attachment = "";
  if (attempt.solutionPath) {
    attachment = `<div class="solution-attachment" data-solution-path="${escapeHtml(attempt.solutionPath)}" data-solution-type="${escapeHtml(attempt.solutionType || "")}">
      <div class="solution-file-heading"><span>${attempt.solutionType === "proof" ? "Proof file" : "Computational witness"}</span><span>${escapeHtml(attempt.solutionPath.split("/").pop())}</span></div>
      <div class="solution-file-content"><p class="solution-loading">The file is opening.</p></div>
      ${attempt.command ? `<p class="rerun-command"><span>Exact command</span><code>${escapeHtml(attempt.command)}</code></p>` : ""}
      ${attempt.output ? `<div class="witness-output"><span>${isVerified ? "Verified output" : "Observed output, not yet verified"}</span><pre>${escapeHtml(attempt.output)}</pre></div>` : ""}
    </div>`;
  }
  return `<article class="submission-card ${escapeHtml(attempt.status.replaceAll(" ", "-"))}">
    <div class="submission-heading"><div><h5>${escapeHtml(attempt.name)}</h5><time datetime="${escapeHtml(attempt.date)}">${escapeHtml(formatDate(attempt.date))}</time></div>${statusStamp(attempt.status, attempt.date)}</div>
    <p class="submission-claim">${escapeHtml(attempt.claim)}</p>
    ${verifiedRecord}
    ${attempt.reviewNote ? `<p class="submission-review">${escapeHtml(attempt.reviewNote)}</p>` : ""}
    ${attachment}
    <a class="submission-link" href="${escapeHtml(attempt.link)}" target="_blank" rel="noreferrer">Read the record ↗</a>
  </article>`;
}

function problemPage(problem, attempts) {
  const house = problem.kind === "codex";
  const status = problemStatus(problem, attempts);
  const statement = problem.statement || problem.summary;
  const attemptsHtml = attempts.length
    ? attempts.map(submissionMarkup).join("")
    : `<p class="empty-solutions">No submission is recorded here yet. The solutions area stays open for a proof or a computational witness.</p>`;
  const closureNote = problem.id === "poincare-conjecture"
    ? `<p class="closed-solution-link">The proof and its formal verification are recorded on <a href="solved.html#poincare-conjecture">the closed page ↗</a>.</p>`
    : "";
  return `<article class="problem-page ${house ? "house-problem" : "world-problem"}" id="${escapeHtml(problem.id)}">
    <div class="problem-page-top"><div><span class="problem-page-index">${escapeHtml(problem.label || `Problem ${String(problem.number).padStart(2, "0")}`)} · ${escapeHtml(problem.field)}</span><h3>${escapeHtml(problem.title)}</h3></div>${status}</div>
    ${house && problem.problemType ? `<p class="problem-type">Type; ${escapeHtml(problem.problemType)}</p>` : ""}
    <p class="problem-statement">${escapeHtml(statement)}</p>
    <p class="problem-source-line"><span>Source line</span>${resourceLinksMarkup(problem.sources, problem.source)}<a href="solve.html?problem=${encodeURIComponent(problem.id)}">Open at the solving desk ↗</a></p>
    ${house && problem.approach ? `<p class="problem-approach"><span>A way in</span>${escapeHtml(problem.approach)}</p>` : ""}
    <section class="solutions-area" aria-label="Solutions and attempts for ${escapeHtml(problem.title)}">
      <div class="solutions-heading"><span>Solutions area</span><small>Attempted → under review → verified</small></div>
      ${attemptsHtml}
      ${closureNote}
    </section>
  </article>`;
}

async function loadSolutionFiles(root) {
  await Promise.all([...root.querySelectorAll(".solution-attachment")].map(async attachment => {
    const content = attachment.querySelector(".solution-file-content");
    if (attachment.dataset.solutionType === "proof" && !attachment.closest(".submission-card")?.classList.contains("verified")) {
      content.innerHTML = "<p class=\"solution-loading\">The full proof waits here until verification.</p>";
      return;
    }
    try {
      const response = await fetch(attachment.dataset.solutionPath);
      if (!response.ok) throw new Error("The published file could not be opened.");
      const text = await response.text();
      if (attachment.dataset.solutionType === "proof") {
        content.className = "solution-file-content proof-markdown";
        content.innerHTML = markdownToHtml(text);
      } else {
        content.innerHTML = "";
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = text;
        pre.append(code);
        content.append(pre);
        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "copy-witness";
        copy.textContent = "Copy the witness";
        copy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(text);
            copy.textContent = "Copied the witness";
          } catch (_error) {
            copy.textContent = "Select the source above";
          }
          window.setTimeout(() => { copy.textContent = "Copy the witness"; }, 1800);
        });
        content.append(copy);
      }
    } catch (error) {
      content.innerHTML = `<p class="solution-loading">${escapeHtml(error.message)}</p>`;
    }
  }));
}

function renderProblemPages(problems, attempts) {
  const byProblem = Object.groupBy ? Object.groupBy(attempts, attempt => attempt.problemId) : attempts.reduce((groups, attempt) => {
    (groups[attempt.problemId] ||= []).push(attempt);
    return groups;
  }, {});
  const world = problems.filter(problem => problem.kind !== "codex");
  const house = problems.filter(problem => problem.kind === "codex");
  document.querySelector("#world-problem-pages").innerHTML = world.map(problem => problemPage(problem, byProblem[problem.id] || [])).join("");
  document.querySelector("#house-problem-pages").innerHTML = house.map(problem => problemPage(problem, byProblem[problem.id] || [])).join("");
  loadSolutionFiles(document);
}

function renderAttempts(attempts, problems) {
  const problemById = Object.fromEntries(problems.map(problem => [problem.id, problem]));
  document.querySelector("#attempt-list").innerHTML = attempts.map(attempt => {
    const problem = problemById[attempt.problemId];
    return `<div class="attempt">
      <div><strong>${escapeHtml(attempt.name)}</strong><small> · ${escapeHtml(problem?.title || attempt.problemId)}</small><p class="problem-summary">${escapeHtml(attempt.claim)}</p></div>
      <small>${escapeHtml(formatDate(attempt.date))}</small>
      <div>${statusStamp(attempt.status, attempt.date)}<br><a href="#${escapeHtml(attempt.problemId)}">Problem page ↗</a><br><a href="${escapeHtml(attempt.link)}" target="_blank" rel="noreferrer">Read the record ↗</a></div>
    </div>`;
  }).join("");
}

function startProblems(data) {
  startProblemFilters(data.problems, data.attempts);
  renderProblemPages(data.problems, data.attempts);
  renderAttempts(data.attempts, data.problems);
  scrollToCurrentHash();
}

function renderDesk(problem, data, method) {
  const record = data.desk.find(item => item.problemId === problem.id) || { definitions: [], relatedEntries: [], machines: [] };
  const attempts = data.attempts.filter(attempt => attempt.problemId === problem.id);
  const entriesById = Object.fromEntries(data.entries.map(entry => [entry.id, entry]));
  const kind = problem.kind === "codex" ? `House problem ${escapeHtml(problem.label || "")}` : "World problem";
  const statement = problem.statement || problem.summary;
  const problemBlock = document.querySelector("#desk-problem-block");
  problemBlock.innerHTML = `<div class="desk-block-top"><span class="desk-block-number">01 / Selected question</span><span class="desk-problem-kind">${kind}</span></div>
    <h2 id="desk-problem-title">${escapeHtml(problem.title)}</h2>
    <div class="desk-problem-meta"><span><strong>Field</strong>${escapeHtml(problem.field)}</span><span><strong>Status</strong><em class="desk-open-status">${escapeHtml(problem.status)}</em></span><span><strong>Ledger ID</strong><code>${escapeHtml(problem.id)}</code></span></div>
    <p class="desk-problem-statement">${escapeHtml(statement)}</p>
    <div class="desk-source-row"><span>Sources</span>${resourceLinksMarkup(problem.sources, problem.source)}</div>
    <a class="desk-arena-link" href="problems.html#${escapeHtml(problem.id)}">Read the full arena page ↗</a>`;

  const definitionsBlock = document.querySelector("#desk-definitions-block");
  const definitionCards = record.definitions.map(definition => {
    const entry = entriesById[definition.entryId];
    if (!entry) return "";
    return `<article class="desk-definition"><h3>${escapeHtml(definition.term)}</h3><p>${escapeHtml(definition.explanation)}</p><a href="index.html#${escapeHtml(entry.id)}">${escapeHtml(entry.title)} · ${escapeHtml(entry.formula)} ↗</a></article>`;
  }).join("");
  definitionsBlock.innerHTML = `<div class="desk-block-top"><span class="desk-block-number">02 / Working vocabulary</span></div><h2 id="desk-definitions-title">Definitions in the book</h2>${definitionCards || `<p class="desk-empty">No directly relevant definition has a dedicated book entry yet.</p>`}`;

  const platesBlock = document.querySelector("#desk-plates-block");
  const plates = record.relatedEntries.map(id => entriesById[id]).filter(Boolean).map(entry => `<a class="desk-related-plate" href="index.html#${escapeHtml(entry.id)}"><span class="desk-related-number">${String(entry.number).padStart(2, "0")} / ${escapeHtml(entry.domain)}</span><strong>${escapeHtml(entry.title)}</strong><code>${escapeHtml(entry.formula)}</code><span>Open the plate ↗</span></a>`).join("");
  platesBlock.innerHTML = `<div class="desk-block-top"><span class="desk-block-number">03 / A short bridge</span></div><h2 id="desk-plates-title">Related book plates</h2>${plates || `<p class="desk-empty">No directly related plate is in the book yet.</p>`}`;

  const machinesBlock = document.querySelector("#desk-machines-block");
  const machines = record.machines.map(machine => {
    const servedPath = String(machine.path || "").startsWith("scripts/") ? `machines/${machine.path.slice(8)}` : machine.path;
    return `<article class="desk-machine"><div><span class="desk-machine-title">${escapeHtml(machine.title)}</span><p>${escapeHtml(machine.description)}</p><a href="${escapeHtml(servedPath)}">Read the source file ↗</a></div><div><span class="desk-command-label">Exact rerun command, from the repository root</span><code class="desk-command">${escapeHtml(machine.command)}</code></div></article>`;
  }).join("");
  machinesBlock.innerHTML = `<div class="desk-block-top"><span class="desk-block-number">04 / Reproducible work</span></div><h2 id="desk-machines-title">Relevant take-home machines</h2>${machines || `<p class="desk-empty">No directly relevant runnable machine is attached to this question yet.</p>`}`;

  const attemptsBlock = document.querySelector("#desk-attempts-block");
  const attemptCards = attempts.length ? attempts.map(submissionMarkup).join("") : `<p class="desk-empty">No dated attempt is recorded for this problem.</p>`;
  attemptsBlock.innerHTML = `<div class="desk-block-top"><span class="desk-block-number">05 / The public ledger</span></div><h2 id="desk-attempts-title">Named attempts</h2><p class="desk-attempt-status-line">Attempted → Under review → Verified, or Withdrawn.</p>${attemptCards}`;
  loadSolutionFiles(attemptsBlock);

  const result = document.querySelector("#desk-result");
  const resultLabel = document.querySelector("#desk-result-label");
  const means = { die: "The die settled", cube: "The cube settled", link: "The direct link opened", random: "The desk chose" };
  resultLabel.textContent = `${means[method] || "The desk chose"} on ${problem.title}.`;
  result.hidden = false;
  const form = document.querySelector("#attempt-form");
  form.dataset.problemId = problem.id;
  form.onsubmit = event => {
    event.preventDefault();
    const values = new FormData(form);
    const name = String(values.get("name") || "").trim();
    const claim = String(values.get("claim") || "").trim().replace(/[\r\n]+/g, " ");
    const workLink = String(values.get("link") || "").trim();
    if (!name || !claim || !workLink) return;
    let parsedLink;
    try { parsedLink = new URL(workLink); } catch (_error) { return; }
    if (!["http:", "https:"].includes(parsedLink.protocol)) return;
    const now = new Date();
    const date = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const body = [
      "## Attempt for the public ledger",
      "",
      `- Name: ${name}`,
      `- Date: ${date}`,
      `- Problem ID: ${problem.id}`,
      `- Claim: ${claim}`,
      `- Work link: ${parsedLink.href}`,
      "- Status: Attempted",
      "",
      "## Verification ladder",
      "",
      "Attempted → Under review → Verified, or Withdrawn.",
      "An attempt appears on the static ledger only after a ledger pull request is reviewed and merged.",
      "Verification requires a published peer-reviewed result or a checked formal proof."
    ].join("\n");
    const issue = new URL("https://github.com/Mascottz/codex-naturalis/issues/new");
    issue.searchParams.set("title", `[Attempt] ${problem.id}: ${claim.slice(0, 80)}`);
    issue.searchParams.set("body", body);
    window.location.assign(issue.href);
  };
}

async function startSolve() {
  const data = await readData({ desk: true });
  const openProblems = data.problems.filter(problem => problem.status === "open");
  const stage = document.querySelector("#desk-roll-stage");
  const rollStatus = document.querySelector("#desk-roll-status");
  const dieButton = document.querySelector("#roll-die");
  const cubeMount = document.querySelector("#desk-cube-mount");
  cubeMount.innerHTML = rubikCubeMarkup("desk-rubik-cube", "desk");
  wireRubikCubes(document, { onChoose: () => rollDesk("cube") });
  const diePips = [...dieButton.querySelectorAll(".die-pip")];
  const dieFaces = { 1: ["pip-center"], 2: ["pip-one", "pip-six"], 3: ["pip-one", "pip-center", "pip-six"], 4: ["pip-one", "pip-two", "pip-five", "pip-six"], 5: ["pip-one", "pip-two", "pip-center", "pip-five", "pip-six"], 6: ["pip-one", "pip-two", "pip-three", "pip-four", "pip-five", "pip-six"] };
  const setDieFace = face => diePips.forEach(pip => { pip.style.opacity = dieFaces[face].includes([...pip.classList].find(name => name.startsWith("pip-"))) ? "1" : "0"; });
  setDieFace(1);
  const requestedId = new URLSearchParams(window.location.search).get("problem");
  const requested = requestedId ? data.problems.find(problem => problem.id === requestedId) : null;
  const invalidRequested = Boolean(requestedId && (!requested || requested.status !== "open"));
  let isRolling = false;
  let rollSequence = 0;
  function rollDesk(method, fixedProblem = null) {
    if (!openProblems.length || isRolling) return;
    isRolling = true;
    rollSequence += 1;
    const sequence = rollSequence;
    const problem = fixedProblem || openProblems[Math.floor(Math.random() * openProblems.length)];
    const cube = cubeMount.querySelector(".rubik-toy");
    stage.classList.add("is-rolling");
    dieButton.disabled = true;
    rollStatus.textContent = "The die and cube are moving through the same scramble.";
    const moves = scrambleRubikCube(cube, 25);
    let pipTurn = 0;
    const pipTimer = window.setInterval(() => {
      pipTurn = Math.floor(Math.random() * 6) + 1;
      setDieFace(pipTurn);
    }, 76);
    window.setTimeout(() => {
      if (sequence !== rollSequence) return;
      window.clearInterval(pipTimer);
      const finalFace = Math.floor(Math.random() * 6) + 1;
      setDieFace(finalFace);
      stage.classList.remove("is-rolling");
      dieButton.disabled = false;
      isRolling = false;
      rollStatus.textContent = invalidRequested
        ? `The linked problem is not open; the desk has drawn ${problem.title} from the open ledger.`
        : `${moves.length} legal cube turns; the desk lands on ${problem.title}.`;
      renderDesk(problem, data, method);
    }, moves.length * 42 + 270);
  }
  dieButton.addEventListener("click", () => rollDesk("die"));
  document.querySelector("#attempt-form").addEventListener("input", event => {
    if (event.target.name === "claim") event.target.value = event.target.value.replace(/[\r\n]+/g, " ");
  });
  if (requested && requested.status === "open") {
    rollDesk("link", requested);
  } else {
    if (requestedId) rollStatus.textContent = "That linked problem is not currently open. The desk will draw from every problem marked open.";
    rollDesk("random");
  }
}

function humanCard(human, entriesById, solvedById) {
  const entryLinks = (human.entryIds || []).map(id => {
    const entry = entriesById[id];
    const label = entry ? entry.title : slugWords(id);
    return `<a href="index.html#${escapeHtml(id)}">${escapeHtml(label)}</a>`;
  });
  const solvedLinks = (human.solvedIds || []).map(id => {
    const solved = solvedById[id];
    const label = solved ? solved.title : slugWords(id);
    return `<a href="solved.html#${escapeHtml(id)}">${escapeHtml(label)}</a>`;
  });
  const links = [...entryLinks, ...solvedLinks].join(" · ");
  return `<article class="human-card" id="${escapeHtml(human.id)}" data-era="${escapeHtml(human.era)}" data-region="${escapeHtml(human.region)}">
    <span class="human-era">${escapeHtml(human.era)} · ${escapeHtml(human.region)}</span>${links ? `<span class="human-entry-links">${links}</span>` : ""}
    <h2>${escapeHtml(human.name)}</h2><p class="human-role">${escapeHtml(sentenceCase(human.role))} · ${escapeHtml(human.years)}</p><p>${escapeHtml(human.note)}</p>
  </article>`;
}

function originYear(human) {
  const text = String(human.years || "").replace(/[\u2012-\u2015]/g, "-");
  const match = text.match(/\d{3,4}/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const value = Number(match[0]);
  return /\bBCE\b/i.test(text) ? -Math.abs(value) : value;
}

function originYearLabel(human) {
  const year = originYear(human);
  return year < 0 ? `${Math.abs(year)} BCE` : Number.isFinite(year) && year !== Number.MAX_SAFE_INTEGER ? String(year) : "Date uncertain";
}

function renderTimeline(humans) {
  const timeline = document.querySelector("#timeline");
  const sorted = [...humans].sort((a, b) => originYear(a) - originYear(b) || a.name.localeCompare(b.name));
  const nodes = [
    { name: "Babylon", detail: "Mesopotamia · c. 1800 BCE" },
    ...sorted.map(human => ({ name: human.name, detail: `${originYearLabel(human)} · ${human.region}`, href: `#${human.id}` })),
    { name: "Now", detail: "The margin stays open" }
  ];
  timeline.style.width = `${Math.max(2800, nodes.length * 128)}px`;
  timeline.innerHTML = nodes.map((node, index) => {
    const left = 3 + (index / Math.max(nodes.length - 1, 1)) * 94;
    const lane = index % 2 === 0 ? "above" : "below";
    const name = node.href ? `<a href="${escapeHtml(node.href)}">${escapeHtml(node.name)}</a>` : escapeHtml(node.name);
    return `<div class="timeline-item ${lane}" style="left:${left}%"><strong>${name}</strong><small>${escapeHtml(node.detail)}</small></div>`;
  }).join("");
}

function startHumanFilters(humans, entries, solved) {
  const filters = document.querySelector("#human-filters");
  const eras = [...new Set(humans.map(human => human.era))];
  const regions = [...new Set(humans.map(human => human.region))].sort();
  filters.innerHTML = `<button class="filter-button active" data-mode="all" data-filter="all" type="button">All cards</button>${eras.map(era => `<button class="filter-button" data-mode="era" data-filter="${escapeHtml(era)}" type="button">${escapeHtml(era)}</button>`).join("")} ${regions.map(region => `<button class="filter-button" data-mode="region" data-filter="${escapeHtml(region)}" type="button">${escapeHtml(region)}</button>`).join("")}`;
  const grid = document.querySelector("#human-grid");
  const count = document.querySelector("#human-count");
  const entriesById = Object.fromEntries(entries.map(entry => [entry.id, entry]));
  const solvedById = Object.fromEntries(solved.map(problem => [problem.id, problem]));
  const show = (mode, filter) => {
    const visible = humans.filter(human => mode === "all" || human[mode] === filter);
    grid.innerHTML = visible.map(human => humanCard(human, entriesById, solvedById)).join("");
    count.textContent = visible.length;
  };
  filters.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    filters.querySelectorAll("button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    show(button.dataset.mode, button.dataset.filter);
  });
  show("all", "all");
}

function solverNames(solvers, humansById) {
  return solvers.map(solver => {
    const human = solver.humanId ? humansById[solver.humanId] : null;
    return human
      ? `<a href="humans.html#${escapeHtml(human.id)}">${escapeHtml(solver.name)}</a>`
      : `<span>${escapeHtml(solver.name)}</span>`;
  }).join('<span class="solver-separator"> · </span>');
}

function renderSolved(problems, humans) {
  const mount = document.querySelector("#solved-list");
  const humansById = Object.fromEntries(humans.map(human => [human.id, human]));
  mount.innerHTML = problems.map(problem => `<article class="solved-plate" id="${escapeHtml(problem.id)}" data-verification="${escapeHtml(problem.verificationType)}">
    <div class="solved-topline"><span class="solved-number">${String(problem.number || "").padStart(2, "0")}</span><span class="verification-register ${escapeHtml(problem.verificationType.replaceAll(" ", "-"))}">${escapeHtml(problem.verificationType)}</span></div>
    <h2>${escapeHtml(problem.title)}</h2>
    ${problem.formula ? `<p class="solved-formula"><code>${escapeHtml(problem.formula)}</code></p>` : ""}
    <p class="solved-solver"><span>Solver${problem.solvers.length > 1 ? "s" : ""}</span>${solverNames(problem.solvers, humansById)}</p>
    <p class="solved-year"><span>Year</span>${escapeHtml(problem.year)}</p>
    <p class="solved-verification">${escapeHtml(problem.verification)}</p>
    <a class="solved-source" href="${escapeHtml(problem.source)}" target="_blank" rel="noreferrer">Source and verification ↗</a>
  </article>`).join("");
  document.querySelector("#solved-count").textContent = problems.length;
}

function verifiedHousePages(problems, attempts, existing) {
  const known = new Set(existing.map(problem => problem.id));
  const houses = problems.filter(problem => problem.kind === "codex");
  const records = [];
  houses.forEach(problem => attempts.filter(attempt => attempt.problemId === problem.id && attempt.status === "verified").forEach(attempt => {
    if (known.has(problem.id)) return;
    records.push({
      id: problem.id,
      number: 100 + Number(problem.number || 0),
      title: problem.title,
      year: attempt.date,
      solvers: [{ name: attempt.name, ...(attempt.humanId ? { humanId: attempt.humanId } : {}) }],
      verificationType: attempt.solutionType === "proof" ? "formal" : "formal",
      verification: attempt.verification || "The verified solution and its referee record remain published on the problem page.",
      source: attempt.link
    });
    known.add(problem.id);
  }));
  return records;
}

function startSolved(data) {
  const published = [...data.solved, ...verifiedHousePages(data.problems, data.attempts, data.solved)];
  published.sort((a, b) => Number(a.number) - Number(b.number));
  renderSolved(published, data.humans);
  scrollToCurrentHash();
}

function startHumans(data) {
  renderTimeline(data.humans);
  startHumanFilters(data.humans, data.entries, data.solved);
  scrollToCurrentHash();
}

function toyCanvas(canvas, defaultHeight = 310) {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(280, canvas.clientWidth || 640);
  const height = canvas.clientHeight || defaultHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

function startBuffon() {
  const canvas = document.querySelector("#buffon-canvas");
  if (!canvas) return;
  const slider = document.querySelector("#buffon-count");
  const countValue = document.querySelector("#buffon-count-value");
  const progress = document.querySelector("#buffon-progress");
  const estimate = document.querySelector("#buffon-estimate");
  const crossingsText = document.querySelector("#buffon-crossings");
  let frame = 0;
  let segments = [];
  let crossings = 0;
  let complete = 0;
  let target = Number(slider.value);

  const draw = () => {
    const { context, width, height } = toyCanvas(canvas);
    context.fillStyle = "#f4eee2"; context.fillRect(0, 0, width, height);
    const spacing = 42;
    context.strokeStyle = "rgba(39,48,58,.19)"; context.lineWidth = 1;
    for (let y = -spacing; y < height + spacing; y += spacing) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
    }
    const visible = segments.length > 1250 ? segments.filter((_, index) => index % Math.ceil(segments.length / 1250) === 0) : segments;
    visible.forEach(segment => {
      context.strokeStyle = segment.crosses ? "rgba(168,92,76,.7)" : "rgba(39,48,58,.55)";
      context.lineWidth = 1.3;
      context.beginPath(); context.moveTo(segment.x1, segment.y1); context.lineTo(segment.x2, segment.y2); context.stroke();
    });
  };
  const run = () => {
    window.cancelAnimationFrame(frame);
    target = Number(slider.value);
    countValue.textContent = prettyValue(target);
    segments = []; crossings = 0; complete = 0;
    progress.textContent = `Needles: 0 / ${prettyValue(target)}`;
    crossingsText.textContent = "Crossings: 0";
    estimate.textContent = "π ≈ waiting";
    const spacing = 42;
    const halfLength = spacing / 2;
    const tick = () => {
      const { width, height } = toyCanvas(canvas);
      const batchEnd = Math.min(target, complete + 110);
      for (; complete < batchEnd; complete++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const angle = Math.random() * Math.PI;
        const dx = halfLength * Math.cos(angle), dy = halfLength * Math.sin(angle);
        const y1 = y - dy, y2 = y + dy;
        const crosses = Math.floor(y1 / spacing) !== Math.floor(y2 / spacing);
        if (crosses) crossings++;
        segments.push({ x1: x - dx, y1, x2: x + dx, y2, crosses });
      }
      draw();
      progress.textContent = `Needles: ${prettyValue(complete)} / ${prettyValue(target)}`;
      crossingsText.textContent = `Crossings: ${prettyValue(crossings)}`;
      estimate.textContent = crossings ? `π ≈ ${(2 * complete / crossings).toFixed(5)}` : "π ≈ waiting for a crossing";
      if (complete < target) frame = requestAnimationFrame(tick);
    };
    tick();
  };
  slider.addEventListener("input", run);
  document.querySelector("#buffon-run").addEventListener("click", run);
  window.addEventListener("resize", draw);
  run();
}

function startGalton() {
  const canvas = document.querySelector("#galton-canvas");
  if (!canvas) return;
  const slider = document.querySelector("#galton-count");
  const countValue = document.querySelector("#galton-count-value");
  const progress = document.querySelector("#galton-progress");
  const mostCommon = document.querySelector("#galton-most-common");
  const rows = 12;
  const bins = Array(rows + 1).fill(0);
  let paths = [];
  let complete = 0;
  let target = Number(slider.value);
  let frame = 0;

  const draw = () => {
    const { context, width, height } = toyCanvas(canvas);
    context.clearRect(0, 0, width, height);
    const boardLeft = 12, boardWidth = width * .48, center = boardLeft + boardWidth / 2;
    const boardTop = 27, boardBottom = height * .69, rowGap = (boardBottom - boardTop) / rows;
    const stepX = Math.min(rowGap * .88, boardWidth / (rows + 1) * 1.45);
    paths.forEach(path => {
      context.strokeStyle = "rgba(168,92,76,.12)"; context.lineWidth = 1;
      context.beginPath();
      path.forEach((state, row) => {
        const x = center + (state - row / 2) * stepX;
        const y = boardTop + row * rowGap;
        row === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
      });
      context.stroke();
    });
    for (let row = 0; row < rows; row++) {
      for (let state = 0; state <= row; state++) {
        const x = center + (state - row / 2) * stepX;
        const y = boardTop + row * rowGap;
        context.fillStyle = "#27303a"; context.beginPath(); context.arc(x, y, 2.7, 0, Math.PI * 2); context.fill();
      }
    }
    const histogramLeft = width * .57, histogramRight = width - 13, histogramTop = 25, histogramBottom = height - 33;
    context.strokeStyle = "rgba(39,48,58,.25)"; context.beginPath(); context.moveTo(histogramLeft, histogramBottom); context.lineTo(histogramRight, histogramBottom); context.stroke();
    const slot = (histogramRight - histogramLeft) / bins.length;
    const maxBin = Math.max(1, ...bins);
    bins.forEach((value, index) => {
      const barHeight = (value / maxBin) * (histogramBottom - histogramTop) * .77;
      context.fillStyle = index === Math.floor(rows / 2) ? "#a85c4c" : "rgba(82,113,103,.72)";
      context.fillRect(histogramLeft + index * slot + slot * .18, histogramBottom - barHeight, slot * .64, barHeight);
    });
    context.fillStyle = "rgba(39,48,58,.62)"; context.font = "10px SFMono-Regular, Consolas, monospace";
    context.fillText("final bins", histogramLeft, 15);
    context.fillText("12 rows", boardLeft, height - 8);
  };
  const run = () => {
    window.cancelAnimationFrame(frame);
    target = Number(slider.value); countValue.textContent = prettyValue(target);
    bins.fill(0); paths = []; complete = 0;
    progress.textContent = `Beads: 0 / ${prettyValue(target)}`;
    mostCommon.textContent = "The bins are gathering.";
    const tick = () => {
      const end = Math.min(target, complete + 45);
      for (; complete < end; complete++) {
        let state = 0;
        const path = [state];
        for (let row = 0; row < rows; row++) {
          if (Math.random() < .5) state++;
          path.push(state);
        }
        bins[state]++;
        if (paths.length < 150) paths.push(path);
      }
      draw();
      progress.textContent = `Beads: ${prettyValue(complete)} / ${prettyValue(target)}`;
      const mode = bins.indexOf(Math.max(...bins));
      mostCommon.textContent = `Most beads so far land in bin ${mode + 1}.`;
      if (complete < target) frame = requestAnimationFrame(tick);
    };
    tick();
  };
  slider.addEventListener("input", run);
  document.querySelector("#galton-run").addEventListener("click", run);
  window.addEventListener("resize", draw);
  run();
}

function startChaosGame() {
  const canvas = document.querySelector("#chaos-canvas");
  if (!canvas) return;
  const slider = document.querySelector("#chaos-count");
  const countValue = document.querySelector("#chaos-count-value");
  const progress = document.querySelector("#chaos-progress");
  let frame = 0;
  let x = 0, y = 0, complete = 0, target = Number(slider.value);
  let context = null, width = 0, height = 0, corners = [];
  const drawFrame = () => {
    const fitted = toyCanvas(canvas);
    context = fitted.context; width = fitted.width; height = fitted.height;
    corners = [{ x: width * .5, y: height * .09 }, { x: width * .1, y: height * .9 }, { x: width * .9, y: height * .9 }];
    context.clearRect(0, 0, width, height);
    context.beginPath(); corners.forEach((corner, index) => index ? context.lineTo(corner.x, corner.y) : context.moveTo(corner.x, corner.y));
    context.closePath(); context.strokeStyle = "rgba(39,48,58,.3)"; context.lineWidth = 1; context.stroke();
    context.fillStyle = "rgba(168,92,76,.75)";
  };
  const run = () => {
    window.cancelAnimationFrame(frame);
    target = Number(slider.value); countValue.textContent = prettyValue(target);
    drawFrame();
    x = width / 2; y = height * .54; complete = 0;
    progress.textContent = `Points: 0 / ${prettyValue(target)}`;
    const tick = () => {
      const end = Math.min(target, complete + 1100);
      for (; complete < end; complete++) {
        const corner = corners[Math.floor(Math.random() * 3)];
        x = (x + corner.x) / 2;
        y = (y + corner.y) / 2;
        if (complete > 0) context.fillRect(x, y, 1.25, 1.25);
      }
      progress.textContent = `Points: ${prettyValue(complete)} / ${prettyValue(target)}`;
      if (complete < target) frame = requestAnimationFrame(tick);
    };
    tick();
  };
  slider.addEventListener("input", run);
  document.querySelector("#chaos-run").addEventListener("click", run);
  window.addEventListener("resize", run);
  run();
}

function startHilbertHotel() {
  const rooms = document.querySelector("#hotel-rooms");
  if (!rooms) return;
  const arrivals = document.querySelector("#hotel-arrivals");
  let count = 0;
  const render = () => {
    arrivals.textContent = `New arrivals: ${prettyValue(count)}`;
    rooms.innerHTML = Array.from({ length: 12 }, (_, index) => {
      const room = index + 1;
      const guest = count > 0 && room <= count ? `New guest ${count - room + 1}` : `Guest ${Math.max(1, room - count)}`;
      const recent = count > 0 && room === 1 ? " new-arrival" : "";
      return `<li class="hotel-room${recent}"><span>Room ${room}</span><strong>${guest}</strong></li>`;
    }).join("");
  };
  document.querySelector("#hotel-arrive").addEventListener("click", () => { count++; render(); });
  document.querySelector("#hotel-reset").addEventListener("click", () => { count = 0; render(); });
  render();
}

function startToys() {
  startBuffon();
  startGalton();
  startChaosGame();
  startHilbertHotel();
}

function showLoadError(selector, label, error) {
  const mount = document.querySelector(selector);
  if (mount) mount.innerHTML = `<p class="human-story">${escapeHtml(label)} ${escapeHtml(error.message)}</p>`;
}

async function wireArenaBadge() {
  const badges = [...document.querySelectorAll(".site-nav sup")];
  if (!badges.length) return;
  try {
    const response = await fetch("data/problems.json");
    if (!response.ok) return;
    const problems = await response.json();
    if (!Array.isArray(problems)) return;
    badges.forEach(badge => { badge.textContent = String(problems.length); });
  } catch (_error) {
    /* the printed count stays as the fallback */
  }
}
wireArenaBadge();

if (document.body.dataset.page === "book") {
  startBook().catch(error => showLoadError("#entries", "The computed pages are resting.", error));
}
if (document.body.dataset.page === "problems") {
  readData().then(startProblems).catch(error => showLoadError("#world-problem-pages", "The ledger is resting.", error));
}
if (document.body.dataset.page === "humans") {
  readData().then(startHumans).catch(error => showLoadError("#human-grid", "The hall is resting.", error));
}
if (document.body.dataset.page === "solved") {
  readData().then(startSolved).catch(error => showLoadError("#solved-list", "The closed pages are resting.", error));
}
if (document.body.dataset.page === "toys") startToys();
if (document.body.dataset.page === "solve") {
  startSolve().catch(error => showLoadError("#desk-roll-status", "The solving desk is resting.", error));
}
