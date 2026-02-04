// backend/src/utils/flowUtils.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RUNS_PATH = path.join(DATA_DIR, 'runs.json');
const STEPS_PATH = path.join(DATA_DIR, 'run-steps.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RUNS_PATH)) fs.writeFileSync(RUNS_PATH, '[]');
  if (!fs.existsSync(STEPS_PATH)) fs.writeFileSync(STEPS_PATH, '[]');
}
function readRuns() { ensure(); return JSON.parse(fs.readFileSync(RUNS_PATH, 'utf8')); }
function writeRuns(r) { ensure(); fs.writeFileSync(RUNS_PATH, JSON.stringify(r, null, 2)); }
function readSteps() { ensure(); return JSON.parse(fs.readFileSync(STEPS_PATH, 'utf8')); }
function writeSteps(r) { ensure(); fs.writeFileSync(STEPS_PATH, JSON.stringify(r, null, 2)); }

function render(str = '', vars = {}) {
  return String(str).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = k.split('.').reduce((a,b)=>a&&a[b]!=null?a[b]:'', vars);
    return v == null ? '' : String(v);
  });
}
function getPath(obj, p=''){ return p.split('.').reduce((a,b)=>a&&a[b]!=null?a[b]:undefined, obj);}
function setVars(vars, mappings = [], json) {
  const out = { ...vars };
  (mappings||[]).forEach(m => { if(m?.var && m?.path) out[m.var] = getPath(json, m.path); });
  return out;
}
function nextOf(nodeId, edges) { const e = edges.find(x => x.source === nodeId); return e ? e.target : null; }

function addRun(run){ const rs = readRuns(); rs.push(run); writeRuns(rs); }
function upsertRun(runId, patch){
  const rs = readRuns(); const i = rs.findIndex(r=>r.id===runId); if(i===-1) return;
  rs[i] = { ...rs[i], ...patch, updatedAt: new Date().toISOString() }; writeRuns(rs);
}
function addStep(step){ const ss = readSteps(); ss.push(step); writeSteps(ss); }

module.exports = { render, setVars, nextOf, readRuns, writeRuns, readSteps, writeSteps, addRun, upsertRun, addStep };