// Minimal Express API stub for QRGGIF validation
// Note: This is a demo. In production use secure storage and proper auth.
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Simple JSON-file DB (qrg-db.json)
const DB_FILE = path.join(__dirname, 'qrg-db.json');
function loadDb() {
  if (!fs.existsSync(DB_FILE)) return { items: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

app.post('/api/validate-qrg', (req, res) => {
  const { animation_hash } = req.body || {};
  if (!animation_hash) return res.status(400).json({ valid: false, message: 'Missing animation_hash' });
  const db = loadDb();
  const found = db.items.find(i => i.animation_hash === animation_hash && i.active);
  if (found) {
    return res.json({ valid: true, message: 'QRGGIF validated', entry: found });
  }
  return res.json({ valid: false, message: 'Not found or expired' });
});

app.listen(3000, () => console.log('QRGGIF API stub running on http://localhost:3000'));
