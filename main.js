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
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const formatMoney = n => {
  if (n == null || Number.isNaN(+n)) return "—";
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(+n);
};
const normalize = s => (s||"").toLowerCase().trim();

// ========== STATE ==========
let currentJob = null;
let currentCurrency = 'USD';
let exchangeRate = 13;
let lastCurrency = 'USD';

// ========== POPULAR / RECENT JOBS ==========
function computePopularJobs() {
  // Demo logic: popularity = number of job titles (simulate "visited" stat)
  const jobs = MOCK_JOBS.slice().sort((a, b) => b.titles.length - a.titles.length);
  POPULAR_JOBS = jobs.slice(0, 4); // Top 4
}
function computeRecentJobs() {
  // Demo logic: latest are last in array
  RECENT_JOBS = MOCK_JOBS.slice(-4).reverse();
}
function renderPopularSection() {
  if (!POPULAR_JOBS.length) return;
  const el = $('#popularSection');
  el.innerHTML = `<h4>Popular Jobs</h4>
    <div class="popular-jobs-list">
      ${POPULAR_JOBS.map(j => `<button class="popular-job-pill" data-demo="${escapeAttr(j.titles[0])}">${escapeHTML(j.titles[0])}</button>`).join("")}
    </div>`;
}
function renderRecentSection() {
  if (!RECENT_JOBS.length) return;
  const el = $('#recentSection');
  el.innerHTML = `<h4>Recently Added</h4>
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

  input.addEventListener('input', function() {
    const val = input.value;
    matches = filterAutocomplete(val);
    currentSelection = -1;
    if (matches.length && val.trim()) {
      list.style.display = "";
      list.innerHTML = matches.map((m, i) =>
        `<li tabindex="-1" class="auto-item${i === 0 ? " selected" : ""}">${escapeHTML(m)}</li>`
      ).join("");
      // CSS handles positioning
    } else {
      list.style.display = "none";
      list.innerHTML = "";
    }
  });

  // Click selection
  list.addEventListener('mousedown', function(e){
    if (e.target && e.target.classList.contains('auto-item')) {
      input.value = e.target.textContent;
      list.style.display = "none";
      input.focus();
    }
  });

  // Keyboard navigation
  input.addEventListener('keydown', function(e){
    if (!matches.length || list.style.display === "none") return;
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

  list.addEventListener('mousemove', function(e){
    if (e.target && e.target.classList.contains('auto-item')) {
      const items = $$('.auto-item', list);
      items.forEach((item, idx) => item.classList.toggle('selected', item === e.target));
      currentSelection = Array.prototype.indexOf.call(items, e.target);
    }
  });

  // Hide on outside click
  document.addEventListener('mousedown', function(e){
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.style.display = "none";
    }
  });

  function updateAutocompleteSelection(list, idx) {
    const items = $$('.auto-item', list);
    items.forEach((item, i) => item.classList.toggle('selected', i === idx));
    if (items[idx]) items[idx].scrollIntoView({block: "nearest"});
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
  let html = `<h4>Browse by Sector</h4><div class="browse-pills" tabindex="0">`;
  for (const sector in SECTOR_MAP) {
    const jobs = SECTOR_MAP[sector].jobs;
    const desc = SECTOR_MAP[sector].desc || "";
    const range = computeSectorSalaryRange(sector);
    let rangeStr = "";
    if (range) {
      rangeStr = `<span class="sector-salary-range"> $${formatMoney(range.min)} – $${formatMoney(range.max)}</span>`;
    }
    html += `<button class="pill-pill" data-sector="${escapeAttr(sector)}">${escapeHTML(sector)} (${jobs.length})${rangeStr}</button>`;
  }
  html += '</div>';
  aside.innerHTML = html;
}

// ========== HANDLE SECTOR PILL CLICK ==========
function sectorPillClickHandler(e) {
  const pill = e.target.closest('.pill-pill');
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
function renderJob(job, q){
  lastSearch = job.titles[0];
  saveState();
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
    tr.innerHTML = `<td>${inst}</td><td class="mono" data-raw="${amount}">${currencySymbol(currentCurrency)} ${formatMoney(convertCurrency(amount, 'USD', currentCurrency))}</td>`;
    salaryRows.appendChild(tr);
    instOptions.push([inst, amount]);
  });

  const instSelect = $('#instSelect');
  instSelect.innerHTML = instOptions.map(([inst, amount]) => `<option value="${amount}">${inst}</option>`).join('');
  instSelect.selectedIndex = 0;
  const selectedBasic = convertCurrency(+instSelect.value, 'USD', currentCurrency);

  $('#basicInput').value = selectedBasic;
  resetAllowances();
  updateCalculatorTotals();

  renderExtras(job);

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

function renderNotFound(q){
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
  msg += " Try a simpler keyword or pick one of these close suggestions:";
  $('#notFoundMsg').textContent = msg;
  const suggs = getSuggestions(q, 6);
  $('#suggestionChips').innerHTML = suggs.map(s => `<button type="button" class="btn btn--chip" data-demo="${s}">${s}</button>`).join('') ||
    `<span class="muted">No suggestions available.</span>`;
}
function renderExtras(job){
  const items = [
    { label: "Required Qualifications", content: job.qualifications },
    { label: "Years of Experience", content: [job.yearsExperience] },
    { label: "Industry", content: [job.industry] },
    { label: "Top Skills", content: job.skills },
    { label: "Common Employers", content: job.employers },
    { label: "Key Responsibilities", content: job.responsibilities.slice(0,4) },
  ];
  $('#suggestions').innerHTML = items.map(it => `
    <div class="card card--soft">
      <div class="muted" style="font-size:12px; text-transform:uppercase; letter-spacing:.04em;">${it.label}</div>
      <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:8px;">
        ${it.content.map(v=>`<span class="pill">${escapeHTML(v)}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

// ========== CALCULATOR ==========
const DEFAULT_ALLOWANCES = [
  { name: "Housing", key: "housing", amount: 150 },
  { name: "Transport", key: "transport", amount: 80 }
];

function makeAllowanceRow(name, key, amount=0){
  const id = `allow-${key}-${Math.random().toString(36).slice(2,7)}`;
  const wrap = document.createElement('div');
  wrap.className = 'calc__row';
  wrap.innerHTML = `
    <label for="${id}">${escapeHTML(name)} Allowance</label>
    <input id="${id}" type="number" inputmode="decimal" min="0" step="0.01" value="${amount}" data-allow-key="${escapeAttr(key)}" />
  `;
  return wrap;
}

function resetAllowances(){
  const allowancesList = $('#allowancesList');
  allowancesList.innerHTML = '';
  DEFAULT_ALLOWANCES.forEach(a => {
    allowancesList.appendChild(
      makeAllowanceRow(a.name, a.key, convertCurrency(a.amount, 'USD', currentCurrency))
    );
  });
}

function collectAllowances(){
  return $$('#allowancesList input').map(i => +i.value || 0);
}

function updateCalculatorTotals(){
  const basic = +$('#basicInput').value || 0;
  const allowancesTotal = collectAllowances().reduce((a,b)=>a+b, 0);
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
  if(hasPolicy === "yes"){
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
function currencySymbol(code){
  if (!code) code = currentCurrency;
  switch(code){
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'ZWL': return 'ZWL';
    default: return code + ' ';
  }
}
function convertCurrency(amount, fromCurrency, toCurrency){
  if (!fromCurrency) fromCurrency = currentCurrency;
  if (!toCurrency) toCurrency = currentCurrency;
  if (fromCurrency === toCurrency) return +amount || 0;
  if (fromCurrency === 'USD' && toCurrency === 'ZWL') return (+amount || 0) * exchangeRate;
  if (fromCurrency === 'ZWL' && toCurrency === 'USD') return (+amount || 0) / exchangeRate;
  return +amount || 0;
}

function refreshSalaryTableCurrency(){
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
function gotoResults(){
  $('#home').classList.add('hidden');
  $('#resultsHeader').classList.remove('hidden');
  $('#results').classList.remove('hidden');
  $('#sectorResults').classList.add('hidden');
  $('#aboutPage').classList.add('hidden');
  $('#results').setAttribute('aria-busy','false');
  $('#resultsQuery').focus();
}
function gotoHome(){
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
    li.addEventListener('click', function() {
      const text = li.querySelector('.term-def').textContent;
      navigator.clipboard.writeText(text);
      showCopyFeedback(li);
    });
    li.addEventListener('keydown', function(e) {
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

// ========== EVENT WIRING ==========
function wire(){
  $('#homeSearchForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const q = $('#homeQuery').value;
    performSearch(q);
  });

  $('#resultsSearchForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const q = $('#resultsQuery').value;
    performSearch(q);
  });

  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-demo]');
    if(btn){
      const q = btn.getAttribute('data-demo');
      $('#homeQuery').value = q;
      $('#resultsQuery').value = q;
      performSearch(q);
      return;
    }
    if (e.target.closest('.pill-pill')) {
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
  });

  $('#backHomeBtn').addEventListener('click', gotoHome);
  $('#backToHomeFromSector').addEventListener('click', gotoHome);
  $('#aboutBtn').addEventListener('click', () => {
    gotoAbout();
    renderAboutPage();
  });
  $('#backToHomeFromAbout').addEventListener('click', hideAbout);

  $('#instSelect').addEventListener('change', ()=>{
    $('#basicInput').value = convertCurrency(+$('#instSelect').value || 0, 'USD', currentCurrency);
    updateCalculatorTotals();
  });

  $('#currencySelect').addEventListener('change', ()=>{
    const newCurrency = $('#currencySelect').value;
    if(newCurrency === "ZWL"){
      const rate = prompt("Enter USD to ZWL exchange rate:", exchangeRate);
      exchangeRate = +rate || 13;
    }
    convertAllCalculatorInputs(lastCurrency, newCurrency);
    lastCurrency = newCurrency;
    currentCurrency = newCurrency;
    refreshSalaryTableCurrency();
    updateCalculatorTotals();
  });

  document.addEventListener('input', (e)=>{
    if (
      e.target === $('#basicInput') ||
      e.target.closest('#allowancesList') ||
      e.target.id === "yearsService" ||
      e.target.id === "nightsWorked" ||
      e.target.id === "coffinCost" ||
      e.target.id === "policyCoverage" ||
      e.target.id === "hasPolicy"
    ){
      updateCalculatorTotals();
    }
  });

  document.addEventListener('change', (e)=>{
    if (
      e.target.id === "yearsService" ||
      e.target.id === "nightsWorked" ||
      e.target.id === "coffinCost" ||
      e.target.id === "policyCoverage" ||
      e.target.id === "hasPolicy"
    ){
      updateCalculatorTotals();
    }
  });

  $('#addAllowanceBtn').addEventListener('click', ()=>{
    const name = prompt('Allowance name:', 'Other');
    if(!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,20) || 'custom';
    $('#allowancesList').appendChild(makeAllowanceRow(name, key, 0));
    updateCalculatorTotals();
  });

  $('#resetCalcBtn').addEventListener('click', ()=>{
    $('#basicInput').value = convertCurrency(+$('#instSelect').value || 0, 'USD', currentCurrency);
    resetAllowances();
    updateCalculatorTotals();
  });

  $$('.btn.btn--chip').forEach(b=>{
    b.addEventListener('keydown', (e)=> {
      if (e.key === 'Enter' || e.key === ' '){ b.click(); }
    });
  });

  renderAutocomplete("#homeQuery", "#autocompleteList");
  renderAutocomplete("#resultsQuery", "#autocompleteListResults");
  resetAllowances();
  renderSectors();
  computePopularJobs();
  computeRecentJobs();
  renderPopularSection();
  renderRecentSection();

}

// ========== SEARCH ==========
function performSearch(q){
  $('#results').setAttribute('aria-busy','true');
  $('#resultsQuery').value = q;
  gotoResults();

  const job = findJob(q);
  if(job){
    renderJob(job, q);
  }else{
    renderNotFound(q);
  }
  $('#results').setAttribute('aria-busy','false');
}

function findJob(query){
  const q = normalize(query);
  if(!q) return null;
  for (const job of MOCK_JOBS){
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
  for (const job of MOCK_JOBS){
    for (const t of job.titles){
      const s = score(t);
      if (s > bestScore){ bestScore = s; best = job; }
    }
  }
  return bestScore >= 0.5 ? best : null;
}

function getSuggestions(query, max=4){
  const q = normalize(query);
  const candidates = new Map();
  for (const job of MOCK_JOBS){
    for (const t of job.titles){
      const title = t;
      const n = normalize(title);
      const base = n.includes(q) || q.includes(n) ? 2 : 0;
      const wordOverlap = n.split(/\s+/).filter(w => q.includes(w)).length;
      const score = base + wordOverlap;
      candidates.set(title, Math.max(candidates.get(title)||0, score));
    }
  }
  return [...candidates.entries()]
    .sort((a,b)=> b[1]-a[1])
    .map(([title])=>title)
    .slice(0, max);
}

// ========== HELPERS ==========
function escapeHTML(str=''){
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function escapeAttr(str=''){
  return escapeHTML(str).replace(/"/g,'&quot;');
}

// ========== INIT ==========
Promise.all([fetchData(), fetchTerms()]).then(wire);