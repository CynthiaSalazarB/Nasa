// Suggested schedule: search small changes to the plan and keep the one whose night-3 DLMO
// lands closest to the target, with the fewest changes.
import { DAY, SAMPLES_PER_DAY, clock, compare, estimateState, forecastDlmo, wrap } from './model.mjs';

// Melatonin onset usually comes about 2 h before habitual sleep. Verify the source before the slides.
export const ALIGN_GAP = 120;
export const ALIGNED_WITHIN = 30;
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
export function suggest(history, plan, mission = plan) {
  if (history.length < SAMPLES_PER_DAY) return null;
  const state = estimateState(history);
  const night3 = options => forecastDlmo(state, options)[2];
  const morning = plan.morning || 0;
  // Where the clock goes if the astronaut keeps their current light (last replay day repeated).
  const currentError = alignmentError(compare(history, plan)[2]?.current, mission.bedtime);
  const planError = alignmentError(night3(plan), plan.bedtime);
  let best = null;
  for (const shift of SHIFTS) {
    for (const lead of LEADS) {
      for (const minutes of MORNINGS) {
        const options = { ...plan, bedtime: wrap(mission.bedtime + shift), wake: wrap(mission.wake + shift), lead, morning: minutes };
        const dlmo = night3(options);
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
export function explain(result, plan, mission = plan) {
  const { options, currentError, shift } = result;
  const status = Math.abs(currentError) <= ALIGNED_WITHIN
    ? 'Your clock is on schedule for the ' + clock(mission.bedtime) + ' mission bedtime.'
    : 'With your current light, your clock runs ' + offsetLabel(currentError) + (currentError > 0 ? ' late' : ' early') + ' for the ' + clock(mission.bedtime) + ' mission bedtime.';
  if (!result.changes) return { status, steps: ['Keep the plan in the lighting preview. It is already the best option found.'], outcome: outcomeText(result) };
  const steps = [];
  if (options.bedtime !== plan.bedtime) steps.push('Sleep ' + clock(options.bedtime) + ' to ' + clock(options.wake) + (shift
    ? ' (' + offsetLabel(shift) + (shift > 0 ? ' later' : ' earlier') + ' than the mission slot, within the 1 h allowed).'
    : ' (the mission slot).'));
  if (options.lead !== plan.lead) steps.push('Switch to Pre-sleep light at ' + clock(options.bedtime - options.lead) + ' (' + offsetLabel(options.lead) + ' before bed).');
  if (options.morning !== (plan.morning || 0)) steps.push(options.morning
    ? 'Use Alertness light for ' + options.morning + ' min after waking at ' + clock(options.wake) + '.'
    : 'Skip the morning Alertness light.');
  return { status, steps, outcome: outcomeText(result) };
}

function outcomeText({ dlmo, error }) {
  return 'Night 3: melatonin onset ' + clock(dlmo) + ', ' + (Math.abs(error) <= ALIGNED_WITHIN
    ? 'on target (within ' + ALIGNED_WITHIN + ' min).'
    : offsetLabel(error) + (error > 0 ? ' late.' : ' early.'));
}
