// Suggested schedule: search small changes to the plan and keep the one whose DLMO on night SCORE_NIGHT
// lands closest to the target, with the fewest changes.
import { DAY, DEFAULT_PARAMS, SAMPLES_PER_DAY, clock, compare, estimateState, forecastDlmo, wrap } from './model.mjs';

// Melatonin onset usually comes about 2 h before habitual sleep. Verify the source before the slides.
export const ALIGN_GAP = 120;
export const ALIGNED_WITHIN = 30;
export const SCORE_NIGHT = 14; // judge each plan two weeks in, once the clock has mostly settled
const SHIFTS = [-60, -45, -30, -15, 0, 15, 30, 45, 60]; // nudges inside the mission sleep slot
const LEADS = [60, 90, 120, 180]; // same choices as the Dimming lead input
const MORNINGS = [0, 30, 60]; // minutes of Alertness light after waking

const delta = (a, b) => wrap(a - b + DAY / 2) - DAY / 2;

// Positive = the clock runs late for this bedtime, negative = early.
export function alignmentError(dlmo, bedtime) {
  return dlmo === null || dlmo === undefined ? NaN : delta(dlmo, bedtime - ALIGN_GAP);
}

// `mission` is the sleep slot set by mission planners; nudges are measured from it, so applying a
// suggestion and asking again gives the same answer.
export function suggest(history, plan, mission = plan, params = DEFAULT_PARAMS) {
  if (history.length < SAMPLES_PER_DAY) return null;
  const state = estimateState(history, params);
  const scored = options => forecastDlmo(state, options, params, SCORE_NIGHT)[SCORE_NIGHT - 1];
  const morning = plan.morning || 0;
  // Where the clock goes if the astronaut keeps their current light (last replay day repeated).
  const currentError = alignmentError(compare(history, plan, params, SCORE_NIGHT)[SCORE_NIGHT - 1]?.current, mission.bedtime);
  const planError = alignmentError(scored(plan), plan.bedtime);
  let best = null;
  for (const shift of SHIFTS) {
    for (const lead of LEADS) {
      for (const minutes of MORNINGS) {
        const options = { ...plan, bedtime: wrap(mission.bedtime + shift), wake: wrap(mission.wake + shift), lead, morning: minutes };
        const dlmo = scored(options);
        const error = alignmentError(dlmo, options.bedtime);
        if (!Number.isFinite(error)) continue;
        const changes = (options.bedtime !== plan.bedtime) + (lead !== plan.lead) + (minutes !== morning);
        // Each change costs 5 min of error, and moving the sleep slot costs a bit more per minute moved.
        const score = Math.abs(error) + 5 * changes + Math.abs(shift) / 4;
        if (!best || score < best.score) best = { options, dlmo, error, changes, shift, score };
      }
    }
  }
  return best && { ...best, currentError, planError };
}

function offsetLabel(minutes) {
  const m = Math.round(Math.abs(minutes));
  const text = (m >= 60 ? Math.floor(m / 60) + ' h ' : '') + (m % 60 ? (m % 60) + ' min' : '');
  return text.trim() || '0 min';
}

// Plain-language summary and steps for the suggestion card.
export function explain(result, plan, mission = plan, name = 'This astronaut') {
  const { options, currentError, shift } = result;
  const bed = clock(mission.bedtime);
  const status = Math.abs(currentError) <= ALIGNED_WITHIN
    ? name + '’s body clock is on schedule for the ' + bed + ' bedtime.'
    : 'If nothing changes, ' + name + '’s body clock runs ' + offsetLabel(currentError) + (currentError > 0 ? ' late' : ' early') + ' for the ' + bed + ' bedtime.';
  if (!result.changes) return { status, steps: ['Send the lighting plan below as it is. No better option was found within the allowed changes.'], outcome: outcomeText(result) };
  const steps = [];
  if (options.bedtime !== plan.bedtime) steps.push('Sleep from ' + clock(options.bedtime) + ' to ' + clock(options.wake) + (shift
    ? ' (' + offsetLabel(shift) + (shift > 0 ? ' later' : ' earlier') + ' than the mission slot; 1 h is the most allowed).'
    : ' (the mission slot).'));
  if (options.lead !== plan.lead) steps.push('Dim the crew-quarters light to Pre-sleep at ' + clock(options.bedtime - options.lead) + ' (' + offsetLabel(options.lead) + ' before bed).');
  if (options.morning !== (plan.morning || 0)) steps.push(options.morning
    ? 'Turn on bright Alertness light for ' + options.morning + ' min after waking at ' + clock(options.wake) + '.'
    : 'Stop the morning Alertness light.');
  return { status, steps, outcome: outcomeText(result) };
}

function outcomeText({ dlmo, error, options }) {
  const goal = clock(options.bedtime - ALIGN_GAP);
  return 'Expected by night ' + SCORE_NIGHT + ': melatonin starts at ' + clock(dlmo) + ', ' + (Math.abs(error) <= ALIGNED_WITHIN
    ? 'on target (goal ' + goal + ', within ' + ALIGNED_WITHIN + ' min).'
    : offsetLabel(error) + (error > 0 ? ' later' : ' earlier') + ' than the ' + goal + ' goal. This is the closest the allowed changes get.');
}
