import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MapPin, Rocket, Building2 } from 'lucide-react';
import { fetchAgencyBySlug } from '../utils/api';
import Header from './Header';
import { SOCIAL_ICONS, STATUS_STYLES, COUNTRY_FLAGS } from './AgencyCard';

export default function AgencyDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['agency', slug],
    queryFn: () => fetchAgencyBySlug(slug)
  });

  const agency = data?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header onHomeClick={() => navigate('/')} />
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Loading agency...</span>
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header onHomeClick={() => navigate('/')} />
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Agency not found</h3>
          <Link to="/agencies" className="text-blue-600 hover:underline">← Back to Agencies</Link>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[agency.status] || 'bg-gray-100 text-gray-600';
  const flag = COUNTRY_FLAGS[agency.country] || '';
  const socialLinks = SOCIAL_ICONS.filter(({ key }) => agency.socialLinks?.[key]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header onHomeClick={() => navigate('/')} />

      <main className="container mx-auto px-4 py-8">
        <div id={slug} className="max-w-3xl mx-auto">
          {/* Back button */}
          <Link
            to="/agencies"
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Agencies</span>
          </Link>

          {/* Main agency card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            {/* Status + country badges */}
            <div className="flex items-center space-x-2 mb-3 flex-wrap gap-y-2">
              {agency.status && (
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${statusStyle}`}>
                  {agency.status}
                </span>
              )}
              {agency.country && (
                <span className="text-base text-gray-600">{flag} {agency.country}</span>
              )}
              <span className="ml-auto px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg">
                {agency.launchCount.toLocaleString()} total launches
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-4">{agency.name}</h1>

            {agency.description && (
              <p className="text-gray-600 mb-5 leading-relaxed">{agency.description}</p>
            )}

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                {socialLinks.map(({ key, Icon, label }) => (
                  <a
                    key={key}
                    href={agency.socialLinks[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors text-sm"
                    title={label}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Launch locations */}
          {agency.locations?.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>Launch Locations</span>
              </h2>
              <ul className="space-y-2">
                {agency.locations.map(loc => (
                  <li key={loc} className="flex items-center space-x-2 text-gray-700">
                    <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                    <span>{loc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Link to launches */}
          <Link
            to={`/?provider=${encodeURIComponent(agency.name)}&upcoming=false`}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <Rocket className="w-5 h-5" />
            <span>View all launches from {agency.name}</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
