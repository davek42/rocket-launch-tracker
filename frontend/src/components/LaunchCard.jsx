import { format, formatDistanceToNow, isFuture } from 'date-fns';
import { Calendar, MapPin, Rocket, Download, Package, Globe2 } from 'lucide-react';
import {
  FaXTwitter,
  FaInstagram,
  FaFacebook,
  FaBluesky,
  FaYoutube,
  FaLinkedin,
  FaGlobe,
} from 'react-icons/fa6';
import { getICSDownloadUrl } from '../utils/api';

const SOCIAL_ICONS = [
  { key: 'twitterX',  Icon: FaXTwitter,  label: 'X (Twitter)' },
  { key: 'instagram', Icon: FaInstagram, label: 'Instagram'    },
  { key: 'facebook',  Icon: FaFacebook,  label: 'Facebook'     },
  { key: 'bluesky',   Icon: FaBluesky,   label: 'Bluesky'      },
  { key: 'youtube',   Icon: FaYoutube,   label: 'YouTube'      },
  { key: 'linkedin',  Icon: FaLinkedin,  label: 'LinkedIn'     },
  { key: 'website',   Icon: FaGlobe,     label: 'Website'      },
];

function ProviderSocialLinks({ socialLinks }) {
  if (!socialLinks) {
    return <span className="text-xs text-gray-400 italic">No social media</span>;
  }

  const links = SOCIAL_ICONS.filter(({ key }) => socialLinks[key]);

  if (links.length === 0) {
    return <span className="text-xs text-gray-400 italic">No social media</span>;
  }

  return (
    <div className="flex items-center space-x-1">
      {links.map(({ key, Icon, label }) => (
        <a
          key={key}
          href={socialLinks[key]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title={label}
        >
          <Icon className="w-4 h-4" />
        </a>
      ))}
    </div>
  );
}

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
        <div className="flex items-center justify-between text-gray-600">
          <div className="flex items-center">
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
          <button
            onClick={handleDownloadICS}
            className="ml-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
            title="Add to Calendar"
          >
            <Download className="w-4 h-4" />
          </button>
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
          {launch.pad.latitude && launch.pad.longitude ? (
            <a
              href={`https://www.google.com/maps?q=${launch.pad.latitude},${launch.pad.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-sm text-blue-600 hover:underline"
            >
              {launch.location.name}
            </a>
          ) : (
            <p className="text-sm">{launch.location.name}</p>
          )}
        </div>

        {(launch.spacecraft?.name || launch.spacecraft?.payloadTotalMassKg) && (
          <div className="flex items-center text-gray-600">
            <Package className="w-5 h-5 mr-2 flex-shrink-0" />
            <div>
              {launch.spacecraft.name && (
                <p className="font-semibold text-sm">{launch.spacecraft.name}</p>
              )}
              {launch.spacecraft.destination && (
                <p className="text-xs text-gray-500">→ {launch.spacecraft.destination}</p>
              )}
              {launch.spacecraft.payloadTotalMassKg && (
                <p className="text-xs text-gray-500">
                  Payload{launch.spacecraft.name ? ' Capacity' : ''}: {launch.spacecraft.payloadTotalMassKg.toLocaleString()} kg
                </p>
              )}
            </div>
          </div>
        )}

        {launch.mission?.description && (
          <p className="text-sm text-gray-600 mt-4 line-clamp-2">
            {launch.mission.description}
          </p>
        )}

        <div className="flex items-center space-x-1 pt-3 border-t border-gray-100">
          <Globe2 className="w-4 h-4 text-gray-400 mr-1 flex-shrink-0" />
          <ProviderSocialLinks socialLinks={launch.provider?.socialLinks} />
        </div>
      </div>
    </div>
  );
}
