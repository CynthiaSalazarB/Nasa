import { ANCHOR, DAY, SAMPLES_PER_DAY, STEP, clock, compare, wrap } from './model.mjs';
import { drawPhase, drawTelemetry, drawUtmb } from './charts.mjs';
import { explain, suggest } from './suggest.mjs';

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
  forecast = compare(telemetry.map(s => s.lux), options);
  const rows = forecast.map((night, index) => {
    const row = document.createElement('tr');
    const shift = night.current !== null && night.preview !== null ? delta(night.preview, night.current) : NaN;
    const labels = [
      'Night ' + (index + 1),
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
    if (index === forecast.length - 1) set('phase-delta', shiftLabel(shift));
    return row;
  });
  el('forecast-rows').replaceChildren(...rows);
  drawPhase(el('phase-chart'), forecast, options.bedtime);
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

function renderSuggestion() {
  suggestion = suggest(telemetry.map(s => s.lux), options, mission);
  if (!suggestion) return;
  const { status, steps, outcome } = explain(suggestion, options, mission);
  set('suggestion-status', status);
  el('suggestion-steps').replaceChildren(...steps.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  set('suggestion-outcome', outcome);
  el('apply-suggestion').disabled = !suggestion.changes;
}

function applySuggestion() {
  if (!suggestion || !suggestion.changes) return;
  const { bedtime, wake, lead, morning } = suggestion.options;
  el('bedtime').value = clock(bedtime);
  el('wake').value = clock(wake);
  el('lead').value = String(lead);
  el('morning').value = String(morning);
  updatePlan();
}

function setMissionSlot() {
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
    drawPhase(el('phase-chart'), forecast, options.bedtime);
  }
}

async function initialize() {
  const [missionRows, utmbRows, phaseRows] = await Promise.all([
    loadCsv('./data/orbital_synthetic_telemetry.csv'),
    loadCsv('./data/utmb_c1g0001.csv'),
    loadCsv('./data/dso484_phases.csv'),
  ]);
  telemetry = missionRows.map(row => ({
    timestamp: row.timestamp,
    asleep: row.sleep_state === 'asleep',
    lux: Number(row.cabin_light_lux),
  }));
  if (telemetry.length !== 7 * SAMPLES_PER_DAY || telemetry.some(row => !Number.isFinite(row.lux))) {
    throw new Error('Invalid mission replay file');
  }
  utmb = utmbRows;
  dso = phaseRows.filter(row => row.marker === 'urinary_melatonin_sulfate');
  sleepNights = summarizeSleep(telemetry);

  for (let day = 0; day < 7; day++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.day = day;
    button.textContent = 'Night ' + (day + 1);
    button.addEventListener('click', () => {
      stopReplay();
      setPlayIndex((day + 1) * SAMPLES_PER_DAY - 1);
    });
    el('day-tabs').append(button);
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
  for (const id of ['lead', 'dim-lux', 'morning']) el(id).addEventListener('change', updatePlan);
  el('apply-suggestion').addEventListener('click', applySuggestion);
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
        drawPhase(el('phase-chart'), forecast, options.bedtime);
      } else {
        renderUtmb();
      }
    });
    for (const id of ['telemetry-chart','phase-chart','utmb-chart']) resize.observe(el(id));
  }
  setPlayIndex(telemetry.length - 1);
  updatePlan();
  navigate();
}

initialize().catch(error => {
  console.error(error);
  set('startup-error', 'Could not load the demo data. Serve the dist folder with an HTTP server and refresh.');
  el('startup-error').hidden = false;
});
