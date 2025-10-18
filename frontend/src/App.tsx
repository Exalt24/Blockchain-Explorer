import Header from './components/Header';
import StatsCards from './components/StatsCards';
import EventFeed from './components/EventFeed';
import Charts from './components/Charts';
import Leaderboard from './components/Leaderboard';
import EventExplorer from './components/EventExplorer';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Header />
        
        <div className="mt-6">
          <StatsCards />
        </div>

        <div className="mt-6">
          <EventFeed />
        </div>

        <div className="mt-6">
          <Charts />
        </div>

        <div className="mt-6">
          <Leaderboard />
        </div>

        <div className="mt-6">
          <EventExplorer />
        </div>
      </div>
    </div>
  );
}