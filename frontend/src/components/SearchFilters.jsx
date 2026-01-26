import { useState } from 'react';
import { Filter, Download, X } from 'lucide-react';

export default function SearchFilters({ filters, filterOptions, onFilterChange, onDownloadICS }) {
  const [localFilters, setLocalFilters] = useState({
    search: '',
    provider: '',
    country: '',
    location: '',
    rocket: '',
    status: ''
  });

  const handleInputChange = (key, value) => {
    // If changing country, clear location if it doesn't match the new country
    if (key === 'country') {
      const newFilters = { ...localFilters, [key]: value };
      // Clear location if it's set and doesn't belong to the new country
      if (localFilters.location && value) {
        const currentLocation = filterOptions.locations?.find(loc => loc.name === localFilters.location);
        if (currentLocation && currentLocation.countryCode !== value) {
          newFilters.location = '';
        }
      }
      setLocalFilters(newFilters);
    } else {
      setLocalFilters({ ...localFilters, [key]: value });
    }
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
  };

  const clearFilters = () => {
    const cleared = {
      search: '',
      provider: '',
      country: '',
      location: '',
      rocket: '',
      status: '',
      upcoming: true
    };
    setLocalFilters(cleared);
    onFilterChange(cleared);
  };

  const toggleUpcoming = (value) => {
    onFilterChange({ upcoming: value, past: !value });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </h2>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </button>
      </div>

      <div className="space-y-4">
        {/* Upcoming/Past Toggle */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Launch Time
          </label>
          <div className="flex space-x-2">
            <button
              onClick={() => toggleUpcoming(true)}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                filters.upcoming
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => toggleUpcoming(false)}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                filters.past
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Past
            </button>
          </div>
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            value={localFilters.search}
            onChange={(e) => handleInputChange('search', e.target.value)}
            placeholder="Search launches..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Provider */}
        {filterOptions.providers && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Provider
            </label>
            <select
              value={localFilters.provider}
              onChange={(e) => handleInputChange('provider', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Providers</option>
              {filterOptions.providers.slice(0, 20).map((provider) => (
                <option key={provider.name} value={provider.name}>
                  {provider.name} ({provider.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Country */}
        {filterOptions.countries && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Country
            </label>
            <select
              value={localFilters.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Countries</option>
              {filterOptions.countries.slice(0, 20).map((country) => (
                <option key={country.code} value={country.code}>
                  {country.code} ({country.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Location */}
        {filterOptions.locations && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Launch Location
            </label>
            <select
              value={localFilters.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Locations</option>
              {filterOptions.locations
                .filter(loc => !localFilters.country || loc.countryCode === localFilters.country)
                .slice(0, 30)
                .map((location) => (
                  <option key={location.name} value={location.name}>
                    {location.name} ({location.count})
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Status */}
        {filterOptions.statuses && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={localFilters.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {filterOptions.statuses.map((status) => (
                <option key={status.abbrev} value={status.abbrev}>
                  {status.name} ({status.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Apply Filters Button */}
        <button
          onClick={applyFilters}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Apply Filters
        </button>

        {/* Download ICS */}
        <button
          onClick={onDownloadICS}
          className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          <span>Download All (ICS)</span>
        </button>
      </div>
    </div>
  );
}
