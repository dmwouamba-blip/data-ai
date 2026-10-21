import React, { useState } from 'react';
import { Database, AlertTriangle, FileText, BarChart3, Eye, Download, Filter, Search, Calendar, Users, Activity, Shield, TrendingUp, CheckCircle2, XCircle, Clock, AlertCircle, Plus } from 'lucide-react';

interface AdverseEvent {
  id: string;
  studyId: string;
  subjectId: string;
  eventTerm: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  seriousness: 'SAE' | 'Non-SAE';
  relationship: 'Related' | 'Possibly Related' | 'Unrelated';
  outcome: 'Recovered' | 'Recovering' | 'Not Recovered' | 'Fatal' | 'Unknown';
  startDate: string;
  endDate?: string;
  reportedDate: string;
  site: string;
  investigator: string;
}

interface DataDomain {
  domain: string;
  description: string;
  recordCount: number;
  lastUpdated: string;
  status: 'Complete' | 'Incomplete' | 'Under Review' | 'Locked';
  issues: number;
  completeness: number;
}

interface TFL {
  id: string;
  type: 'Table' | 'Figure' | 'Listing';
  title: string;
  category: string;
  status: 'Draft' | 'Under Review' | 'Approved' | 'Final';
  lastModified: string;
  reviewer: string;
  pages: number;
}

const StudyDataDomains = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStudy, setSelectedStudy] = useState('ONCO-2024-001');

  // Sample data
  const adverseEvents: AdverseEvent[] = [
    {
      id: 'AE001',
      studyId: 'ONCO-2024-001',
      subjectId: 'ONCO-001-001',
      eventTerm: 'Neutropenia',
      severity: 'Severe',
      seriousness: 'SAE',
      relationship: 'Related',
      outcome: 'Recovered',
      startDate: '2024-01-15',
      endDate: '2024-01-22',
      reportedDate: '2024-01-16',
      site: 'Johns Hopkins',
      investigator: 'Dr. Sarah Chen'
    },
    {
      id: 'AE002',
      studyId: 'ONCO-2024-001',
      subjectId: 'ONCO-001-003',
      eventTerm: 'Fatigue',
      severity: 'Moderate',
      seriousness: 'Non-SAE',
      relationship: 'Possibly Related',
      outcome: 'Recovered',
      startDate: '2024-01-18',
      endDate: '2024-01-25',
      reportedDate: '2024-01-19',
      site: 'Mayo Clinic',
      investigator: 'Dr. Rodriguez'
    },
    {
      id: 'AE003',
      studyId: 'ONCO-2024-001',
      subjectId: 'ONCO-001-007',
      eventTerm: 'Thrombocytopenia',
      severity: 'Severe',
      seriousness: 'SAE',
      relationship: 'Related',
      outcome: 'Recovering',
      startDate: '2024-01-20',
      reportedDate: '2024-01-21',
      site: 'Cleveland Clinic',
      investigator: 'Dr. Kim'
    }
  ];

  const dataDomains: DataDomain[] = [
    { domain: 'DM', description: 'Demographics', recordCount: 127, lastUpdated: '2024-01-25', status: 'Complete', issues: 0, completeness: 100 },
    { domain: 'AE', description: 'Adverse Events', recordCount: 89, lastUpdated: '2024-01-25', status: 'Under Review', issues: 3, completeness: 95 },
    { domain: 'CM', description: 'Concomitant Medications', recordCount: 234, lastUpdated: '2024-01-24', status: 'Complete', issues: 1, completeness: 98 },
    { domain: 'VS', description: 'Vital Signs', recordCount: 1456, lastUpdated: '2024-01-25', status: 'Complete', issues: 0, completeness: 100 },
    { domain: 'LB', description: 'Laboratory Data', recordCount: 2341, lastUpdated: '2024-01-25', status: 'Incomplete', issues: 12, completeness: 87 },
    { domain: 'EX', description: 'Exposure', recordCount: 127, lastUpdated: '2024-01-23', status: 'Locked', issues: 0, completeness: 100 },
    { domain: 'MH', description: 'Medical History', recordCount: 156, lastUpdated: '2024-01-22', status: 'Complete', issues: 2, completeness: 96 },
    { domain: 'DS', description: 'Disposition', recordCount: 127, lastUpdated: '2024-01-25', status: 'Complete', issues: 0, completeness: 100 }
  ];

  const tfls: TFL[] = [
    { id: 'T001', type: 'Table', title: 'Demographics and Baseline Characteristics', category: 'Demographics', status: 'Final', lastModified: '2024-01-20', reviewer: 'Dr. Chen', pages: 2 },
    { id: 'T002', type: 'Table', title: 'Adverse Events Summary', category: 'Safety', status: 'Under Review', lastModified: '2024-01-25', reviewer: 'Dr. Rodriguez', pages: 4 },
    { id: 'F001', type: 'Figure', title: 'Kaplan-Meier Survival Curve', category: 'Efficacy', status: 'Approved', lastModified: '2024-01-22', reviewer: 'Dr. Kim', pages: 1 },
    { id: 'L001', type: 'Listing', title: 'Subject Disposition', category: 'Disposition', status: 'Draft', lastModified: '2024-01-24', reviewer: 'Dr. Patel', pages: 8 },
    { id: 'T003', type: 'Table', title: 'Laboratory Values by Visit', category: 'Laboratory', status: 'Final', lastModified: '2024-01-21', reviewer: 'Dr. Wilson', pages: 6 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
      case 'Final':
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Under Review':
        return 'bg-yellow-100 text-yellow-800';
      case 'Incomplete':
      case 'Draft':
        return 'bg-red-100 text-red-800';
      case 'Locked':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Mild':
        return 'bg-green-100 text-green-800';
      case 'Moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'Severe':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeriousnessColor = (seriousness: string) => {
    return seriousness === 'SAE' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total SAEs</p>
              <p className="text-2xl font-bold text-red-600">12</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total AEs</p>
              <p className="text-2xl font-bold text-orange-600">89</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Data Domains</p>
              <p className="text-2xl font-bold text-blue-600">8</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Data Completeness</p>
              <p className="text-2xl font-bold text-green-600">94%</p>
            </div>
          </div>
        </div>
      </div>

      {/* SAE Summary Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Serious Adverse Events Trend</h3>
            <p className="text-sm text-gray-500">Monthly SAE reporting over time</p>
          </div>
          <TrendingUp className="w-5 h-5 text-red-500" />
        </div>
        
        <div className="grid grid-cols-6 gap-4 mb-4">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => {
            const values = [2, 4, 1, 3, 2, 0];
            return (
              <div key={month} className="text-center">
                <div className="bg-gray-100 rounded-lg p-4 mb-2">
                  <div 
                    className="bg-red-500 rounded-full mx-auto transition-all duration-1000"
                    style={{ 
                      height: `${Math.max(values[index] * 10, 4)}px`,
                      width: '8px'
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">{month}</div>
                <div className="text-sm font-medium text-gray-900">{values[index]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent SAEs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Serious Adverse Events</h3>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
        </div>
        
        <div className="space-y-4">
          {adverseEvents.filter(ae => ae.seriousness === 'SAE').map((ae) => (
            <div key={ae.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">{ae.eventTerm}</h4>
                  <p className="text-sm text-gray-600">Subject: {ae.subjectId} | Site: {ae.site}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(ae.severity)}`}>
                    {ae.severity}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeriousnessColor(ae.seriousness)}`}>
                    {ae.seriousness}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Reported: {new Date(ae.reportedDate).toLocaleDateString()}</span>
                <span>Relationship: {ae.relationship}</span>
                <span>Outcome: {ae.outcome}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSDTMData = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">SDTM Data Domains</h3>
            <p className="text-sm text-gray-500">Study Data Tabulation Model domains and status</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completeness</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dataDomains.map((domain) => (
                <tr key={domain.domain} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-xs font-bold text-blue-700">{domain.domain}</span>
                      </div>
                      <span className="font-medium text-gray-900">{domain.domain}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{domain.description}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{domain.recordCount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(domain.status)}`}>
                      {domain.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${domain.completeness >= 95 ? 'bg-green-500' : domain.completeness >= 85 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${domain.completeness}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{domain.completeness}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {domain.issues > 0 ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {domain.issues} issues
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        No issues
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(domain.lastUpdated).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-green-600 hover:bg-green-50 rounded">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderADaMData = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">ADaM Analysis Datasets</h3>
            <p className="text-sm text-gray-500">Analysis Data Model datasets for statistical analysis</p>
          </div>
          <button className="flex items-center space-x-2 px-3 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4" />
            <span>Generate Analysis</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'ADSL', description: 'Subject Level Analysis Dataset', records: 127, status: 'Complete' },
            { name: 'ADAE', description: 'Adverse Events Analysis Dataset', records: 89, status: 'Under Review' },
            { name: 'ADLB', description: 'Laboratory Analysis Dataset', records: 2341, status: 'Complete' },
            { name: 'ADEFF', description: 'Efficacy Analysis Dataset', records: 456, status: 'Draft' },
            { name: 'ADVS', description: 'Vital Signs Analysis Dataset', records: 1456, status: 'Complete' },
            { name: 'ADCM', description: 'Concomitant Medications Analysis Dataset', records: 234, status: 'Complete' }
          ].map((dataset) => (
            <div key={dataset.name} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-green-700">{dataset.name}</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(dataset.status)}`}>
                  {dataset.status}
                </span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">{dataset.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{dataset.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Records:</span>
                <span className="font-medium text-gray-900">{dataset.records.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTFLs = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tables, Figures & Listings</h3>
            <p className="text-sm text-gray-500">Statistical outputs and clinical study reports</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search TFLs..."
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center space-x-2 px-3 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span>New TFL</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {tfls.map((tfl) => (
            <div key={tfl.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tfl.type === 'Table' ? 'bg-blue-100' :
                    tfl.type === 'Figure' ? 'bg-green-100' : 'bg-purple-100'
                  }`}>
                    {tfl.type === 'Table' ? (
                      <BarChart3 className={`w-5 h-5 ${
                        tfl.type === 'Table' ? 'text-blue-600' :
                        tfl.type === 'Figure' ? 'text-green-600' : 'text-purple-600'
                      }`} />
                    ) : tfl.type === 'Figure' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      tfl.type === 'Table' ? 'bg-blue-100 text-blue-800' :
                      tfl.type === 'Figure' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {tfl.type}
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tfl.status)}`}>
                  {tfl.status}
                </span>
              </div>
              
              <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{tfl.title}</h4>
              <p className="text-sm text-gray-600 mb-4">{tfl.category}</p>
              
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <span>Reviewer:</span>
                  <span className="font-medium text-gray-700">{tfl.reviewer}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pages:</span>
                  <span className="font-medium text-gray-700">{tfl.pages}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Modified:</span>
                  <span className="font-medium text-gray-700">{new Date(tfl.lastModified).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </button>
                <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'sdtm', label: 'SDTM Data', icon: Database },
    { id: 'adam', label: 'ADaM Data', icon: Activity },
    { id: 'tfls', label: 'TFLs', icon: FileText }
  ];

  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Study Data Domains</h2>
              <p className="text-gray-600">Clinical data management and analysis for {selectedStudy}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <select 
                value={selectedStudy}
                onChange={(e) => setSelectedStudy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ONCO-2024-001">ONCO-2024-001</option>
                <option value="CARDIO-2024-003">CARDIO-2024-003</option>
                <option value="NEURO-2024-002">NEURO-2024-002</option>
              </select>
              
              <button className="flex items-center space-x-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                <Shield className="w-4 h-4" />
                <span>Data Lock</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'sdtm' && renderSDTMData()}
        {activeTab === 'adam' && renderADaMData()}
        {activeTab === 'tfls' && renderTFLs()}
      </div>
    </div>
  );
};

export default StudyDataDomains;