import React, { useState } from 'react';
import { Users, Search, Filter, Plus, Eye, Edit, Calendar, Activity, AlertTriangle, CheckCircle2, Clock, MapPin, Phone, Mail, FileText, TrendingUp, Download, MoreHorizontal, Shield, Bell, Target, Zap, AlertCircle, XCircle, TrendingDown, BarChart3 } from 'lucide-react';

interface Subject {
  id: string;
  studyId: string;
  siteId: string;
  siteName: string;
  enrollmentDate: string;
  status: 'Enrolled' | 'Screening' | 'Completed' | 'Withdrawn' | 'Screen Failed';
  demographics: {
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    race: string;
    ethnicity: string;
  };
  visits: {
    scheduled: number;
    completed: number;
    missed: number;
    upcoming: number;
  };
  adverseEvents: {
    total: number;
    serious: number;
    related: number;
  };
  compliance: number;
  lastVisit: string;
  nextVisit: string;
  investigator: string;
  concomitantMeds: number;
  protocolDeviations: number;
}

interface Visit {
  id: string;
  subjectId: string;
  visitName: string;
  scheduledDate: string;
  actualDate?: string;
  status: 'Completed' | 'Missed' | 'Scheduled' | 'In Progress';
  window: string;
  procedures: {
    total: number;
    completed: number;
  };
}

interface AdverseEvent {
  id: string;
  subjectId: string;
  studyId: string;
  term: string;
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Life-threatening' | 'Fatal';
  seriousness: 'SAE' | 'Non-SAE';
  relationship: 'Related' | 'Possibly Related' | 'Probably Related' | 'Unrelated';
  outcome: 'Recovered' | 'Recovering' | 'Not Recovered' | 'Recovered with Sequelae' | 'Fatal' | 'Unknown';
  startDate: string;
  endDate?: string;
  reportedDate: string;
  site: string;
  investigator: string;
  action: 'None' | 'Dose Reduced' | 'Dose Interrupted' | 'Drug Withdrawn' | 'Treatment Stopped';
  followUp: boolean;
  expectedness: 'Expected' | 'Unexpected';
  medDRACode: string;
  systemOrganClass: string;
}

interface SafetySignal {
  id: string;
  term: string;
  frequency: number;
  expectedFrequency: number;
  riskRatio: number;
  pValue: number;
  status: 'Under Review' | 'Confirmed' | 'Dismissed' | 'Escalated';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  detectedDate: string;
  reviewer: string;
  systemOrganClass: string;
}

const Subjects = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStudy, setSelectedStudy] = useState('ONCO-2024-001');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [safetyFilter, setSafetyFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Sample subjects data
  const subjects: Subject[] = [
    {
      id: 'ONCO-001-001',
      studyId: 'ONCO-2024-001',
      siteId: 'SITE-001',
      siteName: 'Johns Hopkins Medical Center',
      enrollmentDate: '2024-01-15',
      status: 'Enrolled',
      demographics: {
        age: 58,
        gender: 'Female',
        race: 'Caucasian',
        ethnicity: 'Non-Hispanic'
      },
      visits: {
        scheduled: 12,
        completed: 8,
        missed: 1,
        upcoming: 3
      },
      adverseEvents: {
        total: 3,
        serious: 1,
        related: 2
      },
      compliance: 92,
      lastVisit: '2024-01-20',
      nextVisit: '2024-02-03',
      investigator: 'Dr. Sarah Chen',
      concomitantMeds: 4,
      protocolDeviations: 0
    },
    {
      id: 'ONCO-001-003',
      studyId: 'ONCO-2024-001',
      siteId: 'SITE-002',
      siteName: 'Mayo Clinic Rochester',
      enrollmentDate: '2024-01-18',
      status: 'Enrolled',
      demographics: {
        age: 62,
        gender: 'Male',
        race: 'African American',
        ethnicity: 'Non-Hispanic'
      },
      visits: {
        scheduled: 12,
        completed: 7,
        missed: 0,
        upcoming: 5
      },
      adverseEvents: {
        total: 2,
        serious: 0,
        related: 1
      },
      compliance: 98,
      lastVisit: '2024-01-22',
      nextVisit: '2024-02-05',
      investigator: 'Dr. Rodriguez',
      concomitantMeds: 2,
      protocolDeviations: 1
    },
    {
      id: 'ONCO-001-007',
      studyId: 'ONCO-2024-001',
      siteId: 'SITE-003',
      siteName: 'Cleveland Clinic',
      enrollmentDate: '2024-01-20',
      status: 'Enrolled',
      demographics: {
        age: 45,
        gender: 'Female',
        race: 'Asian',
        ethnicity: 'Non-Hispanic'
      },
      visits: {
        scheduled: 12,
        completed: 6,
        missed: 2,
        upcoming: 4
      },
      adverseEvents: {
        total: 5,
        serious: 2,
        related: 3
      },
      compliance: 78,
      lastVisit: '2024-01-25',
      nextVisit: '2024-02-08',
      investigator: 'Dr. Kim',
      concomitantMeds: 6,
      protocolDeviations: 2
    },
    {
      id: 'ONCO-001-012',
      studyId: 'ONCO-2024-001',
      siteId: 'SITE-001',
      siteName: 'Johns Hopkins Medical Center',
      enrollmentDate: '2024-01-22',
      status: 'Completed',
      demographics: {
        age: 67,
        gender: 'Male',
        race: 'Caucasian',
        ethnicity: 'Hispanic'
      },
      visits: {
        scheduled: 12,
        completed: 12,
        missed: 0,
        upcoming: 0
      },
      adverseEvents: {
        total: 1,
        serious: 0,
        related: 0
      },
      compliance: 100,
      lastVisit: '2024-01-24',
      nextVisit: '',
      investigator: 'Dr. Sarah Chen',
      concomitantMeds: 3,
      protocolDeviations: 0
    },
    {
      id: 'ONCO-001-015',
      studyId: 'ONCO-2024-001',
      siteId: 'SITE-004',
      siteName: 'UCLA Medical Center',
      enrollmentDate: '2024-01-25',
      status: 'Withdrawn',
      demographics: {
        age: 54,
        gender: 'Female',
        race: 'Hispanic',
        ethnicity: 'Hispanic'
      },
      visits: {
        scheduled: 12,
        completed: 4,
        missed: 1,
        upcoming: 0
      },
      adverseEvents: {
        total: 7,
        serious: 3,
        related: 4
      },
      compliance: 65,
      lastVisit: '2024-01-23',
      nextVisit: '',
      investigator: 'Dr. Patel',
      concomitantMeds: 8,
      protocolDeviations: 3
    }
  ];

  // Sample adverse events data
  const adverseEvents: AdverseEvent[] = [
    {
      id: 'AE001',
      subjectId: 'ONCO-001-001',
      studyId: 'ONCO-2024-001',
      term: 'Neutropenia',
      severity: 'Severe',
      seriousness: 'SAE',
      relationship: 'Related',
      outcome: 'Recovered',
      startDate: '2024-01-15',
      endDate: '2024-01-22',
      reportedDate: '2024-01-16',
      site: 'Johns Hopkins',
      investigator: 'Dr. Sarah Chen',
      action: 'Dose Reduced',
      followUp: true,
      expectedness: 'Expected',
      medDRACode: '10029354',
      systemOrganClass: 'Blood and lymphatic system disorders'
    },
    {
      id: 'AE002',
      subjectId: 'ONCO-001-003',
      studyId: 'ONCO-2024-001',
      term: 'Fatigue',
      severity: 'Moderate',
      seriousness: 'Non-SAE',
      relationship: 'Possibly Related',
      outcome: 'Recovered',
      startDate: '2024-01-18',
      endDate: '2024-01-25',
      reportedDate: '2024-01-19',
      site: 'Mayo Clinic',
      investigator: 'Dr. Rodriguez',
      action: 'None',
      followUp: false,
      expectedness: 'Expected',
      medDRACode: '10016256',
      systemOrganClass: 'General disorders and administration site conditions'
    },
    {
      id: 'AE003',
      subjectId: 'ONCO-001-007',
      studyId: 'ONCO-2024-001',
      term: 'Thrombocytopenia',
      severity: 'Severe',
      seriousness: 'SAE',
      relationship: 'Related',
      outcome: 'Recovering',
      startDate: '2024-01-20',
      reportedDate: '2024-01-21',
      site: 'Cleveland Clinic',
      investigator: 'Dr. Kim',
      action: 'Dose Interrupted',
      followUp: true,
      expectedness: 'Expected',
      medDRACode: '10043554',
      systemOrganClass: 'Blood and lymphatic system disorders'
    },
    {
      id: 'AE004',
      subjectId: 'ONCO-001-007',
      studyId: 'ONCO-2024-001',
      term: 'Nausea',
      severity: 'Mild',
      seriousness: 'Non-SAE',
      relationship: 'Related',
      outcome: 'Recovered',
      startDate: '2024-01-22',
      endDate: '2024-01-24',
      reportedDate: '2024-01-22',
      site: 'Cleveland Clinic',
      investigator: 'Dr. Kim',
      action: 'None',
      followUp: false,
      expectedness: 'Expected',
      medDRACode: '10028813',
      systemOrganClass: 'Gastrointestinal disorders'
    },
    {
      id: 'AE005',
      subjectId: 'ONCO-001-015',
      studyId: 'ONCO-2024-001',
      term: 'Hepatotoxicity',
      severity: 'Life-threatening',
      seriousness: 'SAE',
      relationship: 'Related',
      outcome: 'Recovered with Sequelae',
      startDate: '2024-01-23',
      endDate: '2024-01-30',
      reportedDate: '2024-01-23',
      site: 'UCLA Medical',
      investigator: 'Dr. Patel',
      action: 'Drug Withdrawn',
      followUp: true,
      expectedness: 'Unexpected',
      medDRACode: '10019851',
      systemOrganClass: 'Hepatobiliary disorders'
    }
  ];

  // Sample safety signals data
  const safetySignals: SafetySignal[] = [
    {
      id: 'SS001',
      term: 'Hepatotoxicity',
      frequency: 3,
      expectedFrequency: 1,
      riskRatio: 3.2,
      pValue: 0.045,
      status: 'Under Review',
      priority: 'High',
      detectedDate: '2024-01-25',
      reviewer: 'Dr. Safety Officer',
      systemOrganClass: 'Hepatobiliary disorders'
    },
    {
      id: 'SS002',
      term: 'Severe Neutropenia',
      frequency: 5,
      expectedFrequency: 3,
      riskRatio: 1.8,
      pValue: 0.12,
      status: 'Confirmed',
      priority: 'Medium',
      detectedDate: '2024-01-20',
      reviewer: 'Dr. Safety Officer',
      systemOrganClass: 'Blood and lymphatic system disorders'
    },
    {
      id: 'SS003',
      term: 'Cardiac Arrhythmia',
      frequency: 1,
      expectedFrequency: 0,
      riskRatio: 0,
      pValue: 0.001,
      status: 'Escalated',
      priority: 'Critical',
      detectedDate: '2024-01-24',
      reviewer: 'Dr. Safety Officer',
      systemOrganClass: 'Cardiac disorders'
    }
  ];

  const visits: Visit[] = [
    {
      id: 'V001',
      subjectId: 'ONCO-001-001',
      visitName: 'Baseline',
      scheduledDate: '2024-01-15',
      actualDate: '2024-01-15',
      status: 'Completed',
      window: 'Day 1 ± 0',
      procedures: { total: 8, completed: 8 }
    },
    {
      id: 'V002',
      subjectId: 'ONCO-001-001',
      visitName: 'Week 2',
      scheduledDate: '2024-01-29',
      actualDate: '2024-01-30',
      status: 'Completed',
      window: 'Day 14 ± 2',
      procedures: { total: 6, completed: 6 }
    },
    {
      id: 'V003',
      subjectId: 'ONCO-001-001',
      visitName: 'Week 4',
      scheduledDate: '2024-02-12',
      status: 'Scheduled',
      window: 'Day 28 ± 3',
      procedures: { total: 7, completed: 0 }
    }
  ];

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.investigator.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || subject.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredAdverseEvents = adverseEvents.filter(ae => {
    const matchesSafety = safetyFilter === 'all' || 
                         (safetyFilter === 'sae' && ae.seriousness === 'SAE') ||
                         (safetyFilter === 'related' && ae.relationship !== 'Unrelated') ||
                         (safetyFilter === 'unexpected' && ae.expectedness === 'Unexpected');
    const matchesSeverity = severityFilter === 'all' || ae.severity === severityFilter;
    return matchesSafety && matchesSeverity;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enrolled':
        return 'bg-green-100 text-green-800';
      case 'Screening':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-purple-100 text-purple-800';
      case 'Withdrawn':
        return 'bg-red-100 text-red-800';
      case 'Screen Failed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 90) return 'text-green-600';
    if (compliance >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Mild':
        return 'bg-green-100 text-green-800';
      case 'Moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'Severe':
        return 'bg-orange-100 text-orange-800';
      case 'Life-threatening':
        return 'bg-red-100 text-red-800';
      case 'Fatal':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeriousnessColor = (seriousness: string) => {
    return seriousness === 'SAE' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'Related':
      case 'Probably Related':
        return 'bg-red-100 text-red-800';
      case 'Possibly Related':
        return 'bg-yellow-100 text-yellow-800';
      case 'Unrelated':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSignalStatusColor = (status: string) => {
    switch (status) {
      case 'Under Review':
        return 'bg-blue-100 text-blue-800';
      case 'Confirmed':
        return 'bg-red-100 text-red-800';
      case 'Dismissed':
        return 'bg-gray-100 text-gray-800';
      case 'Escalated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Subjects</p>
              <p className="text-2xl font-bold text-blue-600">127</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Visit Completion</p>
              <p className="text-2xl font-bold text-green-600">89%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. AEs per Subject</p>
              <p className="text-2xl font-bold text-orange-600">2.3</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Compliance</p>
              <p className="text-2xl font-bold text-purple-600">91%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Protocol Deviations</p>
              <p className="text-2xl font-bold text-red-600">18</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visit Completion Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Visit Completion Trend</h3>
            <p className="text-sm text-gray-500">Monthly visit completion rates</p>
          </div>
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        
        <div className="grid grid-cols-6 gap-4 mb-4">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => {
            const values = [85, 89, 92, 88, 91, 89];
            return (
              <div key={month} className="text-center">
                <div className="bg-gray-100 rounded-lg p-4 mb-2 h-24 flex items-end justify-center">
                  <div 
                    className="bg-green-500 rounded-full w-6 transition-all duration-1000"
                    style={{ height: `${values[index]}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">{month}</div>
                <div className="text-sm font-medium text-gray-900">{values[index]}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Demographics Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Demographics Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Gender</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Female</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-pink-500 h-2 rounded-full" style={{ width: '58%' }}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">58%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Male</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '42%' }}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">42%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Age Groups</span>
              </div>
              <div className="space-y-2">
                {[
                  { range: '18-30', percentage: 12 },
                  { range: '31-50', percentage: 34 },
                  { range: '51-65', percentage: 38 },
                  { range: '65+', percentage: 16 }
                ].map((group) => (
                  <div key={group.range} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{group.range}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${group.percentage}%` }}></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{group.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Status Distribution</h3>
          <div className="space-y-4">
            {[
              { status: 'Enrolled', count: 89, color: 'bg-green-500' },
              { status: 'Completed', count: 24, color: 'bg-purple-500' },
              { status: 'Screening', count: 8, color: 'bg-blue-500' },
              { status: 'Withdrawn', count: 4, color: 'bg-red-500' },
              { status: 'Screen Failed', count: 2, color: 'bg-gray-500' }
            ].map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm font-medium text-gray-700">{item.status}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${(item.count / 127) * 100}%` }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSubjectsList = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Subject Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="Enrolled">Enrolled</option>
            <option value="Screening">Screening</option>
            <option value="Completed">Completed</option>
            <option value="Withdrawn">Withdrawn</option>
            <option value="Screen Failed">Screen Failed</option>
          </select>
          
          <select className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="all">All Sites</option>
            <option value="site1">Johns Hopkins</option>
            <option value="site2">Mayo Clinic</option>
            <option value="site3">Cleveland Clinic</option>
            <option value="site4">UCLA Medical</option>
          </select>
          
          <button className="flex items-center space-x-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demographics</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Progress</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Safety</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Compliance</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Visit</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">{subject.id}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(subject.status)}`}>
                          {subject.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{subject.siteName}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          <Users className="w-3 h-3" />
                          <span>{subject.investigator}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">{subject.demographics.age}y, {subject.demographics.gender}</div>
                      <div className="text-gray-500">{subject.demographics.race}</div>
                      <div className="text-gray-500">{subject.demographics.ethnicity}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Completed:</span>
                        <span className="font-medium text-gray-900">
                          {subject.visits.completed}/{subject.visits.scheduled}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(subject.visits.completed / subject.visits.scheduled) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Missed: {subject.visits.missed}</span>
                        <span>Upcoming: {subject.visits.upcoming}</span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Total AEs:</span>
                        <span className="font-medium text-gray-900">{subject.adverseEvents.total}</span>
                      </div>
                      {subject.adverseEvents.serious > 0 && (
                        <div className="flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span className="text-xs text-red-600">{subject.adverseEvents.serious} SAEs</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {subject.adverseEvents.related} related
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${getComplianceColor(subject.compliance)}`}>
                            {subject.compliance}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              subject.compliance >= 90 ? 'bg-green-500' :
                              subject.compliance >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${subject.compliance}%` }}
                          ></div>
                        </div>
                        {subject.protocolDeviations > 0 && (
                          <div className="text-xs text-red-600 mt-1">
                            {subject.protocolDeviations} deviations
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {subject.nextVisit ? (
                        <>
                          <div className="flex items-center space-x-1 text-gray-900">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(subject.nextVisit).toLocaleDateString()}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {Math.ceil((new Date(subject.nextVisit).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500">No upcoming visits</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedSubject(subject)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="More">
                        <MoreHorizontal className="w-4 h-4" />
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

  const renderSafetyMonitoring = () => (
    <div className="space-y-6">
      {/* Safety Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total SAEs</p>
              <p className="text-2xl font-bold text-red-600">12</p>
              <p className="text-xs text-gray-500">+2 this week</p>
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
              <p className="text-xs text-gray-500">+8 this week</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Safety Signals</p>
              <p className="text-2xl font-bold text-purple-600">3</p>
              <p className="text-xs text-gray-500">1 critical</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Safety Reports</p>
              <p className="text-2xl font-bold text-blue-600">24</p>
              <p className="text-xs text-gray-500">Pending review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Signals Alert */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Critical Safety Signal Detected</h3>
            <p className="text-red-700 mb-3">
              Cardiac Arrhythmia has been detected as a potential safety signal requiring immediate attention. 
              This signal has been escalated to the Data Safety Monitoring Board (DSMB).
            </p>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Review Signal
              </button>
              <button className="px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Signals Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Safety Signal Detection</h3>
            <p className="text-sm text-gray-500">Automated detection of potential safety concerns</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
            <Target className="w-4 h-4" />
            <span>Run Analysis</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Ratio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P-Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {safetySignals.map((signal) => (
                <tr key={signal.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{signal.term}</div>
                      <div className="text-sm text-gray-500">{signal.systemOrganClass}</div>
                      <div className="text-xs text-gray-400">Detected: {new Date(signal.detectedDate).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{signal.frequency} observed</div>
                      <div className="text-gray-500">{signal.expectedFrequency} expected</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {signal.riskRatio > 0 ? signal.riskRatio.toFixed(2) : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-sm font-medium ${signal.pValue < 0.05 ? 'text-red-600' : 'text-gray-900'}`}>
                      {signal.pValue.toFixed(3)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(signal.priority)}`}>
                      {signal.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSignalStatusColor(signal.status)}`}>
                      {signal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Review">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Generate Report">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Escalate">
                        <Bell className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adverse Events Filters and Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Adverse Events Monitoring</h3>
            <p className="text-sm text-gray-500">Detailed adverse event tracking and analysis</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={safetyFilter}
              onChange={(e) => setSafetyFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Events</option>
              <option value="sae">SAEs Only</option>
              <option value="related">Related Events</option>
              <option value="unexpected">Unexpected Events</option>
            </select>
            
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="Mild">Mild</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
              <option value="Life-threatening">Life-threatening</option>
              <option value="Fatal">Fatal</option>
            </select>
            
            <button className="flex items-center space-x-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export AEs</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Taken</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAdverseEvents.map((ae) => (
                <tr key={ae.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{ae.term}</div>
                      <div className="text-sm text-gray-500">{ae.systemOrganClass}</div>
                      <div className="text-xs text-gray-400">
                        MedDRA: {ae.medDRACode} | {ae.expectedness}
                      </div>
                      <div className="text-xs text-gray-400">
                        Start: {new Date(ae.startDate).toLocaleDateString()}
                        {ae.endDate && ` - End: ${new Date(ae.endDate).toLocaleDateString()}`}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{ae.subjectId}</div>
                      <div className="text-sm text-gray-500">{ae.site}</div>
                      <div className="text-xs text-gray-400">{ae.investigator}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(ae.severity)}`}>
                        {ae.severity}
                      </span>
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeriousnessColor(ae.seriousness)}`}>
                          {ae.seriousness}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRelationshipColor(ae.relationship)}`}>
                      {ae.relationship}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{ae.outcome}</div>
                      {ae.followUp && (
                        <div className="text-xs text-blue-600 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Follow-up required</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{ae.action}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      {ae.followUp && (
                        <button className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Follow-up">
                          <Bell className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AE Trend Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AE Frequency by System Organ Class</h3>
              <p className="text-sm text-gray-500">Distribution of adverse events by body system</p>
            </div>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          
          <div className="space-y-4">
            {[
              { soc: 'Blood and lymphatic system disorders', count: 8, percentage: 32 },
              { soc: 'Gastrointestinal disorders', count: 6, percentage: 24 },
              { soc: 'General disorders', count: 5, percentage: 20 },
              { soc: 'Hepatobiliary disorders', count: 3, percentage: 12 },
              { soc: 'Cardiac disorders', count: 3, percentage: 12 }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <div className="text-sm font-medium text-gray-900 mb-1">{item.soc}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">SAE Timeline</h3>
              <p className="text-sm text-gray-500">Serious adverse events over time</p>
            </div>
            <TrendingUp className="w-5 h-5 text-red-500" />
          </div>
          
          <div className="grid grid-cols-6 gap-2 mb-4">
            {['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'].map((week, index) => {
              const values = [1, 2, 0, 3, 1, 2];
              return (
                <div key={week} className="text-center">
                  <div className="bg-gray-100 rounded-lg p-2 mb-2 h-16 flex items-end justify-center">
                    <div 
                      className="bg-red-500 rounded-full w-4 transition-all duration-1000"
                      style={{ height: `${Math.max(values[index] * 15, 4)}px` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">{week.replace('Week ', 'W')}</div>
                  <div className="text-sm font-medium text-gray-900">{values[index]}</div>
                </div>
              );
            })}
          </div>
          
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                SAE rate: 9.4% (above expected 5-7%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'subjects', label: 'Subject List', icon: Users },
    { id: 'visits', label: 'Visit Tracking', icon: Calendar },
    { id: 'safety', label: 'Safety Monitoring', icon: Shield }
  ];

  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Subject Management</h2>
              <p className="text-gray-600">Monitor and manage study participants for {selectedStudy}</p>
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
                <Plus className="w-4 h-4" />
                <span>Enroll Subject</span>
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
        {activeTab === 'subjects' && renderSubjectsList()}
        {activeTab === 'visits' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Visit Tracking</h3>
            <p className="text-gray-500">Detailed visit tracking interface coming soon...</p>
          </div>
        )}
        {activeTab === 'safety' && renderSafetyMonitoring()}

        {/* Subject Details Modal */}
        {selectedSubject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedSubject.id}</h2>
                    <p className="text-blue-100">{selectedSubject.siteName}</p>
                  </div>
                  <button
                    onClick={() => setSelectedSubject(null)}
                    className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Demographics</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Age:</span>
                          <span className="font-medium">{selectedSubject.demographics.age} years</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gender:</span>
                          <span className="font-medium">{selectedSubject.demographics.gender}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Race:</span>
                          <span className="font-medium">{selectedSubject.demographics.race}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ethnicity:</span>
                          <span className="font-medium">{selectedSubject.demographics.ethnicity}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Study Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Enrollment Date:</span>
                          <span className="font-medium">{new Date(selectedSubject.enrollmentDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedSubject.status)}`}>
                            {selectedSubject.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Investigator:</span>
                          <span className="font-medium">{selectedSubject.investigator}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Visit Progress</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Completed:</span>
                          <span className="font-medium">{selectedSubject.visits.completed}/{selectedSubject.visits.scheduled}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${(selectedSubject.visits.completed / selectedSubject.visits.scheduled) * 100}%` }}
                          ></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Missed:</span>
                            <span className="font-medium text-red-600">{selectedSubject.visits.missed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Upcoming:</span>
                            <span className="font-medium text-blue-600">{selectedSubject.visits.upcoming}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Safety Profile</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total AEs:</span>
                          <span className="font-medium">{selectedSubject.adverseEvents.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Serious AEs:</span>
                          <span className="font-medium text-red-600">{selectedSubject.adverseEvents.serious}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Related AEs:</span>
                          <span className="font-medium">{selectedSubject.adverseEvents.related}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Protocol Deviations:</span>
                          <span className="font-medium text-orange-600">{selectedSubject.protocolDeviations}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subjects;