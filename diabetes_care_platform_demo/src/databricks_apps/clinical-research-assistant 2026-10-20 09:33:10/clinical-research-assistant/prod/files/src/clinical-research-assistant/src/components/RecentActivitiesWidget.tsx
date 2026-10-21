import React from 'react';
import { Activity, Clock, User, FileText, AlertCircle, CheckCircle2, Users, Calendar } from 'lucide-react';

const RecentActivitiesWidget = () => {
  const activities = [
    {
      id: 1,
      type: 'enrollment',
      title: 'New subject enrolled',
      description: 'ONCO-2024-127 enrolled in Phase II trial',
      user: 'Dr. Sarah Chen',
      timestamp: '2m ago',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 2,
      type: 'compliance',
      title: 'Compliance issue resolved',
      description: 'GCP deviation at Johns Hopkins addressed',
      user: 'System Alert',
      timestamp: '15m ago',
      icon: CheckCircle2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 3,
      type: 'study_update',
      title: 'Protocol amendment approved',
      description: 'CARDIO-003 version 2.1 received regulatory approval',
      user: 'Dr. Rodriguez',
      timestamp: '1h ago',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      id: 4,
      type: 'alert',
      title: 'Enrollment milestone reached',
      description: 'NEURO-002 has reached 75% enrollment target',
      user: 'System Alert',
      timestamp: '2h ago',
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      id: 5,
      type: 'visit',
      title: 'Site monitoring visit completed',
      description: 'UCLA Medical Center monitoring visit concluded',
      user: 'Dr. Kim',
      timestamp: '3h ago',
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      id: 6,
      type: 'enrollment',
      title: 'Subject screening completed',
      description: 'INFECT-004 subject passed all screening criteria',
      user: 'Dr. Patel',
      timestamp: '4h ago',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  ];

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'enrollment':
        return 'Enrollment';
      case 'compliance':
        return 'Compliance';
      case 'study_update':
        return 'Study';
      case 'alert':
        return 'Alert';
      case 'visit':
        return 'Visit';
      default:
        return 'Activity';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
            <p className="text-sm text-gray-500">Latest study updates and system notifications</p>
          </div>
        </div>
        <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          View All
        </button>
      </div>

      {/* Activities Grid - 3 columns on large screens, 2 on medium, 1 on small */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className={`${activity.bgColor} rounded-lg p-4 border ${activity.borderColor} hover:shadow-sm transition-all duration-200`}>
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full ${activity.bgColor} border-2 ${activity.borderColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${activity.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{activity.title}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${activity.bgColor} ${activity.color} border ${activity.borderColor}`}>
                      {getActivityTypeLabel(activity.type)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{activity.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span className="truncate">{activity.user}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{activity.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity summary */}
      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">24</div>
            <div className="text-sm text-gray-500">Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">156</div>
            <div className="text-sm text-gray-500">This Week</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">642</div>
            <div className="text-sm text-gray-500">This Month</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">98%</div>
            <div className="text-sm text-gray-500">Completion Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentActivitiesWidget;