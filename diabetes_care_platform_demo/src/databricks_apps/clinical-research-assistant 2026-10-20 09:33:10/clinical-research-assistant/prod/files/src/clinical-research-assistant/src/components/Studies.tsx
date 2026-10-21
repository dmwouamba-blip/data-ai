import React, { useState } from 'react';
import StudiesHeader from './studies/StudiesHeader';
import StudiesFilters from './studies/StudiesFilters';
import StudiesTable from './studies/StudiesTable';
import StudyDetailsModal from './studies/StudyDetailsModal';
import CreateStudyModal from './studies/CreateStudyModal';

export interface Study {
  id: string;
  title: string;
  protocol: string;
  phase: 'Phase I' | 'Phase II' | 'Phase III' | 'Phase IV';
  therapeuticArea: string;
  status: 'Active' | 'Recruiting' | 'Completed' | 'Suspended' | 'Planning';
  principalInvestigator: string;
  sponsor: string;
  startDate: string;
  estimatedCompletion: string;
  enrollmentTarget: number;
  enrollmentCurrent: number;
  sites: number;
  budget: number;
  priority: 'High' | 'Medium' | 'Low';
  complianceScore: number;
  lastActivity: string;
  description: string;
  objectives: string[];
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  endpoints: {
    primary: string[];
    secondary: string[];
  };
}

const Studies = () => {
  const [studies] = useState<Study[]>([
    {
      id: 'ONCO-2024-001',
      title: 'Phase II Study of Novel Immunotherapy in Advanced Melanoma',
      protocol: 'ONCO-2024-001-v2.1',
      phase: 'Phase II',
      therapeuticArea: 'Oncology',
      status: 'Recruiting',
      principalInvestigator: 'Dr. Sarah Chen',
      sponsor: 'BioTech Innovations Inc.',
      startDate: '2024-01-15',
      estimatedCompletion: '2025-08-30',
      enrollmentTarget: 150,
      enrollmentCurrent: 127,
      sites: 8,
      budget: 2500000,
      priority: 'High',
      complianceScore: 94,
      lastActivity: '2 hours ago',
      description: 'A randomized, double-blind, placebo-controlled study evaluating the efficacy and safety of a novel immunotherapy agent in patients with advanced melanoma.',
      objectives: [
        'Evaluate overall response rate',
        'Assess progression-free survival',
        'Determine safety profile'
      ],
      inclusionCriteria: [
        'Age ≥ 18 years',
        'Histologically confirmed advanced melanoma',
        'ECOG performance status 0-1',
        'Adequate organ function'
      ],
      exclusionCriteria: [
        'Prior immunotherapy treatment',
        'Active autoimmune disease',
        'Pregnancy or nursing'
      ],
      endpoints: {
        primary: ['Overall Response Rate (ORR)'],
        secondary: ['Progression-free survival', 'Overall survival', 'Safety profile']
      }
    },
    {
      id: 'CARDIO-2024-003',
      title: 'Cardiovascular Outcomes Study with Novel ACE Inhibitor',
      protocol: 'CARDIO-2024-003-v1.3',
      phase: 'Phase III',
      therapeuticArea: 'Cardiovascular',
      status: 'Active',
      principalInvestigator: 'Dr. Michael Rodriguez',
      sponsor: 'CardioPharm Solutions',
      startDate: '2023-09-20',
      estimatedCompletion: '2025-12-15',
      enrollmentTarget: 200,
      enrollmentCurrent: 145,
      sites: 12,
      budget: 4200000,
      priority: 'High',
      complianceScore: 87,
      lastActivity: '1 day ago',
      description: 'A multicenter, randomized controlled trial comparing a novel ACE inhibitor to standard of care in patients with heart failure.',
      objectives: [
        'Compare cardiovascular outcomes',
        'Evaluate quality of life improvements',
        'Assess long-term safety'
      ],
      inclusionCriteria: [
        'Age 40-80 years',
        'Diagnosed heart failure (NYHA Class II-III)',
        'Ejection fraction ≤ 40%',
        'Stable medication regimen'
      ],
      exclusionCriteria: [
        'Recent myocardial infarction',
        'Severe kidney disease',
        'Hypersensitivity to ACE inhibitors'
      ],
      endpoints: {
        primary: ['Composite cardiovascular endpoint'],
        secondary: ['Quality of life scores', 'Hospitalization rates', 'Mortality']
      }
    },
    {
      id: 'NEURO-2024-002',
      title: 'Neuroprotective Agent in Early Alzheimer\'s Disease',
      protocol: 'NEURO-2024-002-v1.0',
      phase: 'Phase I',
      therapeuticArea: 'Neurology',
      status: 'Recruiting',
      principalInvestigator: 'Dr. Emily Kim',
      sponsor: 'NeuroTech Research',
      startDate: '2024-03-10',
      estimatedCompletion: '2024-11-30',
      enrollmentTarget: 80,
      enrollmentCurrent: 92,
      sites: 5,
      budget: 1800000,
      priority: 'Medium',
      complianceScore: 96,
      lastActivity: '3 hours ago',
      description: 'First-in-human study evaluating safety and tolerability of a novel neuroprotective compound in patients with early-stage Alzheimer\'s disease.',
      objectives: [
        'Establish maximum tolerated dose',
        'Evaluate safety and tolerability',
        'Assess pharmacokinetic profile'
      ],
      inclusionCriteria: [
        'Age 55-85 years',
        'Mild cognitive impairment or early AD',
        'MMSE score 20-26',
        'Stable caregiver support'
      ],
      exclusionCriteria: [
        'Other forms of dementia',
        'Significant psychiatric illness',
        'Recent investigational drug use'
      ],
      endpoints: {
        primary: ['Safety and tolerability'],
        secondary: ['Pharmacokinetics', 'Cognitive assessments', 'Biomarker changes']
      }
    },
    {
      id: 'INFECT-2024-004',
      title: 'Antibiotic Efficacy in Resistant Bacterial Infections',
      protocol: 'INFECT-2024-004-v2.0',
      phase: 'Phase II',
      therapeuticArea: 'Infectious Disease',
      status: 'Active',
      principalInvestigator: 'Dr. Raj Patel',
      sponsor: 'Global Health Therapeutics',
      startDate: '2024-02-01',
      estimatedCompletion: '2025-06-30',
      enrollmentTarget: 120,
      enrollmentCurrent: 89,
      sites: 6,
      budget: 3100000,
      priority: 'High',
      complianceScore: 91,
      lastActivity: '5 hours ago',
      description: 'Randomized controlled trial evaluating a novel antibiotic combination in patients with multidrug-resistant bacterial infections.',
      objectives: [
        'Evaluate clinical cure rates',
        'Assess microbiological response',
        'Monitor resistance development'
      ],
      inclusionCriteria: [
        'Age ≥ 18 years',
        'Confirmed MDR bacterial infection',
        'Failed standard therapy',
        'Adequate renal function'
      ],
      exclusionCriteria: [
        'Pregnancy',
        'Severe immunocompromise',
        'Allergy to study medications'
      ],
      endpoints: {
        primary: ['Clinical cure rate at day 14'],
        secondary: ['Microbiological response', 'Time to clinical improvement', 'Safety']
      }
    },
    {
      id: 'RESP-2024-005',
      title: 'Inhaled Therapy for Chronic Obstructive Pulmonary Disease',
      protocol: 'RESP-2024-005-v1.2',
      phase: 'Phase III',
      therapeuticArea: 'Respiratory',
      status: 'Planning',
      principalInvestigator: 'Dr. Lisa Thompson',
      sponsor: 'Respiratory Solutions Ltd.',
      startDate: '2024-06-01',
      estimatedCompletion: '2026-03-15',
      enrollmentTarget: 300,
      enrollmentCurrent: 0,
      sites: 15,
      budget: 5200000,
      priority: 'Medium',
      complianceScore: 100,
      lastActivity: '1 week ago',
      description: 'Phase III study comparing a novel inhaled bronchodilator combination to standard of care in patients with moderate to severe COPD.',
      objectives: [
        'Compare lung function improvements',
        'Evaluate exacerbation rates',
        'Assess quality of life'
      ],
      inclusionCriteria: [
        'Age 40-80 years',
        'COPD diagnosis (GOLD 2-3)',
        'Current or former smoker',
        'Stable medication regimen'
      ],
      exclusionCriteria: [
        'Asthma diagnosis',
        'Recent COPD exacerbation',
        'Significant cardiovascular disease'
      ],
      endpoints: {
        primary: ['Change in FEV1 from baseline'],
        secondary: ['Exacerbation rates', 'Quality of life scores', 'Safety profile']
      }
    },
    {
      id: 'ENDO-2024-006',
      title: 'Novel Diabetes Treatment in Type 2 Diabetes Mellitus',
      protocol: 'ENDO-2024-006-v1.1',
      phase: 'Phase II',
      therapeuticArea: 'Endocrinology',
      status: 'Completed',
      principalInvestigator: 'Dr. James Wilson',
      sponsor: 'Metabolic Health Inc.',
      startDate: '2023-04-15',
      estimatedCompletion: '2024-02-28',
      enrollmentTarget: 180,
      enrollmentCurrent: 180,
      sites: 10,
      budget: 2800000,
      priority: 'Low',
      complianceScore: 98,
      lastActivity: '2 months ago',
      description: 'Completed study evaluating a novel glucose-lowering agent in patients with inadequately controlled type 2 diabetes mellitus.',
      objectives: [
        'Evaluate glycemic control',
        'Assess weight management',
        'Monitor cardiovascular safety'
      ],
      inclusionCriteria: [
        'Age 18-75 years',
        'Type 2 diabetes mellitus',
        'HbA1c 7.0-10.5%',
        'Stable metformin therapy'
      ],
      exclusionCriteria: [
        'Type 1 diabetes',
        'Recent diabetic ketoacidosis',
        'Severe renal impairment'
      ],
      endpoints: {
        primary: ['Change in HbA1c from baseline'],
        secondary: ['Weight change', 'Fasting glucose', 'Cardiovascular events']
      }
    }
  ]);

  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filteredStudies, setFilteredStudies] = useState<Study[]>(studies);

  const handleStudySelect = (study: Study) => {
    setSelectedStudy(study);
  };

  const handleCloseModal = () => {
    setSelectedStudy(null);
  };

  const handleCreateStudy = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleFilterChange = (filters: any) => {
    let filtered = studies;

    if (filters.search) {
      filtered = filtered.filter(study => 
        study.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        study.protocol.toLowerCase().includes(filters.search.toLowerCase()) ||
        study.principalInvestigator.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(study => study.status === filters.status);
    }

    if (filters.phase && filters.phase !== 'all') {
      filtered = filtered.filter(study => study.phase === filters.phase);
    }

    if (filters.therapeuticArea && filters.therapeuticArea !== 'all') {
      filtered = filtered.filter(study => study.therapeuticArea === filters.therapeuticArea);
    }

    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(study => study.priority === filters.priority);
    }

    setFilteredStudies(filtered);
  };

  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <StudiesHeader onCreateStudy={handleCreateStudy} />
        <StudiesFilters onFilterChange={handleFilterChange} />
        <StudiesTable 
          studies={filteredStudies} 
          onStudySelect={handleStudySelect}
        />
        
        {selectedStudy && (
          <StudyDetailsModal 
            study={selectedStudy} 
            onClose={handleCloseModal}
          />
        )}
        
        {showCreateModal && (
          <CreateStudyModal onClose={handleCloseCreateModal} />
        )}
      </div>
    </div>
  );
};

export default Studies;