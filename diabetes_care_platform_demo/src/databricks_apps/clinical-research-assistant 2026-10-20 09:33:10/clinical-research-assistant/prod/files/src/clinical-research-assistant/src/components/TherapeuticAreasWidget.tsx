import React from 'react';
import { Activity, TrendingUp, FileText, Calendar } from 'lucide-react';

const TherapeuticAreasWidget = () => {
  const therapeuticAreas = [
    { name: 'Oncology', studies: 8, phases: ['Phase I', 'Phase II', 'Phase III'], activeSubjects: 1247, color: 'bg-red-500' },
    { name: 'Cardiovascular', studies: 5, phases: ['Phase II', 'Phase III'], activeSubjects: 892, color: 'bg-blue-500' },
    { name: 'Neurology', studies: 4, phases: ['Phase I', 'Phase II'], activeSubjects: 634, color: 'bg-purple-500' },
    { name: 'Infectious Disease', studies: 6, phases: ['Phase II', 'Phase III'], activeSubjects: 1074, color: 'bg-green-500' },
    { name: 'Respiratory', studies: 3, phases: ['Phase I', 'Phase III'], activeSubjects: 456, color: 'bg-orange-500' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Therapeutic Areas Overview</h3>
            <p className="text-sm text-gray-500">Active studies across all therapeutic areas</p>
          </div>
        </div>
        <TrendingUp className="w-5 h-5 text-green-500" />
      </div>

      <div className="space-y-4">
        {therapeuticAreas.map((area, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${area.color}`}></div>
                <h4 className="font-medium text-gray-900">{area.name}</h4>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <FileText className="w-4 h-4" />
                  <span>{area.studies} studies</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{area.activeSubjects} subjects</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Phases:</span>
              {area.phases.map((phase, phaseIndex) => (
                <span key={phaseIndex} className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  {phase}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TherapeuticAreasWidget;