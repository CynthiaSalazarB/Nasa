// Personal fit: find the clock offset and period that make the model's predicted sleep onsets
// (DLMO + ALIGN_GAP) match the astronaut's real sleep onsets in the replay.
import { ANCHOR, DAY, DEFAULT_PARAMS, SAMPLES_PER_DAY, STEP, historyDlmo, wrap } from './model.mjs';
import { ALIGN_GAP } from './suggest.mjs';

const range = (from, to, by) => Array.from({ length: Math.round((to - from) / by) + 1 }, (_, i) => +(from + i * by).toFixed(2));
export const OFFSETS = range(-180, 180, 15); // minutes
export const TAUS = range(23.8, 24.6, 0.1); // hours
const delta = (a, b) => wrap(a - b + DAY / 2) - DAY / 2;

// Clock minute of the first sleep onset in each noon-to-noon night, or null when there is none.
export function sleepOnsets(asleep) {
  const nights = Math.floor(asleep.length / SAMPLES_PER_DAY);
  return Array.from({ length: nights }, (_, night) => {
    const start = night * SAMPLES_PER_DAY;
    for (let i = start; i < start + SAMPLES_PER_DAY; i++) {
      if (asleep[i] && (i === start || !asleep[i - 1])) return wrap(ANCHOR + i * STEP);
    }
    return null;
  });
}

// Predicted sleep onset per replay night for given settings.
export function predictOnsets(history, params = DEFAULT_PARAMS) {
  return historyDlmo(history, params).map(dlmo => dlmo === null ? null : wrap(dlmo + ALIGN_GAP));
}

// Grid search (shortcut: 225 short simulations; switch to a smarter search if it feels slow).
// `nights` = which replay nights to fit on (default: all with a sleep onset).
export function fitParams(history, asleep, nights) {
  const observed = sleepOnsets(asleep);
  const use = (nights ?? observed.map((_, i) => i)).filter(i => observed[i] !== null);
  if (use.length < 2) return null;
  let best = null;
  for (const offset of OFFSETS) {
    for (const tau of TAUS) {
      const predicted = predictOnsets(history, { offset, tau });
      const errors = use.map(i => predicted[i] === null ? NaN : delta(predicted[i], observed[i]));
      if (errors.some(e => !Number.isFinite(e))) continue;
      const sse = errors.reduce((sum, e) => sum + e * e, 0);
      if (!best || sse < best.sse) best = { params: { offset, tau }, sse, errors };
    }
  }
  if (!best) return null;
  const rmse = Math.sqrt(best.sse / use.length);
  return { params: best.params, rmse, nights: use, errors: best.errors };
}

// Error in minutes between predicted and observed onset for the given nights (for held-out checks).
export function onsetErrors(history, asleep, params, nights) {
  const observed = sleepOnsets(asleep);
  const predicted = predictOnsets(history, params);
  return nights.filter(i => observed[i] !== null && predicted[i] !== null).map(i => delta(predicted[i], observed[i]));
}
