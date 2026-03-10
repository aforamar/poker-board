const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'db.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const EMPTY = {
  games: [], players: [], transactions: [],
  _seq: { games: 0, players: 0, transactions: 0 },
};

function load() {
  if (!fs.existsSync(dbPath)) return JSON.parse(JSON.stringify(EMPTY));
  try { return JSON.parse(fs.readFileSync(dbPath, 'utf8')); }
  catch { return JSON.parse(JSON.stringify(EMPTY)); }
}

function save(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(data, table) {
  data._seq[table] = (data._seq[table] || 0) + 1;
  return data._seq[table];
}

const now = () => new Date().toISOString();

// ── Games ────────────────────────────────────────────────────────────────────

function getAllGames() {
  return [...load().games].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getGame(id) {
  return load().games.find(g => g.id === id) || null;
}

function createGame(name, buyIn) {
  const data = load();
  const g = { id: nextId(data, 'games'), name, buy_in_amount: buyIn, created_at: now(), status: 'active' };
  data.games.push(g);
  save(data);
  return g;
}

function deleteGame(id) {
  const data = load();
  const before = data.games.length;
  const playerIds = data.players.filter(p => p.game_id === id).map(p => p.id);
  data.games = data.games.filter(g => g.id !== id);
  data.players = data.players.filter(p => p.game_id !== id);
  data.transactions = data.transactions.filter(t => !playerIds.includes(t.player_id));
  save(data);
  return data.games.length < before;
}

// ── Players ──────────────────────────────────────────────────────────────────

const COLORS = ['#ef4444','#3b82f6','#22c55e','#a855f7','#f97316','#ec4899','#14b8a6','#eab308'];

function getPlayers(gameId) {
  const data = load();
  return data.players
    .filter(p => p.game_id === gameId)
    .map(p => {
      const buyins = data.transactions.filter(t => t.player_id === p.id && t.type === 'buyin');
      const cashout = data.transactions.find(t => t.player_id === p.id && t.type === 'cashout');
      return {
        ...p,
        total_buyin: buyins.reduce((s, t) => s + t.amount, 0),
        buyin_count: buyins.length,
        cashout: cashout ? cashout.amount : null,
      };
    });
}

function addPlayer(gameId, name, color) {
  const data = load();
  const existing = data.players.filter(p => p.game_id === gameId);
  const assignedColor = color || COLORS[existing.length % COLORS.length];
  const p = { id: nextId(data, 'players'), game_id: gameId, name, color: assignedColor };
  data.players.push(p);
  save(data);
  return p;
}

function removePlayer(gameId, playerId) {
  const data = load();
  const before = data.players.length;
  data.players = data.players.filter(p => !(p.id === playerId && p.game_id === gameId));
  data.transactions = data.transactions.filter(t => t.player_id !== playerId);
  save(data);
  return data.players.length < before;
}

// ── Transactions ─────────────────────────────────────────────────────────────

function addBuyin(playerId, gameId, amount) {
  const data = load();
  const t = { id: nextId(data, 'transactions'), player_id: playerId, game_id: gameId, type: 'buyin', amount, created_at: now() };
  data.transactions.push(t);
  save(data);
  return t;
}

function removeLatestBuyin(playerId, gameId) {
  const data = load();
  const buyins = data.transactions
    .filter(t => t.player_id === playerId && t.game_id === gameId && t.type === 'buyin')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (buyins.length === 0) return false;
  data.transactions = data.transactions.filter(t => t.id !== buyins[0].id);
  save(data);
  return true;
}

function setCashout(playerId, gameId, amount) {
  const data = load();
  const existing = data.transactions.findIndex(t => t.player_id === playerId && t.type === 'cashout');
  if (existing >= 0) {
    data.transactions[existing].amount = amount;
    save(data);
    return data.transactions[existing];
  }
  const t = { id: nextId(data, 'transactions'), player_id: playerId, game_id: gameId, type: 'cashout', amount, created_at: now() };
  data.transactions.push(t);
  save(data);
  return t;
}

function getPotTotal(gameId) {
  const data = load();
  return data.transactions
    .filter(t => t.game_id === gameId && t.type === 'buyin')
    .reduce((s, t) => s + t.amount, 0);
}

// ── Settlement ───────────────────────────────────────────────────────────────

function calcSettlement(gameId) {
  const players = getPlayers(gameId);
  const balances = players.map(p => ({
    id: p.id, name: p.name, color: p.color,
    net: (p.cashout ?? 0) - p.total_buyin,
  }));

  const debtors  = balances.filter(b => b.net < 0).map(b => ({ ...b, net: Math.abs(b.net) }));
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

  return { balances, transfers, pot: getPotTotal(gameId) };
}

module.exports = {
  getAllGames, getGame, createGame, deleteGame,
  getPlayers, addPlayer, removePlayer,
  addBuyin, removeLatestBuyin, setCashout, getPotTotal,
  calcSettlement,
};
