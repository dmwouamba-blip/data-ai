import React from 'react';
import FilterBar from './FilterBar';
import MetricsCards from './MetricsCards';
import TherapeuticAreasWidget from './TherapeuticAreasWidget';
import ComplianceWidget from './ComplianceWidget';
import EnrollmentWidget from './EnrollmentWidget';
import StudyPhaseWidget from './StudyPhaseWidget';
import RecentActivitiesWidget from './RecentActivitiesWidget';

const Dashboard = () => {
  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
          <p className="text-gray-600">Monitor clinical research activities and performance metrics</p>
        </div>
        
        <FilterBar />
        <MetricsCards />
        
        {/* First Row: Therapeutic Areas and Study Phase Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <TherapeuticAreasWidget />
          <StudyPhaseWidget />
        </div>
        
        {/* Second Row: Compliance Status and Enrollment Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ComplianceWidget />
          <EnrollmentWidget />
        </div>
        
        {/* Third Row: Recent Activities spanning full width */}
        <div className="w-full">
          <RecentActivitiesWidget />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;