// Fictional crew with 90 days of synthetic sleep and light records (5-minute samples, noon to noon, UTC).
// Seeded random, so every load shows the same data. Mission sleep slot for all: 23:00 to 07:00.
import { SAMPLES_PER_DAY, STEP } from './model.mjs';

export const HISTORY_DAYS = 90;
const MISSION_START = Date.UTC(2035, 0, 1, 12);
const BED = 11 * 60; // 23:00, minutes after noon
const WAKE = 19 * 60; // 07:00 next morning
const GENERAL_LUX = 300;

// delay: usual minutes after 23:00 they fall asleep on day 1; drift: extra minutes by day 90;
// noise: night-to-night spread (SD, min); evening: lux from 21:00 to sleep; cupola: share of nights with
// a bright last hour before sleep; shiftDay/shiftHours: a docking that moves the slot later for 3 days.
export const CREW = [
  { id: 'AST-01', name: 'Sarah', seed: 11, delay: 10, drift: 80, noise: 20, evening: 150, cupola: 0.2, shiftDay: 74, shiftHours: 6 },
  { id: 'AST-02', name: 'Mateo', seed: 22, delay: -20, drift: 10, noise: 15, evening: 30, cupola: 0.05, shiftDay: 74, shiftHours: 6 },
  { id: 'AST-03', name: 'Aiko', seed: 33, delay: 45, drift: 30, noise: 25, evening: 200, cupola: 0.3, shiftDay: 74, shiftHours: 6 },
  { id: 'AST-04', name: 'Daniel', seed: 44, delay: 0, drift: 0, noise: 40, evening: 90, cupola: 0.15, shiftDay: 74, shiftHours: 6 },
  { id: 'AST-05', name: 'Priya', seed: 55, delay: -35, drift: -15, noise: 15, evening: 30, cupola: 0, shiftDay: 74, shiftHours: 6 },
  { id: 'AST-06', name: 'Lukas', seed: 66, delay: 30, drift: 110, noise: 30, evening: 250, cupola: 0.35, shiftDay: 74, shiftHours: 6 },
  { id: 'AST-07', name: 'Amara', seed: 77, delay: 15, drift: 40, noise: 20, evening: 60, cupola: 0.1, shiftDay: 74, shiftHours: 6 },
  { id: 'AST-08', name: 'Chen', seed: 88, delay: 70, drift: -40, noise: 25, evening: 120, cupola: 0.2, shiftDay: 74, shiftHours: 6 },
];

function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand) {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// Rows in the same shape the app already uses: { timestamp, asleep, lux }.
export function generateRecord(member) {
  const rand = random(member.seed);
  const rows = [];
  for (let day = 0; day < HISTORY_DAYS; day++) {
    const shift = day >= member.shiftDay && day < member.shiftDay + 3 ? member.shiftHours * 60 : 0;
    const onset = clamp(BED + member.delay + member.drift * day / (HISTORY_DAYS - 1) + member.noise * normal(rand) + shift, 9 * 60, 18 * 60);
    const wake = clamp(WAKE + shift + 10 * normal(rand), onset + 3 * 60, DAY_END);
    const cupola = rand() < member.cupola;
    for (let i = 0; i < SAMPLES_PER_DAY; i++) {
      const minute = i * STEP;
      const asleep = minute >= onset && minute < wake;
      let lux = GENERAL_LUX;
      if (asleep) lux = 0;
      else if (minute >= 9 * 60 + shift && minute < onset) lux = cupola && minute >= onset - 60 ? GENERAL_LUX : member.evening;
      const index = day * SAMPLES_PER_DAY + i;
      rows.push({ timestamp: new Date(MISSION_START + index * STEP * 60000).toISOString(), asleep, lux });
    }
  }
  return rows;
}
const DAY_END = 24 * 60 - STEP;
