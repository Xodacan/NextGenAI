import React from 'react';
import { useAuth } from '../contexts/MockAuthContext';
import { useData } from '../contexts/DataContext';
import { Users, FileText, ClipboardList, Activity, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { patients, documents, summaries } = useData();

  const stats = [
    {
      title: 'Total Patients',
      value: patients.length,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Active Documents',
      value: documents.length,
      icon: FileText,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Pending Summaries',
      value: summaries.filter(s => s.status === 'Draft').length,
      icon: ClipboardList,
      color: 'bg-yellow-500',
      change: '+5%',
      changeType: 'positive'
    },
    {
      title: 'Approved Summaries',
      value: summaries.filter(s => s.status === 'Approved').length,
      icon: Activity,
      color: 'bg-purple-500',
      change: '+15%',
      changeType: 'positive'
    }
  ];

  const recentPatients = patients.slice(0, 5);
  const recentDocuments = documents.slice(0, 5);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.fullName}!</h1>
        <p className="text-gray-600 mt-2">Here's what's happening with your patients today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">{stat.change}</span>
                <span className="text-sm text-gray-500 ml-1">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Patients</h2>
          <div className="space-y-4">
            {recentPatients.map(patient => (
              <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{patient.firstName} {patient.lastName}</p>
                  <p className="text-sm text-gray-600">Room {patient.roomNumber}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  patient.status === 'Active' ? 'bg-green-100 text-green-800' :
                  patient.status === 'Pending Discharge' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {patient.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Documents</h2>
          <div className="space-y-4">
            {recentDocuments.map(document => (
              <div key={document.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{document.fileName}</p>
                  <p className="text-sm text-gray-600">{document.documentType}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(document.uploadTimestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}