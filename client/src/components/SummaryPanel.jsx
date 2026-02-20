import { useState } from 'react';
import { getSettlement } from '../api';

export default function SummaryPanel({ gameId, players, pot, game }) {
  const [copied, setCopied] = useState(false);

  // Sort players by net profit descending (needs cashout)
  const ranked = [...players]
    .filter(p => p.cashout !== null)
    .map(p => ({ ...p, net: p.cashout - p.total_buyin }))
    .sort((a, b) => b.net - a.net);

  const unSettled = players.filter(p => p.cashout === null);

  const handleShare = async () => {
    const result = await getSettlement(gameId);
    const date = new Date(game.created_at).toLocaleDateString();
    const lines = [
      `🃏 ${game.name} — ${date}`,
      `Buy-in: $${game.buy_in_amount} · Pot: $${pot.toFixed(2)}`,
      '',
      '📊 Results:',
      ...ranked.map((p, i) => `${i + 1}. ${p.name}: ${p.net >= 0 ? '+' : ''}$${p.net.toFixed(2)}`),
      '',
      '💸 Transfers:',
      ...(result.transfers.length === 0
        ? ['Everyone settled!']
        : result.transfers.map(t => `${t.from.name} → ${t.to.name}: $${t.amount.toFixed(2)}`)),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const biggestWin = ranked[0]?.net ?? 0;
  const biggestLoss = ranked[ranked.length - 1]?.net ?? 0;

  return (
    <div className="px-4 pt-5">
      {/* Pot card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4 text-center">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Pot</p>
        <p className="text-4xl font-bold text-yellow-400">${pot.toFixed(2)}</p>
        <p className="text-sm text-gray-500 mt-1">{players.length} players · ${game.buy_in_amount} buy-in</p>
      </div>

      {/* Stats row */}
      {ranked.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Biggest Win</p>
            <p className="text-lg font-bold text-green-400">+${biggestWin.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{ranked[0].name}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Biggest Loss</p>
            <p className="text-lg font-bold text-red-400">${biggestLoss.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{ranked[ranked.length - 1]?.name}</p>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 pt-4 pb-2">Leaderboard</p>
        {ranked.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6 px-4">
            Enter chip values in the Settle tab to see results
          </p>
        ) : (
          <ul>
            {ranked.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 border-t border-gray-800 first:border-t-0"
              >
                {/* Rank */}
                <span className="text-gray-600 text-sm w-5 text-center font-mono">{i + 1}</span>

                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>

                {/* Name + stats */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {p.buyin_count} buy-in{p.buyin_count !== 1 ? 's' : ''} · invested ${p.total_buyin.toFixed(2)}
                  </p>
                </div>

                {/* Net */}
                <span className={`font-bold text-sm shrink-0 ${p.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {p.net >= 0 ? '+' : ''}${p.net.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Unsettled players */}
      {unSettled.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-yellow-400 font-semibold mb-1">Awaiting cashout</p>
          <p className="text-sm text-gray-400">
            {unSettled.map(p => p.name).join(', ')} haven't entered chip values yet
          </p>
        </div>
      )}

      {/* Share button */}
      <button
        onClick={handleShare}
        className="w-full bg-yellow-500 text-gray-900 font-bold py-3 rounded-xl active:bg-yellow-400 transition-colors mb-6"
      >
        {copied ? '✓ Copied to Clipboard!' : '📋 Share Summary'}
      </button>
    </div>
  );
}
