// localStorage-based data layer — no server API needed.
// Data persists in the browser across refreshes, restarts, and offline.

const DB_KEY = 'poker_board_db';
const EMPTY = {
  games: [], players: [], transactions: [],
  _seq: { games: 0, players: 0, transactions: 0 },
};

function load() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || JSON.parse(JSON.stringify(EMPTY)); }
  catch { return JSON.parse(JSON.stringify(EMPTY)); }
}

function save(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function nextId(data, table) {
  data._seq[table] = (data._seq[table] || 0) + 1;
  return data._seq[table];
}

const now = () => new Date().toISOString();
const COLORS = ['#ef4444','#3b82f6','#22c55e','#a855f7','#f97316','#ec4899','#14b8a6','#eab308'];

function buildPlayers(gameId, data) {
  return data.players.filter(p => p.game_id === gameId).map(p => {
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

// ── Games ─────────────────────────────────────────────────────────────────────

export const getGames = () => {
  const data = load();
  return Promise.resolve([...data.games].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
};

export const createGame = (name, buyIn) => {
  const data = load();
  const g = { id: nextId(data, 'games'), name, buy_in_amount: buyIn, created_at: now(), status: 'active' };
  data.games.push(g);
  save(data);
  return Promise.resolve(g);
};

export const getGame = (id) => {
  const data = load();
  const g = data.games.find(g => g.id === id);
  if (!g) return Promise.reject(new Error('Not found'));
  const pot = data.transactions
    .filter(t => t.game_id === id && t.type === 'buyin')
    .reduce((s, t) => s + t.amount, 0);
  return Promise.resolve({ ...g, pot });
};

export const deleteGame = (id) => {
  const data = load();
  const playerIds = data.players.filter(p => p.game_id === id).map(p => p.id);
  data.games = data.games.filter(g => g.id !== id);
  data.players = data.players.filter(p => p.game_id !== id);
  data.transactions = data.transactions.filter(t => !playerIds.includes(t.player_id));
  save(data);
  return Promise.resolve({ success: true });
};

// ── Players ───────────────────────────────────────────────────────────────────

export const getPlayers = (gid) => {
  return Promise.resolve(buildPlayers(gid, load()));
};

export const addPlayer = (gid, name, color) => {
  const data = load();
  const existing = data.players.filter(p => p.game_id === gid);
  const assignedColor = color || COLORS[existing.length % COLORS.length];
  const p = { id: nextId(data, 'players'), game_id: gid, name, color: assignedColor };
  data.players.push(p);
  save(data);
  return Promise.resolve(p);
};

export const removePlayer = (gid, pid) => {
  const data = load();
  data.players = data.players.filter(p => !(p.id === pid && p.game_id === gid));
  data.transactions = data.transactions.filter(t => t.player_id !== pid);
  save(data);
  return Promise.resolve({ success: true });
};

// ── Transactions ──────────────────────────────────────────────────────────────

export const addBuyin = (gid, pid, amount) => {
  const data = load();
  const t = { id: nextId(data, 'transactions'), player_id: pid, game_id: gid, type: 'buyin', amount, created_at: now() };
  data.transactions.push(t);
  save(data);
  return Promise.resolve(t);
};

export const removeBuyin = (gid, pid) => {
  const data = load();
  const buyins = data.transactions
    .filter(t => t.player_id === pid && t.game_id === gid && t.type === 'buyin')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (buyins.length === 0) return Promise.reject(new Error('No buy-in to remove'));
  data.transactions = data.transactions.filter(t => t.id !== buyins[0].id);
  save(data);
  return Promise.resolve({ success: true });
};

export const setCashout = (gid, pid, amount) => {
  const data = load();
  const idx = data.transactions.findIndex(t => t.player_id === pid && t.type === 'cashout');
  if (idx >= 0) {
    data.transactions[idx].amount = amount;
    save(data);
    return Promise.resolve(data.transactions[idx]);
  }
  const t = { id: nextId(data, 'transactions'), player_id: pid, game_id: gid, type: 'cashout', amount, created_at: now() };
  data.transactions.push(t);
  save(data);
  return Promise.resolve(t);
};

// ── Settlement ────────────────────────────────────────────────────────────────

export const getSettlement = (gid) => {
  const data = load();
  const players = buildPlayers(gid, data);
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

  const pot = data.transactions
    .filter(t => t.game_id === gid && t.type === 'buyin')
    .reduce((s, t) => s + t.amount, 0);
  return Promise.resolve({ balances, transfers, pot });
};
