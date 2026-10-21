import React, { useState } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Studies from './components/Studies';
import StudyDataDomains from './components/StudyDataDomains';
import Subjects from './components/Subjects';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'studies':
        return <Studies />;
      case 'domains':
        return <StudyDataDomains />;
      case 'subjects':
        return <Subjects />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        {renderContent()}
      </div>
    </div>
  );
}

export default App;