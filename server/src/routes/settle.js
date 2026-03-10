const router = require('express').Router({ mergeParams: true });
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const g = await db.getGame(Number(req.params.id));
    if (!g) return res.status(404).json({ error: 'Not found' });
    res.json(await db.calcSettlement(Number(req.params.id)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
