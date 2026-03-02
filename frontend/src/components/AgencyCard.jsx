import { Link } from 'react-router-dom';
import {
  FaXTwitter,
  FaInstagram,
  FaFacebook,
  FaBluesky,
  FaYoutube,
  FaLinkedin,
  FaGlobe,
} from 'react-icons/fa6';

export const SOCIAL_ICONS = [
  { key: 'twitterX',  Icon: FaXTwitter,  label: 'X (Twitter)' },
  { key: 'instagram', Icon: FaInstagram, label: 'Instagram'    },
  { key: 'facebook',  Icon: FaFacebook,  label: 'Facebook'     },
  { key: 'bluesky',   Icon: FaBluesky,   label: 'Bluesky'      },
  { key: 'youtube',   Icon: FaYoutube,   label: 'YouTube'      },
  { key: 'linkedin',  Icon: FaLinkedin,  label: 'LinkedIn'     },
  { key: 'website',   Icon: FaGlobe,     label: 'Website'      },
];

export const STATUS_STYLES = {
  active:     'bg-green-100 text-green-800',
  government: 'bg-blue-100 text-blue-800',
  defunct:    'bg-gray-100 text-gray-600',
};

export const COUNTRY_FLAGS = {
  'USA':          '🇺🇸',
  'Russia':       '🇷🇺',
  'China':        '🇨🇳',
  'France':       '🇫🇷',
  'Germany':      '🇩🇪',
  'Japan':        '🇯🇵',
  'India':        '🇮🇳',
  'UK':           '🇬🇧',
  'Australia':    '🇦🇺',
  'Italy':        '🇮🇹',
  'Spain':        '🇪🇸',
  'Brazil':       '🇧🇷',
  'Israel':       '🇮🇱',
  'Iran':         '🇮🇷',
  'South Korea':  '🇰🇷',
  'North Korea':  '🇰🇵',
  'Taiwan':       '🇹🇼',
  'Canada':       '🇨🇦',
  'Europe':       '🇪🇺',
  'Multinational': '🌐',
};

export default function AgencyCard({ agency }) {
  const statusStyle = STATUS_STYLES[agency.status] || 'bg-gray-100 text-gray-600';
  const flag = COUNTRY_FLAGS[agency.country] || '';
  const socialLinks = SOCIAL_ICONS.filter(({ key }) => agency.socialLinks?.[key]);

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-5">
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
            {agency.status && (
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusStyle}`}>
                {agency.status}
              </span>
            )}
            {agency.country && (
              <span className="text-sm text-gray-500">{flag} {agency.country}</span>
            )}
          </div>
          <Link
            to={`/agencies/${agency.slug}`}
            className="text-lg font-bold text-gray-800 hover:text-blue-600 transition-colors leading-tight block"
          >
            {agency.name}
          </Link>
        </div>
        <span className="ml-3 px-2 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg flex-shrink-0 whitespace-nowrap">
          {agency.launchCount.toLocaleString()} launches
        </span>
      </div>

      {/* Description */}
      {agency.description && (
        <p className="text-sm text-gray-600 line-clamp-3 mb-3">{agency.description}</p>
      )}

      {/* Social links */}
      <div className="flex items-center space-x-1 pt-3 border-t border-gray-100">
        {socialLinks.length > 0 ? (
          socialLinks.map(({ key, Icon, label }) => (
            <a
              key={key}
              href={agency.socialLinks[key]}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title={label}
            >
              <Icon className="w-4 h-4" />
            </a>
          ))
        ) : (
          <span className="text-xs text-gray-400 italic">No social media</span>
        )}
      </div>
    </div>
  );
}
