import { ANCHOR, DAY, STEP, clock, wrap } from './model.mjs';
const colors = { grid:'#2a374b', muted:'#a7b4c9', mint:'#8fe4d0', amber:'#efb570', violet:'#aa9af2' };

function context(canvas) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return null;
  const scale = window.devicePixelRatio || 1;
  const bitmapWidth = Math.round(width * scale);
  const bitmapHeight = Math.round(height * scale);
  if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
    canvas.width = bitmapWidth;
    canvas.height = bitmapHeight;
  }
  const c = canvas.getContext('2d');
  c.setTransform(scale, 0, 0, scale, 0, 0);
  c.clearRect(0, 0, width, height);
  c.font = '11px ui-monospace, monospace';
  c.fillStyle = colors.muted;
  c.textBaseline = 'middle';
  return { c, width, height };
}

function line(c, points, stroke, size = 1) {
  if (!points.length) return;
  c.strokeStyle = stroke;
  c.lineWidth = size;
  c.beginPath();
  points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y));
  c.stroke();
}

function dot(c, x, y, color, radius = 3.5) {
  c.fillStyle = color; c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();
  c.fillStyle = colors.muted;
}

function luxRibbon(c, samples, x, y, to) {
  const points = [];
  for (let i = 0; i <= to; i++) {
    if (i) points.push([x(i), y(samples[i - 1].lux)]);
    points.push([x(i), y(samples[i].lux)]);
  }
  if (points.length < 2) return;
  const last = points.at(-1);
  c.fillStyle = 'rgba(239,181,112,.12)';
  c.beginPath();
  c.moveTo(points[0][0], y(0));
  for (const p of points) c.lineTo(...p);
  c.lineTo(last[0], y(0)); c.closePath(); c.fill();
  line(c, points, colors.amber, 2);
}

export function drawTelemetry(canvas, samples, to, options) {
  const view = context(canvas);
  if (!view) return;
  const { c, width, height } = view;
  const left = 33, right = width - 17, top = 12, base = height - 48;
  const x = index => left + index / (DAY / STEP) * (right - left);
  const y = lux => base - lux / 300 * (base - top);
  c.textAlign = 'right';
  for (let lux = 0; lux <= 300; lux += 100) {
    const yy = y(lux);
    c.fillText(String(lux), left - 6, yy);
    line(c, [[left,yy],[right,yy]], colors.grid);
  }
  c.textAlign = 'center';
  const awakeSpan = wrap(options.bedtime - options.wake);
  for (let i = 0; i < DAY / STEP; i++) {
    const time = wrap(ANCHOR + i * STEP);
    if (wrap(time - options.wake) < awakeSpan) continue;
    c.fillStyle = 'rgba(170,154,242,.07)';
    c.fillRect(x(i), top, x(i + 1) - x(i) + .04, base - top + 15);
    c.fillStyle = '#a7b4c9';
    if (i % 3 === 0) c.fillRect(x(i), base + 15, x(i + 1) - x(i) + .4, 1);
  }
  luxRibbon(c, samples, x, y, to);
  c.fillStyle = colors.violet;
  for (let i = 0; i <= to; i++) {
    if (samples[i].asleep) c.fillRect(x(i), base + 4, x(i + 1) - x(i) + .2, 7);
  }
  c.fillStyle = colors.muted;
  for (let i = 0; i <= 6; i++) {
    c.fillText(clock(ANCHOR + 240 * i), x(48 * i), height - 14);
  }
  if (to < samples.length - 1) {
    c.setLineDash([3, 4]);
    line(c, [[x(to), top],[x(to),base + 15]], colors.mint);
    c.setLineDash([]);
  }
  dot(c, x(to), y(samples[to].lux), colors.amber);
}

export function drawPhase(canvas, forecast, bedtime) {
  const view = context(canvas);
  if (!view || !forecast.length) return;
  const { c, width, height } = view;
  const left = 53, right = width - 22, top = 11, base = height - 27;
  const target = ANCHOR + wrap(bedtime - ANCHOR);
  const times = forecast.flatMap(row => [row.current, row.preview]).filter(t => t !== null);
  const minimum = Math.floor((Math.min(...times, target) - 15) / 60) * 60;
  const maximum = Math.ceil((Math.max(...times, target) + 15) / 60) * 60;
  const y = time => base - (time - minimum) / (maximum - minimum) * (base - top);
  const x = i => left + (right - left) * (i + 0.5) / 3;
  c.textAlign = 'right';
  const spacing = Math.max(60, Math.ceil((maximum - minimum) / 240) * 60);
  for (let t = minimum; t <= maximum; t += spacing) {
    const yy = y(t);
    line(c, [[left,yy],[right,yy]], colors.grid);
    c.fillText(clock(t), left - 6, yy);
  }
  c.setLineDash([4, 5]); line(c, [[left,y(target)],[right,y(target)]], '#6c7d97'); c.setLineDash([]);
  c.textAlign = 'center';
  for (let i = 0; i < 3; i++) c.fillText('Night ' + (i + 1), x(i), height - 11);
  for (const [key, color] of [['current',colors.amber],['preview',colors.mint]]) {
    let previous = null;
    forecast.forEach((row, i) => {
      if (row[key] === null) { previous = null; return; }
      const point = [x(i), y(row[key])];
      if (previous) line(c, [previous, point], color, 2);
      dot(c, ...point, color);
      previous = point;
    });
  }
}

export function drawUtmb(canvas, rows, metric) {
  const view = context(canvas);
  if (!view || !rows.length) return;
  const { c, width, height } = view;
  const left = 42, right = width - 19, top = 12, base = height - 28;
  const values = rows.map(row => Number(row[metric]) / (metric === 'sleep_min' ? 60 : 1));
  const step = metric === 'sleep_min' ? 1 : metric === 'efficiency' ? 10 : 30;
  const min = Math.floor(Math.min(...values) / step) * step;
  const max = Math.max(min + step, Math.ceil(Math.max(...values) / step) * step);
  const y = v => base - (v - min) / (max - min) * (base - top);
  const x = i => values.length > 1 ? left + i / (values.length - 1) * (right - left) : (left + right) / 2;
  c.textAlign = 'right';
  for (let v = min; v <= max; v += step) {
    line(c, [[left,y(v)],[right,y(v)]], colors.grid);
    c.fillText(String(v), left - 7, y(v));
  }
  const points = values.map((v, i) => [x(i),y(v)]);
  line(c, points, colors.mint, 2);
  if (values.length < 14) for (const p of points) dot(c, ...p, colors.mint, 3);
  c.textAlign = 'left'; c.fillText(rows[0].date, left, height - 9);
  if (rows.length > 1) {
    c.textAlign = 'right'; c.fillText(rows.at(-1).date, right, height - 9);
  }
}
