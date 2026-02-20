import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGames, createGame, deleteGame } from '../api';
import PasscodeModal from './PasscodeModal';

export default function GameList() {
  const [games, setGames] = useState([]);
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState('10');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const navigate = useNavigate();

  useEffect(() => { getGames().then(setGames); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const g = await createGame(name.trim(), parseFloat(buyIn) || 10);
      navigate(`/game/${g.id}`);
    } finally { setCreating(false); }
  };

  const handleDelete = (e, id, gameName) => {
    e.stopPropagation();
    setDeleteTarget({ id, name: gameName });
  };

  const confirmDelete = async () => {
    await deleteGame(deleteTarget.id);
    setGames(prev => prev.filter(g => g.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🃏</span>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Poker Board
            </h1>
            <p className="text-sm text-gray-400">Have fun...</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 text-right shrink-0">
          Built by<br />
          <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent font-semibold">
            Amar Suroju
          </span>
        </p>
      </div>

      {/* New game form */}
      <form onSubmit={handleCreate} className="bg-gray-900 rounded-2xl p-4 mb-8 border border-gray-800">
        <p className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">New Game Night</p>
        <input
          type="text"
          placeholder="e.g. Friday Feb 21"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 mb-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-gray-600"
        />
        <div className="flex gap-2 items-center mb-3">
          <span className="text-gray-400 text-sm">Buy-in $</span>
          <input
            type="number"
            min="1"
            value={buyIn}
            onChange={e => setBuyIn(e.target.value)}
            className="w-24 bg-gray-800 text-white rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="w-full bg-yellow-500 text-gray-900 font-bold py-3 rounded-xl disabled:opacity-40 active:bg-yellow-400 transition-colors"
        >
          {creating ? '…' : '+ Start Game'}
        </button>
      </form>

      {/* Game list */}
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Past Games</h2>
      {games.length === 0 ? (
        <div className="text-center py-14 text-gray-600">
          <p className="text-5xl mb-3">🃏</p>
          <p className="font-medium">No games yet</p>
          <p className="text-sm">Start one above</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {games.map(g => (
            <li
              key={g.id}
              onClick={() => navigate(`/game/${g.id}`)}
              className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex items-center justify-between cursor-pointer active:bg-gray-800 transition-colors"
            >
              <div>
                <p className="font-semibold text-white">{g.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Buy-in ${g.buy_in_amount} · {new Date(g.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-600">›</span>
                <button onClick={e => handleDelete(e, g.id, g.name)} className="text-red-500 text-sm p-1">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PasscodeModal
        open={!!deleteTarget}
        gameName={deleteTarget?.name}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
