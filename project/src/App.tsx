import React, { useState } from 'react';
import Navigation from './components/Navigation';
import WelcomePage from './components/WelcomePage';
import DebrisSimulation from './components/DebrisSimulation';
import MLAnalysis from './components/MLAnalysis';

type Page = 'welcome' | 'debris' | 'ml';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('welcome');

  const renderPage = () => {
    switch (currentPage) {
      case 'welcome':
        return <WelcomePage onNavigate={setCurrentPage} />;
      case 'debris':
        return <DebrisSimulation />;
      case 'ml':
        return <MLAnalysis />;
      default:
        return <WelcomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {currentPage !== 'welcome' && (
        <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      )}
      {renderPage()}
    </div>
  );
}

export default App;