const express = require('express');
const router = express.Router();
const path = require('path'); const fs = require('fs');
const { startFlow, listRuns } = require('../engine/flowEngine');
const FLOWS_PATH = path.join(__dirname,'..','data','flows.json');

router.get('/', (_req,res)=> {
  const flows = JSON.parse(fs.readFileSync(FLOWS_PATH,'utf8'));
  res.json({ flows });
});
router.post('/:id/start', (req,res)=>{
  const { id } = req.params;
  const { contacts, channel } = req.body;
  if(!Array.isArray(contacts)||!contacts.length) return res.status(400).json({error:'contacts vazio'});
  try { const runIds = startFlow(id, contacts, channel||'whatsapp'); res.json({ ok:true, runs: runIds }); }
  catch(e){ res.status(400).json({ error: e.message }); }
});
router.get('/:id/runs', (req,res)=> res.json({ runs: listRuns(req.params.id) }));
module.exports = router;