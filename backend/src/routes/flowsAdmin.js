const express = require('express');
const router = express.Router();
const fs = require('fs'); const path = require('path');
const FLOWS_PATH = path.join(__dirname,'..','data','flows.json');

router.get('/all', (_req,res)=>{
  const flows = JSON.parse(fs.readFileSync(FLOWS_PATH,'utf8'));
  res.json({ flows });
});
router.post('/save', express.json(), (req,res)=>{
  const { flows } = req.body||{}; if(!Array.isArray(flows)) return res.status(400).json({error:'flows must be array'});
  fs.writeFileSync(FLOWS_PATH, JSON.stringify(flows,null,2),'utf8'); res.json({ ok:true, count: flows.length });
});
module.exports = router;