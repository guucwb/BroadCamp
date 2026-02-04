const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// GET /api/history
router.get('/', (req, res) => {
  const filePath = path.join(__dirname, '..', 'history.json');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    res.json(data);
  } catch (err) {
    console.error('Erro ao ler history.json:', err);
    res.status(500).json({ error: 'Erro ao ler histórico' });
  }
});

module.exports = router;