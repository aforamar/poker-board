const router = require('express').Router({ mergeParams: true });
const db = require('../db');

router.get('/', (req, res) => res.json(db.getPlayers(Number(req.params.id))));

router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const game = db.getGame(Number(req.params.id));
  if (!game) return res.status(404).json({ error: 'Game not found' });
  const player = db.addPlayer(game.id, name.trim(), color);
  res.status(201).json(player);
});

router.delete('/:pid', (req, res) => {
  const ok = db.removePlayer(Number(req.params.id), Number(req.params.pid));
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// Add buy-in
router.post('/:pid/buyin', (req, res) => {
  const amount = parseFloat(req.body.amount);
  if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  res.status(201).json(db.addBuyin(Number(req.params.pid), Number(req.params.id), amount));
});

// Remove latest buy-in
router.delete('/:pid/buyin', (req, res) => {
  const ok = db.removeLatestBuyin(Number(req.params.pid), Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'No buy-in to remove' });
  res.json({ success: true });
});

// Set cashout (upsert)
router.post('/:pid/cashout', (req, res) => {
  const amount = parseFloat(req.body.amount);
  if (isNaN(amount) || amount < 0) return res.status(400).json({ error: 'Invalid amount' });
  res.json(db.setCashout(Number(req.params.pid), Number(req.params.id), amount));
});

module.exports = router;
