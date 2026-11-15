import { ANCHOR, DAY, DEFAULT_PARAMS, SAMPLES_PER_DAY, STEP, clock, compare, historyDlmo, wrap } from './model.mjs';
import { drawPhase, drawTelemetry, drawUtmb } from './charts.mjs';
import { ALIGN_GAP, explain, suggest } from './suggest.mjs';
import { fitParams, sleepOnsets } from './fit.mjs';
import { CREW, generateRecord } from './crew.mjs';

const FORECAST_NIGHTS = 90; // three months ahead
const FIT_NIGHTS = 21; // personal fit uses the last three weeks of the record
const TABLE_NIGHTS = [1, 7, 14, 30, 60, 90];

const el = id => document.getElementById(id);
const set = (id, value) => { el(id).textContent = value; };
const value = id => el(id).value;
const timeInput = id => {
  const text = value(id);
  if (!text) return NaN;
  const [hour, minute] = text.split(':').map(Number);
  return hour * 60 + minute;
};
const fixtures = {
  general: ['General illumination', '4,500 K · 210 cd fixture default'],
  warm: ['Pre-sleep', '2,700 K · 90 cd fixture default'],
  cool: ['Alertness / phase shift', '6,500 K · 420 cd fixture default'],
};
const phaseLabels = {
  sleep_min: ['Mean sleep duration', n => duration(Math.round(n))],
  latency_min: ['Mean time to fall asleep', n => Math.round(n) + ' min'],
  efficiency: ['Mean sleep efficiency', n => n.toFixed(1) + '%'],
};

let telemetry = [];
let sleepNights = [];
let utmb = [];
let dso = [];
let forecast = [];
let playIndex = 0;
let timer = null;
let options = { bedtime: 1380, wake: 420, lead: 120, lux: 30, morning: 0 };
// Sleep slot set by mission planners. Only a manual bed/wake edit changes it; Apply does not.
let mission = { bedtime: 1380, wake: 420 };
let suggestion = null;
let planApplied = false; // true after Preview in forecast, until the plan is edited by hand
let personalFit = null; // result of fitParams on the replay
let member = CREW[0];
let chartView = { past: [], future: [] };
const records = new Map(); // astronaut id -> generated rows
const fits = new Map(); // astronaut id -> fit result
// Forecasts start from the same recent window the fit used, so the fitted offset means the same thing.
const recentLux = () => telemetry.slice(-FIT_NIGHTS * SAMPLES_PER_DAY).map(s => s.lux);
const activeParams = () => (personalFit && el('use-fit').checked ? personalFit.params : DEFAULT_PARAMS);

function duration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return (h ? h + ' h' : '') + (h && m ? ' ' : '') + (m ? m + ' min' : h ? '' : '0 min');
}

function delta(a, b) {
  return wrap(a - b + DAY / 2) - DAY / 2;
}

function shiftLabel(diff) {
  if (!Number.isFinite(diff)) return '—';
  if (!diff) return 'No shift';
  return duration(Math.abs(diff)) + (diff > 0 ? ' later' : ' earlier');
}

async function loadCsv(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('Unable to load ' + path);
  // The three bundled CSVs have unquoted scalar fields.
  const [head, ...rows] = (await response.text()).trim().split(/\r?\n/);
  const names = head.split(',');
  return rows.map(row => Object.fromEntries(row.split(',').map((field, index) => [names[index], field])));
}

function summarizeSleep(rows) {
  const nights = [];
  let onset = null;
  rows.forEach((row, i) => {
    if (row.asleep && onset === null) onset = i;
    if (!row.asleep && onset !== null) {
      nights.push({ onset, end:i, night:Math.floor(onset / SAMPLES_PER_DAY) + 1 });
      onset = null;
    }
  });
  return nights;
}

function renderReplay() {
  if (!telemetry.length) return;
  const day = Math.floor(playIndex / SAMPLES_PER_DAY);
  const sample = telemetry[playIndex];
  const latest = sleepNights.findLast(night => night.end <= playIndex);
  const targetLength = wrap(options.wake - options.bedtime);
  const onset = latest ? wrap(ANCHOR + latest.onset * STEP) : null;
  const delay = latest ? delta(onset, options.bedtime) : null;
  set('sleep-duration', latest ? duration((latest.end - latest.onset) * STEP) : '—');
  set('sleep-target-label', duration(targetLength) + ' scheduled');
  set('sleep-onset', onset !== null ? clock(onset) : '—');
  set('sleep-night', latest ? 'Replay night ' + latest.night : 'Awaiting completed sleep');
  set('sleep-delay', delay === null ? '—' : delay === 0 ? 'On target' : shiftLabel(delay));
  set('sleep-delay-label', 'Compared with ' + clock(options.bedtime) + ' target');
  set('replay-time', 'Day ' + (day + 1) + ' · ' + sample.timestamp.slice(11,16));
  set('live-lux', sample.lux + ' lux');
  set('live-state', sample.asleep ? 'Asleep' : 'Awake');
  el('scrubber').value = playIndex;
  el('scrubber').setAttribute('aria-valuetext', el('replay-time').textContent);
  for (const button of el('day-tabs').children) {
    button.setAttribute('aria-pressed', Number(button.dataset.day) === day);
  }
  const start = day * SAMPLES_PER_DAY;
  drawTelemetry(el('telemetry-chart'), telemetry.slice(start, start + SAMPLES_PER_DAY), playIndex - start, options);
}

function setPlayIndex(index) {
  playIndex = Math.max(0, Math.min(index, telemetry.length - 1));
  renderReplay();
}

function stopReplay() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  set('play', '▶ Replay');
}

function toggleReplay() {
  if (!telemetry.length) return;
  if (timer !== null) { stopReplay(); return; }
  if (playIndex === telemetry.length - 1) setPlayIndex(0);
  set('play', 'Ⅱ Pause');
  timer = window.setInterval(() => {
    setPlayIndex(playIndex + 12);
    if (playIndex === telemetry.length - 1) stopReplay();
  }, 115);
}

function renderForecast() {
  if (!telemetry.length) return;
  const lux = telemetry.map(s => s.lux);
  const params = activeParams();
  forecast = compare(recentLux(), options, params, FORECAST_NIGHTS);
  const onsets = sleepOnsets(telemetry.map(s => s.asleep));
  chartView = { past: historyDlmo(lux, params).map((dlmo, i) => ({ dlmo, onset: onsets[i] })), future: forecast };
  const rows = TABLE_NIGHTS.map(nightNumber => {
    const night = forecast[nightNumber - 1];
    const row = document.createElement('tr');
    const shift = night.current !== null && night.preview !== null ? delta(night.preview, night.current) : NaN;
    const labels = [
      'Night ' + nightNumber,
      night.current === null ? '—' : clock(night.current),
      night.preview === null ? '—' : clock(night.preview),
      shiftLabel(shift),
    ];
    labels.forEach((label, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = label;
      row.append(cell);
    });
    if (nightNumber === FORECAST_NIGHTS) set('phase-delta', shiftLabel(shift));
    return row;
  });
  el('forecast-rows').replaceChildren(...rows);
  drawPhase(el('phase-chart'), chartView, options.bedtime, ALIGN_GAP);
}

function updatePlan() {
  const bedtime = timeInput('bedtime');
  const wake = timeInput('wake');
  const lead = Number(value('lead'));
  const lux = Number(value('dim-lux'));
  const morning = Number(value('morning'));
  const awake = wrap(bedtime - wake);
  const error = el('input-error');
  if (!Number.isFinite(awake) || awake <= lead + morning) {
    error.textContent = 'Choose distinct bed and wake times with an awake window longer than the dimming lead and morning light.';
    error.hidden = false;
    return;
  }
  error.hidden = true;
  options = { bedtime, wake, lead, lux, morning };
  set('target-header', clock(bedtime) + ' → ' + clock(wake));
  set('general-start', clock(wake));
  set('dim-start', clock(bedtime - lead));
  set('off-start', clock(bedtime));
  renderReplay();
  renderForecast();
  renderSuggestion();
}

function renderFit() {
  if (!personalFit) {
    set('fit-summary', 'Personal fit needs at least 2 nights with a sleep onset; using the average clock.');
    el('use-fit').disabled = true;
    return;
  }
  const { params, typical, unusual, nights } = personalFit;
  const offset = params.offset === 0 ? 'no start offset' : 'start offset ' + duration(Math.abs(params.offset)) + (params.offset > 0 ? ' later' : ' earlier');
  set('fit-summary', 'Fitted on the last ' + nights.length + ' nights: natural day ' + params.tau.toFixed(1) + ' h (average 24.2 h), '
    + offset + '. Predicted sleep onsets are typically ' + Math.round(typical) + ' min off'
    + (unusual ? '; ' + unusual + ' unusual nights (for example a docking shift) ignored.' : '.'));
}

function renderSuggestion() {
  suggestion = suggest(recentLux(), options, mission, activeParams());
  if (!suggestion) return;
  const { status, steps, outcome } = explain(suggestion, options, mission);
  set('suggestion-status', status);
  el('suggestion-steps').replaceChildren(...steps.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  set('suggestion-outcome', outcome);
  const button = el('apply-suggestion');
  button.disabled = !suggestion.changes;
  button.textContent = suggestion.changes ? 'Preview in forecast' : planApplied ? 'Plan applied ✓' : 'Already the best plan';
}

function applySuggestion() {
  planApplied = true;
  if (!suggestion || !suggestion.changes) return;
  const { bedtime, wake, lead, morning } = suggestion.options;
  el('bedtime').value = clock(bedtime);
  el('wake').value = clock(wake);
  el('lead').value = String(lead);
  el('morning').value = String(morning);
  updatePlan();
}

function setMissionSlot() {
  planApplied = false;
  const bedtime = timeInput('bedtime');
  const wake = timeInput('wake');
  if (Number.isFinite(bedtime) && Number.isFinite(wake)) mission = { bedtime, wake };
  updatePlan();
}

function fixture(mode) {
  const [name, details] = fixtures[mode];
  el('fixture-preview').dataset.mode = mode;
  set('fixture-name', name);
  set('fixture-details', details);
  for (const button of document.querySelectorAll('[data-fixture]')) {
    button.setAttribute('aria-pressed', button.dataset.fixture === mode);
  }
}

function renderUtmb() {
  const key = value('utmb-metric');
  const interval = value('utmb-phase');
  const rows = interval === 'all' ? utmb : utmb.filter(row => row.phase === interval);
  if (!rows.length) return;
  const mean = rows.reduce((sum, row) => sum + Number(row[key]), 0) / rows.length;
  const [caption, format] = phaseLabels[key];
  set('utmb-average', format(mean));
  set('utmb-average-label', caption + ' · ' + rows.length + ' observations');
  drawUtmb(el('utmb-chart'), rows, key);
}

function renderDso() {
  const row = dso.find(item => item.subject_id === value('dso-subject'));
  if (!row) return;
  set('dso-before', clock(Number(row.before_peak_h_after_midnight) * 60));
  set('dso-after', clock(Number(row.after_peak_h_after_midnight) * 60));
  set('dso-delay', Number(row.reported_phase_delay_h).toFixed(1) + ' h');
}

function navigate() {
  const evidence = window.location.hash === '#evidence';
  el('evidence').hidden = !evidence;
  el('console').hidden = evidence;
  if (evidence) {
    stopReplay();
    el('console-link').removeAttribute('aria-current');
    el('evidence-link').setAttribute('aria-current', 'page');
    renderUtmb();
    renderDso();
  } else {
    el('evidence-link').removeAttribute('aria-current');
    el('console-link').setAttribute('aria-current', 'page');
    renderReplay();
    drawPhase(el('phase-chart'), chartView, options.bedtime, ALIGN_GAP);
  }
}

async function initialize() {
  const [utmbRows, phaseRows] = await Promise.all([
    loadCsv('./data/utmb_c1g0001.csv'),
    loadCsv('./data/dso484_phases.csv'),
  ]);
  utmb = utmbRows;
  dso = phaseRows.filter(row => row.marker === 'urinary_melatonin_sulfate');
  for (const astronaut of CREW) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = astronaut.id;
    button.textContent = astronaut.name;
    button.title = astronaut.id;
    button.addEventListener('click', () => selectAstronaut(astronaut));
    el('crew-tabs').append(button);
  }
  for (const subject of dso) {
    el('dso-subject').add(new Option('Subject ' + subject.subject_id + ' · Protocol ' + subject.protocol, subject.subject_id));
  }
  el('play').addEventListener('click', toggleReplay);
  el('scrubber').addEventListener('input', () => {
    stopReplay();
    setPlayIndex(Number(value('scrubber')));
  });
  for (const id of ['bedtime', 'wake']) el(id).addEventListener('change', setMissionSlot);
  for (const id of ['lead', 'dim-lux', 'morning']) el(id).addEventListener('change', () => { planApplied = false; updatePlan(); });
  el('apply-suggestion').addEventListener('click', applySuggestion);
  el('use-fit').addEventListener('change', () => { renderForecast(); renderSuggestion(); });
  for (const button of document.querySelectorAll('[data-fixture]')) {
    button.addEventListener('click', () => fixture(button.dataset.fixture));
  }
  for (const id of ['utmb-metric','utmb-phase']) el(id).addEventListener('change', renderUtmb);
  el('dso-subject').addEventListener('change', renderDso);
  window.addEventListener('hashchange', navigate);
  if (window.ResizeObserver) {
    const resize = new ResizeObserver(() => {
      if (el('evidence').hidden) {
        renderReplay();
        drawPhase(el('phase-chart'), chartView, options.bedtime, ALIGN_GAP);
      } else {
        renderUtmb();
      }
    });
    for (const id of ['telemetry-chart','phase-chart','utmb-chart']) resize.observe(el(id));
  }
  await selectAstronaut(CREW[0]);
  navigate();
}

// Load one astronaut's 90-day record, fit their clock (cached), and redraw everything.
async function selectAstronaut(astronaut) {
  stopReplay();
  member = astronaut;
  planApplied = false;
  for (const button of el('crew-tabs').children) button.setAttribute('aria-pressed', button.dataset.id === member.id);
  set('crew-eyebrow', 'FLIGHT SURGEON REVIEW / ' + member.id + ' · ' + member.name.toUpperCase());
  if (!records.has(member.id)) records.set(member.id, generateRecord(member));
  telemetry = records.get(member.id);
  sleepNights = summarizeSleep(telemetry);
  const days = telemetry.length / SAMPLES_PER_DAY;
  el('scrubber').max = telemetry.length - 1;
  el('day-tabs').replaceChildren(...Array.from({ length: 7 }, (_, k) => {
    const day = days - 7 + k;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.day = day;
    button.textContent = 'Night ' + (day + 1);
    button.addEventListener('click', () => { stopReplay(); setPlayIndex((day + 1) * SAMPLES_PER_DAY - 1); });
    return button;
  }));
  if (!fits.has(member.id)) {
    set('fit-summary', 'Fitting ' + member.name + '’s clock to the last ' + FIT_NIGHTS + ' nights…');
    await new Promise(resolve => setTimeout(resolve, 30)); // let the message paint before the ~1 s fit
    const recent = telemetry.slice(-FIT_NIGHTS * SAMPLES_PER_DAY);
    fits.set(member.id, fitParams(recent.map(s => s.lux), recent.map(s => s.asleep)));
  }
  personalFit = fits.get(member.id);
  renderFit();
  setPlayIndex(telemetry.length - 1);
  updatePlan();
}

initialize().catch(error => {
  console.error(error);
  set('startup-error', 'Could not load the demo data. Serve the dist folder with an HTTP server and refresh.');
  el('startup-error').hidden = false;
});
