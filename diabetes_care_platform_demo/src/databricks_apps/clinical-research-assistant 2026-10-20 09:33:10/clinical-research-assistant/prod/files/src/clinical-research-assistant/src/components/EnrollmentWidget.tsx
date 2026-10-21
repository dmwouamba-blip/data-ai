import React from 'react';
import { Users, Target, TrendingUp, Calendar } from 'lucide-react';

const EnrollmentWidget = () => {
  const enrollmentData = [
    { study: 'ONCOLOGY-001', target: 150, current: 127, percentage: 85, timeline: 'On Track', color: 'bg-green-500' },
    { study: 'CARDIO-003', target: 200, current: 145, percentage: 73, timeline: 'Delayed', color: 'bg-yellow-500' },
    { study: 'NEURO-002', target: 80, current: 92, percentage: 115, timeline: 'Ahead', color: 'bg-blue-500' },
    { study: 'INFECT-004', target: 120, current: 89, percentage: 74, timeline: 'Behind', color: 'bg-red-500' },
  ];

  const getTimelineColor = (timeline: string) => {
    switch (timeline) {
      case 'On Track':
        return 'text-green-600 bg-green-50';
      case 'Ahead':
        return 'text-blue-600 bg-blue-50';
      case 'Delayed':
        return 'text-yellow-600 bg-yellow-50';
      case 'Behind':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Enrollment Progress</h3>
            <p className="text-sm text-gray-500">Subject enrollment status</p>
          </div>
        </div>
        <TrendingUp className="w-5 h-5 text-purple-500" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center space-x-1 mb-1">
            <Target className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Target</span>
          </div>
          <span className="text-xl font-bold text-blue-900">550</span>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
          <div className="flex items-center space-x-1 mb-1">
            <Users className="w-3 h-3 text-green-600" />
            <span className="text-xs font-medium text-green-700">Enrolled</span>
          </div>
          <span className="text-xl font-bold text-green-900">453</span>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
          <div className="flex items-center space-x-1 mb-1">
            <Calendar className="w-3 h-3 text-purple-600" />
            <span className="text-xs font-medium text-purple-700">Rate</span>
          </div>
          <span className="text-xl font-bold text-purple-900">82%</span>
        </div>
      </div>

      <div className="space-y-3">
        {enrollmentData.map((study, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${study.color}`}></div>
                <span className="font-medium text-gray-900 text-sm">{study.study}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTimelineColor(study.timeline)}`}>
                  {study.timeline}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">{study.current}/{study.target}</span>
              <span className="text-xs font-medium text-gray-900">{study.percentage}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${study.color}`}
                style={{ width: `${Math.min(study.percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnrollmentWidget;