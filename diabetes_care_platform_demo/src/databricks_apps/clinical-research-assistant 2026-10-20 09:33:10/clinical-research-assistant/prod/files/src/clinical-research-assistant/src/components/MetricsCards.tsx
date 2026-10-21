import React from 'react';
import { FileText, Users, Building2, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

const MetricsCards = () => {
  const metrics = [
    {
      title: 'Total Studies',
      value: '26',
      change: '+3',
      changeType: 'increase',
      icon: FileText,
      description: 'Active clinical studies',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Active Subjects',
      value: '3,847',
      change: '+247',
      changeType: 'increase',
      icon: Users,
      description: 'Enrolled participants',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Research Sites',
      value: '18',
      change: '+2',
      changeType: 'increase',
      icon: Building2,
      description: 'Active clinical sites',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Avg. Study Duration',
      value: '14.2',
      change: '-0.8',
      changeType: 'decrease',
      icon: Calendar,
      description: 'Months per study',
      color: 'from-orange-500 to-orange-600'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${metric.color} rounded-lg flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                metric.changeType === 'increase' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {metric.changeType === 'increase' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{metric.change}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">{metric.value}</h3>
              <p className="text-sm font-medium text-gray-700">{metric.title}</p>
              <p className="text-xs text-gray-500">{metric.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MetricsCards;