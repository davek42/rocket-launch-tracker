import { Link, useLocation } from 'react-router-dom';
import { Rocket, Info, BarChart3, FileText, Building2 } from 'lucide-react';

export default function Header({ onAboutClick, onStatsClick, onDocsClick, onHomeClick, currentView }) {
  const location = useLocation();
  const isOnAgencies = location.pathname.startsWith('/agencies');
  const isHome = location.pathname === '/';

  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/"
              onClick={onHomeClick}
              className="flex items-center space-x-3 hover:opacity-90 transition-opacity"
            >
              <Rocket className="w-8 h-8" />
              <h1 className="text-3xl font-bold">World Rocket Launch</h1>
            </Link>
            <p className="mt-2 text-blue-100">Rocket launches from around the world</p>
          </div>
          <div className="flex items-center space-x-2">
            {isHome && (
              <>
                <button
                  onClick={onStatsClick}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    currentView === 'stats'
                      ? 'bg-white bg-opacity-30'
                      : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="hidden sm:inline">Stats</span>
                </button>
                <button
                  onClick={onDocsClick}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    currentView === 'docs'
                      ? 'bg-white bg-opacity-30'
                      : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="hidden sm:inline">Docs</span>
                </button>
              </>
            )}
            <Link
              to="/agencies"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isOnAgencies
                  ? 'bg-white bg-opacity-30'
                  : 'bg-white bg-opacity-20 hover:bg-opacity-30'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span className="hidden sm:inline">Agencies</span>
            </Link>
            {onAboutClick && (
              <button
                onClick={onAboutClick}
                className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
              >
                <Info className="w-5 h-5" />
                <span className="hidden sm:inline">About</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
