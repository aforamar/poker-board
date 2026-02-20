import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGame, getPlayers } from '../api';
import PlayersPanel from './PlayersPanel';
import SettlePanel from './SettlePanel';
import SummaryPanel from './SummaryPanel';

const TABS = ['Players', 'Settle', 'Summary'];

export default function GameDashboard() {
  const { id } = useParams();
  const gameId = parseInt(id, 10);
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [pot, setPot] = useState(0);

  useEffect(() => {
    getGame(gameId).then(setGame);
    refreshPlayers();
  }, [gameId]);

  const refreshPlayers = () => {
    getPlayers(gameId).then(ps => {
      setPlayers(ps);
      const total = ps.reduce((s, p) => s + p.total_buyin, 0);
      setPot(total);
    });
  };

  if (!game) return (
    <div className="flex items-center justify-center h-screen text-gray-600">
      Loading…
    </div>
  );

  return (
    <div className="max-w-lg mx-auto flex flex-col h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 bg-gray-950 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => navigate('/')} className="text-gray-500 text-sm mr-1">‹ Back</button>
          <h1 className="font-bold text-white text-lg truncate flex-1">{game.name}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Buy-in <span className="text-yellow-400 font-semibold">${game.buy_in_amount}</span></span>
          <span>Pot <span className="text-yellow-400 font-semibold">${pot.toFixed(2)}</span></span>
          <span>{players.length} player{players.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === 0 && <PlayersPanel gameId={gameId} game={game} players={players} onRefresh={refreshPlayers} />}
        {tab === 1 && <SettlePanel gameId={gameId} players={players} pot={pot} onRefresh={refreshPlayers} />}
        {tab === 2 && <SummaryPanel gameId={gameId} players={players} pot={pot} game={game} />}
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex">
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${
              tab === i ? 'text-yellow-400 border-t-2 border-yellow-400 -mt-px' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
