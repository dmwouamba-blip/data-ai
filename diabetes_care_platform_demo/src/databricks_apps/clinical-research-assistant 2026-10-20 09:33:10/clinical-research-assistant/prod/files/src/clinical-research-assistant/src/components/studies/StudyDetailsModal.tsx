import React from 'react';
import { X, Calendar, Users, Building2, DollarSign, FileText, Target, AlertCircle, CheckCircle2, Clock, Pause } from 'lucide-react';
import { Study } from '../Studies';

interface StudyDetailsModalProps {
  study: Study;
  onClose: () => void;
}

const StudyDetailsModal: React.FC<StudyDetailsModalProps> = ({ study, onClose }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'Recruiting':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'Completed':
        return <CheckCircle2 className="w-5 h-5 text-gray-500" />;
      case 'Suspended':
        return <Pause className="w-5 h-5 text-red-500" />;
      case 'Planning':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(study.status)}
              <div>
                <h2 className="text-xl font-bold text-white">{study.title}</h2>
                <p className="text-blue-100">{study.protocol}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Status and Phase */}
          <div className="flex items-center space-x-4 mb-6">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(study.status)}`}>
              {study.status}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPhaseColor(study.phase)}`}>
              {study.phase}
            </span>
            <span className="text-sm text-gray-500">{study.therapeuticArea}</span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Enrollment</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-900">{study.enrollmentCurrent}</span>
                  <span className="text-sm text-blue-700">/ {study.enrollmentTarget}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(getEnrollmentProgress(study.enrollmentCurrent, study.enrollmentTarget), 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-blue-600">{getEnrollmentProgress(study.enrollmentCurrent, study.enrollmentTarget)}% Complete</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <Building2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Sites</span>
              </div>
              <span className="text-2xl font-bold text-green-900">{study.sites}</span>
              <p className="text-xs text-green-600">Active locations</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Compliance</span>
              </div>
              <span className="text-2xl font-bold text-purple-900">{study.complianceScore}%</span>
              <p className="text-xs text-purple-600">GCP Score</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Budget</span>
              </div>
              <span className="text-lg font-bold text-orange-900">{formatCurrency(study.budget)}</span>
              <p className="text-xs text-orange-600">Total allocation</p>
            </div>
          </div>

          {/* Study Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Users className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Principal Investigator</p>
                      <p className="text-sm text-gray-600">{study.principalInvestigator}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Sponsor</p>
                      <p className="text-sm text-gray-600">{study.sponsor}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Timeline</p>
                      <p className="text-sm text-gray-600">
                        {new Date(study.startDate).toLocaleDateString()} - {new Date(study.estimatedCompletion).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{study.description}</p>
              </div>

              {/* Objectives */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Objectives</h3>
                <ul className="space-y-2">
                  {study.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-600">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Endpoints */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Endpoints</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Primary Endpoints</h4>
                    <ul className="space-y-1">
                      {study.endpoints.primary.map((endpoint, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-gray-600">{endpoint}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Secondary Endpoints</h4>
                    <ul className="space-y-1">
                      {study.endpoints.secondary.map((endpoint, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-gray-600">{endpoint}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Inclusion Criteria */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Inclusion Criteria</h3>
                <ul className="space-y-2">
                  {study.inclusionCriteria.map((criteria, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Exclusion Criteria */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Exclusion Criteria</h3>
                <ul className="space-y-2">
                  {study.exclusionCriteria.map((criteria, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Last updated: {study.lastActivity}</span>
              <span>•</span>
              <span>Protocol: {study.protocol}</span>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Edit Study
              </button>
              <button className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyDetailsModal;