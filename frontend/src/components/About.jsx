import { X, ExternalLink, Rocket, Code, Database } from 'lucide-react';

export default function About({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Rocket className="w-8 h-8" />
              <h2 className="text-2xl font-bold">About Rocket Launch Tracker</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <p className="text-gray-700 leading-relaxed">
              A web application to track rocket launches worldwide, featuring over 7,700 historical and upcoming launches with search, filter, and calendar export capabilities.
            </p>
          </div>

          {/* Credits Section */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Code className="w-5 h-5 mr-2" />
              Credits
            </h3>

            <div className="space-y-4">
              {/* Developer */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-1">Developer</h4>
                <p className="text-gray-700">David Kinsfather</p>
              </div>

              {/* AI Assistant */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-1">AI Development Assistant</h4>
                <a
                  href="https://claude.ai/code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  Claude Code by Anthropic
                  <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            </div>
          </div>

          {/* Data Sources */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Data Sources
            </h3>

            <div className="space-y-4">
              {/* Launch Library 2 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Launch Library 2 API</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Primary launch data source with comprehensive information on rocket launches worldwide.
                </p>
                <div className="flex flex-col space-y-1 text-sm">
                  <a
                    href="https://thespacedevs.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    TheSpaceDevs
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                  <a
                    href="https://ll.thespacedevs.com/2.2.0/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    API Documentation
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>

              {/* SpaceX API */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">SpaceX API</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Community-maintained API providing detailed payload data for SpaceX missions.
                </p>
                <a
                  href="https://github.com/r-spacex/SpaceX-API"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                >
                  GitHub Repository
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Technology Stack</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <h4 className="font-semibold text-gray-700 mb-1">Frontend</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• React + Vite</li>
                  <li>• Tailwind CSS</li>
                  <li>• Tanstack Query</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-1">Backend</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Node.js + Express</li>
                  <li>• SQLite (bun:sqlite)</li>
                  <li>• Bun Runtime</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Built with data from TheSpaceDevs and the SpaceX community
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
