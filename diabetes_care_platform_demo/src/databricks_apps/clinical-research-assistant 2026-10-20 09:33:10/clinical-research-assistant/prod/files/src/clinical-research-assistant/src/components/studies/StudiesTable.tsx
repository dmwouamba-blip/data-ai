import React, { useState } from 'react';
import { Eye, Edit, MoreHorizontal, Calendar, Users, Building2, DollarSign, AlertCircle, CheckCircle2, Clock, Pause } from 'lucide-react';
import { Study } from '../Studies';

interface StudiesTableProps {
  studies: Study[];
  onStudySelect: (study: Study) => void;
}

const StudiesTable: React.FC<StudiesTableProps> = ({ studies, onStudySelect }) => {
  const [sortField, setSortField] = useState<keyof Study>('lastActivity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Study) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedStudies = [...studies].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'Recruiting':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'Completed':
        return <CheckCircle2 className="w-4 h-4 text-gray-500" />;
      case 'Suspended':
        return <Pause className="w-4 h-4 text-red-500" />;
      case 'Planning':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Recruiting':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-gray-100 text-gray-800';
      case 'Suspended':
        return 'bg-red-100 text-red-800';
      case 'Planning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Phase I':
        return 'bg-blue-100 text-blue-800';
      case 'Phase II':
        return 'bg-green-100 text-green-800';
      case 'Phase III':
        return 'bg-purple-100 text-purple-800';
      case 'Phase IV':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getEnrollmentProgress = (current: number, target: number) => {
    return Math.round((current / target) * 100);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Study Details
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status & Phase
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enrollment
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timeline
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compliance
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Budget
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStudies.map((study) => (
              <tr key={study.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {study.title}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(study.priority)}`}>
                          {study.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{study.protocol}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{study.principalInvestigator}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Building2 className="w-3 h-3" />
                          <span>{study.sites} sites</span>
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{study.therapeuticArea}</p>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(study.status)}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(study.status)}`}>
                        {study.status}
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPhaseColor(study.phase)}`}>
                      {study.phase}
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-900 font-medium">
                        {study.enrollmentCurrent}/{study.enrollmentTarget}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getEnrollmentProgress(study.enrollmentCurrent, study.enrollmentTarget)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(getEnrollmentProgress(study.enrollmentCurrent, study.enrollmentTarget), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>Started: {new Date(study.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>Est. End: {new Date(study.estimatedCompletion).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-400">Last activity: {study.lastActivity}</p>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{study.complianceScore}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            study.complianceScore >= 90 ? 'bg-green-500' :
                            study.complianceScore >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${study.complianceScore}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-1 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {formatCurrency(study.budget)}
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onStudySelect(study)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="More Options">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {studies.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No studies found</h3>
          <p className="text-gray-500">Try adjusting your filters or search criteria.</p>
        </div>
      )}
    </div>
  );
};

export default StudiesTable;