const router = require('express').Router({ mergeParams: true });
const db = require('../db');

router.get('/', async (req, res) => {
  try { res.json(await db.getPlayers(Number(req.params.id))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  try {
    const game = await db.getGame(Number(req.params.id));
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.status(201).json(await db.addPlayer(game.id, name.trim(), color));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:pid', async (req, res) => {
  try {
    const ok = await db.removePlayer(Number(req.params.id), Number(req.params.pid));
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:pid/buyin', async (req, res) => {
  const amount = parseFloat(req.body.amount);
  if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  try { res.status(201).json(await db.addBuyin(Number(req.params.pid), Number(req.params.id), amount)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:pid/buyin', async (req, res) => {
  try {
    const ok = await db.removeLatestBuyin(Number(req.params.pid), Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'No buy-in to remove' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:pid/cashout', async (req, res) => {
  const amount = parseFloat(req.body.amount);
  if (isNaN(amount) || amount < 0) return res.status(400).json({ error: 'Invalid amount' });
  try { res.json(await db.setCashout(Number(req.params.pid), Number(req.params.id), amount)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
