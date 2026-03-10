const router = require('express').Router();
const db = require('../db');

router.get('/', (req, res) => res.json(db.getAllGames()));

router.post('/', (req, res) => {
  const { name, buy_in_amount } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const amount = parseFloat(buy_in_amount) || 10;
  res.status(201).json(db.createGame(name.trim(), amount));
});

router.get('/:id', (req, res) => {
  const g = db.getGame(Number(req.params.id));
  if (!g) return res.status(404).json({ error: 'Not found' });
  res.json({ ...g, pot: db.getPotTotal(g.id) });
});

router.delete('/:id', (req, res) => {
  const ok = db.deleteGame(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
