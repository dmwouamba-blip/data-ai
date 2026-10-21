import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

interface StudiesFiltersProps {
  onFilterChange: (filters: any) => void;
}

const StudiesFilters: React.FC<StudiesFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    phase: 'all',
    therapeuticArea: 'all',
    priority: 'all'
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      status: 'all',
      phase: 'all',
      therapeuticArea: 'all',
      priority: 'all'
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '' && value !== 'all');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              Active
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          )}
          
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {showAdvancedFilters ? 'Simple' : 'Advanced'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search studies, protocols, investigators..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Recruiting">Recruiting</option>
              <option value="Completed">Completed</option>
              <option value="Suspended">Suspended</option>
              <option value="Planning">Planning</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
            <select
              value={filters.phase}
              onChange={(e) => handleFilterChange('phase', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Phases</option>
              <option value="Phase I">Phase I</option>
              <option value="Phase II">Phase II</option>
              <option value="Phase III">Phase III</option>
              <option value="Phase IV">Phase IV</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Therapeutic Area</label>
            <select
              value={filters.therapeuticArea}
              onChange={(e) => handleFilterChange('therapeuticArea', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Areas</option>
              <option value="Oncology">Oncology</option>
              <option value="Cardiovascular">Cardiovascular</option>
              <option value="Neurology">Neurology</option>
              <option value="Infectious Disease">Infectious Disease</option>
              <option value="Respiratory">Respiratory</option>
              <option value="Endocrinology">Endocrinology</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Progress</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="all">All Progress</option>
                  <option value="ahead">Ahead of Schedule</option>
                  <option value="on-track">On Track</option>
                  <option value="behind">Behind Schedule</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compliance Score</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="all">All Scores</option>
                  <option value="excellent">Excellent (90-100%)</option>
                  <option value="good">Good (80-89%)</option>
                  <option value="fair">Fair (70-79%)</option>
                  <option value="poor">Poor (&lt;70%)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="all">All Budgets</option>
                  <option value="small">&lt; $2M</option>
                  <option value="medium">$2M - $5M</option>
                  <option value="large">&gt; $5M</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudiesFilters;