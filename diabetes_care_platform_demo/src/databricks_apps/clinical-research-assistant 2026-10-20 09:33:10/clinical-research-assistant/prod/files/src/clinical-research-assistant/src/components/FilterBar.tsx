import React from 'react';
import { Filter, MapPin, Building2 } from 'lucide-react';

const FilterBar = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700">Filters</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <select className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">All Sites</option>
                <option value="site1">Johns Hopkins Medical Center</option>
                <option value="site2">Mayo Clinic Rochester</option>
                <option value="site3">Cleveland Clinic</option>
                <option value="site4">UCLA Medical Center</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <select className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">All Regions</option>
                <option value="north-america">North America</option>
                <option value="europe">Europe</option>
                <option value="asia-pacific">Asia Pacific</option>
                <option value="latin-america">Latin America</option>
              </select>
            </div>
          </div>
        </div>
        
        <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default FilterBar;