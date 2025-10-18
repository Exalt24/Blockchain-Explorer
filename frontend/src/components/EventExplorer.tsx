import { useState, useEffect } from 'react';
import { getEvents, getEventsByTransaction, getEventsByBlock } from '../services/api';
import type { BlockchainEvent, EventFilters } from '../types';

type SearchMode = 'filters' | 'transaction' | 'block';

export default function EventExplorer() {
  const [searchMode, setSearchMode] = useState<SearchMode>('filters');
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<EventFilters>({
    page: 1,
    limit: 20,
    eventType: '',
    playerAddress: '',
    fromDate: '',
    toDate: '',
  });
  
  const [txHash, setTxHash] = useState('');
  const [blockNumber, setBlockNumber] = useState('');
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (searchMode === 'filters') {
      fetchFilteredEvents();
    }
  }, [filters.page, filters.limit, searchMode]);

  useEffect(() => {
    console.log('🔍 EventExplorer: Component mounted, fetching initial data...');
    fetchFilteredEvents();
  }, []);

  const fetchFilteredEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 EventExplorer: Fetching with filters:', filters);
      
      const response = await getEvents(filters);
      
      console.log('🔍 EventExplorer: API response:', response);
      console.log('🔍 EventExplorer: Events array:', response.data);
      console.log('🔍 EventExplorer: Pagination:', response.pagination);
      
      setEvents(response.data || []);
      setPagination(response.pagination);
    } catch (err) {
      console.error('🔍 EventExplorer: Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const searchByTransaction = async () => {
    if (!txHash.trim()) {
      setError('Please enter a transaction hash');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await getEventsByTransaction(txHash.trim());
      setEvents(data);
      setPagination({ page: 1, limit: data.length, total: data.length, totalPages: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const searchByBlock = async () => {
    if (!blockNumber.trim()) {
      setError('Please enter a block number');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await getEventsByBlock(blockNumber.trim());
      setEvents(data);
      setPagination({ page: 1, limit: data.length, total: data.length, totalPages: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch block events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchMode === 'filters') {
      setFilters({ ...filters, page: 1 });
      fetchFilteredEvents();
    } else if (searchMode === 'transaction') {
      searchByTransaction();
    } else if (searchMode === 'block') {
      searchByBlock();
    }
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      eventType: '',
      playerAddress: '',
      fromDate: '',
      toDate: '',
    });
    setTxHash('');
    setBlockNumber('');
    setEvents([]);
    setError(null);
  };

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEventColor = (eventName: string) => {
    const colors: Record<string, string> = {
      PlayerJoined: 'bg-green-500/20 text-green-400 border-green-500/30',
      ScoreUpdated: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      ItemPurchased: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      GameReset: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[eventName] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const nextPage = () => {
    if (pagination.page < pagination.totalPages) {
      setFilters({ ...filters, page: filters.page! + 1 });
    }
  };

  const prevPage = () => {
    if (pagination.page > 1) {
      setFilters({ ...filters, page: filters.page! - 1 });
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        🔍 Event Explorer
      </h2>

      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSearchMode('filters')}
            className={`px-4 py-2 rounded transition-colors ${
              searchMode === 'filters'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Filter Events
          </button>
          <button
            onClick={() => setSearchMode('transaction')}
            className={`px-4 py-2 rounded transition-colors ${
              searchMode === 'transaction'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            By Transaction
          </button>
          <button
            onClick={() => setSearchMode('block')}
            className={`px-4 py-2 rounded transition-colors ${
              searchMode === 'block'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            By Block
          </button>
        </div>

        {searchMode === 'filters' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Event Type</label>
              <select
                value={filters.eventType}
                onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                aria-label="Filter by event type"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Events</option>
                <option value="PlayerJoined">Player Joined</option>
                <option value="ScoreUpdated">Score Updated</option>
                <option value="ItemPurchased">Item Purchased</option>
                <option value="GameReset">Game Reset</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Player Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={filters.playerAddress}
                onChange={(e) => setFilters({ ...filters, playerAddress: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">From Date</label>
              <input
                type="datetime-local"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                aria-label="Filter events from this date and time"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">To Date</label>
              <input
                type="datetime-local"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                aria-label="Filter events until this date and time"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {searchMode === 'transaction' && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Transaction Hash</label>
            <input
              type="text"
              placeholder="0x..."
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
            />
          </div>
        )}

        {searchMode === 'block' && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Block Number</label>
            <input
              type="text"
              placeholder="12345"
              value={blockNumber}
              onChange={(e) => setBlockNumber(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={clearFilters}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-gray-400">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
          <p>Loading events...</p>
        </div>
      )}

      {!loading && events.length === 0 && !error && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-lg mb-2">No events found.</p>
          <p className="text-sm">
            {pagination.total > 0 
              ? `Found ${pagination.total} total events but none match your filters.`
              : 'The database is empty. Generate some events by interacting with the smart contract.'}
          </p>
          <p className="text-xs mt-2 text-gray-500">
            Current filters: {filters.eventType || 'All Events'}, Page {filters.page}
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3 pl-3 font-medium">Event</th>
                  <th className="pb-3 font-medium">Block</th>
                  <th className="pb-3 font-medium">Transaction</th>
                  <th className="pb-3 font-medium">Timestamp</th>
                  <th className="pb-3 pr-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 pl-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getEventColor(event.event_name)}`}>
                        {event.event_name}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-sm text-gray-300">
                      {event.block_number}
                    </td>
                    <td className="py-3 font-mono text-sm text-blue-400">
                      <a
                        href={`#tx-${event.transaction_hash}`}
                        className="hover:underline"
                        title={event.transaction_hash}
                      >
                        {formatAddress(event.transaction_hash)}
                      </a>
                    </td>
                    <td className="py-3 text-sm text-gray-400">
                      {formatTimestamp(event.timestamp)}
                    </td>
                    <td className="py-3 pr-3 text-sm text-gray-300">
                      {event.decoded_data?.player && (
                        <span className="font-mono text-xs">
                          {formatAddress(event.decoded_data.player)}
                        </span>
                      )}
                      {event.decoded_data?.newScore && (
                        <span className="ml-2 text-xs text-green-400">
                          Score: {event.decoded_data.newScore}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {searchMode === 'filters' && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total events)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={prevPage}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded transition-colors text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={nextPage}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded transition-colors text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {(searchMode === 'transaction' || searchMode === 'block') && (
            <div className="mt-4 pt-4 border-t border-gray-700 text-center text-sm text-gray-400">
              Found {events.length} event{events.length !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  );
}