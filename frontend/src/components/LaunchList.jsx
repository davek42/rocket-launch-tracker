import LaunchCard from './LaunchCard';
import { Loader2, Rocket } from 'lucide-react';

export default function LaunchList({ launches, pagination, isLoading, onPageChange }) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading launches...</span>
      </div>
    );
  }

  if (launches.length === 0) {
    return (
      <div className="text-center py-20">
        <Rocket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">No launches found</h3>
        <p className="text-gray-500">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <p className="text-gray-600">
          Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} launches
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {launches.map((launch) => (
          <LaunchCard key={launch.id} launch={launch} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="mt-8 flex justify-center space-x-2">
          <button
            onClick={() => onPageChange(Math.max(0, pagination.offset - pagination.limit))}
            disabled={pagination.offset === 0}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
            Page {Math.floor(pagination.offset / pagination.limit) + 1} of {Math.ceil(pagination.total / pagination.limit)}
          </span>

          <button
            onClick={() => onPageChange(pagination.offset + pagination.limit)}
            disabled={!pagination.hasMore}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
