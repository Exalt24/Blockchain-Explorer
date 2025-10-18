import { useStats } from '../hooks/useStats';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-lg p-6 hover:border-[#3d3d54] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="text-gray-400 text-sm font-medium">{title}</div>
        <div className={`text-2xl ${color}`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

export default function StatsCards() {
  const { stats, loading } = useStats();

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[#1a1a2e] border border-[#2d2d44] rounded-lg p-6 animate-pulse"
          >
            <div className="h-5 bg-[#2d2d44] rounded w-24 mb-3" />
            <div className="h-9 bg-[#2d2d44] rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Events"
        value={stats.totalEvents.toLocaleString()}
        icon="📊"
        color="text-[--color-primary]"
      />
      <StatCard
        title="Unique Players"
        value={stats.uniquePlayers.toLocaleString()}
        icon="👥"
        color="text-[--color-secondary]"
      />
      <StatCard
        title="Events (24h)"
        value={stats.eventsLast24h.toLocaleString()}
        icon="⚡"
        color="text-[--color-success]"
      />
      <StatCard
        title="Latest Block"
        value={`#${stats.latestBlock}`}
        icon="🔗"
        color="text-white"
      />
    </div>
  );
}