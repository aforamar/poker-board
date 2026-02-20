import { useState } from 'react';
import { addPlayer, removePlayer, addBuyin, removeBuyin } from '../api';
import ConfirmModal from './ConfirmModal';
import PasscodeModal from './PasscodeModal';

const COLORS = [
  { hex: '#ef4444', label: 'Red' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#22c55e', label: 'Green' },
  { hex: '#a855f7', label: 'Purple' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#eab308', label: 'Yellow' },
];

export default function PlayersPanel({ gameId, game, players, onRefresh }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [adding, setAdding] = useState(false);
  const [buyingIn, setBuyingIn] = useState(null);
  const [modal, setModal] = useState(null); // { type: 'buyin'|'remove', pid, playerName }

  const usedColors = players.map(p => p.color);
  const nextColor = COLORS.find(c => !usedColors.includes(c.hex))?.hex || COLORS[0].hex;
  const selectedColor = color || nextColor;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      const newPlayer = await addPlayer(gameId, name.trim(), selectedColor);
      await addBuyin(gameId, newPlayer.id, game.buy_in_amount);
      setName('');
      setColor('');
      onRefresh();
    } finally { setAdding(false); }
  };

  const handleConfirm = async () => {
    const { type, pid } = modal;
    setModal(null);
    if (type === 'remove') {
      await removePlayer(gameId, pid);
      onRefresh();
    } else if (type === 'buyin') {
      setBuyingIn(pid);
      try {
        await addBuyin(gameId, pid, game.buy_in_amount);
        onRefresh();
      } finally { setBuyingIn(null); }
    } else if (type === 'removeBuyin') {
      await removeBuyin(gameId, pid);
      onRefresh();
    }
  };

  const modalProps = modal?.type === 'buyin'
    ? {
        title: `Re-buy for ${modal.playerName}`,
        message: `Add another $${game.buy_in_amount} buy-in?`,
        confirmLabel: `+ $${game.buy_in_amount}`,
        confirmClass: 'bg-yellow-500 text-gray-900 active:bg-yellow-400',
      }
    : {
        title: `Remove buy-in for ${modal?.playerName}?`,
        message: `This will deduct $${game.buy_in_amount} from their total.`,
        confirmLabel: `- $${game.buy_in_amount}`,
        confirmClass: 'bg-red-600 text-white active:bg-red-500',
      };

  return (
    <div className="px-4 pt-5">
      {/* Add player form */}
      <form onSubmit={handleAdd} className="bg-gray-900 rounded-2xl p-4 mb-6 border border-gray-800">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add Player</p>
        <input
          type="text"
          placeholder="Player name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 mb-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-gray-600"
        />
        {/* Color picker */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c.hex}
              type="button"
              onClick={() => setColor(c.hex)}
              className="w-8 h-8 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c.hex,
                borderColor: selectedColor === c.hex ? 'white' : 'transparent',
                transform: selectedColor === c.hex ? 'scale(1.2)' : 'scale(1)',
              }}
              title={c.label}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={adding || !name.trim()}
          className="w-full bg-yellow-500 text-gray-900 font-bold py-3 rounded-xl disabled:opacity-40 active:bg-yellow-400 transition-colors"
        >
          {adding ? '…' : '+ Add Player'}
        </button>
      </form>

      {/* Player cards */}
      {players.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <p className="text-4xl mb-2">🃏</p>
          <p className="font-medium">No players yet</p>
          <p className="text-sm">Add players above</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {players.map(p => (
            <li key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                {/* Avatar + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      {p.buyin_count} buy-in{p.buyin_count !== 1 ? 's' : ''} · invested <span className="text-gray-300">${p.total_buyin.toFixed(2)}</span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {p.buyin_count > 0 && (
                    <button
                      onClick={() => setModal({ type: 'removeBuyin', pid: p.id, playerName: p.name })}
                      className="text-gray-500 text-xs font-bold px-2.5 py-2 rounded-xl border border-gray-700 active:bg-gray-800 transition-colors"
                    >
                      −
                    </button>
                  )}
                  <button
                    onClick={() => setModal({ type: 'buyin', pid: p.id, playerName: p.name })}
                    disabled={buyingIn === p.id}
                    className="bg-yellow-500 text-gray-900 text-xs font-bold px-3 py-2 rounded-xl active:bg-yellow-400 disabled:opacity-50 transition-colors"
                  >
                    {buyingIn === p.id ? '…' : `+$${game.buy_in_amount}`}
                  </button>
                  <button
                    onClick={() => setModal({ type: 'remove', pid: p.id, playerName: p.name })}
                    className="text-red-500 text-sm p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Cashout badge */}
              {p.cashout !== null && (
                <div className="mt-2 flex items-center gap-2 ml-13">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                    Cashed out: <span className="text-white font-medium">${p.cashout.toFixed(2)}</span>
                  </span>
                  <span className={`text-xs font-semibold ${p.cashout - p.total_buyin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {p.cashout - p.total_buyin >= 0 ? '+' : ''}${(p.cashout - p.total_buyin).toFixed(2)}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Buy-in / remove buy-in confirmation */}
      <ConfirmModal
        open={!!modal && modal.type !== 'remove'}
        {...modalProps}
        onConfirm={handleConfirm}
        onCancel={() => setModal(null)}
      />

      {/* Passcode-protected player removal */}
      <PasscodeModal
        open={modal?.type === 'remove'}
        title="Enter passcode to remove player"
        gameName={modal?.playerName}
        onConfirm={handleConfirm}
        onCancel={() => setModal(null)}
      />
    </div>
  );
}
