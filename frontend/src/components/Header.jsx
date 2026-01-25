import { Rocket } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center space-x-3">
          <Rocket className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Rocket Launch Tracker</h1>
        </div>
        <p className="mt-2 text-blue-100">Track rocket launches from around the world</p>
      </div>
    </header>
  );
}
