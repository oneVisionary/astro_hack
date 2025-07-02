import React from 'react';
import { Satellite, Brain, Globe, ArrowRight, Orbit } from 'lucide-react';

type Page = 'welcome' | 'debris' | 'ml';

interface WelcomePageProps {
  onNavigate: (page: Page) => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onNavigate }) => {
  const features = [
    {
      id: 'debris' as Page,
      title: 'Real-Time Debris Simulation',
      description: 'Visualize live COSMOS 2251 debris using real TLE data from NORAD. Watch orbital mechanics in action with interactive trails and satellite information.',
      icon: Satellite,
      color: 'from-blue-500 to-cyan-500',
      stats: '10+ Objects Tracked'
    },
    {
      id: 'ml' as Page,
      title: 'ML Orbital Analysis',
      description: 'Advanced machine learning algorithms analyze orbital patterns, predict collision risks, and optimize cleanup missions with 10-year projections.',
      icon: Brain,
      color: 'from-purple-500 to-pink-500',
      stats: 'AI-Powered Insights'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mb-6">
              <Orbit className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Space Debris
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Visualization
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Explore real-time orbital debris and analyze space sustainability 
              with cutting-edge visualization and machine learning technology.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
            {features.map(({ id, title, description, icon: Icon, color, stats }) => (
              <div
                key={id}
                className="group cursor-pointer"
                onClick={() => onNavigate(id)}
              >
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r ${color} mb-6`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">{description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-400 font-medium">{stats}</span>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Start */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <div className="flex items-center justify-center mb-4">
              <Globe className="w-8 h-8 text-blue-400 mr-3" />
              <h2 className="text-2xl font-bold text-white">Ready to Explore?</h2>
            </div>
            <p className="text-gray-300 mb-6">
              Start with our real-time debris simulation to see live orbital data in action
            </p>
            <button
              onClick={() => onNavigate('debris')}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Satellite className="w-5 h-5 mr-2" />
              Launch Simulation
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-400 border-t border-white/10">
        <p>&copy; 2025 Space Debris Visualization. Educational project powered by real NORAD TLE data.</p>
      </footer>
    </div>
  );
};

export default WelcomePage;