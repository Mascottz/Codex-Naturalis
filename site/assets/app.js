// small machines; the book interface. it reads computed data and keeps each plate moving.

const domainOrder = ["sky", "earth", "living", "invisible", "structure"];
const domainNames = { sky: "The sky", earth: "The earth", living: "The living", invisible: "The invisible", structure: "The structure" };
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const escapeHtml = value => String(value).replace(/[&<>\"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
const prettyValue = value => Number.isInteger(Number(value)) ? Number(value).toLocaleString() : Number(value).toFixed(2);

async function readData() {
  const names = ["entries", "humans", "problems", "attempts", "phyllotaxis", "lorenz"];
  const values = await Promise.all(names.map(name => fetch(`data/${name}.json`).then(response => response.json())));
  return Object.fromEntries(names.map((name, index) => [name, values[index]]));
}

function originatorChips(entry, humansById) {
  return entry.originators.map(id => {
    const human = humansById[id];
    const name = human ? human.name : id.replaceAll("-", " ");
    return `<a class="originator-chip" href="humans.html#${escapeHtml(id)}">${escapeHtml(name)}</a>`;
  }).join("");
}

function entryPlate(entry, humansById) {
  const slider = entry.slider || { label: "parameter", min: 0, max: 1, step: .01, value: .5 };
  const status = entry.status === "live" ? " live" : "";
  return `
    <article class="entry-plate${status}" id="${escapeHtml(entry.id)}" data-domain="${escapeHtml(entry.domain)}" data-visual="${escapeHtml(entry.visualType)}" data-entry-id="${escapeHtml(entry.id)}">
      <div class="entry-aside">
        <div>
          <span class="entry-number">${String(entry.number).padStart(2, "0")} / ${escapeHtml(entry.year)}</span>
          <h3 class="entry-title">${escapeHtml(entry.title)}</h3>
          <p class="entry-formula"><code>${escapeHtml(entry.formula)}</code></p>
        </div>
        <p class="entry-source"><span>Source line</span>${escapeHtml(entry.source)}</p>
      </div>
      <div class="entry-copy">
        <p class="statement">${escapeHtml(entry.statement)}</p>
        <div class="readings">
          <div><span class="reading-label">The rigorous reading</span><p>${escapeHtml(entry.derivation || entry.statement)}</p></div>
          <div><span class="reading-label">The intuition</span><p>${escapeHtml(entry.intuition)}</p></div>
        </div>
        <div class="originators" aria-label="Originators">${originatorChips(entry, humansById)}</div>
        ${entry.story ? `<p class="human-story">${escapeHtml(entry.story)}</p>` : ""}
        <div class="visual-shell">
          <canvas class="entry-canvas" aria-label="Interactive visualization for ${escapeHtml(entry.title)}"></canvas>
          <div class="visual-tools">
            <label>${escapeHtml(slider.label)}</label>
            <input class="entry-slider" type="range" min="${slider.min}" max="${slider.max}" step="${slider.step}" value="${slider.value}" aria-label="${escapeHtml(slider.label)} for ${escapeHtml(entry.title)}">
            <output class="slider-value">${prettyValue(slider.value)}</output>
            <button class="take-home" type="button">Take it home</button>
          </div>
        </div>
      </div>
    </article>`;
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
    wirePlate(plate, entry, computed);
  });
}

function canvasContext(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 640;
  const height = canvas.clientHeight || 210;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
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

function drawLorenz(context, width, height, rho, computed) {
  baseCanvas(context, width, height);
  const points = computed.points || [];
  const sample = points.filter((_, index) => index % 2 === 0);
  const scale = Math.min(width / 52, height / 48);
  const cx = width * .53, cy = height * .52;
  context.lineWidth = 1.15;
  context.beginPath();
  sample.forEach((point, index) => {
    const x = cx + point[0] * scale * .78;
    const y = cy - (point[2] - 25) * scale * .75;
    index === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
  });
  context.strokeStyle = `hsl(${Number(rho) * 4 + 12} 42% 42%)`; context.stroke();
  context.fillStyle = "#d7856f"; context.beginPath(); context.arc(cx, cy, 3, 0, Math.PI * 2); context.fill();
}

function codeFor(entry) {
  if (entry.visualType === "lorenz") return `# lorenz; one small machine\nσ, ρ, β = 10.0, ${entry.slider.value}, 8 / 3\nx, y, z = 0.1, 0.0, 0.0\nfor step in 1:9000\n    x, y, z = x + .008 * σ * (y - x), y + .008 * (x * (ρ - z) - y), z + .008 * (x * y - β * z)\nend\nprintln((x, y, z))`;
  if (entry.visualType === "phyllotaxis") return `# phyllotaxis; one small machine\nφ = (1 + sqrt(5)) / 2\nangle = 2π * (1 - 1 / φ)\nfor i in 0:219\n    r = sqrt((i + .5) / 220)\n    println((r * cos(i * angle), r * sin(i * angle)))\nend`;
  return `// ${entry.title.toLowerCase()}\n// the formula stays close to its picture\nprintln(${JSON.stringify(entry.formula)})`;
}

function wirePlate(plate, entry, computed) {
  const canvas = plate.querySelector("canvas");
  const slider = plate.querySelector(".entry-slider");
  const output = plate.querySelector(".slider-value");
  const takeHome = plate.querySelector(".take-home");
  let frame;
  const draw = timestamp => {
    const { context, width, height } = canvasContext(canvas);
    const value = slider.value;
    if (entry.visualType === "euler") drawEuler(context, width, height, value, timestamp / 1000);
    else if (entry.visualType === "phyllotaxis") drawPhyllotaxis(context, width, height, value, computed.phyllotaxis);
    else if (entry.visualType === "lorenz") drawLorenz(context, width, height, value, computed.lorenz);
    else drawGeneric(context, width, height, entry, value, timestamp / 1000);
    if (!prefersReducedMotion) frame = requestAnimationFrame(draw);
  };
  slider.addEventListener("input", () => { output.value = prettyValue(slider.value); output.textContent = prettyValue(slider.value); if (prefersReducedMotion) draw(0); });
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
  const data = await readData();
  renderEntries(data.entries, data.humans, { phyllotaxis: data.phyllotaxis, lorenz: data.lorenz });
  wireRandom(data.entries);
}

function problemRow(problem) {
  const statusClass = problem.status.replaceAll(" ", "-");
  return `<tr data-field="${escapeHtml(problem.field)}" data-millennium="${problem.millennium}">
    <td class="problem-number">${String(problem.number).padStart(2, "0")}</td>
    <td class="problem-title">${escapeHtml(problem.title)}${problem.millennium ? "<small>millennium problem</small>" : ""}</td>
    <td class="problem-summary">${escapeHtml(problem.summary)}</td>
    <td><span class="status ${statusClass}">${escapeHtml(problem.status)}</span></td>
    <td><a class="quiet-link" href="${escapeHtml(problem.source)}" target="_blank" rel="noreferrer">Source ↗</a></td>
  </tr>`;
}

function startProblemFilters(problems) {
  const filters = document.querySelector("#problem-filters");
  const list = document.querySelector("#problem-list");
  const count = document.querySelector("#open-count");
  const show = filter => {
    const visible = problems.filter(problem => filter === "all" || (filter === "millennium" ? problem.millennium : problem.field === filter));
    list.innerHTML = visible.map(problemRow).join("");
    count.textContent = visible.filter(problem => problem.status === "open").length;
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

function renderAttempts(attempts, problems) {
  const problemNames = Object.fromEntries(problems.map(problem => [problem.id, problem.title]));
  document.querySelector("#attempt-list").innerHTML = attempts.map(attempt => `<div class="attempt">
    <div><strong>${escapeHtml(attempt.name)}</strong><small> · ${escapeHtml(problemNames[attempt.problemId] || attempt.problemId)}</small><p class="problem-summary">${escapeHtml(attempt.claim)}</p></div>
    <small>${escapeHtml(attempt.date)}</small>
    <div><span class="status ${attempt.status.replaceAll(" ", "-")}">${escapeHtml(attempt.status)}</span><br><a href="${escapeHtml(attempt.link)}" target="_blank" rel="noreferrer">Read the attempt ↗</a></div>
  </div>`).join("");
}

function humanCard(human) {
  const links = human.entryIds.map(id => `<a href="index.html#${escapeHtml(id)}">${escapeHtml(id.replaceAll("-", " "))}</a>`).join(" · ");
  return `<article class="human-card" id="${escapeHtml(human.id)}" data-era="${escapeHtml(human.era)}" data-region="${escapeHtml(human.region)}">
    <span class="human-era">${escapeHtml(human.era)} · ${escapeHtml(human.region)}</span><span class="human-entry-links">${links}</span>
    <h2>${escapeHtml(human.name)}</h2><p class="human-role">${escapeHtml(human.role)} · ${escapeHtml(human.years)}</p><p>${escapeHtml(human.note)}</p>
  </article>`;
}

function renderTimeline(humans) {
  const timeline = document.querySelector("#timeline");
  const years = humans.map(human => { const match = human.years.match(/-?\d{3,4}/); return match ? Math.abs(Number(match[0])) : 1900; });
  const first = Math.min(...years), last = Math.max(...years);
  const origin = `<div class="timeline-item" style="left:2%"><strong>Babylon</strong><small>mesopotamia · c. 1800 BCE</small></div>`;
  const now = `<div class="timeline-item" style="left:96%"><strong>Now</strong><small>the margin stays open</small></div>`;
  timeline.innerHTML = origin + humans.filter((human, index) => index % 2 === 0).map(human => {
    const match = human.years.match(/-?\d{3,4}/); const year = match ? Math.abs(Number(match[0])) : 1900;
    const left = 5 + ((year - first) / (last - first)) * 90;
    return `<div class="timeline-item" style="left:${left}%"><strong>${escapeHtml(human.name)}</strong><small>${escapeHtml(human.era)} · ${escapeHtml(human.region)}</small></div>`;
  }).join("") + now;
}

function startHumanFilters(humans) {
  const filters = document.querySelector("#human-filters");
  const eras = [...new Set(humans.map(human => human.era))];
  const regions = [...new Set(humans.map(human => human.region))].sort();
  filters.innerHTML = `<button class="filter-button active" data-mode="all" data-filter="all" type="button">All cards</button>${eras.map(era => `<button class="filter-button" data-mode="era" data-filter="${escapeHtml(era)}" type="button">${escapeHtml(era)}</button>`).join("")} ${regions.map(region => `<button class="filter-button" data-mode="region" data-filter="${escapeHtml(region)}" type="button">${escapeHtml(region)}</button>`).join("")}`;
  const grid = document.querySelector("#human-grid");
  const count = document.querySelector("#human-count");
  const show = (mode, filter) => {
    const visible = humans.filter(human => mode === "all" || human[mode] === filter);
    grid.innerHTML = visible.map(humanCard).join("");
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

async function startProblems() {
  const data = await readData();
  startProblemFilters(data.problems);
  renderAttempts(data.attempts, data.problems);
}

async function startHumans() {
  const data = await readData();
  renderTimeline(data.humans);
  startHumanFilters(data.humans);
  if (window.location.hash) window.setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView(), 80);
}

if (document.body.dataset.page === "book") {
  startBook().catch(error => { document.querySelector("#entries").innerHTML = `<p class="human-story">The computed pages are resting. ${escapeHtml(error.message)}</p>`; });
}
if (document.body.dataset.page === "problems") {
  startProblems().catch(error => { document.querySelector("#problem-list").innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`; });
}
if (document.body.dataset.page === "humans") {
  startHumans().catch(error => { document.querySelector("#human-grid").innerHTML = `<p class="human-story">The hall is resting. ${escapeHtml(error.message)}</p>`; });
}
