import { useWebSocketContext } from '../contexts/WebSocketContext';
import { useStats } from '../hooks/useStats';

export default function Header() {
  const { isConnected } = useWebSocketContext();
  const { stats } = useStats();

  return (
    <header className="bg-[#1a1a2e] border-b border-[#2d2d44] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Blockchain Explorer
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time event indexing and analytics
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[--color-success]' : 'bg-[--color-danger]'
              }`}
            />
            <span className="text-sm text-gray-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {stats && (
            <div className="text-right">
              <div className="text-xs text-gray-400">Latest Block</div>
              <div className="text-sm font-mono text-white">
                #{stats.latestBlock}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}