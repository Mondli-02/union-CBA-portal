// main.js — patched single-file version
// Reworked: safer wire(), fixed currency double-convert bug, improved findJob matching,
// ensured instSelect stores RAW USD, hardened DOM guards, fixed about page wiring.

// ========== DATA LOADING ==========
let MOCK_JOBS = [];
let SECTOR_MAP = {};
let SALARIES = {};
let TERMS = {};
let POPULAR_JOBS = [];
let RECENT_JOBS = [];
let lastSearch = "";
let lastSector = "";

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

// ========== HELPERS ==========
function escapeHTML(str = '') {
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
function escapeAttr(str = '') {
  return escapeHTML(String(str)).replace(/"/g, '&quot;');
}

// ========== SEARCH COUNTERS & RECENT SEARCHES ==========
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
  const filtered = [title].concat(arr.filter(x => x !== title)).slice(0, 8);
  localStorage.setItem('recent_job_searches', JSON.stringify(filtered));
}
function getRecentSearches(limit = 4) {
  const arr = loadRecentSearches();
  return arr.slice(0, limit);
}

// ========== TRY JOBS ANIMATION ==========
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
  if (!input || !list) return;

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
      if (currentSelection >= 0 && matches[currentSelection]) {
        input.value = matches[currentSelection];
        list.style.display = "none";
        input.focus();
        e.preventDefault();
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

// ========== SECTOR HANDLING ==========
function sectorPillClickHandler(e) {
  const pill = e.target.closest('.sector-pill');
  if (!pill) return;
  const sector = pill.getAttribute('data-sector');
  lastSector = sector;
  saveState();
  displaySectorResults(sector);
}

function displaySectorResults(sector) {
  const homeEl = $('#home'); if (homeEl) homeEl.classList.add('hidden');
  const headerEl = $('#resultsHeader'); if (headerEl) headerEl.classList.add('hidden');
  const resultsEl = $('#results'); if (resultsEl) resultsEl.classList.add('hidden');
  const sectorResults = $('#sectorResults'); if (sectorResults) sectorResults.classList.remove('hidden');
  const heading = $('#sectorResultsHeading'); if (heading) heading.textContent = `Jobs in ${sector}`;

  const descEl = $('#sectorDesc');
  if (descEl) {
    descEl.innerHTML = SECTOR_MAP[sector]?.desc
      ? `<div class="sector-desc">${escapeHTML(SECTOR_MAP[sector].desc)}</div>` : '';
  }

  const range = computeSectorSalaryRange(sector);
  const salaryRangeEl = $('#sectorSalaryRange');
  if (salaryRangeEl) {
    salaryRangeEl.innerHTML = range
      ? `<div class="sector-salary-range">Salary range: $${formatMoney(range.min)} – $${formatMoney(range.max)}</div>`
      : "";
  }

  const jobsInSector = getJobsForSector(sector);
  const list = $('#sectorResultsList');
  if (!list) return;
  if (!jobsInSector.length) {
    list.innerHTML = `<div class="muted">No jobs found in this sector. Try another sector or search above.</div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  list.innerHTML = jobsInSector.map(job => `
    <div class="card card--soft">
      <div style="font-size:18px;font-weight:700;">${escapeHTML(job.titles[0])}</div>
      <div style="margin:8px 0 8px 0;color:var(--muted);font-size:14px;">${escapeHTML(job.description)}</div>
      <button class="btn btn--chip" data-jobid="${escapeAttr(job.id)}">View More</button>
    </div>
  `).join('');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  if ($('#jobTitle')) $('#jobTitle').textContent = job.titles[0];
  if ($('#jobMeta')) $('#jobMeta').textContent = `${job.industry} • Typical Experience: ${job.yearsExperience}`;
  if ($('#jobDesc')) $('#jobDesc').textContent = job.description;
  if ($('#jobGradeBadge')) $('#jobGradeBadge').textContent = `Grade: ${job.grade}`;

  const salaryRows = $('#salaryRows');
  if (salaryRows) {
    salaryRows.innerHTML = '';
    const salaryTable = SALARIES[job.grade] || {};
    const instOptions = [];
    Object.entries(salaryTable).forEach(([inst, amount]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="inst-cell" data-inst="${escapeAttr(inst)}" style="cursor:pointer;">${escapeHTML(inst)}</td>
                      <td class="mono" data-raw="${amount}">${currencySymbol(currentCurrency)} ${formatMoney(convertCurrency(amount, 'USD', currentCurrency))}</td>`;
      salaryRows.appendChild(tr);
      instOptions.push([inst, amount]);
    });

    const instSelect = $('#instSelect');
    if (instSelect) {
      instSelect.innerHTML = instOptions.map(([inst, amount]) =>
        `<option data-raw="${amount}" value="${amount}">${escapeHTML(inst)} - ${currencySymbol(currentCurrency)} ${formatMoney(convertCurrency(amount, 'USD', currentCurrency))}</option>`
      ).join('');
      instSelect.selectedIndex = 0;
      const selectedRaw = +instSelect.value || 0;
      if ($('#basicInput')) $('#basicInput').value = convertCurrency(selectedRaw, 'USD', currentCurrency);
    }
  }

  resetAllowances();
  updateCalculatorTotals();

  renderExtras(job);
  renderSimilarSector(job);

  ['jobCard','calcCard','serviceCard','nightCard','funeralCard','extraCard'].forEach(id => {
    const el = $(`#${id}`);
    if (el) el.style.display = '';
  });
  const nf = $('#notFoundCard'); if (nf) nf.style.display = 'none';
  const results = $('#results'); if (results) results.classList.remove('hidden');
  const header = $('#resultsHeader'); if (header) header.classList.remove('hidden');
  const sectorResults = $('#sectorResults'); if (sectorResults) sectorResults.classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderNotFound(q) {
  const hideIds = ['jobCard','calcCard','extraCard','serviceCard','nightCard','funeralCard'];
  hideIds.forEach(id => { const el = $(`#${id}`); if (el) el.style.display = 'none'; });
  const nf = $('#notFoundCard'); if (nf) nf.style.display = '';
  const results = $('#results'); if (results) results.classList.remove('hidden');
  const header = $('#resultsHeader'); if (header) header.classList.remove('hidden');
  const sectorResults = $('#sectorResults'); if (sectorResults) sectorResults.classList.add('hidden');

  let msg = "We couldn’t find an exact job title match.";
  if (q && q.length > 2 && filterAutocomplete(q).length === 0) {
    msg += " No jobs matched your keyword.";
  }
  msg += " Try a simpler keyword or browse jobs by sector:";
  const notFoundMsg = $('#notFoundMsg'); if (notFoundMsg) notFoundMsg.textContent = msg;

  const sectorBtns = Object.keys(SECTOR_MAP).map(sector =>
    `<button type="button" class="btn btn--chip sector-suggestion-btn" data-sector="${escapeAttr(sector)}">${escapeHTML(sector)}</button>`
  ).join('') || `<span class="muted">No sectors available.</span>`;
  const suggestionChips = $('#suggestionChips');
  if (suggestionChips) suggestionChips.innerHTML = sectorBtns;

  if (suggestionChips) {
    suggestionChips.onclick = function (e) {
      const btn = e.target.closest('.sector-suggestion-btn');
      if (btn) {
        const sector = btn.getAttribute('data-sector');
        if (sector) displaySectorResults(sector);
      }
    };
  }
}

function renderExtras(job) {
  const items = [
    { label: "Required Qualifications", content: job.qualifications || [] },
    { label: "Years of Experience", content: [job.yearsExperience] },
    { label: "Industry", content: [job.industry] },
    { label: "Top Skills", content: job.skills || [] },
    { label: "Common Employers", content: job.employers || [] },
    { label: "Key Responsibilities", content: (job.responsibilities || []).slice(0, 4) },
  ];
  const suggestions = $('#suggestions');
  if (!suggestions) return;
  suggestions.innerHTML = items.map(it => `
    <div class="card card--soft">
      <div class="muted" style="font-size:12px; text-transform:uppercase; letter-spacing:.04em;">${it.label}</div>
      <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:8px;">
        ${(it.content || []).map(v => `<span class="pill">${escapeHTML(v)}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderSimilarSector(job) {
  const wrap = $('#similarSectorWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const jobTitle = job.titles[0];
  const sectorsWithThisJob = Object.keys(SECTOR_MAP).filter(s =>
    (SECTOR_MAP[s].jobs || []).includes(jobTitle)
  );

  let sectorKeys = sectorsWithThisJob.length ? sectorsWithThisJob : [];
  if (job.industry && SECTOR_MAP[job.industry]) {
    if (!sectorKeys.includes(job.industry)) sectorKeys.unshift(job.industry);
  }
  if (!sectorKeys.length) return;

  let html = `<div class="muted" style="font-size:12px; margin-bottom:6px;">Other jobs grouped by sector:</div>`;
  sectorKeys.forEach(sectorKey => {
    const jobs = getJobsForSector(sectorKey)
      .filter(j => j.id !== job.id)
      .slice(0, 6);
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
  if (!allowancesList) return;
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
  const basic = +($('#basicInput')?.value || 0);
  const allowancesTotal = collectAllowances().reduce((a, b) => a + b, 0);
  const grand = basic + allowancesTotal;

  const allowancesTotalEl = $('#allowancesTotal'); if (allowancesTotalEl) allowancesTotalEl.textContent = `${currencySymbol(currentCurrency)} ${formatMoney(allowancesTotal)}`;
  const grandTotalEl = $('#grandTotal'); if (grandTotalEl) grandTotalEl.textContent = `${currencySymbol(currentCurrency)} ${formatMoney(grand)}`;

  const years = +($('#yearsService')?.value || 0);
  const serviceTotalEl = $('#serviceTotal'); if (serviceTotalEl) serviceTotalEl.textContent = `${currencySymbol(currentCurrency)} ${(basic * 0.01 * years).toFixed(2)}`;

  const nights = +($('#nightsWorked')?.value || 0);
  const nightTotalEl = $('#nightTotal'); if (nightTotalEl) nightTotalEl.textContent = `${currencySymbol(currentCurrency)} ${(basic * 0.01 * nights).toFixed(2)}`;

  const hasPolicy = $('#hasPolicy')?.value;
  const coffin = +($('#coffinCost')?.value || 0);
  let owed = 0;
  const policyRow = $('#policyRow');
  if (hasPolicy === "yes") {
    const coverage = +($('#policyCoverage')?.value || 0);
    owed = coverage >= coffin ? 0 : coffin - coverage;
    if (policyRow) policyRow.style.display = "";
  } else {
    owed = coffin * 0.5;
    if (policyRow) policyRow.style.display = "none";
  }
  const funeralTotalEl = $('#funeralTotal'); if (funeralTotalEl) funeralTotalEl.textContent = `${currencySymbol(currentCurrency)} ${owed.toFixed(2)}`;
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

  // if fromCurrency is USD and toCurrency has rate
  if (fromCurrency === 'USD' && exchangeRates[toCurrency]) {
    return (+amount || 0) * exchangeRates[toCurrency];
  }
  // if toCurrency is USD and fromCurrency has rate
  if (toCurrency === 'USD' && exchangeRates[fromCurrency]) {
    return (+amount || 0) / exchangeRates[fromCurrency];
  }
  // both in exchangeRates => convert via USD
  if (exchangeRates[fromCurrency] && exchangeRates[toCurrency]) {
    const inUSD = (+amount || 0) / exchangeRates[fromCurrency];
    return inUSD * exchangeRates[toCurrency];
  }
  // fallback: from USD to ZWL default
  if (fromCurrency === 'USD' && toCurrency === 'ZWL') {
    return (+amount || 0) * (exchangeRates['ZWL'] || 1);
  }
  // best-effort: unknown currencies -> return amount unchanged
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
  if (!fromCurrency) fromCurrency = lastCurrency || 'USD';
  if (!toCurrency) toCurrency = currentCurrency || 'USD';
  const b = +($('#basicInput')?.value || 0);
  if ($('#basicInput')) $('#basicInput').value = convertCurrency(b, fromCurrency, toCurrency);
  $$('#allowancesList input').forEach(input => {
    input.value = convertCurrency(+input.value || 0, fromCurrency, toCurrency);
  });
  if ($('#coffinCost')) $('#coffinCost').value = convertCurrency(+$('#coffinCost').value || 0, fromCurrency, toCurrency);
  if ($('#policyCoverage')) $('#policyCoverage').value = convertCurrency(+$('#policyCoverage').value || 0, fromCurrency, toCurrency);
}

// ========== NAVIGATION ==========
function gotoResults() {
  const home = $('#home'); if (home) home.classList.add('hidden');
  const header = $('#resultsHeader'); if (header) header.classList.remove('hidden');
  const results = $('#results'); if (results) results.classList.remove('hidden');
  const sectorResults = $('#sectorResults'); if (sectorResults) sectorResults.classList.add('hidden');
  const about = $('#aboutPage'); if (about) about.classList.add('hidden');
  if ($('#results')) $('#results').setAttribute('aria-busy', 'false');
  const query = $('#resultsQuery'); if (query) query.focus();
}
function gotoHome() {
  const home = $('#home'); if (home) home.classList.remove('hidden');
  const header = $('#resultsHeader'); if (header) header.classList.add('hidden');
  const results = $('#results'); if (results) results.classList.add('hidden');
  const sectorResults = $('#sectorResults'); if (sectorResults) sectorResults.classList.add('hidden');
  const about = $('#aboutPage'); if (about) about.classList.add('hidden');
  const resultsQuery = $('#resultsQuery'); if (resultsQuery) resultsQuery.value = '';
  ['jobCard','calcCard','serviceCard','nightCard','funeralCard','extraCard','notFoundCard'].forEach(id => {
    const el = $(`#${id}`); if (el) el.style.display = 'none';
  });
  const homeQuery = $('#homeQuery'); if (homeQuery) homeQuery.focus();
}

// ========== ABOUT PAGE ==========
function renderAboutPage() {
  const termListEl = $('#termList');
  if (!termListEl) return;
  let html = "";
  Object.entries(TERMS).forEach(([term, def]) => {
    html += `<li tabindex="0">
      <span class="term-title">${escapeHTML(term)}</span>
      <span class="term-def">${escapeHTML(def)}</span>
      <span class="copy-feedback" style="display:none;">Copied!</span>
    </li>`;
  });
  termListEl.innerHTML = html;

  const items = Array.from(termListEl.querySelectorAll('li'));
  items.forEach(li => {
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
  if (!feedback) return;
  feedback.style.display = "";
  li.classList.add('copied');
  setTimeout(() => {
    feedback.style.display = "none";
    li.classList.remove('copied');
  }, 1100);
}
function gotoAbout() {
  const about = $('#aboutPage'); if (about) about.classList.remove('hidden');
  const home = $('#home'); if (home) home.classList.add('hidden');
  const results = $('#results'); if (results) results.classList.add('hidden');
  const header = $('#resultsHeader'); if (header) header.classList.add('hidden');
  const sectorResults = $('#sectorResults'); if (sectorResults) sectorResults.classList.add('hidden');
  window.scrollTo(0, 0);
}
function hideAbout() {
  const about = $('#aboutPage'); if (about) about.classList.add('hidden');
  const home = $('#home'); if (home) home.classList.remove('hidden');
}

// ========== INSTITUTION DEFINITION POPUP HANDLING ==========
function showInstDefinition(inst) {
  const titleEl = $('#instDefTitle');
  const textEl = $('#instDefText');
  const box = $('#instDefBox');
  if (titleEl) titleEl.textContent = inst;
  const def = TERMS[inst] || TERMS[inst.toLowerCase()] || TERMS[inst.toUpperCase()] || "Definition not available.";
  if (textEl) textEl.textContent = def;
  if (box) {
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
function hideInstDefinition() {
  const box = $('#instDefBox'); if (box) box.classList.add('hidden');
}

// ========== FIND / SUGGESTIONS ==========
function findJob(query) {
  const q = normalize(query);
  if (!q) return null;

  // 1) exact title match (any job)
  for (const job of MOCK_JOBS) {
    if (job.titles.map(normalize).some(t => t === q)) return job;
  }

  // 2) title startsWith (e.g. "cook helper" when query "cook")
  for (const job of MOCK_JOBS) {
    if (job.titles.map(normalize).some(t => t.startsWith(q))) return job;
  }

  // 3) whole-word match in the title (e.g. "assistant cook" contains word "cook")
  for (const job of MOCK_JOBS) {
    if (job.titles.map(normalize).some(t => t.split(/\s+/).includes(q))) return job;
  }

  // 4) includes fallback (less precise)
  for (const job of MOCK_JOBS) {
    if (job.titles.map(normalize).some(t => t.includes(q))) return job;
  }

  // 5) scoring fallback
  let best = null, bestScore = 0;
  for (const job of MOCK_JOBS) {
    for (const t of job.titles) {
      const a = new Set(normalize(t).split(/\s+/));
      const b = new Set(q.split(/\s+/));
      let hits = 0;
      for (const w of a) if (b.has(w)) hits++;
      const s = hits / Math.max(1, a.size);
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

// ========== HELPERS (again usable) ==========
function escapeForText(s = '') {
  return escapeHTML(s);
}

// ========== CURRENCY UI HELPERS ==========
function updateCurrencyDisplay(fromCurrency, toCurrency) {
  // salary rows: read data-raw (raw USD) and re-render
  $$('#salaryRows td[data-raw]').forEach(td => {
    const rawUSD = +td.getAttribute('data-raw');
    td.textContent = `${currencySymbol(toCurrency)} ${formatMoney(convertCurrency(rawUSD, 'USD', toCurrency))}`;
  });

  // instSelect: keep option.value = raw USD and update displayed text
  const instSelect = $("#instSelect");
  if (instSelect) {
    instSelect.querySelectorAll("option").forEach(opt => {
      const rawUSD = +opt.getAttribute("data-raw");
      if (!isNaN(rawUSD)) {
        const instLabel = (opt.textContent || "").split(" - ")[0];
        opt.textContent = `${instLabel} - ${currencySymbol(toCurrency)} ${formatMoney(convertCurrency(rawUSD, 'USD', toCurrency))}`;
        opt.value = rawUSD;
      }
    });
  }

  // convert calculator inputs from the previous displayed currency -> the new one
  convertAllCalculatorInputs(fromCurrency, toCurrency);

  // finalise
  lastCurrency = toCurrency;
  currentCurrency = toCurrency;
  updateCalculatorTotals();
}

function setupCurrencySelect() {
  const sel = $('#currencySelect');
  if (!sel) return;
  const codes = ['USD', ...Object.keys(exchangeRates || {})];
  // dedupe while preserving order
  const seen = new Set();
  const cleaned = [];
  for (const c of codes) {
    if (!seen.has(c)) { seen.add(c); cleaned.push(c); }
  }
  sel.innerHTML = cleaned.map(code => {
    if (code === 'USD') return `<option value="USD">$ USD</option>`;
    return `<option value="${escapeAttr(code)}">${escapeHTML(code)}</option>`;
  }).join('');
  sel.value = currentCurrency || 'USD';
  if ($('#customCurrencyWrap')) $('#customCurrencyWrap').style.display = 'none';
}

// ========== INIT & WIRING ==========
function wire() {
  loadState();

  // safe DOM lookups
  const homeForm = $('#homeSearchForm');
  const resultsForm = $('#resultsSearchForm');
  const backHomeBtn = $('#backHomeBtn');
  const backFromSector = $('#backToHomeFromSector');
  const aboutBtn = $('#aboutBtn');
  const backFromAbout = $('#backToHomeFromAbout');
  const instSelect = $('#instSelect');
  const currencySelect = $('#currencySelect');
  const customCurrencyWrap = $('#customCurrencyWrap');
  const customCurrencyCode = $('#customCurrencyCode');
  const customExchangeRate = $('#customExchangeRate');
  const addCustomCurrencyBtn = $('#addCustomCurrencyBtn');
  const closeInstDef = $('#closeInstDef');

  if (homeForm) {
    homeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#homeQuery')?.value || '';
      performSearch(q);
    });
  }
  if (resultsForm) {
    resultsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#resultsQuery')?.value || '';
      performSearch(q);
    });
  }

  // Delegated click handler (handles many button types)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-demo]');
    if (btn) {
      const q = btn.getAttribute('data-demo');
      if (q) {
        if ($('#homeQuery')) $('#homeQuery').value = q;
        if ($('#resultsQuery')) $('#resultsQuery').value = q;
        performSearch(q);
      }
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
      if (job) renderJob(job, job.titles[0]);
      return;
    }

    const instCell = e.target.closest('.inst-cell');
    if (instCell) {
      const inst = instCell.getAttribute('data-inst');
      showInstDefinition(inst);
      return;
    }

    const sim = e.target.closest('.similar-pill');
    if (sim) {
      const q = sim.getAttribute('data-demo');
      if (q) performSearch(q);
      return;
    }

    const sbtn = e.target.closest('.sector-suggestion-btn');
    if (sbtn) {
      const sector = sbtn.getAttribute('data-sector');
      if (sector) displaySectorResults(sector);
    }
  });

  if (backHomeBtn) backHomeBtn.addEventListener('click', gotoHome);
  if (backFromSector) backFromSector.addEventListener('click', gotoHome);
  if (aboutBtn) {
    aboutBtn.addEventListener('click', () => {
      gotoAbout();
      renderAboutPage();
    });
  }
  if (backFromAbout) backFromAbout.addEventListener('click', hideAbout);

  const backToPrev = $('#backToPreviousSearch');
  if (backToPrev) backToPrev.addEventListener('click', () => {
    const ls = localStorage.getItem('jobs_last_search') || '';
    if (ls) performSearch(ls);
    else gotoHome();
  });

  if (instSelect) {
    instSelect.addEventListener('change', () => {
      const raw = +instSelect.value || 0;
      if ($('#basicInput')) $('#basicInput').value = convertCurrency(raw, 'USD', currentCurrency);
      updateCalculatorTotals();
    });
  }

  setupCurrencySelect();

  if (currencySelect) {
    currencySelect.addEventListener('change', () => {
      const newCurrency = currencySelect.value || 'USD';
      const fromCurrency = lastCurrency || currentCurrency || 'USD';

      if (newCurrency === 'USD') {
        if (customCurrencyWrap) customCurrencyWrap.style.display = 'none';
        updateCurrencyDisplay(fromCurrency, 'USD');
        return;
      }

      if (exchangeRates[newCurrency] !== undefined) {
        if (customCurrencyWrap) customCurrencyWrap.style.display = 'none';
        updateCurrencyDisplay(fromCurrency, newCurrency);
        return;
      }

      if (customCurrencyWrap) {
        customCurrencyWrap.style.display = '';
        if (customCurrencyCode) customCurrencyCode.value = newCurrency;
        if (customExchangeRate) customExchangeRate.value = exchangeRates[newCurrency] || '';
      }
    });
  }

  if (customCurrencyCode) {
    customCurrencyCode.addEventListener('input', () => {
      const code = (customCurrencyCode.value || '').trim().toUpperCase();
      if (!code) return;
      const sel = $('#currencySelect');
      if (!sel) return;
      const old = sel.value;
      if (old && old !== 'USD' && exchangeRates[old] !== undefined && code !== old) {
        const rate = exchangeRates[old];
        delete exchangeRates[old];
        exchangeRates[code] = rate;
        const optOld = sel.querySelector(`option[value="${old}"]`);
        if (optOld) optOld.value = code;
      }
      const opt = sel.querySelector(`option[value="${code}"]`) || sel.querySelector(`option[value="${old}"]`);
      if (opt) opt.textContent = code;
      sel.value = code;
      currentCurrency = code;
      refreshSalaryTableCurrency();
      updateCalculatorTotals();
    });
  }

  if (customExchangeRate) {
    customExchangeRate.addEventListener('input', () => {
      const val = parseFloat(customExchangeRate.value);
      const code = (customCurrencyCode?.value || '').trim().toUpperCase();
      if (!code || isNaN(val) || val <= 0) return;
      exchangeRates[code] = val;
      currentCurrency = code;
      refreshSalaryTableCurrency();
      updateCalculatorTotals();
    });
  }

  if (addCustomCurrencyBtn) {
    addCustomCurrencyBtn.style.display = '';
    addCustomCurrencyBtn.addEventListener('click', () => {
      const code = (customCurrencyCode?.value || '').trim().toUpperCase();
      const rate = parseFloat(customExchangeRate?.value || '');
      if (!code || !rate || rate <= 0) {
        alert('Enter a valid currency code and USD → X rate (number).');
        return;
      }
      exchangeRates[code] = rate;
      const sel = $('#currencySelect');
      if (sel) {
        if (!sel.querySelector(`option[value="${code}"]`)) {
          const opt = document.createElement('option');
          opt.value = code;
          opt.textContent = code;
          sel.appendChild(opt);
        }
        sel.value = code;
      }
      if (customCurrencyWrap) customCurrencyWrap.style.display = 'none';
      const fromCurrency = lastCurrency || 'USD';
      updateCurrencyDisplay(fromCurrency, code);
    });
  } else {
    if ($('#customCurrencyWrap')) $('#customCurrencyWrap').style.display = 'none';
  }

  if (closeInstDef) closeInstDef.addEventListener('click', hideInstDefinition);

  document.addEventListener('input', (e) => {
    if (
      e.target === $('#basicInput') ||
      e.target.closest('#allowancesList') ||
      (e.target.id === "yearsService") ||
      (e.target.id === "nightsWorked") ||
      (e.target.id === "coffinCost") ||
      (e.target.id === "policyCoverage") ||
      (e.target.id === "hasPolicy")
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
    ) updateCalculatorTotals();
  });

  const addAllowanceBtn = $('#addAllowanceBtn');
  if (addAllowanceBtn) {
    addAllowanceBtn.addEventListener('click', () => {
      const name = prompt('Allowance name:', 'Other');
      if (!name) return;
      const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20) || 'custom';
      $('#allowancesList')?.appendChild(makeAllowanceRow(name, key, 0));
      updateCalculatorTotals();
    });
  }

  const resetCalcBtn = $('#resetCalcBtn');
  if (resetCalcBtn) {
    resetCalcBtn.addEventListener('click', () => {
      const selRaw = +($('#instSelect')?.value || 0);
      if ($('#basicInput')) $('#basicInput').value = convertCurrency(selRaw, 'USD', currentCurrency);
      resetAllowances();
      updateCalculatorTotals();
    });
  }

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

  renderTryJobs(getRandomJobs(3));
  let tryJobInterval = setInterval(animateTryJobs, 4000);
  const tryWrap = document.getElementById('tryJobs');
  if (tryWrap) {
    tryWrap.addEventListener("mouseenter", () => { clearInterval(tryJobInterval); tryJobInterval = null; });
    tryWrap.addEventListener("mouseleave", () => { if (!tryJobInterval) tryJobInterval = setInterval(animateTryJobs, 4000); });
  }

  if ($('#homeLogo')) {
    $('#homeLogo').addEventListener('click', gotoHome);
    $('#homeLogo').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { gotoHome(); e.preventDefault(); } });
  }
  if ($('#topLogo')) {
    $('#topLogo').addEventListener('click', gotoHome);
    $('#topLogo').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { gotoHome(); e.preventDefault(); } });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#instDefBox') && !e.target.closest('.inst-cell')) {
      hideInstDefinition();
    }
  });
}

// ========== SEARCH HANDLER ==========
function performSearch(q) {
  const resultsEl = $('#results');
  if (resultsEl) resultsEl.setAttribute('aria-busy', 'true');
  if ($('#resultsQuery')) $('#resultsQuery').value = q;
  gotoResults();

  const job = findJob(q);
  if (job) {
    renderJob(job, q);
  } else {
    renderNotFound(q);
  }

  computePopularJobs();
  computeRecentJobs();
  renderPopularSection();
  renderRecentSection();

  if (resultsEl) resultsEl.setAttribute('aria-busy', 'false');
}

// ========== INIT ==========
Promise.all([fetchData(), fetchTerms()]).then(() => {
  // initial currency / UI state
  setupCurrencySelect();
  currentCurrency = currentCurrency || 'USD';
  lastCurrency = lastCurrency || 'USD';
  if ($('#customCurrencyWrap')) $('#customCurrencyWrap').style.display = 'none';

  wire();
  if ($('#homeQuery')) $('#homeQuery').focus();
  if ($('#jobCard')) $('#jobCard').focus();
});
