// backend/src/workers/flowWorker.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RUNS_DB = path.join(DATA_DIR, 'runs.json');
const JOURNEYS_DB = path.join(DATA_DIR, 'journeys.json');

// usa twilioService.js se existir; senão DRY
const twilioSvc = (() => {
  try {
    const svc = require('../services/twilioService');
    if (svc && typeof svc.sendWhatsApp === 'function' && typeof svc.sendSMS === 'function') return svc;
    return {
      async sendWhatsApp(to, body) { await svc.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to: `whatsapp:${to}`, body }); },
      async sendSMS(to, body) { await svc.messages.create({ from: process.env.TWILIO_SMS_NUMBER, to, body }); },
    };
  } catch {
    return {
      async sendWhatsApp(to, body) { console.log('[DRY][WA]', to, body); },
      async sendSMS(to, body) { console.log('[DRY][SMS]', to, body); },
    };
  }
})();

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RUNS_DB)) fs.writeFileSync(RUNS_DB, JSON.stringify([]));
  if (!fs.existsSync(JOURNEYS_DB)) fs.writeFileSync(JOURNEYS_DB, JSON.stringify([]));
}
function readRuns() { ensureFiles(); return JSON.parse(fs.readFileSync(RUNS_DB, 'utf8') || '[]'); }
function writeRuns(rows) { fs.writeFileSync(RUNS_DB, JSON.stringify(rows, null, 2)); }
function readJourneys() { ensureFiles(); return JSON.parse(fs.readFileSync(JOURNEYS_DB, 'utf8') || '[]'); }

function replaceVars(text, vars) {
  return String(text || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function edgeCondsFromWait(nodeId, edges) {
  const outs = edges.filter(e => e.source === nodeId);
  const conds = outs.map(e => ({
    edgeId: e.id,
    target: e.target,
    label: e.label || '',
    type: e.data?.conditionType || 'keywords',
    value: e.data?.value || '',
    isFallback: !!e.data?.isFallback
  }));
  return conds;
}

function matchReply(conds, inboundText, inboundPayload) {
  const text = String(inboundText || '').trim();
  const payload = String(inboundPayload || '').trim();

  // 1) match explícito por payload
  const byPayload = conds.find(c => c.type === 'payload' && c.value && payload &&
    c.value.split('|').map(s => s.trim()).filter(Boolean).some(p => p === payload));
  if (byPayload) return byPayload;

  // 2) regex
  const byRegex = conds.find(c => {
    if (c.type !== 'regex' || !c.value) return false;
    const m = String(c.value).match(/^\/(.+)\/([gimsuy]*)$/);
    try {
      const rx = m ? new RegExp(m[1], m[2]) : new RegExp(c.value);
      return rx.test(text);
    } catch { return false; }
  });
  if (byRegex) return byRegex;

  // 3) keywords
  const byKw = conds.find(c => c.type === 'keywords' && c.value && text &&
    c.value.toLowerCase().split('|').map(s => s.trim()).filter(Boolean)
      .some(k => text.toLowerCase().includes(k)));
  if (byKw) return byKw;

  // 4) fallback
  const fb = conds.find(c => c.isFallback);
  if (fb) return fb;

  return null;
}

async function processContact(flow, run, contact) {
  const nodes = flow.nodes || [];
  const edges = flow.edges || [];

  const nextOf = (nodeId) => edges.find(ed => ed.source === nodeId)?.target || null;

  // inicial
  if (!contact.cursor) {
    const aud = nodes.find(n => n.type === 'audience');
    contact.cursor = aud?.id || null;
    contact.state = 'active';
  }

  // loop (avança enquanto não precisar esperar)
  let safety = 0;
  while (contact.state === 'active' && contact.cursor && safety < 100) {
    safety++;
    const node = nodes.find(n => n.id === contact.cursor);
    if (!node) { contact.state = 'done'; break; }

    contact.history = contact.history || [];
    contact.history.push({ ts: new Date().toISOString(), type: 'visit', nodeId: node.id, nodeType: node.type });

    if (node.type === 'audience') {
      // só passa adiante
    }

    if (node.type === 'message') {
      const md = node.data || {};
      const body = replaceVars(md.text || '', contact.vars || {});
      const channel = (md.channel || 'whatsapp').toLowerCase();
      if (process.env.DRY_RUN === 'true') {
        console.log(`[DRY][${channel}] -> ${contact.phone}: ${body}`);
      } else {
        if (channel === 'whatsapp') {
          await twilioSvc.sendWhatsApp(contact.phone, body);
        } else {
          await twilioSvc.sendSMS(contact.phone, body);
        }
      }
      contact.history.push({ ts: new Date().toISOString(), type: 'outbound', channel, body });
    }

    if (node.type === 'api') {
      // noop (você pode implementar fetch + map aqui, se quiser)
    }

    if (node.type === 'delay') {
      const md = node.data || {};
      if (md.mode === 'until' && md.until) {
        const wait = Math.max(0, new Date(md.until).getTime() - Date.now());
        if (wait > 0) await sleep(wait);
      } else {
        const secs = Number(md.seconds || 0);
        if (secs > 0) await sleep(secs * 1000);
      }
    }

    if (node.type === 'wait') {
      // para aqui e aguarda inbound
      contact.state = 'waiting';
      contact.wait = {
        nodeId: node.id,
        conds: edgeCondsFromWait(node.id, edges)
      };
      break;
    }

    if (node.type === 'end') {
      contact.state = 'done';
      break;
    }

    // segue
    const nxt = nextOf(node.id);
    if (!nxt) { contact.state = 'done'; break; }
    contact.cursor = nxt;
  }
}

async function resumeIfInbound(flow, run, contact) {
  if (contact.state !== 'waiting-inbound') return;

  const conds = contact.wait?.conds || [];
  const inbound = contact.lastInbound || {};
  const chosen = matchReply(conds, inbound.text, inbound.payload);

  // decide próximo nó
  let target = null;
  if (chosen) {
    target = chosen.target;
  } else {
    // sem edge: encerra contato
    contact.state = 'done';
    return;
  }

  // limpa flags e continua
  contact.cursor = target;
  contact.state = 'active';
  delete contact.lastInbound;
  delete contact.wait;

  // processa imediatamente
  await processContact(flow, run, contact);
}

async function processRun(runId) {
  let runs = readRuns();
  let run = runs.find(r => r.id === runId);
  if (!run) return;

  if (run.status !== 'queued' && run.status !== 'running') return;

  // marca running
  run.status = 'running';
  run.startedAt = run.startedAt || new Date().toISOString();
  run.updatedAt = new Date().toISOString();

  // carregar flow
  const flows = readJourneys();
  const flow = flows.find(f => f.id === run.flowId);
  if (!flow) {
    run.status = 'failed';
    run.error = 'flow not found';
    run.updatedAt = new Date().toISOString();
    writeRuns(readRuns());
    return;
  }

  // inicializa contatos (se ainda não)
  run.contacts = run.contacts || [];
  // cada contato: { phone, vars, cursor, state, history, ... }
  // processed/total
  run.total = run.contacts.length;
  run.processed = run.contacts.filter(c => c.state === 'done').length;

  // percorre contatos e processa
  for (const c of run.contacts) {
    if (!c) continue;

    if (c.state === 'waiting') {
      // segue esperando; o inbound vai mudar para 'waiting-inbound'
      continue;
    }
    if (c.state === 'waiting-inbound') {
      await resumeIfInbound(flow, run, c);
      continue;
    }
    if (c.state === 'done') continue;

    // ativo ou sem estado -> processa
    await processContact(flow, run, c);
  }

  // atualiza contagem
  run.processed = run.contacts.filter(c => c.state === 'done').length;
  run.updatedAt = new Date().toISOString();

  // finaliza se todos concluídos
  if (run.processed >= run.total) {
    run.status = 'done';
    run.endedAt = new Date().toISOString();
  }

  // persiste
  runs = readRuns();
  const idx = runs.findIndex(r => r.id === run.id);
  if (idx !== -1) {
    runs[idx] = run;
    writeRuns(runs);
  }
}

// simples scheduler
const ACTIVE = new Set();
setInterval(() => {
  try {
    const runs = readRuns();
    const next = runs.find(r => (r.status === 'queued' || r.status === 'running') && !ACTIVE.has(r.id));
    if (next) {
      ACTIVE.add(next.id);
      processRun(next.id).finally(() => ACTIVE.delete(next.id));
    }
  } catch (e) {
    console.error('[flowWorker] erro no loop:', e.message);
  }
}, 1500);

console.log('[flowWorker] iniciado.');