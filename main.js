// ========== DATA LOADING ==========
let MOCK_JOBS = [];
let SECTOR_MAP = {};
let SALARIES = {};
let TERMS = {};
let POPULAR_JOBS = [];
let RECENT_JOBS = [];
let lastSearch = "";
let lastSector = "";


// Institution Definitions
const institutionDefinitions = {
  "ECDS": "Early Childhood Education Development Centres (ECDs)/ Nursery Schools /Pre-Schools - means centres for the early development of children from the age two in preparation for primary education.",
  "Ind. A-Trust schools": "Independent A - Trust Schools - means schools which are run by registered trusts or board of governors whose employees are employed by the trust or boards of governors.",
  "Ind. B-Private Schools": "Independent B - Private Schools - means schools which are run and managed by private individuals or organizations and whose employees are either employed by the private individuals or organizations.",
  "Ind. C-Private Colleges": "Independent C - Private Schools - Means colleges which are run by private individuals or organizations which provide for academic and professional courses. The employees are employed by private individuals, organizations or registered companies.",
  "Ind. D-Home Schools A": "Independent D - Home Schools A - means private schools which operate from a residential property or a home set up with an enrolment of between 1 - 50 students, which are run by individuals, organizations or private companies whose employees are employed by the same.",
  "Ind. D-Home Schools B": "Independent D - Home Schools B - means private schools which operate from a residential property or a home set up with an enrolment of 51 students and above, which are run by individuals, organizations or private companies whose employees are employed by the same.",
  "Ind. E-Boarding": "Independent E - Boarding means any boarding school whose employees are employed by SDCs which do not under under mission school, local authority schools or government schools.",
  "Ind. F-Day-Urban Schools": "Independent F - Day-Urban - means any day school in urban areas whose employees are employed by SDCs which do not fall under mission schools, local authority schools or government schools.",
  "Ind. F-Day-Rural Schools": "Independent F - Day-Rural - means any day school in rural areas whose employees are employed by SDCs which do not fall under mission schools, local authority schools or government schools.",
  "Ind. G-Boarding Schools": "Independent G - Boarding Schools - means a non-formal boarding college which charges tuiition and booarding fees which do not exceed USD$750.00 per term.",
  "Ind. H2-Day-Urban Schools": "Independent H2 - Day-Urban Schools - means a non-formal day school in urban areas (low density, high density and CBD) which charges tuition fees which do not exceed USD$300.00 per term.",
  "Ind. H1-Day-Rural Schools": "Independent H1 - Day-Rural Schools - means a non-formal day college in rural, farming or settlement areas which charges tuition fees which do not exceed USD$150.00 per term.",
  "Mission Boarding Schools": "Mission Boarding Schools - means schools which are run by religious organizations as responsible authorities which offer boarding facilities. The employees are either directly employed by the responsible authority or SDC.",
  "Mission Day Schools": "Mission Day Schools - means schools which are run by religious organizations as responsible authorities which do not offer boarding facilities. The employees are either directly employed by the responsible authority or SDC.",
  "Mission Hospitals & Clinics": "Mission Hospitals and Clinics - means health care institutions which are run by religious organizations and whose employees are employed by the responsible authority",
  "NGOs": "Non-Governmental Organizations - means registered Private Voluntary Organizations or Trusts which operate in Zimbabwe and provide relief and developmental assistance to communities.",
  "Private ECDs": "Private ECDs - means ECDs which operate on a private school and are run by private individuals, organizations or registered companies whose employees are employed by the same.",
  "Religious Organizations (Administrative Offices)": "This refers to places where the church administration is done",
  "Religious Organizations (Presbyteries and Convents": "This refers to places where Ministers stay or their domiciles",
  "Rural ECDs": "Rural ECDs - means ECDs which are located in a rural set up and are run by private individuals, organizations or registered companies whose employees are employed by the same.",
  "Tertiary Institutions": "Tertiary Institutions - means colleges, training institutions and universities which are run by non-governmental organizations e.g. religious organizations (Churches) or other organizations, whose employees are not employed by government or local authorities",
  "Trust ECDs": "Trust ECDs - means ECDs/Nursery Schools/Pre-Schools which operate under trsut schools and are run by the board of governors or trusts whose employees are employed by the same.",
  "Urban 1 ECDs": "Urban 1 ECDs - means ECDs which are located in low or medium density suburbs which are run by private individuals, organizations or registered companies whose employees are employed by the same.",
  "Urban 2 ECDs": "Urban 2 ECDs - means ECDs which are located in high density suburbs which are run by private individuals, organizations or registered companies whose employees are employed by the same.",
  "Welfare A": "Welfare A - means registered Private Voluntary Organizations that provide institutional care to persons or animals and charge a nominal fee for the services and these rely on donations and grants",
  "Welfare B": "Welfare B - means registered Private Voluntary Organizations providing institutional care to persons or animals but do not charge fees for the service.",
  "Welfare C": "Welfare C - means institutions which are run by registered Private Voluntary Organizations as special education institutions and/or training institutions and rehabilitation institutions for physically and mentally handicapped people which are requred to be registered in terms of the Education Act and Manpower Planning and Development Act. These charge fees for services provided.",
  "Welfare D": "Welfare D - means registered Private Voluntary Organizations which provide institutional care, support, protect, home and educational facilities to children who are orphaned, abandoned, and vulnerable and are in need of care. These are run by local or international organizations, depend on donations and grants for funding and do not charge fees for the services provided."
};

// Popup to show definition
function showDefinitionPopup(name, definition) {
  let popup = document.createElement("div");
  popup.className = "definition-popup";
  popup.innerHTML = `
    <div class="definition-content">
        <h3>${name}</h3>
        <p>${definition}</p>
        <button id="closePopup">Close</button>
    </div>
  `;
  document.body.appendChild(popup);
  document.getElementById("closePopup").addEventListener("click", () => {
    popup.remove();
  });
}

// Attach definitions to institution-type elements
function attachInstitutionDefinitions() {
  document.querySelectorAll(".institution-type").forEach(el => {
    el.style.cursor = "pointer";
    el.title = "Click for definition";
    el.addEventListener("click", () => {
      const name = el.textContent.trim();
      const def = institutionDefinitions[name] || "Definition not available.";
      showDefinitionPopup(name, def);
    });
  });
}


// Util: Save/load persistent state (search/sector)
function saveState() {
  localStorage.setItem("jobs_last_search", lastSearch || "");
  localStorage.setItem("jobs_last_sector", lastSector || "");
}
function loadState() {
  lastSearch = localStorage.getItem("jobs_last_search") || "";
  lastSector = localStorage.getItem("jobs_last_sector") || "";
}

function fetchData() {
  return Promise.all([
    fetch('data/job-info.json').then(res => res.json()).then(data => { MOCK_JOBS = data; }),
    fetch('data/sector.json').then(res => res.json()).then(data => { SECTOR_MAP = data; }),
    fetch('data/salaries.json').then(res => res.json()).then(data => { SALARIES = data; })
  ]);
}
function fetchTerms() {
  return fetch('data/terms.json').then(res => res.json()).then(data => { TERMS = data; });
}


// ========== DOM REFS & UTILITIES ==========
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const formatMoney = n => {
  if (n == null || Number.isNaN(+n)) return "—";
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(+n);
};
const normalize = s => (s || "").toLowerCase().trim();

// ========== STATE ==========
let currentJob = null;
let currentCurrency = 'USD';
let exchangeRates = { 'ZWL': 13 }; // USD -> ZWL default
let lastCurrency = 'USD';

function updateCurrencyDisplay() {
  // Update salary table
  $$("#salaryRows td.mono").forEach(td => {
    const rawUSD = +td.getAttribute("data-raw");
    td.textContent = `${currencySymbol(currentCurrency)} ${formatMoney(convertCurrency(rawUSD, 'USD', currentCurrency))}`;
  });

  // Update institution select dropdown
  const instSelect = $("#instSelect");
  if (instSelect) {
    instSelect.querySelectorAll("option").forEach(opt => {
      const rawUSD = +opt.getAttribute("data-raw"); // safer than splitting text
      if (!isNaN(rawUSD)) {
        opt.textContent = `${opt.textContent.split(" - ")[0]} - ${currencySymbol(currentCurrency)} ${formatMoney(convertCurrency(rawUSD, 'USD', currentCurrency))}`;
      }
    });
    instSelect.value = convertCurrency(+instSelect.value, lastCurrency, currentCurrency);
  }

  // Update calculator inputs
  if ($("#basicInput")) {
    $("#basicInput").value = convertCurrency(+$("#basicInput").value, lastCurrency, currentCurrency);
  }

  $$("#allowancesList input").forEach(inp => {
    inp.value = convertCurrency(+inp.value, lastCurrency, currentCurrency);
  });

  // Refresh totals
  updateCalculatorTotals();

  // Update lastCurrency
  lastCurrency = currentCurrency;
  currentCurrency = newCurrencyCode;
updateCurrencyDisplay();

}


// search counters & recent searches persisted
function loadSearchCounters() {
  try {
    const raw = localStorage.getItem('job_search_counts');
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
function saveSearchCounters(obj) {
  try { localStorage.setItem('job_search_counts', JSON.stringify(obj)); } catch (e) { }
}
function incrementSearchCount(jobId) {
  const counts = loadSearchCounters();
  counts[jobId] = (counts[jobId] || 0) + 1;
  saveSearchCounters(counts);
}
function getSearchCount(jobId) {
  const counts = loadSearchCounters();
  return counts[jobId] || 0;
}

function loadRecentSearches() {
  try {
    const raw = localStorage.getItem('recent_job_searches');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function pushRecentSearch(title) {
  if (!title) return;
  const arr = loadRecentSearches();
  // keep unique with most recent first
  const filtered = [title].concat(arr.filter(x => x !== title)).slice(0, 8);
  localStorage.setItem('recent_job_searches', JSON.stringify(filtered));
}
function getRecentSearches(limit = 4) {
  const arr = loadRecentSearches();
  return arr.slice(0, limit);
}

// ========== TRY JOB ANIMATION ==========
function getRandomJobs(count = 3) {
  const titles = getAllJobTitles();
  const chosen = [];
  const used = new Set();
  while (chosen.length < count && used.size < titles.length) {
    const idx = Math.floor(Math.random() * titles.length);
    if (!used.has(idx)) {
      chosen.push(titles[idx]);
      used.add(idx);
    }
  }
  return chosen;
}

function renderTryJobs(jobs) {
  const el = document.getElementById('tryJobs');
  if (!el) return;
  el.innerHTML = jobs.map(j =>
    `<button class="btn btn--chip" data-demo="${escapeAttr(j)}" type="button">${escapeHTML(j)}</button>`
  ).join(' ');
}

function animateTryJobs() {
  const el = document.getElementById('tryJobs');
  if (!el) return;
  el.classList.add('fade-out');
  setTimeout(() => {
    renderTryJobs(getRandomJobs(3));
    el.classList.remove('fade-out');
    el.classList.add('fade-in');
    setTimeout(() => el.classList.remove('fade-in'), 500);
  }, 500);
}

// ========== POPULAR / RECENT JOBS ==========
function computePopularJobs() {
  // Rank by search counts (persisted). If no counts, fall back to title-count heuristic.
  const counts = loadSearchCounters();
  const jobs = MOCK_JOBS.slice();
  jobs.sort((a, b) => {
    const ca = counts[a.id] || 0;
    const cb = counts[b.id] || 0;
    if (ca !== cb) return cb - ca;
    return (b.titles.length - a.titles.length);
  });
  POPULAR_JOBS = jobs.slice(0, 4);
}
function computeRecentJobs() {
  const recent = getRecentSearches();
  if (recent.length) {
    // map titles to job entries where possible
    const jobs = recent.map(title => MOCK_JOBS.find(j => j.titles[0] === title)).filter(Boolean);
    RECENT_JOBS = jobs.slice(0, 4);
  } else {
    RECENT_JOBS = MOCK_JOBS.slice(-4).reverse();
  }
}
function renderPopularSection() {
  const el = $('#popularSection');
  if (!el) return;
  if (!POPULAR_JOBS.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<h4 class="popular-jobs-heading">Popular Jobs</h4>
    <div class="popular-jobs-list">
      ${POPULAR_JOBS.map(j => `<button class="popular-job-pill" data-demo="${escapeAttr(j.titles[0])}">${escapeHTML(j.titles[0])}</button>`).join("")}
    </div>`;
}
function renderRecentSection() {
  const el = $('#recentSection');
  if (!el) return;
  if (!RECENT_JOBS.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<h4>Recently Searched</h4>
    <div class="recent-jobs-list">
      ${RECENT_JOBS.map(j => `<button class="recent-job-pill" data-demo="${escapeAttr(j.titles[0])}">${escapeHTML(j.titles[0])}</button>`).join("")}
    </div>`;
}

// ========== AUTOCOMPLETE ==========
function getAllJobTitles() {
  return MOCK_JOBS.flatMap(j => j.titles);
}
function filterAutocomplete(q) {
  if (!q) return [];
  const qn = normalize(q);
  return getAllJobTitles().filter(title =>
    normalize(title).includes(qn)
  ).slice(0, 8);
}
function renderAutocomplete(inputId, listId) {
  const input = $(inputId);
  const list = $(listId);

  let currentSelection = -1;
  let matches = [];

  input.addEventListener('input', function () {
    const val = input.value;
    matches = filterAutocomplete(val);
    currentSelection = -1;
    if (matches.length && val.trim()) {
      list.style.display = "";
      list.innerHTML = matches.map((m, i) =>
        `<li tabindex="-1" role="option" aria-selected="${i === 0 ? 'true' : 'false'}" class="auto-item${i === 0 ? " selected" : ""}">${escapeHTML(m)}</li>`
      ).join("");
    } else {
      list.style.display = "none";
      list.innerHTML = "";
    }
  });

  list.addEventListener('mousedown', function (e) {
    if (e.target && e.target.classList.contains('auto-item')) {
      input.value = e.target.textContent;
      list.style.display = "none";
      input.focus();
    }
  });

  input.addEventListener('keydown', function (e) {
    if (!matches.length || list.style.display === "none") {
      // allow normal submit if no matches visible
      return;
    }
    if (e.key === "ArrowDown") {
      currentSelection++;
      if (currentSelection >= matches.length) currentSelection = 0;
      updateAutocompleteSelection(list, currentSelection);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      currentSelection--;
      if (currentSelection < 0) currentSelection = matches.length - 1;
      updateAutocompleteSelection(list, currentSelection);
      e.preventDefault();
    } else if (e.key === "Enter") {
      // only intercept Enter when a selection is active
      if (currentSelection >= 0 && matches[currentSelection]) {
        input.value = matches[currentSelection];
        list.style.display = "none";
        input.focus();
        e.preventDefault();
      } else {
        // no active selection -> allow form to submit normally
      }
    } else if (e.key === "Escape") {
      list.style.display = "none";
    }
  });

  list.addEventListener('mousemove', function (e) {
    if (e.target && e.target.classList.contains('auto-item')) {
      const items = $$('.auto-item', list);
      items.forEach((item, idx) => {
        const isActive = item === e.target;
        item.classList.toggle('selected', isActive);
        item.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      currentSelection = Array.prototype.indexOf.call(items, e.target);
    }
  });

  document.addEventListener('mousedown', function (e) {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.style.display = "none";
    }
  });

  function updateAutocompleteSelection(list, idx) {
    const items = $$('.auto-item', list);
    items.forEach((item, i) => {
      const isSel = i === idx;
      item.classList.toggle('selected', isSel);
      item.setAttribute('aria-selected', isSel ? 'true' : 'false');
    });
    if (items[idx]) items[idx].scrollIntoView({ block: "nearest" });
  }
}

// ========== RENDER SECTORS ==========
function computeSectorSalaryRange(sector) {
  if (!SECTOR_MAP[sector]) return null;
  const jobs = SECTOR_MAP[sector].jobs;
  let min = Infinity, max = -Infinity;
  let found = false;
  for (const jobTitle of jobs) {
    const job = MOCK_JOBS.find(j => j.titles.includes(jobTitle));
    if (!job) continue;
    const salaryTable = SALARIES[job.grade] || {};
    Object.values(salaryTable).forEach(val => {
      min = Math.min(min, val);
      max = Math.max(max, val);
      found = true;
    });
  }
  if (!found) return null;
  return { min, max };
}
function renderSectors() {
  const aside = $('#browseSectors');
  if (!aside) return;
  let html = `<h4 class="popular-jobs-heading" style="text-align:center; font-family: var(--font-b); font-weight: 600;">Browse by Sector</h4>
    <div class="browse-pills" tabindex="0" style="justify-content:center;">`;
  for (const sector in SECTOR_MAP) {
    const jobs = SECTOR_MAP[sector].jobs;
    const range = computeSectorSalaryRange(sector);
    html += `
      <button class="sector-pill" data-sector="${escapeAttr(sector)}" tabindex="0">
        <span class="sector-title">${escapeHTML(sector)}
          <span class="sector-count">(${jobs.length})</span>
        </span>
        ${range ? `<span class="sector-salary-range">Salary: $${formatMoney(range.min)} – $${formatMoney(range.max)}</span>` : ""}
      </button>
    `;
  }
  html += '</div>';
  aside.innerHTML = html;
}

// ========== HANDLE SECTOR PILL CLICK ==========
function sectorPillClickHandler(e) {
  const pill = e.target.closest('.sector-pill');
  if (!pill) return;
  const sector = pill.getAttribute('data-sector');
  lastSector = sector;
  saveState();
  displaySectorResults(sector);
}

// ========== DISPLAY SECTOR RESULTS ==========
function displaySectorResults(sector) {
  $('#home').classList.add('hidden');
  $('#resultsHeader').classList.add('hidden');
  $('#results').classList.add('hidden');
  $('#sectorResults').classList.remove('hidden');
  $('#sectorResultsHeading').textContent = `Jobs in ${sector}`;

  $('#sectorDesc').innerHTML = SECTOR_MAP[sector]?.desc
    ? `<div class="sector-desc">${escapeHTML(SECTOR_MAP[sector].desc)}</div>` : '';

  const range = computeSectorSalaryRange(sector);
  $('#sectorSalaryRange').innerHTML = range
    ? `<div class="sector-salary-range">Salary range: $${formatMoney(range.min)} – $${formatMoney(range.max)}</div>`
    : "";

  const jobsInSector = getJobsForSector(sector);
  const list = $('#sectorResultsList');
  if (!jobsInSector.length) {
    list.innerHTML = `<div class="muted">No jobs found in this sector. Try another sector or search above.</div>`;
    return;
  }
  list.innerHTML = jobsInSector.map(job => `
    <div class="card card--soft">
      <div style="font-size:18px;font-weight:700;">${escapeHTML(job.titles[0])}</div>
      <div style="margin:8px 0 8px 0;color:var(--muted);font-size:14px;">${escapeHTML(job.description)}</div>
      <button class="btn btn--chip" data-jobid="${escapeAttr(job.id)}">View More</button>
    </div>
  `).join('');
}
function getJobsForSector(sector) {
  const titles = new Set((SECTOR_MAP[sector]?.jobs || []));
  return MOCK_JOBS.filter(job => job.titles.some(t => titles.has(t)));
}

// ========== RENDERERS ==========
function renderJob(job, q) {
  lastSearch = job.titles[0];
  saveState();
  pushRecentSearch(lastSearch);
  incrementSearchCount(job.id);

  currentJob = job;
  $('#jobTitle').textContent = job.titles[0];
  $('#jobMeta').textContent = `${job.industry} • Typical Experience: ${job.yearsExperience}`;
  $('#jobDesc').textContent = job.description;
  $('#jobGradeBadge').textContent = `Grade: ${job.grade}`;

  const salaryRows = $('#salaryRows');
  salaryRows.innerHTML = '';
  const salaryTable = SALARIES[job.grade] || {};
  const instOptions = [];
  Object.entries(salaryTable).forEach(([inst, amount]) => {
    const tr = document.createElement('tr');
    // make the inst cell clickable to reveal definition (if available)
    tr.innerHTML = `<td class="inst-cell" data-inst="${escapeAttr(inst)}" style="cursor:pointer;">${escapeHTML(inst)}</td><td class="mono" data-raw="${amount}">${currencySymbol(currentCurrency)} ${formatMoney(convertCurrency(amount, 'USD', currentCurrency))}</td>`;
    salaryRows.appendChild(tr);
    instOptions.push([inst, amount]);
  });

  instSelect.innerHTML = instOptions.map(([inst, amount]) =>
  `<option data-raw="${amount}" value="${convertCurrency(amount, 'USD', currentCurrency)}">
     ${inst} - ${currencySymbol(currentCurrency)} ${formatMoney(convertCurrency(amount, 'USD', currentCurrency))}
   </option>`
).join('');
  
  instSelect.selectedIndex = 0;
  const selectedBasic = convertCurrency(+instSelect.value, 'USD', currentCurrency);

  $('#basicInput').value = selectedBasic;
  resetAllowances();
  updateCalculatorTotals();

  renderExtras(job);
  renderSimilarSector(job);
  attachInstitutionDefinitions();

  $('#jobCard').style.display = '';
  $('#calcCard').style.display = '';
  $('#serviceCard').style.display = '';
  $('#nightCard').style.display = '';
  $('#funeralCard').style.display = '';
  $('#extraCard').style.display = '';
  $('#notFoundCard').style.display = 'none';
  $('#results').classList.remove('hidden');
  $('#resultsHeader').classList.remove('hidden');
  $('#sectorResults').classList.add('hidden');
}

function renderNotFound(q) {
  $('#jobCard').style.display = 'none';
  $('#calcCard').style.display = 'none';
  $('#extraCard').style.display = 'none';
  $('#serviceCard').style.display = 'none';
  $('#nightCard').style.display = 'none';
  $('#funeralCard').style.display = 'none';
  $('#notFoundCard').style.display = '';
  $('#results').classList.remove('hidden');
  $('#resultsHeader').classList.remove('hidden');
  $('#sectorResults').classList.add('hidden');
  let msg = "We couldn’t find an exact job title match.";
  if (q && q.length > 2 && filterAutocomplete(q).length === 0) {
    msg += " No jobs matched your keyword.";
  }
  msg += " Try a simpler keyword or browse jobs by sector:";

  $('#notFoundMsg').textContent = msg;

  // Replace suggestions with sector buttons
  const sectorBtns = Object.keys(SECTOR_MAP).map(sector =>
    `<button type="button" class="btn btn--chip sector-suggestion-btn" data-sector="${escapeAttr(sector)}">${escapeHTML(sector)}</button>`
  ).join('') || `<span class="muted">No sectors available.</span>`;
  $('#suggestionChips').innerHTML = sectorBtns;

  // Add click handler for sector buttons (delegation for robustness)
  $('#suggestionChips').onclick = function (e) {
    const btn = e.target.closest('.sector-suggestion-btn');
    if (btn) {
      const sector = btn.getAttribute('data-sector');
      if (sector) {
        displaySectorResults(sector);
      }
    }
  };
}
function renderExtras(job) {
  const items = [
    { label: "Required Qualifications", content: job.qualifications },
    { label: "Years of Experience", content: [job.yearsExperience] },
    { label: "Industry", content: [job.industry] },
    { label: "Top Skills", content: job.skills },
    { label: "Common Employers", content: job.employers },
    { label: "Key Responsibilities", content: (job.responsibilities || []).slice(0, 4) },
  ];
  $('#suggestions').innerHTML = items.map(it => `
    <div class="card card--soft">
      <div class="muted" style="font-size:12px; text-transform:uppercase; letter-spacing:.04em;">${it.label}</div>
      <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:8px;">
        ${it.content.map(v => `<span class="pill">${escapeHTML(v)}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderSimilarSector(job) {
  const wrap = $('#similarSectorWrap');
  wrap.innerHTML = '';
  // Find all sectors that include this job's main title
  const jobTitle = job.titles[0];
  // Get all sector keys containing this job
  const sectorsWithThisJob = Object.keys(SECTOR_MAP).filter(s =>
    (SECTOR_MAP[s].jobs || []).includes(jobTitle)
  );

  // If job has an industry field that is a sector, prefer that
  let sectorKeys = sectorsWithThisJob.length ? sectorsWithThisJob : [];
  if (job.industry && SECTOR_MAP[job.industry]) {
    if (!sectorKeys.includes(job.industry)) sectorKeys.unshift(job.industry);
  }
  if (!sectorKeys.length) return;

  let html = `<div class="muted" style="font-size:12px; margin-bottom:6px;">Other jobs grouped by sector:</div>`;
  sectorKeys.forEach(sectorKey => {
    const jobs = getJobsForSector(sectorKey)
      .filter(j => j.id !== job.id)
      .slice(0, 6); // limit to 6 per sector
    if (!jobs.length) return;
    html += `<div style="margin-bottom:10px;">
      <div class="muted" style="font-size:11px; margin-bottom:3px;">${escapeHTML(sectorKey)}</div>
      <div>${jobs.map(j =>
      `<button class="similar-pill" data-demo="${escapeAttr(j.titles[0])}">${escapeHTML(j.titles[0])}</button>`
    ).join(' ')}</div>
    </div>`;
  });
  wrap.innerHTML = html;
}
// ========== CALCULATOR ==========
const DEFAULT_ALLOWANCES = [
  { name: "Housing", key: "housing", amount: 150 },
  { name: "Transport", key: "transport", amount: 80 }
];

function makeAllowanceRow(name, key, amount = 0) {
  const id = `allow-${key}-${Math.random().toString(36).slice(2, 7)}`;
  const wrap = document.createElement('div');
  wrap.className = 'calc__row';
  wrap.innerHTML = `
    <label for="${id}">${escapeHTML(name)} Allowance</label>
    <input id="${id}" type="number" inputmode="decimal" min="0" step="0.01" value="${amount}" data-allow-key="${escapeAttr(key)}" />
  `;
  return wrap;
}

function resetAllowances() {
  const allowancesList = $('#allowancesList');
  allowancesList.innerHTML = '';
  DEFAULT_ALLOWANCES.forEach(a => {
    allowancesList.appendChild(
      makeAllowanceRow(a.name, a.key, convertCurrency(a.amount, 'USD', currentCurrency))
    );
  });
}

function collectAllowances() {
  return $$('#allowancesList input').map(i => +i.value || 0);
}

function updateCalculatorTotals() {
  const basic = +$('#basicInput').value || 0;
  const allowancesTotal = collectAllowances().reduce((a, b) => a + b, 0);
  const grand = basic + allowancesTotal;

  $('#allowancesTotal').textContent = `${currencySymbol(currentCurrency)} ${formatMoney(allowancesTotal)}`;
  $('#grandTotal').textContent = `${currencySymbol(currentCurrency)} ${formatMoney(grand)}`;

  const years = +($('#yearsService')?.value || 0);
  $('#serviceTotal').textContent = `${currencySymbol(currentCurrency)} ${(basic * 0.01 * years).toFixed(2)}`;

  const nights = +($('#nightsWorked')?.value || 0);
  $('#nightTotal').textContent = `${currencySymbol(currentCurrency)} ${(basic * 0.01 * nights).toFixed(2)}`;

  const hasPolicy = $('#hasPolicy')?.value;
  const coffin = +($('#coffinCost')?.value || 0);
  let owed = 0;
  if (hasPolicy === "yes") {
    const coverage = +($('#policyCoverage')?.value || 0);
    owed = coverage >= coffin ? 0 : coffin - coverage;
    $('#policyRow').style.display = "";
  } else {
    owed = coffin * 0.5;
    $('#policyRow').style.display = "none";
  }
  $('#funeralTotal').textContent = `${currencySymbol(currentCurrency)} ${owed.toFixed(2)}`;
}

// ========== CURRENCY ==========
function currencySymbol(code) {
  if (!code) code = currentCurrency;
  switch (code) {
    case 'USD': return '$';
    case 'ZWL': return 'ZWL';
    default: return code + ' ';
  }
}
function convertCurrency(amount, fromCurrency, toCurrency) {
  if (!fromCurrency) fromCurrency = currentCurrency;
  if (!toCurrency) toCurrency = currentCurrency;
  if (fromCurrency === toCurrency) return +amount || 0;

  // if both USD and target have rates
  if (fromCurrency === 'USD' && exchangeRates[toCurrency]) {
    return (+amount || 0) * exchangeRates[toCurrency];
  }
  if (toCurrency === 'USD' && exchangeRates[fromCurrency]) {
    return (+amount || 0) / exchangeRates[fromCurrency];
  }
  // both in exchangeRates => convert via USD
  if (exchangeRates[fromCurrency] && exchangeRates[toCurrency]) {
    const inUSD = (+amount || 0) / exchangeRates[fromCurrency];
    return inUSD * exchangeRates[toCurrency];
  }
  // fallback: if from is USD and to is ZWL default
  if (fromCurrency === 'USD' && toCurrency === 'ZWL') {
    return (+amount || 0) * (exchangeRates['ZWL'] || 1);
  }
  // best-effort: if currencies unknown, return amount unchanged
  return +amount || 0;
}

function refreshSalaryTableCurrency() {
  $$('#salaryRows td[data-raw]').forEach(td => {
    const base = +td.getAttribute('data-raw');
    td.textContent = `${currencySymbol(currentCurrency)} ${formatMoney(convertCurrency(base, 'USD', currentCurrency))}`;
  });
  updateCalculatorTotals();
}

function convertAllCalculatorInputs(fromCurrency, toCurrency) {
  let b = +$('#basicInput').value || 0;
  $('#basicInput').value = convertCurrency(b, fromCurrency, toCurrency);
  $$('#allowancesList input').forEach(input => {
    input.value = convertCurrency(+input.value || 0, fromCurrency, toCurrency);
  });
  if ($('#coffinCost')) $('#coffinCost').value = convertCurrency(+$('#coffinCost').value || 0, fromCurrency, toCurrency);
  if ($('#policyCoverage')) $('#policyCoverage').value = convertCurrency(+$('#policyCoverage').value || 0, fromCurrency, toCurrency);
}

// ========== NAVIGATION ==========
function gotoResults() {
  $('#home').classList.add('hidden');
  $('#resultsHeader').classList.remove('hidden');
  $('#results').classList.remove('hidden');
  $('#sectorResults').classList.add('hidden');
  $('#aboutPage').classList.add('hidden');
  $('#results').setAttribute('aria-busy', 'false');
  $('#resultsQuery').focus();
}
function gotoHome() {
  $('#home').classList.remove('hidden');
  $('#resultsHeader').classList.add('hidden');
  $('#results').classList.add('hidden');
  $('#sectorResults').classList.add('hidden');
  $('#aboutPage').classList.add('hidden');
  $('#resultsQuery').value = '';
  $('#jobCard').style.display = 'none';
  $('#calcCard').style.display = 'none';
  $('#serviceCard').style.display = 'none';
  $('#nightCard').style.display = 'none';
  $('#funeralCard').style.display = 'none';
  $('#extraCard').style.display = 'none';
  $('#notFoundCard').style.display = 'none';
  $('#homeQuery').focus();
}

// ========== ABOUT PAGE ==========
function renderAboutPage() {
  const termListEl = $('#termList');
  let html = "";
  Object.entries(TERMS).forEach(([term, def]) => {
    html += `<li tabindex="0">
      <span class="term-title">${escapeHTML(term)}</span>
      <span class="term-def">${escapeHTML(def)}</span>
      <span class="copy-feedback" style="display:none;">Copied!</span>
    </li>`;
  });
  termListEl.innerHTML = html;
  $$('.term-list li').forEach(li => {
    li.addEventListener('click', function () {
      const text = li.querySelector('.term-def').textContent;
      navigator.clipboard.writeText(text).catch(() => { });
      showCopyFeedback(li);
    });
    li.addEventListener('keydown', function (e) {
      if (e.key === "Enter" || e.key === " ") {
        li.click();
        e.preventDefault();
      }
    });
  });
}
function showCopyFeedback(li) {
  const feedback = li.querySelector('.copy-feedback');
  feedback.style.display = "";
  li.classList.add('copied');
  setTimeout(() => {
    feedback.style.display = "none";
    li.classList.remove('copied');
  }, 1100);
}
function gotoAbout() {
  $('#aboutPage').classList.remove('hidden');
  $('#home').classList.add('hidden');
  $('#results').classList.add('hidden');
  $('#resultsHeader').classList.add('hidden');
  $('#sectorResults').classList.add('hidden');
  window.scrollTo(0, 0);
}
function hideAbout() {
  $('#aboutPage').classList.add('hidden');
  $('#home').classList.remove('hidden');
}

// ========== INSTITUTION DEFINITION POPUP HANDLING ==========
function showInstDefinition(inst) {
  const titleEl = $('#instDefTitle');
  const textEl = $('#instDefText');
  const box = $('#instDefBox');
  titleEl.textContent = inst;
  const def = TERMS[inst] || TERMS[inst.toLowerCase()] || TERMS[inst.toUpperCase()] || "Definition not available.";
  textEl.textContent = def;
  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideInstDefinition() {
  const box = $('#instDefBox');
  box.classList.add('hidden');
}

// ========== EVENT WIRING ==========
function wire() {
  loadState();

  $('#homeSearchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#homeQuery').value;
    performSearch(q);
  });

  $('#resultsSearchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#resultsQuery').value;
    performSearch(q);
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-demo]');
    if (btn) {
      const q = btn.getAttribute('data-demo');
      $('#homeQuery').value = q;
      $('#resultsQuery').value = q;
      performSearch(q);
      return;
    }
    if (e.target.closest('.sector-pill')) {
      sectorPillClickHandler(e);
      return;
    }
    const viewBtn = e.target.closest('button[data-jobid]');
    if (viewBtn) {
      const jobId = viewBtn.getAttribute('data-jobid');
      const job = MOCK_JOBS.find(j => j.id === jobId);
      if (job) {
        renderJob(job, job.titles[0]);
      }
      return;
    }

    // salary table inst click -> show def
    const instCell = e.target.closest('.inst-cell');
    if (instCell) {
      const inst = instCell.getAttribute('data-inst');
      showInstDefinition(inst);
      return;
    }
  });

  $('#backHomeBtn').addEventListener('click', gotoHome);
  $('#backToHomeFromSector').addEventListener('click', gotoHome);
  $('#aboutBtn').addEventListener('click', () => {
    gotoAbout();
    renderAboutPage();
  });
  $('#backToHomeFromAbout').addEventListener('click', hideAbout);

  // Back to previous search button on about page
  $('#backToPreviousSearch').addEventListener('click', () => {
    const ls = localStorage.getItem('jobs_last_search') || '';
    if (ls) {
      // attempt to perform search
      performSearch(ls);
    } else {
      gotoHome();
    }
  });

  $('#instSelect').addEventListener('change', () => {
    $('#basicInput').value = convertCurrency(+$('#instSelect').value || 0, 'USD', currentCurrency);
    updateCalculatorTotals();
  });

  // Currency selection handler
  function setupCurrencySelect() {
    const sel = $('#currencySelect');
    sel.innerHTML = `
    <option value="USD">$ USD</option>
    <option value="ZWL">ZWL</option>
  `;
    sel.value = 'USD';
    $('#customCurrencyWrap').style.display = 'none';
  }
  setupCurrencySelect();

  // On change: only USD or ZWL possible
  $('#currencySelect').addEventListener('change', () => {
    const newCurrency = $('#currencySelect').value;

    if (newCurrency === "USD") {
      $('#customCurrencyWrap').style.display = "none";
      const fromCurrency = lastCurrency || 'USD';
      convertAllCalculatorInputs(fromCurrency, "USD");
      lastCurrency = "USD";
      currentCurrency = "USD";
      refreshSalaryTableCurrency();
      updateCalculatorTotals();
      return;
    }

    // ZWL or custom: show UI to edit code and rate
    if (newCurrency === "ZWL") {
      $('#customCurrencyWrap').style.display = "";
      $('#customCurrencyCode').value = "ZWL";
      $('#customExchangeRate').value = exchangeRates['ZWL'] || 13;
      const fromCurrency = lastCurrency || 'USD';
      convertAllCalculatorInputs(fromCurrency, "ZWL");
      lastCurrency = "ZWL";
      currentCurrency = "ZWL";
      refreshSalaryTableCurrency();
      updateCalculatorTotals();
      return;
    }
  });

  // PATCH: Only allow editing code/rate for ZWL (alternate currency)
  $('#customCurrencyCode').addEventListener('input', () => {
    // Update label in select if user changes code
    const code = ($('#customCurrencyCode').value || '').trim().toUpperCase();
    const sel = $('#currencySelect');
    let opt = sel.querySelector('option[value="ZWL"]');
    if (opt) opt.textContent = code;
    // Set currentCurrency for calculations
    currentCurrency = code;
    refreshSalaryTableCurrency();
    updateCalculatorTotals();
  });

  $('#customExchangeRate').addEventListener('input', () => {
    const val = parseFloat($('#customExchangeRate').value);
    const code = ($('#customCurrencyCode').value || '').trim().toUpperCase();
    if (!isNaN(val) && val > 0 && code) {
      exchangeRates[code] = val;
      currentCurrency = code;
      refreshSalaryTableCurrency();
      updateCalculatorTotals();
    }
  });

  // PATCH: Remove addCustomCurrencyBtn and logic
  const addBtn = $('#addCustomCurrencyBtn');
  if (addBtn) addBtn.style.display = "none";

  // PATCH: On page load, only show two currencies and setup initial state
  function initCurrency() {
    setupCurrencySelect();
    currentCurrency = 'USD';
    lastCurrency = 'USD';
    exchangeRates = { 'ZWL': 13 };
    $('#customCurrencyWrap').style.display = 'none';
  }
  initCurrency();

  // Add custom currency button
  $('#addCustomCurrencyBtn').addEventListener('click', () => {
    const code = ($('#customCurrencyCode').value || '').trim().toUpperCase();
    const rate = parseFloat($('#customExchangeRate').value || '');
    if (!code || !rate || rate <= 0) {
      alert('Enter a valid currency code and USD → X rate (number).');
      return;
    }
    // add to exchangeRates and set current currency
    exchangeRates[code] = rate;
    // add to select
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${code}`;
    // insert before OTHER
    const sel = $('#currencySelect');
    sel.insertBefore(opt, sel.querySelector('option[value="OTHER"]'));
    sel.value = code;
    $('#customCurrencyWrap').style.display = 'none';
    const fromCurrency = lastCurrency || 'USD';
    convertAllCalculatorInputs(fromCurrency, code);
    lastCurrency = code;
    currentCurrency = code;
    refreshSalaryTableCurrency();
    updateCalculatorTotals();
  });

  $('#closeInstDef').addEventListener('click', hideInstDefinition);

  document.addEventListener('input', (e) => {
    if (
      e.target === $('#basicInput') ||
      e.target.closest('#allowancesList') ||
      e.target.id === "yearsService" ||
      e.target.id === "nightsWorked" ||
      e.target.id === "coffinCost" ||
      e.target.id === "policyCoverage" ||
      e.target.id === "hasPolicy"
    ) {
      updateCalculatorTotals();
    }
  });

  document.addEventListener('change', (e) => {
    if (
      e.target.id === "yearsService" ||
      e.target.id === "nightsWorked" ||
      e.target.id === "coffinCost" ||
      e.target.id === "policyCoverage" ||
      e.target.id === "hasPolicy"
    ) {
      updateCalculatorTotals();
    }
  });

  $('#addAllowanceBtn').addEventListener('click', () => {
    const name = prompt('Allowance name:', 'Other');
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20) || 'custom';
    $('#allowancesList').appendChild(makeAllowanceRow(name, key, 0));
    updateCalculatorTotals();
  });

  $('#resetCalcBtn').addEventListener('click', () => {
    $('#basicInput').value = convertCurrency(+$('#instSelect').value || 0, 'USD', currentCurrency);
    resetAllowances();
    updateCalculatorTotals();
  });

  // keyboard accessibility for chip buttons (they are dynamically created too)
  document.addEventListener('keydown', function (e) {
    if ((e.target.classList && e.target.classList.contains('btn--chip')) && (e.key === 'Enter' || e.key === ' ')) {
      e.target.click();
      e.preventDefault();
    }
  });

  renderAutocomplete("#homeQuery", "#autocompleteList");
  renderAutocomplete("#resultsQuery", "#autocompleteListResults");
  resetAllowances();
  renderSectors();
  computePopularJobs();
  computeRecentJobs();
  renderPopularSection();
  renderRecentSection();

  // Initial render for Try jobs
  renderTryJobs(getRandomJobs(3));
  // Animate every 4 seconds; pause on hover
  let tryJobInterval = setInterval(animateTryJobs, 4000);
  const tryWrap = document.getElementById('tryJobs');
  if (tryWrap) {
    tryWrap.addEventListener("mouseenter", () => clearInterval(tryJobInterval));
    tryWrap.addEventListener("mouseleave", () => tryJobInterval = setInterval(animateTryJobs, 4000));
  }

  // Logo links to home
  $('#homeLogo').addEventListener('click', gotoHome);
  $('#topLogo').addEventListener('click', gotoHome);
  $('#homeLogo').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { gotoHome(); e.preventDefault(); } });
  $('#topLogo').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { gotoHome(); e.preventDefault(); } });

  // salary table click delegation for term definitions handled in document click above

  // when clicking similar sector pill -> perform search
  document.addEventListener('click', function (e) {
    const sim = e.target.closest('.similar-pill');
    if (sim) {
      const q = sim.getAttribute('data-demo');
      if (q) performSearch(q);
    }
  });

  // hide inst def on outside click
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#instDefBox') && !e.target.closest('.inst-cell')) {
      hideInstDefinition();
    }
  });
}

// ========== SEARCH ==========
function performSearch(q) {
  $('#results').setAttribute('aria-busy', 'true');
  $('#resultsQuery').value = q;
  gotoResults();

  const job = findJob(q);
  if (job) {
    renderJob(job, q);
  } else {
    renderNotFound(q);
  }

  // update computed lists
  computePopularJobs();
  computeRecentJobs();
  renderPopularSection();
  renderRecentSection();

  $('#results').setAttribute('aria-busy', 'false');
}

function findJob(query) {
  const q = normalize(query);
  if (!q) return null;
  for (const job of MOCK_JOBS) {
    if (job.titles.map(normalize).some(t => t === q || t.includes(q) || q.includes(t))) {
      return job;
    }
  }
  const score = (title) => {
    const a = new Set(normalize(title).split(/\s+/));
    const b = new Set(q.split(/\s+/));
    let hits = 0; for (const w of a) if (b.has(w)) hits++;
    return hits / Math.max(1, a.size);
  };
  let best = null, bestScore = 0;
  for (const job of MOCK_JOBS) {
    for (const t of job.titles) {
      const s = score(t);
      if (s > bestScore) { bestScore = s; best = job; }
    }
  }
  return bestScore >= 0.5 ? best : null;
}

function getSuggestions(query, max = 4) {
  const q = normalize(query);
  const candidates = new Map();
  for (const job of MOCK_JOBS) {
    for (const t of job.titles) {
      const title = t;
      const n = normalize(title);
      const base = n.includes(q) || q.includes(n) ? 2 : 0;
      const wordOverlap = n.split(/\s+/).filter(w => q.includes(w)).length;
      const score = base + wordOverlap;
      candidates.set(title, Math.max(candidates.get(title) || 0, score));
    }
  }
  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([title]) => title)
    .slice(0, max);
}

// ========== HELPERS ==========
function escapeHTML(str = '') {
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
function escapeAttr(str = '') {
  return escapeHTML(str).replace(/"/g, '&quot;');
}

// ========== INIT ==========
Promise.all([fetchData(), fetchTerms()]).then(() => {
  wire();
  // initial focus
  if ($('#homeQuery')) $('#homeQuery').focus();
});


