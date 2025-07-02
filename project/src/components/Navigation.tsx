import React from 'react';
import { Satellite, Home, Brain, ChevronLeft } from 'lucide-react';

type Page = 'welcome' | 'debris' | 'ml';

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate }) => {
  const navItems = [
    { id: 'welcome' as Page, label: 'Home', icon: Home },
    { id: 'debris' as Page, label: 'Debris Simulation', icon: Satellite },
    { id: 'ml' as Page, label: 'ML Analysis', icon: Brain },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <Satellite className="w-8 h-8 text-blue-400" />
              <span className="text-white font-bold text-xl">SpaceDebris</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    currentPage === id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('welcome')}
            className="md:hidden flex items-center space-x-2 text-gray-300 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden bg-black/30 backdrop-blur-sm border-t border-white/10">
        <div className="px-4 py-3 space-y-2">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                currentPage === id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;