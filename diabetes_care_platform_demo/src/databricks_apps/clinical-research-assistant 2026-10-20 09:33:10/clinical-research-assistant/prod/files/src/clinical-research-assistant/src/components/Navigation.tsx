import React from 'react';
import { BarChart3, FileText, Database, Users, Home } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'studies', label: 'Studies', icon: FileText },
    { id: 'domains', label: 'Study Data Domains', icon: Database },
    { id: 'subjects', label: 'Subjects', icon: Users },
  ];

  return (
    <nav className="bg-white border-r border-gray-200 w-64 min-h-screen pt-6">
      <div className="px-4">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="mt-8 px-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">Quick Stats</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Active Studies</span>
              <span className="font-semibold text-blue-900">12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Total Subjects</span>
              <span className="font-semibold text-blue-900">3,847</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;