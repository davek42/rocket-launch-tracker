import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building2 } from 'lucide-react';
import { fetchAgencies, fetchAgencyFilters } from '../utils/api';
import AgencyCard from './AgencyCard';
import Header from './Header';

export default function AgenciesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ limit: 50, offset: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ['agencies', filters],
    queryFn: () => fetchAgencies(filters)
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['agencyFilters'],
    queryFn: fetchAgencyFilters
  });

  const agencies = data?.data?.agencies || [];
  const pagination = data?.data?.pagination || {};
  const options = filterOptions?.data || {};

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  const handlePageChange = (newOffset) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header onHomeClick={() => navigate('/')} />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>

              {/* Launch Agency or Company */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Launch Agency or Company</label>
                <select
                  value={filters.name || ''}
                  onChange={e => handleFilterChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Agencies</option>
                  {(options.names || []).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Agency name..."
                  value={filters.search || ''}
                  onChange={e => handleFilterChange('search', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={e => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  {(options.statuses || []).map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Country */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  value={filters.country || ''}
                  onChange={e => handleFilterChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Countries</option>
                  {(options.countries || []).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Launch Location */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Launch Location</label>
                <select
                  value={filters.location || ''}
                  onChange={e => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  {(options.locations || []).map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Reset */}
              <button
                onClick={() => setFilters({ limit: 50, offset: 0 })}
                className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Loading agencies...</span>
              </div>
            ) : agencies.length === 0 ? (
              <div className="text-center py-20">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No agencies found</h3>
                <p className="text-gray-500">Try adjusting your filters</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-6">
                  {pagination.total != null
                    ? `Showing ${pagination.offset + 1}–${Math.min(pagination.offset + pagination.limit, pagination.total)} of ${pagination.total} agencies`
                    : `${agencies.length} agencies`}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {agencies.map(agency => (
                    <AgencyCard key={agency.slug || agency.name} agency={agency} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.total > pagination.limit && (
                  <div className="mt-8 flex justify-center space-x-2">
                    <button
                      onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
                      disabled={pagination.offset === 0}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
                      Page {Math.floor(pagination.offset / pagination.limit) + 1} of {Math.ceil(pagination.total / pagination.limit)}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                      disabled={!pagination.hasMore}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
