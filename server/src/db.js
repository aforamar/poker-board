const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
let _db = null;

async function getDb() {
  if (_db) return _db;
  const client = new MongoClient(uri);
  await client.connect();
  _db = client.db('poker_board');
  return _db;
}

async function nextId(name) {
  const db = await getDb();
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return result.seq;
}

const now = () => new Date().toISOString();

// ── Games ────────────────────────────────────────────────────────────────────

async function getAllGames() {
  const db = await getDb();
  return db.collection('games').find().sort({ created_at: -1 }).toArray();
}

async function getGame(id) {
  const db = await getDb();
  return db.collection('games').findOne({ id }) || null;
}

async function createGame(name, buyIn) {
  const db = await getDb();
  const id = await nextId('games');
  const g = { id, name, buy_in_amount: buyIn, created_at: now(), status: 'active' };
  await db.collection('games').insertOne(g);
  return g;
}

async function deleteGame(id) {
  const db = await getDb();
  const players = await db.collection('players').find({ game_id: id }).toArray();
  const playerIds = players.map(p => p.id);
  await db.collection('games').deleteOne({ id });
  await db.collection('players').deleteMany({ game_id: id });
  await db.collection('transactions').deleteMany({ player_id: { $in: playerIds } });
  return true;
}

// ── Players ──────────────────────────────────────────────────────────────────

const COLORS = ['#ef4444','#3b82f6','#22c55e','#a855f7','#f97316','#ec4899','#14b8a6','#eab308'];

async function getPlayers(gameId) {
  const db = await getDb();
  const players = await db.collection('players').find({ game_id: gameId }).toArray();
  const transactions = await db.collection('transactions').find({ game_id: gameId }).toArray();
  return players.map(p => {
    const buyins = transactions.filter(t => t.player_id === p.id && t.type === 'buyin');
    const cashout = transactions.find(t => t.player_id === p.id && t.type === 'cashout');
    return {
      ...p,
      total_buyin: buyins.reduce((s, t) => s + t.amount, 0),
      buyin_count: buyins.length,
      cashout: cashout ? cashout.amount : null,
    };
  });
}

async function addPlayer(gameId, name, color) {
  const db = await getDb();
  const existing = await db.collection('players').countDocuments({ game_id: gameId });
  const assignedColor = color || COLORS[existing % COLORS.length];
  const id = await nextId('players');
  const p = { id, game_id: gameId, name, color: assignedColor };
  await db.collection('players').insertOne(p);
  return p;
}

async function removePlayer(gameId, playerId) {
  const db = await getDb();
  const result = await db.collection('players').deleteOne({ id: playerId, game_id: gameId });
  if (result.deletedCount === 0) return false;
  await db.collection('transactions').deleteMany({ player_id: playerId });
  return true;
}

// ── Transactions ─────────────────────────────────────────────────────────────

async function addBuyin(playerId, gameId, amount) {
  const db = await getDb();
  const id = await nextId('transactions');
  const t = { id, player_id: playerId, game_id: gameId, type: 'buyin', amount, created_at: now() };
  await db.collection('transactions').insertOne(t);
  return t;
}

async function removeLatestBuyin(playerId, gameId) {
  const db = await getDb();
  const buyin = await db.collection('transactions')
    .find({ player_id: playerId, game_id: gameId, type: 'buyin' })
    .sort({ created_at: -1 })
    .limit(1)
    .toArray();
  if (buyin.length === 0) return false;
  await db.collection('transactions').deleteOne({ id: buyin[0].id });
  return true;
}

async function setCashout(playerId, gameId, amount) {
  const db = await getDb();
  const existing = await db.collection('transactions').findOne({ player_id: playerId, type: 'cashout' });
  if (existing) {
    await db.collection('transactions').updateOne({ player_id: playerId, type: 'cashout' }, { $set: { amount } });
    return { ...existing, amount };
  }
  const id = await nextId('transactions');
  const t = { id, player_id: playerId, game_id: gameId, type: 'cashout', amount, created_at: now() };
  await db.collection('transactions').insertOne(t);
  return t;
}

async function getPotTotal(gameId) {
  const db = await getDb();
  const buyins = await db.collection('transactions').find({ game_id: gameId, type: 'buyin' }).toArray();
  return buyins.reduce((s, t) => s + t.amount, 0);
}

// ── Settlement ───────────────────────────────────────────────────────────────

async function calcSettlement(gameId) {
  const players = await getPlayers(gameId);
  const balances = players.map(p => ({
    id: p.id, name: p.name, color: p.color,
    net: (p.cashout ?? 0) - p.total_buyin,
  }));

  const debtors   = balances.filter(b => b.net < 0).map(b => ({ ...b, net: Math.abs(b.net) }));
  const creditors = balances.filter(b => b.net > 0).map(b => ({ ...b }));

  debtors.sort((a, b) => b.net - a.net);
  creditors.sort((a, b) => b.net - a.net);

  const transfers = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].net, creditors[j].net);
    if (amount > 0.005) {
      transfers.push({
        from: { id: debtors[i].id, name: debtors[i].name, color: debtors[i].color },
        to:   { id: creditors[j].id, name: creditors[j].name, color: creditors[j].color },
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtors[i].net   -= amount;
    creditors[j].net -= amount;
    if (debtors[i].net   < 0.005) i++;
    if (creditors[j].net < 0.005) j++;
  }

  return { balances, transfers, pot: await getPotTotal(gameId) };
}

module.exports = {
  getAllGames, getGame, createGame, deleteGame,
  getPlayers, addPlayer, removePlayer,
  addBuyin, removeLatestBuyin, setCashout, getPotTotal,
  calcSettlement,
};
