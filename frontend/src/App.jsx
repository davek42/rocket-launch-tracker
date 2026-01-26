import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLaunches, fetchFilters, getBulkICSDownloadUrl } from './utils/api';
import Header from './components/Header';
import LaunchList from './components/LaunchList';
import SearchFilters from './components/SearchFilters';
import About from './components/About';
import { Rocket } from 'lucide-react';

function App() {
  const [showAbout, setShowAbout] = useState(false);
  const [filters, setFilters] = useState({
    upcoming: true,
    limit: 20,
    offset: 0,
    sort: 'net',
    order: 'asc'
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['launches', filters],
    queryFn: () => fetchLaunches(filters)
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['filters'],
    queryFn: fetchFilters
  });

  const handleFilterChange = (newFilters) => {
    setFilters({
      ...filters,
      ...newFilters,
      offset: 0 // Reset to first page when filters change
    });
  };

  const handlePageChange = (newOffset) => {
    setFilters({
      ...filters,
      offset: newOffset
    });
  };

  const handleDownloadICS = () => {
    const url = getBulkICSDownloadUrl(filters);
    window.location.href = url;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Rocket className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Launches</h2>
          <p className="text-gray-600">{error.message}</p>
          <p className="text-sm text-gray-500 mt-2">Make sure the backend server is running</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header onAboutClick={() => setShowAbout(true)} />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <SearchFilters
              filters={filters}
              filterOptions={filterOptions?.data || {}}
              onFilterChange={handleFilterChange}
              onDownloadICS={handleDownloadICS}
            />
          </aside>

          {/* Launches List */}
          <div className="lg:col-span-3">
            <LaunchList
              launches={data?.data?.launches || []}
              pagination={data?.data?.pagination || {}}
              isLoading={isLoading}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </main>

      <About isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}

export default App;
