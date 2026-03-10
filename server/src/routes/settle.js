const router = require('express').Router({ mergeParams: true });
const db = require('../db');

router.get('/', (req, res) => {
  if (!db.getGame(Number(req.params.id))) return res.status(404).json({ error: 'Not found' });
  res.json(db.calcSettlement(Number(req.params.id)));
});

module.exports = router;
