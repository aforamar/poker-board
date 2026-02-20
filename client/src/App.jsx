import { Routes, Route } from 'react-router-dom';
import GameList from './components/GameList';
import GameDashboard from './components/GameDashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Routes>
        <Route path="/" element={<GameList />} />
        <Route path="/game/:id" element={<GameDashboard />} />
      </Routes>
    </div>
  );
}
