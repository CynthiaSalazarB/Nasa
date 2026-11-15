// Forger99 browser port of Arcascope/circadian (MIT). See LICENSE-arcascope.txt.
export const DAY = 1440;
export const STEP = 5;
export const ANCHOR = 720;
export const SAMPLES_PER_DAY = DAY / STEP;
const DEFAULT_STATE = [-0.0843259, -1.09607546, 0.45584306];
const dt = STEP / 60;
export const wrap = (minutes, period = DAY) => ((minutes % period) + period) % period;

export function clock(minute) {
  const time = wrap(Math.round(minute));
  return [Math.floor(time / 60), time % 60].map(n => String(n).padStart(2, '0')).join(':');
}

// Personal settings. offset: minutes the person's usual clock runs later (+) or earlier (-) than the
// default; tau: intrinsic period in hours (Forger99 default 24.2). The fit (fit.mjs) estimates both.
export const DEFAULT_PARAMS = { offset: 0, tau: 24.2 };

function derivative([x, xc, n], lux, tau) {
  const alpha = 0.05 * Math.sqrt(lux / 9500);
  const input = 33.75 * (1 - n) * alpha * (1 - 0.4 * x) * (1 - 0.4 * xc);
  const damping = 0.23 * (xc - (4 / 3) * xc ** 3);
  const period = (24 / (0.99669 * tau)) ** 2 + 0.55 * input;
  return [
    (Math.PI / 12) * (xc + input),
    (Math.PI / 12) * (damping - x * period),
    60 * (alpha * (1 - n) - 0.0075 * n),
  ];
}

export function step(state, lux, tau = DEFAULT_PARAMS.tau) {
  const shifted = (slope, fraction) => state.map((value, i) => value + slope[i] * dt * fraction);
  const k1 = derivative(state, lux, tau);
  const k2 = derivative(shifted(k1, 0.5), lux, tau);
  const k3 = derivative(shifted(k2, 0.5), lux, tau);
  const k4 = derivative(shifted(k3, 1), lux, tau);
  return state.map((value, i) => value + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

// Phase-shift (Alertness) fixture default, about 500 lux mid-module (SSLA report, NTRS 20160005080; data/light.txt).
export const MORNING_LUX = 500;

export function scheduleLux(time, bedtime, wake, lead, dimLux, morning = 0) {
  const sinceWake = wrap(time - wake);
  const awakeMinutes = wrap(bedtime - wake);
  if (sinceWake >= awakeMinutes) return 0;
  if (sinceWake < morning) return MORNING_LUX;
  return sinceWake >= awakeMinutes - lead ? dimLux : 300;
}

export function forecastLux(index, options) {
  return scheduleLux(wrap(ANCHOR + index * STEP), options.bedtime, options.wake, options.lead, options.lux, options.morning);
}

// DLMO per noon-to-noon night from a series of x values (one per step). DLMO = temperature minimum - 7 h.
function dlmoByNight(rhythm, nightCount) {
  const nights = Array(nightCount).fill(null);
  let lastMinimum = -Infinity;
  for (let i = 1; i < rhythm.length - 1; i++) {
    if (rhythm[i] >= rhythm[i - 1] || rhythm[i] > rhythm[i + 1] || (i - lastMinimum) * STEP < 13 * 60) continue;
    lastMinimum = i;
    const dlmo = i * STEP - 7 * 60;
    const night = Math.floor(dlmo / DAY);
    if (night >= 0 && night < nights.length) nights[night] = dlmo + ANCHOR;
  }
  return nights;
}

function simulatePhase(initial, lightAtStep, tau) {
  let state = initial;
  const rhythm = [state[0]];
  // Simulate beyond the chart window so the last DLMO has a following temperature minimum.
  const n = 4 * SAMPLES_PER_DAY;
  for (let i = 1; i <= n; i++) {
    state = step(state, lightAtStep(i), tau);
    rhythm.push(state[0]);
  }
  return dlmoByNight(rhythm, 3);
}

// Start state: 14 repeats of the first replay day, shifted by the personal offset.
function settle(history, { offset, tau }) {
  const usual = history.slice(0, SAMPLES_PER_DAY);
  const lag = Math.round(offset / STEP);
  let state = DEFAULT_STATE;
  for (let i = 1; i <= 14 * SAMPLES_PER_DAY; i++) {
    state = step(state, usual[wrap(i - lag, SAMPLES_PER_DAY)], tau);
  }
  return state;
}

// Clock state at the end of the replay, the shared start point for every forecast.
export function estimateState(history, params = DEFAULT_PARAMS) {
  const currentDay = history.slice(-SAMPLES_PER_DAY);
  let state = settle(history, params);
  for (let i = 1; i < history.length; i++) state = step(state, history[i], params.tau);
  return step(state, currentDay[0], params.tau);
}

// Modeled DLMO (minutes after the replay's first midnight-based clock, like compare()) for every replay night.
export function historyDlmo(history, params = DEFAULT_PARAMS) {
  let state = settle(history, params);
  const rhythm = [state[0]];
  for (let i = 1; i < history.length; i++) {
    state = step(state, history[i], params.tau);
    rhythm.push(state[0]);
  }
  return dlmoByNight(rhythm, Math.floor(history.length / SAMPLES_PER_DAY)).map((value, i) => value === null ? null : value - i * DAY);
}

// DLMO (minutes, same scale as compare()) for the next three nights under a schedule.
export function forecastDlmo(state, options, params = DEFAULT_PARAMS) {
  return simulatePhase(state, i => forecastLux(i, options), params.tau).map((value, i) => value === null ? null : value - i * DAY);
}

export function compare(history, options, params = DEFAULT_PARAMS) {
  if (history.length < SAMPLES_PER_DAY) return [];
  const currentDay = history.slice(-SAMPLES_PER_DAY);
  const state = estimateState(history, params);
  const current = simulatePhase(state, i => currentDay[i % SAMPLES_PER_DAY], params.tau);
  const preview = simulatePhase(state, i => forecastLux(i, options), params.tau);
  return current.map((value, i) => ({
    current: value === null ? null : value - i * DAY,
    preview: preview[i] === null ? null : preview[i] - i * DAY,
  }));
}
