import React from 'react';
import { Shield, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const ComplianceWidget = () => {
  const complianceData = [
    { site: 'Johns Hopkins', status: 'Compliant', score: 98, issues: 0, color: 'text-green-600', bgColor: 'bg-green-50' },
    { site: 'Mayo Clinic', status: 'Minor Issues', score: 87, issues: 3, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { site: 'Cleveland Clinic', status: 'Compliant', score: 95, issues: 1, color: 'text-green-600', bgColor: 'bg-green-50' },
    { site: 'UCLA Medical', status: 'Action Required', score: 72, issues: 8, color: 'text-red-600', bgColor: 'bg-red-50' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Compliant':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'Minor Issues':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'Action Required':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Compliance Status</h3>
            <p className="text-sm text-gray-500">GCP compliance across sites</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Score</span>
          <span className="text-2xl font-bold text-green-600">88%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{ width: '88%' }}></div>
        </div>
      </div>

      <div className="space-y-3">
        {complianceData.map((site, index) => (
          <div key={index} className={`${site.bgColor} rounded-lg p-3 border border-gray-100`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(site.status)}
                <span className="font-medium text-gray-900 text-sm">{site.site}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-gray-900">{site.score}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span className={`font-medium ${site.color}`}>{site.status}</span>
              <span>{site.issues} issues</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
              <div 
                className={`h-1 rounded-full ${site.score >= 90 ? 'bg-green-500' : site.score >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${site.score}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComplianceWidget;