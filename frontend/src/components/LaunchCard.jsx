import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import { Calendar, MapPin, Rocket, Download } from 'lucide-react';
import { getICSDownloadUrl } from '../utils/api';

export default function LaunchCard({ launch }) {
  const launchDate = new Date(launch.net);
  const isUpcoming = isFuture(launchDate);

  const getStatusColor = (status) => {
    const colors = {
      'Go': 'bg-green-100 text-green-800',
      'TBD': 'bg-yellow-100 text-yellow-800',
      'Success': 'bg-blue-100 text-blue-800',
      'Failure': 'bg-red-100 text-red-800',
      'Hold': 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleDownloadICS = (e) => {
    e.stopPropagation();
    window.location.href = getICSDownloadUrl(launch.id);
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${getStatusColor(launch.status.abbrev)}`}>
            {launch.status.name}
          </span>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{launch.name}</h3>
        </div>
        {launch.imageUrl && (
          <img
            src={launch.imageUrl}
            alt={launch.name}
            className="w-24 h-24 object-cover rounded-lg ml-4"
          />
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center text-gray-600">
          <Calendar className="w-5 h-5 mr-2 flex-shrink-0" />
          <div>
            <p className="font-semibold">{format(launchDate, 'PPP p')}</p>
            {isUpcoming && (
              <p className="text-sm text-blue-600">
                T-{formatDistanceToNow(launchDate)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center text-gray-600">
          <Rocket className="w-5 h-5 mr-2 flex-shrink-0" />
          <div>
            <p className="font-semibold">{launch.provider.name}</p>
            <p className="text-sm">{launch.rocket.name}</p>
          </div>
        </div>

        <div className="flex items-center text-gray-600">
          <MapPin className="w-5 h-5 mr-2 flex-shrink-0" />
          <p className="text-sm">{launch.location.name}</p>
        </div>

        {launch.mission?.description && (
          <p className="text-sm text-gray-600 mt-4 line-clamp-2">
            {launch.mission.description}
          </p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={handleDownloadICS}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Add to Calendar</span>
        </button>
      </div>
    </div>
  );
}
