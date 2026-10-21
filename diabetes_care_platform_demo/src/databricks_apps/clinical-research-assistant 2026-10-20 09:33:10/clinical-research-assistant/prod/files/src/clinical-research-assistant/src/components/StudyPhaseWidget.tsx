import React from 'react';
import { BarChart3, TrendingUp, FileText, Clock } from 'lucide-react';

const StudyPhaseWidget = () => {
  const phaseData = [
    { phase: 'Phase I', count: 8, percentage: 31, color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    { phase: 'Phase II', count: 12, percentage: 46, color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
    { phase: 'Phase III', count: 5, percentage: 19, color: 'bg-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
    { phase: 'Phase IV', count: 1, percentage: 4, color: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  ];

  const totalStudies = phaseData.reduce((sum, phase) => sum + phase.count, 0);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Study Distribution by Phase</h3>
            <p className="text-sm text-gray-500">Clinical trial phases across all studies</p>
          </div>
        </div>
        <TrendingUp className="w-5 h-5 text-indigo-500" />
      </div>

      {/* Circular Progress Visualization */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="35"
              stroke="#f3f4f6"
              strokeWidth="10"
              fill="none"
            />
            
            {/* Phase segments */}
            {phaseData.map((phase, index) => {
              const previousPercentages = phaseData.slice(0, index).reduce((sum, p) => sum + p.percentage, 0);
              const circumference = 2 * Math.PI * 35;
              const strokeDasharray = `${(phase.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((previousPercentages / 100) * circumference);
              
              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="35"
                  stroke={phase.color.replace('bg-', '#')}
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-in-out"
                  style={{
                    stroke: phase.phase === 'Phase I' ? '#3b82f6' :
                            phase.phase === 'Phase II' ? '#10b981' :
                            phase.phase === 'Phase III' ? '#8b5cf6' : '#f59e0b'
                  }}
                />
              );
            })}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{totalStudies}</div>
              <div className="text-xs text-gray-500">Studies</div>
            </div>
          </div>
        </div>
      </div>

      {/* Phase breakdown */}
      <div className="space-y-3">
        {phaseData.map((phase, index) => (
          <div key={index} className={`${phase.bgColor} rounded-lg p-3 border border-gray-100`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${phase.color}`}></div>
                <span className="font-medium text-gray-900 text-sm">{phase.phase}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${phase.textColor}`}>{phase.percentage}%</span>
                <span className="text-lg font-bold text-gray-900">{phase.count}</span>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${phase.color} transition-all duration-1000 ease-out`}
                style={{ width: `${phase.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center space-x-1 mb-1">
            <Clock className="w-3 h-3 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">Avg. Duration</span>
          </div>
          <span className="text-lg font-bold text-gray-900">18.4mo</span>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 border border-indigo-200">
          <div className="flex items-center space-x-1 mb-1">
            <TrendingUp className="w-3 h-3 text-indigo-600" />
            <span className="text-xs font-medium text-indigo-700">Success Rate</span>
          </div>
          <span className="text-lg font-bold text-indigo-900">87%</span>
        </div>
      </div>
    </div>
  );
};

export default StudyPhaseWidget;