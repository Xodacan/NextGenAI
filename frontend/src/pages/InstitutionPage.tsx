import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Building2, Users, FileText, ClipboardList, MapPin, Phone, Mail, Calendar, TrendingUp } from 'lucide-react';

export default function InstitutionPage() {
  const { user, institution } = useAuth();
  const { patients, documents, summaries } = useData();

  if (!institution) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Institution Assigned</h2>
          <p className="text-gray-600">
            Contact your administrator to be assigned to an institution.
          </p>
        </div>
      </div>
    );
  }

  const institutionStats = [
    {
      title: 'Total Patients',
      value: patients.length,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Active Documents',
      value: documents.length,
      icon: FileText,
      color: 'bg-green-500',
      change: '+8%'
    },
    {
      title: 'Pending Summaries',
      value: summaries.filter(s => s.status === 'Draft').length,
      icon: ClipboardList,
      color: 'bg-yellow-500',
      change: '+5%'
    },
    {
      title: 'Approved Summaries',
      value: summaries.filter(s => s.status === 'Approved').length,
      icon: ClipboardList,
      color: 'bg-purple-500',
      change: '+15%'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Institution Overview</h1>
        <p className="text-gray-600">Manage and monitor your institution's healthcare operations</p>
      </div>

      {/* Institution Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {institution.logo ? (
              <img 
                src={institution.logo} 
                alt={institution.name}
                className="h-20 w-20 rounded-xl object-cover shadow-lg"
              />
            ) : (
              <div className="h-20 w-20 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Building2 className="h-10 w-10 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-3xl font-bold">{institution.name}</h2>
              <p className="text-blue-100 text-lg">{institution.type}</p>
              <div className="flex items-center space-x-4 mt-3">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Est. {institution.established}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Institution Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {institutionStats.map((stat, index) => {
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

      {/* Institution Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Address</p>
                <p className="text-sm text-gray-600">{institution.address}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Phone</p>
                <p className="text-sm text-gray-600">{institution.phone}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-sm text-gray-600">{institution.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">New patient admitted</span>
              </div>
              <span className="text-xs text-gray-500">2 hours ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Document uploaded</span>
              </div>
              <span className="text-xs text-gray-500">4 hours ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ClipboardList className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-900">Summary approved</span>
              </div>
              <span className="text-xs text-gray-500">6 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}