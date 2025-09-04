
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData, formatOccupant } from '../contexts/DataContext';
import { Users, TrendingUp, Settings, Clock, CheckCircle, AlertCircle, BarChart3, Building2, MapPin, Phone, Calendar } from 'lucide-react';
import UserSettings from './UserSettings';

export default function Dashboard() {
  const navigate = useNavigate();
  const { institution } = useAuth();
  const { patients, documents, summaries } = useData();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const hasAnyData = patients.length > 0 || documents.length > 0 || summaries.length > 0;

  // Sample data with correct structure for formatOccupant function
  const samplePatients = [
    { 
      id: 'sp1', 
      firstName: 'Jane', 
      lastName: 'Smith', 
      dateOfBirth: '1985-06-15',
      admissionDate: '2024-01-20',
      occupantType: 'Room' as const,
      occupantValue: 'B-210', 
      status: 'Active' as const 
    },
    { 
      id: 'sp2', 
      firstName: 'Michael', 
      lastName: 'Brown', 
      dateOfBirth: '1972-09-28',
      admissionDate: '2024-01-18',
      occupantType: 'Bed' as const,
      occupantValue: 'C-105', 
      status: 'Pending Discharge' as const 
    },
    { 
      id: 'sp3', 
      firstName: 'Ava', 
      lastName: 'Johnson', 
      dateOfBirth: '1990-03-12',
      admissionDate: '2024-01-15',
      occupantType: 'Room' as const,
      occupantValue: 'A-112', 
      status: 'Discharged' as const 
    },
  ];

  const sampleDocuments = [
    { id: 'sd1', fileName: 'admission_form.pdf', documentType: 'Admission Form', uploadTimestamp: new Date().toISOString() },
    { id: 'sd2', fileName: 'cbc_results.pdf', documentType: 'Lab Results', uploadTimestamp: new Date().toISOString() },
    { id: 'sd3', fileName: 'chest_xray.jpg', documentType: 'Radiology Report', uploadTimestamp: new Date().toISOString() },
  ];

  // Calculate useful statistics
  const totalPatients = hasAnyData ? patients.length : 24;
  const activePatients = hasAnyData ? patients.filter(p => p.status === 'Active').length : 12;
  const pendingDischargePatients = hasAnyData ? patients.filter(p => p.status === 'Pending Discharge').length : 8;
  
  const totalDocuments = hasAnyData ? documents.length : 58;
  const pendingSummaries = hasAnyData ? summaries.filter(s => s.status === 'Draft').length : 4;
  const pendingReviewSummaries = hasAnyData ? summaries.filter(s => s.status === 'Pending Review').length : 3;
  const approvedSummaries = hasAnyData ? summaries.filter(s => s.status === 'Approved').length : 9;
  
  const stats = [
    {
      title: 'Active Patients',
      value: activePatients,
      icon: Users,
      color: 'bg-green-500',
      change: '+12%',
      changeType: 'positive',
      onClick: () => navigate('/patients'),
      description: 'Currently under care'
    },
    {
      title: 'Pending Discharge',
      value: pendingDischargePatients,
      icon: Clock,
      color: 'bg-yellow-500',
      change: '+8%',
      changeType: 'positive',
      description: 'Ready for discharge'
    },
    {
      title: 'Pending Review',
      value: pendingReviewSummaries,
      icon: AlertCircle,
      color: 'bg-orange-500',
      change: '+5%',
      changeType: 'positive',
      description: 'Summaries awaiting approval'
    },
    {
      title: 'Completed This Month',
      value: approvedSummaries,
      icon: CheckCircle,
      color: 'bg-blue-500',
      change: '+15%',
      changeType: 'positive',
      description: 'Approved summaries'
    }
  ];

  const recentPatients = hasAnyData ? patients.slice(0, 5) : samplePatients;
  const recentDocuments = hasAnyData ? documents.slice(0, 5) : sampleDocuments;

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your patients today
          </p>
        </div>
        
        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
        >
          <Settings className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Settings</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index} 
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${stat.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
              onClick={stat.onClick}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{stat.description}</p>
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">{stat.change}</span>
                  <span className="text-sm text-gray-500 ml-1">from last month</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Overview Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Summary Overview</h2>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{totalDocuments}</div>
            <div className="text-sm text-gray-600">Total Documents</div>
            <div className="text-xs text-gray-500 mt-1">Clinical records processed</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{pendingSummaries}</div>
            <div className="text-sm text-gray-600">Draft Summaries</div>
            <div className="text-xs text-gray-500 mt-1">Awaiting completion</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{totalPatients}</div>
            <div className="text-sm text-gray-600">Total Patients</div>
            <div className="text-xs text-gray-500 mt-1">All time patients</div>
          </div>
        </div>
      </div>

      {/* Institution Section */}
      {institution && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Institution Information</h2>
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {institution.logo ? (
                <img 
                  src={institution.logo} 
                  alt={institution.name}
                  className="h-16 w-16 rounded-xl object-cover shadow-md"
                />
              ) : (
                <div className="h-16 w-16 bg-blue-100 rounded-xl flex items-center justify-center shadow-md">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-900">{institution.name}</h3>
                <p className="text-blue-600 font-medium">{institution.type}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{institution.address?.split(',')[0] || 'Address not available'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Phone className="h-4 w-4" />
                    <span>{institution.phone || 'Phone not available'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                <Calendar className="h-4 w-4" />
                <span>Established</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{institution.established || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Patients</h2>
            <button 
              onClick={() => navigate('/patients')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </button>
          </div>
          {!hasAnyData && (
            <p className="text-sm text-gray-500 mb-3">Sample data shown. Add a patient to get started.</p>
          )}
          <div className="space-y-4">
            {recentPatients.map(patient => (
              <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                   onClick={() => navigate(`/patients/${patient.id}`)}>
                <div>
                  <p className="font-medium text-gray-900">{patient.firstName} {patient.lastName}</p>
                  <p className="text-sm text-gray-600">{formatOccupant(patient)}</p>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
            <button 
              onClick={() => navigate('/documents')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </button>
          </div>
          {!hasAnyData && (
            <p className="text-sm text-gray-500 mb-3">Sample data shown. Upload a document to see it here.</p>
          )}
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

      {/* User Settings Modal */}
      <UserSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}