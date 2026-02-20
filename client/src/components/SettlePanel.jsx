import { useState, useEffect } from 'react';
import { setCashout, getSettlement } from '../api';

export default function SettlePanel({ gameId, players, pot, onRefresh }) {
  const [cashouts, setCashouts] = useState({});
  const [settlement, setSettlement] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Seed cashout inputs from existing player cashout values
  useEffect(() => {
    const initial = {};
    players.forEach(p => {
      if (p.cashout !== null) initial[p.id] = String(p.cashout);
    });
    setCashouts(prev => ({ ...initial, ...prev }));
  }, [players]);

  const getValue = (pid) => cashouts[pid] ?? '';
  const getNet = (p) => {
    const v = parseFloat(cashouts[p.id]);
    if (isNaN(v)) return null;
    return v - p.total_buyin;
  };

  const handleSaveCashout = async (pid) => {
    const val = parseFloat(cashouts[pid]);
    if (isNaN(val) || val < 0) return;
    await setCashout(gameId, pid, val);
    onRefresh();
  };

  const handleCalculate = async () => {
    // Save all cashout values first
    setCalculating(true);
    try {
      await Promise.all(
        players
          .filter(p => cashouts[p.id] !== undefined && cashouts[p.id] !== '')
          .map(p => setCashout(gameId, p.id, parseFloat(cashouts[p.id])))
      );
      const result = await getSettlement(gameId);
      setSettlement(result);
      onRefresh();
    } finally { setCalculating(false); }
  };

  const handleShare = () => {
    if (!settlement) return;
    const lines = [
      `🃏 Poker Settlement`,
      `Pot: $${pot.toFixed(2)}`,
      '',
      ...settlement.transfers.map(t => `${t.from.name} → ${t.to.name}: $${t.amount.toFixed(2)}`),
    ];
    if (settlement.transfers.length === 0) lines.push('Everyone is settled up!');
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const allEntered = players.length > 0 && players.every(p => {
    const v = parseFloat(cashouts[p.id]);
    return !isNaN(v) && v >= 0;
  });

  const liveTotal = players.reduce((s, p) => {
    const v = parseFloat(cashouts[p.id]);
    return s + (isNaN(v) ? 0 : v);
  }, 0);

  return (
    <div className="px-4 pt-5">
      {players.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <p className="text-4xl mb-2">👥</p>
          <p className="font-medium">No players yet</p>
          <p className="text-sm">Add players in the Players tab</p>
        </div>
      ) : (
        <>
          {/* Cashout inputs */}
          <div className="space-y-3 mb-4">
            {players.map(p => {
              const net = getNet(p);
              return (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + invested */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">invested ${p.total_buyin.toFixed(2)}</p>
                  </div>

                  {/* Net badge */}
                  {net !== null && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${net >= 0 ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                      {net >= 0 ? '+' : ''}${net.toFixed(2)}
                    </span>
                  )}

                  {/* Cashout input */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={getValue(p.id)}
                      onChange={e => setCashouts(prev => ({ ...prev, [p.id]: e.target.value }))}
                      onBlur={() => handleSaveCashout(p.id)}
                      className="w-20 bg-gray-800 text-white rounded-xl px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chip total vs pot */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 mb-4 flex justify-between text-sm">
            <span className="text-gray-400">Chips entered</span>
            <span className={`font-semibold ${Math.abs(liveTotal - pot) < 0.05 ? 'text-green-400' : 'text-yellow-400'}`}>
              ${liveTotal.toFixed(2)} / ${pot.toFixed(2)}
            </span>
          </div>

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            disabled={!allEntered || calculating}
            className="w-full bg-yellow-500 text-gray-900 font-bold py-3 rounded-xl disabled:opacity-40 active:bg-yellow-400 transition-colors mb-6"
          >
            {calculating ? 'Calculating…' : 'Calculate Settlement'}
          </button>

          {/* Settlement result */}
          {settlement && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Transfers</p>
                <button
                  onClick={handleShare}
                  className="text-xs text-yellow-400 font-semibold px-3 py-1 rounded-lg bg-yellow-400/10 active:bg-yellow-400/20"
                >
                  {copied ? '✓ Copied!' : '📋 Share'}
                </button>
              </div>

              {settlement.transfers.length === 0 ? (
                <p className="text-green-400 font-semibold text-center py-2">🎉 Everyone is settled!</p>
              ) : (
                <ul className="space-y-3">
                  {settlement.transfers.map((t, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: t.from.color }}
                      >
                        {t.from.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-white font-medium truncate">{t.from.name}</span>
                      <span className="text-gray-500 text-sm">pays</span>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: t.to.color }}
                      >
                        {t.to.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-white font-medium truncate">{t.to.name}</span>
                      <span className="ml-auto text-yellow-400 font-bold text-sm shrink-0">${t.amount.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
