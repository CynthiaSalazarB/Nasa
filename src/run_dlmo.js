// run_dlmo.js
// Runs predicting_dlmo's browser model (St. Hilaire 2007) in Node, exactly the
// way its web worker does, and prints the predicted DLMO for one CSV.
//
// Usage: node src/run_dlmo.js third_party/predicting_dlmo/js data/processed/predicting_dlmo_input/P1015.csv
//
// Model code: predicting_dlmo by Yitong Huang, Caleb Mayer, Olivia Walch (MIT licence)
// https://github.com/ojwalch/predicting_dlmo
const fs = require('fs'), vm = require('vm');
const [,, jsDir, csvPath] = process.argv;
if (!jsDir || !csvPath) {
  console.error('Usage: node run_dlmo.js <predicting_dlmo/js folder> <input csv>');
  process.exit(1);
}
const ctx = { console, Math, Date, parseFloat, Array };
ctx.self = { importScripts: () => {} };          // the worker imports models.js; we load it ourselves
ctx.postMessage = (m) => { ctx.__result = m; };  // capture the worker's answer
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(jsDir + '/models.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(jsDir + '/prep_data.js', 'utf8'), ctx);
ctx.onmessage({ data: { rawData: fs.readFileSync(csvPath, 'utf8'), filename: csvPath } });

// DLMO in hours of the clock time used in the file (0-24)
const dlmo = ((ctx.__result.minimumTime % 24) + 24) % 24;
console.log(JSON.stringify({ file: csvPath, dlmo_hours: Number(dlmo.toFixed(2)) }));
