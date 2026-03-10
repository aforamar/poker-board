const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try { res.json(await db.getAllGames()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { name, buy_in_amount } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const amount = parseFloat(buy_in_amount) || 10;
  try { res.status(201).json(await db.createGame(name.trim(), amount)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const g = await db.getGame(Number(req.params.id));
    if (!g) return res.status(404).json({ error: 'Not found' });
    res.json({ ...g, pot: await db.getPotTotal(g.id) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.deleteGame(Number(req.params.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
