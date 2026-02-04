const fs = require('fs');
const path = require('path');
const { parseISODurationToMs } = require('../utils/isoDuration');
const { sendMessage } = require('../utils/messagingService');

const FLOWS_PATH = path.join(__dirname, '..', 'data', 'flows.json');
const RUNS_PATH  = path.join(__dirname, '..', 'data', 'runs.json');

let flows = [];
let runs  = [];
const inbox = new Map(); // phoneE164 -> { text, at }

function load() {
  flows = JSON.parse(fs.readFileSync(FLOWS_PATH, 'utf8'));
  runs = fs.existsSync(RUNS_PATH) ? JSON.parse(fs.readFileSync(RUNS_PATH, 'utf8')) : [];
}
function saveRuns() {
  fs.writeFileSync(RUNS_PATH, JSON.stringify(runs, null, 2), 'utf8');
}
function renderTemplate(str, ctx) {
  return (str||'').replace(/{{\s*([\w.]+)\s*}}/g, (_, k)=> (ctx[k] ?? ''));
}
function findNode(flow, id) { return flow.nodes.find(n=>n.id===id); }

async function stepSend(_flow, run, node) {
  const body = renderTemplate(node.content, run.contact);
  await sendMessage({
    channel: node.channel || run.channel || 'whatsapp',
    to: run.contact.phone,
    content: body
  });
  run.current = node.next;
  run.dueAt = Date.now();
}
function stepWait(run, node) {
  const ms = parseISODurationToMs(node.duration);
  run.current = node.next;
  run.dueAt = Date.now() + ms;
}
function stepWaitForReply(run, node) {
  const ms = parseISODurationToMs(node.timeout);
  run.wait = { until: Date.now() + ms };
  run.current = node.next;      // deve apontar p/ um branch
  run.dueAt = Date.now() + 1000;
}
function evalBranchExpr(expr, replyText) {
  if (!replyText) return false;
  const m = expr.match(/^includes:(.+)$/i); if (!m) return false;
  const parts = m[1].split('|').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const t = replyText.toLowerCase();
  return parts.some(p=> t.includes(p));
}
function stepBranch(flow, run, node) {
  const now = Date.now();
  const reply = run.reply; // {text, at}
  let nextId = null;

  if (reply && (!run.wait || reply.at <= run.wait.until)) {
    for (const c of (node.conditions||[])) {
      if (evalBranchExpr(c.expr, reply.text)) { nextId = c.next; break; }
    }
    if (!nextId && node.fallbackNext) nextId = node.fallbackNext;
  } else {
    if (run.wait && now > run.wait.until) {
      nextId = node.timeoutNext || node.fallbackNext;
    } else { run.dueAt = now + 1500; return; }
  }
  run.wait = null;
  run.current = nextId || 'end';
  run.dueAt = Date.now();
}
function stepEnd(run) { run.status='finished'; run.dueAt = null; }

async function processRun(run) {
  if (run.status !== 'running') return;
  const flow = flows.find(f=>f.id===run.flowId); if(!flow){ run.status='error'; run.error='flow not found'; return; }
  const node = findNode(flow, run.current); if(!node){ run.status='error'; run.error=`node ${run.current} not found`; return; }

  const ib = inbox.get(run.contact.phone);
  if (ib){ run.reply = ib; inbox.delete(run.contact.phone); }

  switch(node.type){
    case 'start': run.current = node.next || 'end'; run.dueAt = Date.now(); break;
    case 'send': await stepSend(flow, run, node); break;
    case 'wait': stepWait(run, node); break;
    case 'wait_for_reply': stepWaitForReply(run, node); break;
    case 'branch': stepBranch(flow, run, node); break;
    case 'end': stepEnd(run); break;
    default: run.status='error'; run.error=`unknown node type: ${node.type}`;
  }
}
async function tick() {
  const now = Date.now();
  const due = runs.filter(r=> r.status==='running' && (r.dueAt||0) <= now);
  for (const r of due) { try { await processRun(r); } catch(e){ r.status='error'; r.error=e.message; } }
  if (due.length) saveRuns();
}
function startEngine(){ load(); setInterval(tick, 1000); }

function startFlow(flowId, contacts, channel='whatsapp'){
  const flow = flows.find(f=>f.id===flowId); if(!flow) throw new Error('flow not found');
  const newRuns = contacts.map(c=>({
    id:`run_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    flowId, contact:c, channel,
    current:'start', status:'running', dueAt:Date.now(), wait:null, reply:null
  }));
  runs.push(...newRuns); saveRuns(); return newRuns.map(r=>r.id);
}
function registerReply(fromE164, text){
  const phone = fromE164.replace(/^whatsapp:/,'');
  inbox.set(phone, { text, at: Date.now() });
}
function listRuns(flowId){ return runs.filter(r=>r.flowId===flowId); }

module.exports = { startEngine, startFlow, listRuns, registerReply };